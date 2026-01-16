import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { WEBVIEW_READY_TIMEOUT_MS, LONG_TEXT_THRESHOLD, COMMANDS } from './constants';
import { getPanelHtml } from './panelTemplate';

export interface UserResponse {
  action: 'continue' | 'end' | 'instruction';
  text: string;
  images: string[];
  requestId?: string;
}

export class ChatPanelProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _onUserResponse = new vscode.EventEmitter<UserResponse>();
  public onUserResponse = this._onUserResponse.event;
  private _port: number = 0;
  private _viewReadyResolve?: () => void;
  private _viewReadyPromise?: Promise<void>;
  private _currentRequestId?: string;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _version: string
  ) {
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

    webviewView.webview.html = getPanelHtml(this._version);

    if (this._port > 0) {
      webviewView.webview.postMessage({ type: 'setPort', port: this._port });
    }

    webviewView.webview.onDidReceiveMessage((message) => this._handleWebviewMessage(message));

    webviewView.onDidChangeVisibility(() => {
      if (!webviewView.visible) {
        this._resetViewReadyPromise();
      }
    });
  }

  private _handleWebviewMessage(message: any) {
    const requestId = message.requestId || this._currentRequestId;
    switch (message.type) {
      case 'ready':
        this._viewReadyResolve?.();
        break;
      case 'continue':
        this._onUserResponse.fire({ action: 'continue', text: '', images: [], requestId });
        break;
      case 'end':
        this._onUserResponse.fire({ action: 'end', text: '', images: [], requestId });
        break;
      case 'submit':
        this._handleSubmit(message.text, message.images || [], requestId);
        break;
    }
  }

  async showPrompt(prompt: string, requestId?: string) {
    this._currentRequestId = requestId;
    if (!this._view) {
      await vscode.commands.executeCommand(COMMANDS.PANEL_FOCUS);
      // Wait for view to be resolved after focus command
      await new Promise<void>(resolve => setTimeout(resolve, 100));
    }

    try {
      await Promise.race([
        this._viewReadyPromise,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Webview ready timeout')), WEBVIEW_READY_TIMEOUT_MS)
        )
      ]);
    } catch (e) {
      console.error(`[WindsurfChatOpen] ${e}`);
      // Webview not ready, fire error response
      this._onUserResponse.fire({
        action: 'continue',
        text: `[WindsurfChatOpen 警告] Webview 面板未就绪，请重试。如果问题持续，请尝试重新打开面板。`,
        images: [],
        requestId
      });
      return;
    }

    if (this._view) {
      this._view.show?.(false);
      this._view.webview.postMessage({ type: 'showPrompt', prompt, requestId, startTimer: true });
    } else {
      console.error('[WindsurfChatOpen] Panel view not available after focus attempt');
      this._onUserResponse.fire({
        action: 'continue',
        text: `[WindsurfChatOpen 警告] 面板视图不可用，请重试。如果问题持续，请尝试重新打开面板。`,
        images: [],
        requestId
      });
    }
  }


  setPort(port: number) {
    this._port = port;
    this._view?.webview.postMessage({ type: 'setPort', port });
  }

  private _handleSubmit(text: string, images: string[], requestId?: string) {
    const tempDir = os.tmpdir();
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const savedImages: string[] = [];
    const failedImages: number[] = [];

    images.forEach((img, i) => {
      try {
        const imgPath = path.join(tempDir, `wsc_img_${uniqueId}_${i}.png`);
        const base64Data = img.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(imgPath, base64Data, 'base64');
        savedImages.push(imgPath);
      } catch (e) {
        console.error(`[WindsurfChatOpen] Failed to save image ${i}: ${e}`);
        failedImages.push(i + 1);
      }
    });

    let warningPrefix = '';
    if (failedImages.length > 0) {
      warningPrefix = `[WindsurfChatOpen 警告] 第 ${failedImages.join(', ')} 张图片保存失败\n\n`;
    }

    if (text.length > LONG_TEXT_THRESHOLD) {
      const txtPath = path.join(tempDir, `windsurf_chat_instruction_${uniqueId}.txt`);
      fs.writeFileSync(txtPath, text, 'utf-8');
      this._onUserResponse.fire({
        action: 'instruction',
        text: `${warningPrefix}[Content too long, saved to file]\n\nUser provided full instruction, please use read_file tool to read the following file:\n- ${txtPath}`,
        images: savedImages,
        requestId: requestId
      });
    } else {
      this._onUserResponse.fire({
        action: 'instruction',
        text: warningPrefix + text,
        images: savedImages,
        requestId: requestId
      });
    }
  }

}

