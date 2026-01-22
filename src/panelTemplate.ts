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
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: var(--vscode-editor-background);
      border-radius: 4px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header h1 {
      font-size: 15px;
      font-weight: 600;
      margin: 0;
    }
    .version {
      background: var(--vscode-badge-background);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
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
      cursor: pointer;
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
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: bold;
      line-height: 1;
    }
    .image-preview .file-wrapper {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
      font-size: 12px;
    }
    .image-preview .file-icon {
      font-size: 16px;
    }
    .image-preview .file-name {
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .image-preview .file-delete {
      width: 18px;
      height: 18px;
      background: #d32f2f;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
      line-height: 1;
      margin-left: 4px;
    }
    .image-preview .file-delete:hover {
      background: #b71c1c;
    }
    .image-preview .img-delete:hover {
      background: #b71c1c;
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
    .settings-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      background: transparent;
      color: var(--vscode-foreground);
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.1s;
      opacity: 0.7;
    }
    .settings-toggle:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }
    .settings-toggle-icon {
      transition: transform 0.2s;
      display: inline-block;
    }
    .settings-toggle.expanded .settings-toggle-icon {
      transform: rotate(45deg);
    }
    .port-display {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
    }
    .connection-status {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-testing-iconPassed);
    }
    .connection-status.disconnected {
      background: var(--vscode-testing-iconFailed);
    }
    .config-bar {
      display: none;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 4px;
      font-size: 12px;
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: max-height 0.3s ease, opacity 0.3s ease, padding 0.3s ease;
    }
    .config-bar.show {
      display: flex;
      max-height: 200px;
      opacity: 1;
    }
    .config-bar-row {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .config-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .config-item label {
      color: var(--vscode-descriptionForeground);
    }
    .config-item input {
      width: 80px;
      padding: 4px 8px;
      border: 1px solid var(--vscode-input-border, rgba(128, 128, 128, 0.35));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 3px;
      font-size: 12px;
    }
    .config-item input:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .config-item .hint-text {
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
    }
    .timeout-presets {
      display: flex;
      gap: 6px;
      margin-left: 8px;
    }
    .timeout-preset-btn {
      padding: 2px 8px;
      font-size: 11px;
      border: 1px solid var(--vscode-button-border, transparent);
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      border-radius: 3px;
      cursor: pointer;
      transition: background 0.1s;
    }
    .timeout-preset-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
    }
    .timeout-preset-btn:active {
      transform: translateY(1px);
    }
    .port-display {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--vscode-descriptionForeground);
    }
    .connection-status {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--vscode-testing-iconPassed);
    }
    .connection-status.disconnected {
      background: var(--vscode-testing-iconFailed);
    }
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
      <div class="config-item">
        <label for="timeoutInput">超时时间:</label>
        <input type="number" id="timeoutInput" min="0" step="1" value="30" />
        <span>分钟</span>
        <span class="hint-text">(0=不限制)</span>
      </div>
      <div class="timeout-presets">
        <button class="timeout-preset-btn" data-minutes="0">不限制</button>
        <button class="timeout-preset-btn" data-minutes="30">30分钟</button>
        <button class="timeout-preset-btn" data-minutes="60">1小时</button>
        <button class="timeout-preset-btn" data-minutes="240">4小时</button>
        <button class="timeout-preset-btn" data-minutes="480">8小时</button>
      </div>
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
    <textarea id="inputText" placeholder="输入反馈或指令...支持拖拽图片和文本文件"></textarea>
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
    const timeoutInput = document.getElementById('timeoutInput');
    const connectionStatus = document.getElementById('connectionStatus');
    let images = [];
    let filePathMap = {}; // 文件名 -> 完整路径的映射
    let currentRequestId = '';
    let currentPort = 0;

    const MAX_IMAGE_COUNT = 10;
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    let timeoutMinutes = 30; // 默认30分钟

    // 支持的文本文件扩展名
    const TEXT_FILE_EXTENSIONS = [
      '.txt', '.md', '.json', '.xml', '.yaml', '.yml', '.toml',
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.html', '.css', '.scss', '.less',
      '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.php',
      '.rb', '.swift', '.kt', '.scala', '.sh', '.bash', '.zsh', '.fish',
      '.sql', '.graphql', '.proto', '.thrift',
      '.log', '.csv', '.ini', '.conf', '.config', '.env',
      '.gitignore', '.dockerignore', '.editorconfig', '.prettierrc', '.eslintrc'
    ];

    // 设置展开/收起
    const settingsToggle = document.getElementById('settingsToggle');
    const configBar = document.getElementById('configBar');
    settingsToggle.addEventListener('click', () => {
      settingsToggle.classList.toggle('expanded');
      configBar.classList.toggle('show');
    });

    // 监听超时时间输入变化
    timeoutInput.addEventListener('change', () => {
      const value = parseInt(timeoutInput.value);
      if (!isNaN(value) && value >= 0) {
        timeoutMinutes = value;
        vscode.postMessage({ type: 'setTimeout', timeoutMinutes: value });
      }
    });

    // 快捷设置按钮
    document.querySelectorAll('.timeout-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.getAttribute('data-minutes'));
        timeoutInput.value = minutes;
        timeoutMinutes = minutes;
        vscode.postMessage({ type: 'setTimeout', timeoutMinutes: minutes });
      });
    });

    document.getElementById('btnSubmit').onclick = submit;
    document.getElementById('btnEnd').onclick = () => {
      waitingIndicator.classList.remove('show');
      vscode.postMessage({ type: 'end', requestId: currentRequestId });
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
      let text = inputText.value.trim();
      const validImages = images.filter(img => img !== null);

      // 替换文本中的文件名为完整路径
      for (const fileName in filePathMap) {
        const fullPath = filePathMap[fileName];
        // 使用简单的字符串替换，避免正则表达式转义问题
        text = text.split(fileName).join(fullPath);
      }

      if (text || validImages.length > 0) {
        vscode.postMessage({
          type: 'submit',
          text,
          images: validImages,
          requestId: currentRequestId
        });
        inputText.value = '';
        images = [];
        filePathMap = {}; // 清空文件路径映射
        imagePreview.innerHTML = '';
      } else {
        vscode.postMessage({ type: 'continue', requestId: currentRequestId });
      }
    }

    inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        waitingIndicator.classList.remove('show');
        vscode.postMessage({ type: 'end', requestId: currentRequestId });
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
      console.log('[WindsurfChatOpen] Drop event triggered!');
      const items = e.dataTransfer?.items;

      console.log('[WindsurfChatOpen] Items:', items);

      if (!items || items.length === 0) {
        console.log('[WindsurfChatOpen] No items, returning');
        return;
      }

      // 阻止默认行为
      e.preventDefault();

      // 记录拖拽前的文本和光标位置
      const textBefore = inputText.value;
      const cursorPos = inputText.selectionStart;

      console.log('[WindsurfChatOpen] Text before:', textBefore);
      console.log('[WindsurfChatOpen] Cursor position:', cursorPos);

      // 处理每个拖拽项
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log('[WindsurfChatOpen] Item', i, '- kind:', item.kind, 'type:', item.type);

        // 处理文件类型的项
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            console.log('[WindsurfChatOpen] Got file:', file.name, 'type:', file.type);

            // 处理图片
            if (file.type.startsWith('image/')) {
              console.log('[WindsurfChatOpen] Processing image:', file.name);
              addImage(file);
            }
          }
        }

        // 处理字符串类型的项（文件路径）
        if (item.kind === 'string' && item.type === 'text/uri-list') {
          console.log('[WindsurfChatOpen] Processing uri-list');
          item.getAsString((uriString) => {
            console.log('[WindsurfChatOpen] Got URI:', uriString);

            if (uriString) {
              // 解析 file:// URI
              let filePath = uriString.trim();
              if (filePath.startsWith('file:///')) {
                filePath = filePath.substring(8); // 移除 file:///
                // Windows 路径处理
                if (!/^[a-zA-Z]:/.test(filePath)) {
                  filePath = '/' + filePath; // Unix 路径
                }
              } else if (filePath.startsWith('file://')) {
                filePath = filePath.substring(7); // 移除 file://
              }
              filePath = decodeURIComponent(filePath);

              console.log('[WindsurfChatOpen] Parsed file path:', filePath);

              // 提取文件名
              const fileName = filePath.split(/[\\/]/).pop() || '';
              console.log('[WindsurfChatOpen] File name:', fileName);

              // 检查是否是文本文件
              if (isTextFileByName(fileName)) {
                console.log('[WindsurfChatOpen] Is text file, adding to map');

                // 保存文件名到路径的映射
                filePathMap[fileName] = filePath;

                // 在光标位置插入文件名
                const before = textBefore.substring(0, cursorPos);
                const after = textBefore.substring(cursorPos);
                inputText.value = before + fileName + after;

                // 更新光标位置
                const newCursorPos = cursorPos + fileName.length;
                inputText.setSelectionRange(newCursorPos, newCursorPos);
                inputText.focus();

                console.log('[WindsurfChatOpen] Inserted file name at position', cursorPos);
              } else {
                console.log('[WindsurfChatOpen] Not a text file, skipping');
              }
            }
          });
        }
      }
    });

    inputText.addEventListener('dragover', (e) => e.preventDefault());

    function addImage(file) {
      // 检查图片数量限制
      if (images.filter(img => img !== null).length >= MAX_IMAGE_COUNT) {
        alert('图片数量超过限制（最多 ' + MAX_IMAGE_COUNT + ' 张）');
        return;
      }

      // 检查图片大小限制
      if (file.size > MAX_IMAGE_SIZE) {
        alert('图片大小超过限制（单张最大 5MB）');
        return;
      }

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

    function isTextFile(file) {
      const fileName = file.name.toLowerCase();
      return TEXT_FILE_EXTENSIONS.some(ext => fileName.endsWith(ext));
    }

    function isTextFileByName(fileName) {
      const lowerName = fileName.toLowerCase();
      return TEXT_FILE_EXTENSIONS.some(ext => lowerName.endsWith(ext));
    }

    function addFileWithPath(fileName, filePath, fileSize) {
      // 检查文件数量限制
      if (files.length >= MAX_FILE_COUNT) {
        alert('文件数量超过限制（最多 ' + MAX_FILE_COUNT + ' 个）');
        return;
      }

      const fileIndex = files.length;
      files.push({
        name: fileName,
        path: filePath,
        size: fileSize
      });

      // 显示文件预览
      const wrapper = document.createElement('div');
      wrapper.className = 'file-wrapper';

      const fileIcon = document.createElement('span');
      fileIcon.className = 'file-icon';
      fileIcon.textContent = '📄';

      const fileNameSpan = document.createElement('span');
      fileNameSpan.className = 'file-name';
      fileNameSpan.textContent = fileName;
      fileNameSpan.title = filePath;

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'file-delete';
      deleteBtn.textContent = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        removeFile(fileIndex, wrapper);
      };

      wrapper.appendChild(fileIcon);
      wrapper.appendChild(fileNameSpan);
      wrapper.appendChild(deleteBtn);
      imagePreview.appendChild(wrapper);
    }

    function removeFile(index, wrapper) {
      files.splice(index, 1);
      wrapper.remove();
    }

    let countdownInterval;
    let displayInterval;
    let remainingSeconds = 0;

    function startCountdown() {
      if (countdownInterval) clearInterval(countdownInterval);
      if (displayInterval) clearInterval(displayInterval);

      // 如果超时时间为0，不启动倒计时
      if (timeoutMinutes === 0) {
        countdown.textContent = '⏱️ 不限制';
        return;
      }

      remainingSeconds = timeoutMinutes * 60;
      countdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds <= 0) {
          clearInterval(countdownInterval);
          clearInterval(displayInterval);
          countdown.textContent = '';
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
        currentRequestId = msg.requestId || '';
        waitingIndicator.classList.add('show');
        inputText.focus();
        if (msg.startTimer) {
          startCountdown();
          if (timeoutMinutes > 0) {
            if (displayInterval) clearInterval(displayInterval);
            displayInterval = setInterval(() => {
              if (remainingSeconds > 0) {
                countdown.textContent = getCountdownText();
              } else {
                clearInterval(displayInterval);
                countdown.textContent = '';
              }
            }, 1000);
          }
        }
      } else if (msg.type === 'setPort') {
        currentPort = msg.port;
        document.getElementById('portInfo').textContent = '端口: ' + msg.port;
        // 服务启动后显示绿色状态
        connectionStatus.classList.remove('disconnected');
        connectionStatus.title = '服务运行中';
      } else if (msg.type === 'setTimeoutMinutes') {
        if (typeof msg.timeoutMinutes === 'number' && msg.timeoutMinutes >= 0) {
          timeoutMinutes = msg.timeoutMinutes;
          timeoutInput.value = msg.timeoutMinutes;
        }
      }
    });

    vscode.postMessage({ type: 'ready' });
  </script>
</body>
</html>`;
}
