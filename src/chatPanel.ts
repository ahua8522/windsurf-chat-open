import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import * as https from 'https';
import * as http from 'http';
import {
  WEBVIEW_READY_TIMEOUT_MS,
  LONG_TEXT_THRESHOLD,
  COMMANDS,
  ERROR_MESSAGES,
  MAX_IMAGE_COUNT,
  MAX_IMAGE_SIZE
} from './constants';
import { getPanelHtml } from './panelTemplate';
import notifier from 'node-notifier';

export interface UserResponse {
  action: 'continue' | 'end' | 'instruction' | 'error';
  text: string;
  images: string[];
  files?: Array<{ name: string; path: string; size: number }>;
  requestId?: string;
  error?: string;
}

interface WebviewMessage {
  type: 'ready' | 'continue' | 'end' | 'submit' | 'setTimeout' | 'getWorkspaceRoot' | 'saveDevRequirements' | 'saveChatCount' | 'sendNotification' | 'saveLlmConfig' | 'optimizePrompt' | 'switchProject' | 'refreshDevRequirements';
  text?: string;
  images?: string[];
  files?: Array<{ name: string; path: string; size: number }>;
  requestId?: string;
  timeoutMinutes?: number;
  requirements?: Array<{ id: number; text: string; checked: boolean; isGlobal?: boolean }>;
  count?: number;
  llmConfig?: { baseUrl: string; apiKey: string; model: string };
  projectIndices?: number[];
  projectPath?: string;
}

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _onUserResponse = new vscode.EventEmitter<UserResponse>();
  public onUserResponse = this._onUserResponse.event;
  private _port: number = 0;
  private _viewReadyResolve?: () => void;
  private _viewReadyPromise?: Promise<void>;
  private _isWebviewReady: boolean = false;
  private _currentRequestId?: string;
  private _timeoutMinutes: number = 0; // 默认不限制
  private _context?: vscode.ExtensionContext;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _version: string,
    context?: vscode.ExtensionContext
  ) {
    this._context = context;
    this._resetViewReadyPromise();
    this._migrateOldData();
  }

  private _migrateOldData() {
    if (!this._context) { return; }
    const gs = this._context.globalState;
    // 迁移旧的全局 devRequirements → devRequirements:global
    const oldReqs = gs.get<any[]>('devRequirements');
    if (oldReqs && Array.isArray(oldReqs) && oldReqs.length > 0) {
      const existing = gs.get<any[]>('devRequirements:global', []) || [];
      if (existing.length === 0) {
        gs.update('devRequirements:global', oldReqs);
        console.log(`[WindsurfChatOpen] Migrated ${oldReqs.length} old devRequirements to global`);
      }
      gs.update('devRequirements', undefined); // 清除旧 key
    }
    // 迁移旧的全局 chatCount → 第一个工作区文件夹
    const oldCount = gs.get<number>('chatCount');
    if (typeof oldCount === 'number' && oldCount > 0) {
      const folders = vscode.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        const key = `chatCount:${folders[0].uri.fsPath}`;
        const existing = gs.get<number>(key, 0) || 0;
        if (existing === 0) {
          gs.update(key, oldCount);
          console.log(`[WindsurfChatOpen] Migrated chatCount ${oldCount} to ${key}`);
        }
      }
      gs.update('chatCount', undefined); // 清除旧 key
    }
  }

  private _resetViewReadyPromise() {
    this._isWebviewReady = false;
    this._viewReadyPromise = new Promise<void>((resolve) => {
      this._viewReadyResolve = resolve;
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    if (this._viewReadyResolve) {
      this._viewReadyResolve();
    }
    this._resetViewReadyPromise();
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = getPanelHtml(this._version);

    if (this._port > 0) {
      webviewView.webview.postMessage({ type: 'setPort', port: this._port });
    }

    webviewView.webview.onDidReceiveMessage((message) => this._handleWebviewMessage(message));
  }

  private _handleWebviewMessage(message: WebviewMessage) {
    const requestId = message.requestId || this._currentRequestId;
    switch (message.type) {
      case 'ready': {
        this._isWebviewReady = true;
        this._viewReadyResolve?.();
        // 发送当前超时配置到前端
        this._view?.webview.postMessage({ type: 'setTimeoutMinutes', timeoutMinutes: this._timeoutMinutes });
        // 发送工作区文件夹列表到前端
        const wsFolders = vscode.workspace.workspaceFolders;
        if (wsFolders && wsFolders.length > 0) {
          const projects = wsFolders.map(f => ({ path: f.uri.fsPath, name: path.basename(f.uri.fsPath) }));
          this._view?.webview.postMessage({ type: 'setWorkspaceRoot', workspaceRoot: wsFolders[0].uri.fsPath, projects });
          // 发送默认项目（第一个）的数据
          this._sendProjectData(wsFolders[0].uri.fsPath);
        }
        // 发送 LLM 配置到前端
        const llmConfig = this._context?.globalState.get('llmConfig', {});
        this._view?.webview.postMessage({ type: 'setLlmConfig', llmConfig });
        break;
      }
      case 'continue':
        this._onUserResponse.fire({ action: 'continue', text: '', images: [], requestId });
        break;
      case 'end':
        this._onUserResponse.fire({ action: 'end', text: '', images: [], requestId });
        break;
      case 'submit':
        this._handleSubmit(message.text || '', message.images || [], message.files, requestId);
        break;
      case 'setTimeout':
        if (typeof message.timeoutMinutes === 'number' && message.timeoutMinutes >= 0) {
          this._timeoutMinutes = message.timeoutMinutes;
          console.log(`[WindsurfChatOpen] Timeout set to ${this._timeoutMinutes} minutes`);
        }
        break;
      case 'getWorkspaceRoot':
        // 响应前端请求工作区路径
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
          const root = folders[0].uri.fsPath;
          this._view?.webview.postMessage({ type: 'setWorkspaceRoot', workspaceRoot: root });
        }
        break;
      case 'saveDevRequirements':
        // 按项目路径保存开发要求
        if (message.requirements && this._context && message.projectPath) {
          // 分离全局和项目级要求
          const globalReqs = message.requirements.filter((r: any) => r.isGlobal);
          const projectReqs = message.requirements.filter((r: any) => !r.isGlobal);
          this._context.globalState.update('devRequirements:global', globalReqs);
          this._context.globalState.update(`devRequirements:${message.projectPath}`, projectReqs);
          console.log(`[WindsurfChatOpen] Dev requirements saved: global=${globalReqs.length}, project=${projectReqs.length}`);
        }
        break;
      case 'saveChatCount':
        // 按项目路径保存对话次数
        if (typeof message.count === 'number' && this._context && message.projectPath) {
          this._context.globalState.update(`chatCount:${message.projectPath}`, message.count);
        }
        break;
      case 'switchProject':
        // 切换项目时只刷新开发要求（计数基于工作区，不跟随切换）
        if (message.projectPath) {
          this._sendProjectDevRequirements(message.projectPath);
        }
        break;
      case 'refreshDevRequirements':
        // 刷新开发要求（从存储重新加载全局+项目级）
        if (message.projectPath) {
          this._sendProjectDevRequirements(message.projectPath);
        }
        break;
      case 'sendNotification':
        notifier.notify({
          title: 'WindsurfChat Open',
          message: 'AI 已完成任务，等待您的下一步指令',
          sound: true,
          wait: false
        }, (err) => {
          if (err) {
            console.error(`[WindsurfChatOpen] 系统通知发送失败: ${err}`);
          }
        });
        break;
      case 'saveLlmConfig':
        if (message.llmConfig && this._context) {
          this._context.globalState.update('llmConfig', message.llmConfig);
          console.log('[WindsurfChatOpen] LLM config saved');
        }
        break;
      case 'optimizePrompt':
        this._optimizeWithLlm(message.text || '', message.projectIndices);
        break;
    }
  }

  public getTimeoutMinutes(): number {
    return this._timeoutMinutes;
  }

  private _sendProjectData(projectPath: string) {
    if (!this._context) { return; }
    this._sendProjectDevRequirements(projectPath);
    // 项目级对话次数
    const chatCount = this._context.globalState.get<number>(`chatCount:${projectPath}`, 0) || 0;
    this._view?.webview.postMessage({ type: 'setChatCount', count: chatCount });
    console.log(`[WindsurfChatOpen] Sent project data for: ${projectPath}, chatCount=${chatCount}`);
  }

  private _sendProjectDevRequirements(projectPath: string) {
    if (!this._context) { return; }
    const globalReqs = this._context.globalState.get<any[]>('devRequirements:global', []) || [];
    const projectReqs = this._context.globalState.get<any[]>(`devRequirements:${projectPath}`, []) || [];
    const allReqs = [
      ...globalReqs.map((r: any) => ({ ...r, isGlobal: true })),
      ...projectReqs.map((r: any) => ({ ...r, isGlobal: false }))
    ];
    this._view?.webview.postMessage({ type: 'setDevRequirements', requirements: allReqs });
    console.log(`[WindsurfChatOpen] Refreshed dev requirements for: ${projectPath}, total=${allReqs.length}`);
  }

  async showPrompt(prompt: string, requestId?: string) {
    this._currentRequestId = requestId;
    if (!this._view) {
      await vscode.commands.executeCommand(COMMANDS.PANEL_FOCUS);
      const deadline = Date.now() + WEBVIEW_READY_TIMEOUT_MS;
      while (!this._view && Date.now() < deadline) {
        await new Promise<void>(resolve => setTimeout(resolve, 50));
      }
    }

    if (!this._view) {
      this._onUserResponse.fire({
        action: 'error',
        text: '',
        images: [],
        requestId,
        error: ERROR_MESSAGES.PANEL_NOT_AVAILABLE
      });
      return;
    }

    try {
      const readyPromise = this._viewReadyPromise;
      await Promise.race([
        readyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Webview ready timeout')), WEBVIEW_READY_TIMEOUT_MS)
        )
      ]);
    } catch (e) {
      console.error(`[WindsurfChatOpen] ${e}`);
      // Webview not ready, fire error response
      this._onUserResponse.fire({
        action: 'error',
        text: '',
        images: [],
        requestId,
        error: ERROR_MESSAGES.WEBVIEW_NOT_READY
      });
      return;
    }

    if (this._view) {
      this._view.show?.(false);
      this._view.webview.postMessage({ type: 'showPrompt', prompt, requestId, startTimer: true });
    } else {
      console.error('[WindsurfChatOpen] Panel view not available after focus attempt');
      this._onUserResponse.fire({
        action: 'error',
        text: '',
        images: [],
        requestId,
        error: ERROR_MESSAGES.PANEL_NOT_AVAILABLE
      });
    }
  }


  private _getProjectInfo(rootPath: string): string[] {
    const info: string[] = [];
    const projectName = path.basename(rootPath);
    info.push(`项目: ${projectName}`);

    // 读取 package.json 获取技术栈
    try {
      const pkgPath = path.join(rootPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const deps = Object.keys(pkg.dependencies || {});
        const devDeps = Object.keys(pkg.devDependencies || {});
        if (pkg.description) { info.push(`  描述: ${pkg.description}`); }
        if (deps.length > 0) { info.push(`  依赖: ${deps.join(', ')}`); }
        if (devDeps.length > 0) { info.push(`  开发依赖: ${devDeps.join(', ')}`); }
      }
    } catch { /* ignore */ }

    // 读取 requirements.txt 判断 Python 项目
    try {
      const reqPath = path.join(rootPath, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        const content = fs.readFileSync(reqPath, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 20);
        info.push(`  Python依赖: ${content.join(', ')}`);
      }
    } catch { /* ignore */ }

    // 顶层目录结构（最多15项）
    try {
      const entries = fs.readdirSync(rootPath, { withFileTypes: true })
        .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '__pycache__' && e.name !== 'dist' && e.name !== 'build')
        .slice(0, 15)
        .map(e => e.isDirectory() ? `${e.name}/` : e.name);
      if (entries.length > 0) { info.push(`  顶层结构: ${entries.join(', ')}`); }
    } catch { /* ignore */ }

    return info;
  }

  private async _getWorkspaceContext(targetFolder?: vscode.WorkspaceFolder, targetFolders?: vscode.WorkspaceFolder[]): Promise<string> {
    const parts: string[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return '';
    }

    // 当前打开的文件
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const filePath = vscode.workspace.asRelativePath(activeEditor.document.uri);
      const lang = activeEditor.document.languageId;
      parts.push(`当前打开文件: ${filePath} (${lang})`);
    }

    // 确定目标项目列表
    let folders: vscode.WorkspaceFolder[] = [];
    if (targetFolders && targetFolders.length > 0) {
      folders = targetFolders;
    } else if (targetFolder) {
      folders = [targetFolder];
    } else {
      // 自动判断
      let autoFolder: vscode.WorkspaceFolder | undefined;
      if (activeEditor) {
        autoFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      }
      if (!autoFolder) {
        autoFolder = workspaceFolders[0];
      }
      folders = [autoFolder];
    }

    // 不关联任何项目（targetFolders 为空数组）
    if (targetFolders && targetFolders.length === 0) {
      return parts.join('\n');
    }

    // 收集所有目标项目的详细信息
    const targetPaths = new Set(folders.map(f => f.uri.fsPath));
    for (const folder of folders) {
      const projectInfo = this._getProjectInfo(folder.uri.fsPath);
      parts.push(`\n【目标项目】`);
      parts.push(...projectInfo);
      this._saveProjectContext(folder.uri.fsPath, projectInfo);
    }

    // 其他项目简要信息
    if (workspaceFolders.length > 1) {
      const otherFolders = workspaceFolders.filter(f => !targetPaths.has(f.uri.fsPath));
      if (otherFolders.length > 0) {
        parts.push(`\n【工作区其他项目】`);
        for (const folder of otherFolders) {
          parts.push(`- ${path.basename(folder.uri.fsPath)}`);
        }
      }
    }

    return parts.join('\n');
  }

  private _saveProjectContext(rootPath: string, projectInfo: string[]) {
    try {
      const contextDir = path.join(rootPath, '.windsurfchatopen');
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }
      const contextFile = path.join(contextDir, 'project-context.json');
      const data = {
        updatedAt: new Date().toISOString(),
        projectName: path.basename(rootPath),
        context: projectInfo
      };
      fs.writeFileSync(contextFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[WindsurfChatOpen] Failed to save project context:', e);
    }
  }

  private async _optimizeWithLlm(text: string, projectIndices?: number[]) {
    const llmConfig = this._context?.globalState.get<{ baseUrl: string; apiKey: string; model: string }>('llmConfig');
    if (!llmConfig || !llmConfig.apiKey) {
      this._view?.webview.postMessage({ type: 'optimizeResult', success: false, error: '请先在设置中配置 API Key' });
      return;
    }

    // 多项目选择逻辑
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 1 && projectIndices === undefined) {
      // 返回项目列表让前端选择（支持多选和不选）
      const projects = workspaceFolders.map((f, i) => ({ index: i, name: path.basename(f.uri.fsPath) }));
      this._view?.webview.postMessage({ type: 'selectProject', projects, text });
      return;
    }

    // 确定目标项目（可能多个或为空数组表示不关联）
    let targetFolders: vscode.WorkspaceFolder[] = [];
    if (projectIndices && projectIndices.length > 0 && workspaceFolders) {
      targetFolders = projectIndices.map(i => workspaceFolders[i]).filter(Boolean);
    } else if (!projectIndices && workspaceFolders && workspaceFolders.length === 1) {
      targetFolders = [workspaceFolders[0]];
    }
    // projectIndices 为空数组 [] 表示不关联任何项目

    let baseUrl = (llmConfig.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    const model = llmConfig.model || 'gpt-4o-mini';
    const apiKey = llmConfig.apiKey;

    // 智能拼接：如果 baseUrl 已包含 /chat/completions 则不再追加
    const endpoint = baseUrl.endsWith('/chat/completions') ? baseUrl : baseUrl + '/chat/completions';

    // 收集指定项目的上下文
    const workspaceContext = await this._getWorkspaceContext(undefined, targetFolders);
    let systemPrompt = '你是一个提示词优化专家。用户会给你一段发给 AI 编程助手的指令，请优化这段指令使其更清晰、结构化、易于 AI 理解和执行。要求：\n1. 保持用户原意不变\n2. 使指令更具体、条理清晰\n3. 如果指令较短，适当补充细节\n4. 直接输出优化后的指令文本，不要添加任何解释或前缀\n5. 使用与原文相同的语言\n6. 结合项目上下文，使指令更贴合当前项目的技术栈和架构';
    if (workspaceContext) {
      systemPrompt += '\n\n以下是当前项目的上下文信息，请结合这些信息优化指令：\n' + workspaceContext;
    }

    const requestBody = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 2048
    });

    console.log(`[WindsurfChatOpen] LLM optimize - System Prompt:\n${systemPrompt}`);
    console.log(`[WindsurfChatOpen] LLM optimize - User Prompt:\n${text}`);

    try {
      const url = new URL(endpoint);
      console.log(`[WindsurfChatOpen] LLM optimize request: ${url.href}, model: ${model}`);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      const result = await new Promise<string>((resolve, reject) => {
        const req = httpModule.request({
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 30000
        }, (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json.error) {
                reject(new Error(json.error.message || JSON.stringify(json.error)));
                return;
              }
              const content = json.choices?.[0]?.message?.content;
              if (content) {
                resolve(content.trim());
              } else {
                reject(new Error('API 返回数据格式异常'));
              }
            } catch (e) {
              reject(new Error(`解析响应失败: ${data.substring(0, 200)}`));
            }
          });
        });

        req.on('error', (e: Error) => reject(e));
        req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
        req.write(requestBody);
        req.end();
      });

      this._view?.webview.postMessage({ type: 'optimizeResult', success: true, text: result });
    } catch (e: any) {
      console.error('[WindsurfChatOpen] LLM optimize failed:', e);
      this._view?.webview.postMessage({ type: 'optimizeResult', success: false, error: e.message || String(e) });
    }
  }

  setPort(port: number) {
    this._port = port;
    this._view?.webview.postMessage({ type: 'setPort', port });
  }

  private _handleSubmit(text: string, images: string[], files?: Array<{ name: string; path: string; size: number }>, requestId?: string) {
    // 验证图片数量
    if (images.length > MAX_IMAGE_COUNT) {
      this._onUserResponse.fire({
        action: 'error',
        text: '',
        images: [],
        requestId,
        error: ERROR_MESSAGES.TOO_MANY_IMAGES
      });
      return;
    }

    // 创建 windsurf-chat 文件夹
    const tempDir = path.join(os.tmpdir(), 'windsurf-chat');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(4).toString('hex');
    const savedImages: string[] = [];
    const failedImages: number[] = [];
    const oversizedImages: number[] = [];

    // 处理文件路径
    let filesText = '';
    if (files && files.length > 0) {
      filesText = '\n\n用户拖拽了以下文件，请使用 read_file 工具读取：\n';
      files.forEach(file => {
        filesText += `- ${file.path} (${file.name})\n`;
      });
    }

    images.forEach((img, i) => {
      try {
        const base64Data = img.replace(/^data:image\/\w+;base64,/, '');

        // 验证图片大小
        const imageSize = Buffer.byteLength(base64Data, 'base64');
        if (imageSize > MAX_IMAGE_SIZE) {
          oversizedImages.push(i + 1);
          return;
        }

        const imgPath = path.join(tempDir, `wsc_img_${uniqueId}_${i}.png`);
        fs.writeFileSync(imgPath, base64Data, 'base64');
        savedImages.push(imgPath);
      } catch (e) {
        console.error(`[WindsurfChatOpen] ${ERROR_MESSAGES.IMAGE_SAVE_FAILED} ${i}: ${e}`);
        failedImages.push(i + 1);
      }
    });

    let warningPrefix = '';
    if (oversizedImages.length > 0) {
      warningPrefix += `[WindsurfChatOpen 警告] 第 ${oversizedImages.join(', ')} 张图片超过大小限制（5MB），已跳过\n\n`;
    }
    if (failedImages.length > 0) {
      warningPrefix += `[WindsurfChatOpen 警告] 第 ${failedImages.join(', ')} 张图片保存失败\n\n`;
    }

    if (text.length > LONG_TEXT_THRESHOLD) {
      try {
        const txtPath = path.join(tempDir, `windsurf_chat_instruction_${uniqueId}.txt`);
        fs.writeFileSync(txtPath, text, 'utf-8');
        this._onUserResponse.fire({
          action: 'instruction',
          text: `${warningPrefix}[Content too long, saved to file]\n\nUser provided full instruction, please use read_file tool to read the following file:\n- ${txtPath}${filesText}`,
          images: savedImages,
          files: files,
          requestId: requestId
        });
      } catch (e) {
        console.error(`[WindsurfChatOpen] Failed to save text file: ${e}`);
        this._onUserResponse.fire({
          action: 'error',
          text: '',
          images: [],
          requestId,
          error: '保存文本文件失败，请重试'
        });
      }
    } else {
      this._onUserResponse.fire({
        action: 'instruction',
        text: warningPrefix + text + filesText,
        images: savedImages,
        files: files,
        requestId: requestId
      });
    }
  }

}

