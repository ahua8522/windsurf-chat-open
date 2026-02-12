import { getPanelStyles } from './panelStyles';
import { getPanelScript } from './panelScript';

/**
 * 获取 webview 的 HTML 内容
 */
export function getPanelHtml(version: string = '0.0.0'): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WindsurfChat</title>
  <style>
    ${getPanelStyles()}
  </style>
</head>
<body>
  <div class="header">
    <div class="header-bar">
      <div class="header-left">
        <h1>WindsurfChat Open</h1>
        <span class="version">v${version}</span>
      </div>
      <div class="header-right">
        <div class="chat-counter-display">
          <span>📨 <span id="chatCount">0</span></span>
          <button class="counter-reset-btn" id="chatCountReset" title="清零次数">↺</button>
        </div>
        <button class="settings-toggle" id="settingsToggle" title="设置">
          <span class="settings-toggle-icon">⚙️</span>
        </button>
        <div class="port-display">
          <span id="portInfo">端口: --</span>
          <span class="connection-status" id="connectionStatus"></span>
        </div>
      </div>
    </div>
  </div>

  <div class="config-bar" id="configBar">
    <div class="config-bar-row">
      <label for="timeoutInput">超时时间</label>
      <div class="config-input-group">
        <input type="number" id="timeoutInput" min="0" step="1" value="0" />
        <span class="config-unit">分钟</span>
        <span class="hint-text">0 = 不限制</span>
      </div>
    </div>
    <div class="timeout-presets">
      <button class="timeout-preset-btn" data-minutes="0">不限制</button>
      <button class="timeout-preset-btn" data-minutes="30">30m</button>
      <button class="timeout-preset-btn" data-minutes="60">1h</button>
      <button class="timeout-preset-btn" data-minutes="240">4h</button>
      <button class="timeout-preset-btn" data-minutes="480">8h</button>
    </div>
    <button id="confirmConfigBtn" class="confirm-config-btn">保存设置</button>
  </div>
  
  <div class="waiting-indicator" id="waitingIndicator">
    <span class="waiting-indicator-text">✨ AI 等待你的输入...</span>
    <span id="countdown" class="countdown"></span>
  </div>
  
  <div class="queue-section" id="queueSection">
    <div class="queue-header">
      <span class="queue-title">📋 队列 (<span id="queueCount">0</span>)</span>
      <button class="queue-clear-btn" id="queueClearBtn" title="清空队列">清空</button>
    </div>
    <div class="queue-list" id="queueList"></div>
  </div>

  <div class="prompt-area">
    <div id="promptText">等待 AI 输出...</div>
  </div>
  
  <div class="input-area">
    <div class="input-container">
      <div id="inputText" contenteditable="true" data-placeholder="输入反馈或指令...支持拖拽图片、文本文件和文件夹"></div>
      <div class="input-actions">
        <button class="btn-end" id="btnEnd" title="结束对话 (Esc)"><svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg></button>
        <button class="btn-send" id="btnSubmit" title="提交 (Ctrl+Enter)"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="12" x2="8" y2="4"/><polyline points="4,7 8,3 12,7"/></svg></button>
      </div>
    </div>
    <div class="image-preview" id="imagePreview"></div>
    
    <div class="dev-requirements-section">
      <div class="dev-requirements-header">
        <span class="dev-requirements-title">📋 开发要求</span>
        <div class="dev-requirements-header-actions">
          <input type="text" id="devReqInput" placeholder="添加..." maxlength="100" />
          <button id="devReqAddBtn" title="添加">+</button>
          <button class="dev-requirements-toggle" id="devReqToggle" title="展开/收起">▼</button>
        </div>
      </div>
      <div class="dev-requirements-content" id="devReqContent">
        <div class="dev-requirements-list" id="devReqList"></div>
      </div>
    </div>
    
    <div class="hint">Ctrl+Enter 提交 | Esc 结束 | 支持拖拽文件、图片到输入框</div>
  </div>
  
  <div class="modal" id="imageModal">
    <button class="modal-close" id="modalClose">×</button>
    <img id="modalImage" src="" alt="preview">
  </div>

  <script>
    ${getPanelScript()}
  </script>
</body>
</html>`;
}

