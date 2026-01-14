import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

export interface UserResponse {
  action: 'continue' | 'end' | 'instruction';
  text: string;
  images: string[];
}

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _onUserResponse = new vscode.EventEmitter<UserResponse>();
  public onUserResponse = this._onUserResponse.event;
  private _port: number = 0;
  private _viewReadyResolve?: () => void;
  private _viewReadyPromise?: Promise<void>;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._resetViewReadyPromise();
  }

  private _resetViewReadyPromise() {
    this._viewReadyPromise = new Promise<void>((resolve) => {
      this._viewReadyResolve = resolve;
    });
  }

  resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtml();

    // 面板初始化后，如果已有端口信息则发送
    if (this._port > 0) {
      webviewView.webview.postMessage({ type: 'setPort', port: this._port });
    }

    webviewView.webview.onDidReceiveMessage((message) => {
      const timestamp = new Date().toISOString();
      console.log(`[WindsurfChatOpen] ${timestamp} 收到 webview 消息: ${message.type}`);

      switch (message.type) {
        case 'ready':
          // Webview 初始化完成，通知等待者
          console.log('[WindsurfChatOpen] Webview 报告已就绪');
          if (this._viewReadyResolve) {
            this._viewReadyResolve();
          }
          break;
        case 'continue':
          console.log(`[WindsurfChatOpen] ${timestamp} 用户操作: continue (空提交或点击继续)`);
          this._onUserResponse.fire({ action: 'continue', text: '', images: [] });
          break;
        case 'end':
          console.log(`[WindsurfChatOpen] ${timestamp} 用户操作: end`);
          this._onUserResponse.fire({ action: 'end', text: '', images: [] });
          break;
        case 'submit':
          console.log(`[WindsurfChatOpen] ${timestamp} 用户操作: submit, text长度=${message.text?.length || 0}, 图片数=${message.images?.length || 0}`);
          this._handleSubmit(message.text, message.images || []);
          break;
      }
    });

    // 面板被隐藏时重置 ready promise
    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        this._resetViewReadyPromise();
      }
    });
  }

  async showPrompt(prompt: string) {
    console.log('[WindsurfChatOpen] showPrompt 开始, prompt:', prompt.substring(0, 50));

    // 如果面板未初始化，先打开面板
    if (!this._view) {
      console.log('[WindsurfChatOpen] 面板未初始化，尝试打开...');
      await vscode.commands.executeCommand('windsurfChatOpen.panel.focus');
    }

    // 等待 webview 真正就绪（带超时保护）
    const READY_TIMEOUT = 5000;
    try {
      await Promise.race([
        this._viewReadyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Webview 就绪超时')), READY_TIMEOUT)
        )
      ]);
      console.log('[WindsurfChatOpen] Webview 已就绪');
    } catch (e) {
      console.warn(`[WindsurfChatOpen] 等待 webview 就绪失败: ${e}, 继续尝试发送消息`);
    }

    if (this._view) {
      // 确保面板可见
      this._view.show?.(false);  // false = 获取焦点
      // 发送提示消息
      this._view.webview.postMessage({ type: 'showPrompt', prompt, startTimer: true });
      console.log('[WindsurfChatOpen] 已发送 showPrompt 消息');
    } else {
      console.error('[WindsurfChatOpen] 面板初始化失败，无法发送消息');
    }
  }

  setPort(port: number) {
    this._port = port;
    if (this._view) {
      this._view.webview.postMessage({ type: 'setPort', port });
    }
  }

  private _handleSubmit(text: string, images: string[]) {
    const tempDir = os.tmpdir();
    const timestamp = Date.now();
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const savedImages: string[] = [];

    for (let i = 0; i < images.length; i++) {
      try {
        const imgPath = path.join(tempDir, `wsc_img_${uniqueId}_${i}.png`);
        const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(imgPath, base64Data, 'base64');
        savedImages.push(imgPath);
        console.log(`[WindsurfChatOpen] 图片已保存: ${imgPath}`);
      } catch (e) {
        console.error(`[WindsurfChatOpen] 保存图片失败: ${e}`);
      }
    }

    if (text.length > 500) {
      const txtPath = path.join(tempDir, `windsurf_chat_instruction_${timestamp}.txt`);
      fs.writeFileSync(txtPath, text, 'utf-8');
      this._onUserResponse.fire({
        action: 'instruction',
        text: `[Content too long, saved to file]\n\nUser provided full instruction, please use read_file tool to read the following file:\n- ${txtPath}`,
        images: savedImages
      });
    } else {
      this._onUserResponse.fire({
        action: 'instruction',
        text,
        images: savedImages
      });
    }
  }

  private _getHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WindsurfChat</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 12px;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    .header {
      margin-bottom: 16px;
    }
    .header h1 {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 6px;
    }
    .header-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .version {
      background: var(--vscode-badge-background);
      padding: 2px 6px;
      border-radius: 3px;
    }
    .port-info {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 2px 6px;
      border-radius: 3px;
      font-weight: 600;
    }
    .slogan {
      opacity: 0.8;
    }
    .prompt-area {
      max-height: 120px;
      overflow-y: auto;
      margin-bottom: 12px;
      padding: 6px 0;
      font-size: 13px;
      line-height: 1.6;
      color: var(--vscode-descriptionForeground);
    }
    #promptText {
      white-space: pre-wrap;
      word-break: break-word;
    }
    #promptText::before {
      content: '🤖 ';
    }
    .countdown {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
      margin-left: 8px;
    }
    .waiting-indicator {
      display: none;
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      border-radius: 4px;
      padding: 8px 12px;
      margin-bottom: 12px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    .waiting-indicator.show {
      display: block;
    }
    .waiting-indicator-text {
      font-size: 13px;
      font-weight: 600;
      color: var(--vscode-inputValidation-infoForeground);
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    .input-area {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    textarea {
      width: 100%;
      min-height: 60px;
      padding: 8px;
      border: 1px solid var(--vscode-input-border, rgba(128, 128, 128, 0.35));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      resize: vertical;
      font-family: inherit;
      font-size: 13px;
    }
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .buttons {
      display: flex;
      gap: 8px;
    }
    button {
      padding: 6px 12px;
      border: 1px solid var(--vscode-widget-border);
      background: transparent;
      color: var(--vscode-foreground);
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    button:hover {
      opacity: 1;
      background: var(--vscode-list-hoverBackground);
    }
    .btn-primary {
      border-color: var(--vscode-focusBorder);
    }
    .btn-danger {
      color: var(--vscode-errorForeground);
    }
    .image-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 8px;
      padding: 4px;
    }
    .image-preview .img-wrapper {
      position: relative;
      display: inline-block;
    }
    .image-preview img {
      max-width: 60px;
      max-height: 60px;
      border-radius: 4px;
      border: 1px solid var(--vscode-widget-border);
      display: block;
    }
    .image-preview .img-delete {
      position: absolute;
      top: -8px;
      right: -8px;
      width: 20px;
      height: 20px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      padding: 0;
      margin: 0;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      line-height: 1;
    }
    .image-preview .img-delete:hover {
      background: #b71c1c;
    }
    .image-preview img {
      cursor: pointer;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.9);
      z-index: 100;
      justify-content: center;
      align-items: center;
    }
    .modal.show {
      display: flex;
    }
    .modal img {
      max-width: 90%;
      max-height: 90%;
      border-radius: 8px;
    }
    .modal-close {
      position: absolute;
      top: 20px;
      right: 20px;
      color: white;
      font-size: 30px;
      cursor: pointer;
      background: none;
      border: none;
    }
    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>WindsurfChat Open</h1>
    <div class="header-meta">
      <span class="version">v1.4.4</span>
      <span class="port-info" id="portInfo">端口: --</span>
      <span class="slogan">🎉 免费开源 · 安全可控 · 无需配置</span>
    </div>
  </div>
  
  <div class="waiting-indicator" id="waitingIndicator">
    <span class="waiting-indicator-text">✨ AI 等待你的输入...</span>
    <span id="countdown" class="countdown"></span>
  </div>
  
  <div class="prompt-area">
    <div id="promptText">等待 AI 输出...</div>
  </div>
  
  <div class="input-area">
    <textarea id="inputText" placeholder="输入反馈或指令...支持拖拽图片"></textarea>
    <div class="image-preview" id="imagePreview"></div>
    <div class="buttons">
      <button class="btn-primary" id="btnSubmit">提交 (Ctrl+Enter)</button>
      <button class="btn-danger" id="btnEnd">结束对话</button>
    </div>
    <div class="hint">空提交=继续 | Ctrl+Enter 提交 | Esc 结束</div>
  </div>
  
  <div class="modal" id="imageModal">
    <button class="modal-close" id="modalClose">×</button>
    <img id="modalImage" src="" alt="preview">
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    const inputText = document.getElementById('inputText');
    const promptText = document.getElementById('promptText');
    const countdown = document.getElementById('countdown');
    const imagePreview = document.getElementById('imagePreview');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const waitingIndicator = document.getElementById('waitingIndicator');
    let images = [];

    document.getElementById('btnSubmit').onclick = submit;
    document.getElementById('btnEnd').onclick = () => {
      waitingIndicator.classList.remove('show');
      vscode.postMessage({ type: 'end' });
    };
    document.getElementById('modalClose').onclick = closeModal;
    imageModal.onclick = (e) => { if (e.target === imageModal) closeModal(); };

    function showModal(src) {
      modalImage.src = src;
      imageModal.classList.add('show');
    }
    function closeModal() {
      imageModal.classList.remove('show');
    }

    function submit() {
      waitingIndicator.classList.remove('show');
      const text = inputText.value.trim();
      const validImages = images.filter(img => img !== null);
      if (text || validImages.length > 0) {
        vscode.postMessage({ type: 'submit', text, images: validImages });
        inputText.value = '';
        images = [];
        imagePreview.innerHTML = '';
      } else {
        vscode.postMessage({ type: 'continue' });
      }
    }

    inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        waitingIndicator.classList.remove('show');
        vscode.postMessage({ type: 'end' });
      }
    });

    inputText.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) addImage(file);
        }
      }
    });

    inputText.addEventListener('drop', (e) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files) return;
      for (const file of files) {
        if (file.type.startsWith('image/')) addImage(file);
      }
    });

    inputText.addEventListener('dragover', (e) => e.preventDefault());

    function addImage(file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const index = images.length;
        images.push(dataUrl);
        
        const wrapper = document.createElement('div');
        wrapper.className = 'img-wrapper';
        
        const img = document.createElement('img');
        img.src = dataUrl;
        img.onclick = () => showModal(dataUrl);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'img-delete';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => { e.stopPropagation(); removeImage(index, wrapper); };
        
        wrapper.appendChild(img);
        wrapper.appendChild(deleteBtn);
        imagePreview.appendChild(wrapper);
      };
      reader.readAsDataURL(file);
    }

    function removeImage(index, wrapper) {
      images[index] = null;
      wrapper.remove();
    }

    let countdownInterval;
    let remainingSeconds = 30 * 60;

    function startCountdown() {
      if (countdownInterval) clearInterval(countdownInterval);
      remainingSeconds = 30 * 60;
      
      countdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
    }

    function getCountdownText() {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return '⏱️ ' + minutes + ':' + seconds.toString().padStart(2, '0');
    }

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg.type === 'showPrompt') {
        promptText.textContent = msg.prompt;
        waitingIndicator.classList.add('show');
        inputText.focus();
        if (msg.startTimer) {
          startCountdown();
          // 每秒更新倒计时（不影响主文本）
          const updateDisplay = setInterval(() => {
            if (remainingSeconds > 0) {
              countdown.textContent = getCountdownText();
            } else {
              clearInterval(updateDisplay);
              countdown.textContent = '';
            }
          }, 1000);
        }
      } else if (msg.type === 'setPort') {
        const portInfo = document.getElementById('portInfo');
        if (portInfo) {
          portInfo.textContent = '端口: ' + msg.port;
        }
      }
    });

    // Webview 加载完成，通知 TypeScript 端
    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
  }
}
