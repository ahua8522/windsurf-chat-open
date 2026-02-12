/**
 * Webview 面板的 JavaScript 脚本
 */
export function getPanelScript(): string {
  return `
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
    const devReqToggle = document.getElementById('devReqToggle');
    const devReqContent = document.getElementById('devReqContent');
    const devReqList = document.getElementById('devReqList');
    const devReqInput = document.getElementById('devReqInput');
    const devReqAddBtn = document.getElementById('devReqAddBtn');
    const queueSection = document.getElementById('queueSection');
    const queueList = document.getElementById('queueList');
    const queueCount = document.getElementById('queueCount');
    const queueClearBtn = document.getElementById('queueClearBtn');
    const chatCountEl = document.getElementById('chatCount');
    const chatCountResetBtn = document.getElementById('chatCountReset');
    const btnEnd = document.getElementById('btnEnd');
    const btnOptimize = document.getElementById('btnOptimize');
    const llmBaseUrlInput = document.getElementById('llmBaseUrl');
    const llmApiKeyInput = document.getElementById('llmApiKey');
    const llmModelInput = document.getElementById('llmModel');
    let images = [];
    let currentRequestId = '';
    let currentPort = 0;
    let workspaceRoot = ''; // 工作区根目录

    const MAX_IMAGE_COUNT = 10;
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    let timeoutMinutes = 0; // 默认不限制
    let fileChipIdCounter = 0; // 用于生成唯一的 file-chip ID
    let isOptimizing = false; // 是否正在优化提示词
    
    let devRequirements = []; // 开发要求列表 {id, text, checked}
    let messageQueue = []; // 消息队列
    let isWaitingForInput = false; // 是否在等待用户输入
    let chatCount = 0; // 对话次数
    let autoDequeueTimer = null; // 自动出队定时器

    // ============ 工具函数 ============

    const toastContainer = document.getElementById('toastContainer');
    function showToast(message, isError) {
      const el = document.createElement('div');
      el.className = 'toast' + (isError ? ' error' : '');
      el.textContent = message;
      toastContainer.appendChild(el);
      setTimeout(() => {
        el.style.animation = 'toast-out 0.2s ease forwards';
        setTimeout(() => el.remove(), 200);
      }, 3000);
    }

    /**
     * 将 file:// URI 转换为本地文件路径
     */
    function parseFileUri(uri) {
      let path = uri.trim();

      if (path.startsWith('file:///')) {
        path = path.substring('file:///'.length);
        // Unix 路径需要加回 /
        if (!/^[a-zA-Z]:/.test(path)) {
          path = '/' + path;
        }
      } else if (path.startsWith('file://')) {
        path = path.substring('file://'.length);
      }

      return decodeURIComponent(path);
    }

    /**
     * 从路径中提取文件名
     */
    function getFileName(path) {
      const parts = path.split(/[\\\\\/]/);
      return parts[parts.length - 1] || '';
    }

    /**
     * 转换为相对路径
     */
    function toRelativePath(absolutePath, workspaceRoot) {
      if (!workspaceRoot || !absolutePath.startsWith(workspaceRoot)) {
        return absolutePath;
      }

      let relativePath = absolutePath.substring(workspaceRoot.length);

      // 移除开头的路径分隔符
      relativePath = relativePath.replace(/^[\\\\\/]+/, '');

      // 统一使用正斜杠
      return relativePath.split('\\\\').join('/');
    }

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

    // 快捷设置按钮（仅更新输入框，不立即保存）
    document.querySelectorAll('.timeout-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.getAttribute('data-minutes'));
        timeoutInput.value = minutes;
      });
    });

    // 确定按钮：保存配置并收起配置栏
    document.getElementById('confirmConfigBtn').addEventListener('click', () => {
      const value = parseInt(timeoutInput.value);
      if (!isNaN(value) && value >= 0) {
        timeoutMinutes = value;
        vscode.postMessage({ type: 'setTimeout', timeoutMinutes: value });
        updateCountdownForNewTimeout();
      }
      // 保存 LLM 配置
      vscode.postMessage({
        type: 'saveLlmConfig',
        llmConfig: {
          baseUrl: llmBaseUrlInput.value.trim(),
          apiKey: llmApiKeyInput.value.trim(),
          model: llmModelInput.value.trim() || 'gpt-4o-mini'
        }
      });
      // 收起配置栏
      settingsToggle.classList.remove('expanded');
      configBar.classList.remove('show');
    });

    document.getElementById('btnSubmit').onclick = submit;
    btnEnd.onclick = () => {
      waitingIndicator.classList.remove('show');
      isWaitingForInput = false;
      btnEnd.classList.remove('show');
      if (autoDequeueTimer) { clearTimeout(autoDequeueTimer); autoDequeueTimer = null; }
      vscode.postMessage({ type: 'end', requestId: currentRequestId });
    };
    // 优化按钮
    btnOptimize.onclick = () => {
      if (isOptimizing) return;
      const text = getPlainText();
      if (!text) return;
      isOptimizing = true;
      btnOptimize.classList.add('loading');
      vscode.postMessage({ type: 'optimizePrompt', text: text });
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
      // 如果不在等待输入状态，添加到队列
      if (!isWaitingForInput) {
        addToQueue();
        return;
      }

      // 取消自动出队定时器
      if (autoDequeueTimer) {
        clearTimeout(autoDequeueTimer);
        autoDequeueTimer = null;
      }

      waitingIndicator.classList.remove('show');
      isWaitingForInput = false;
      btnEnd.classList.remove('show');

      // 从 contenteditable 中提取文本和文件路径
      let text = getTextWithFilePaths();
      const validImages = images.filter(img => img !== null);

      // 空值判断只看输入框数据（不含开发要求）
      if (text || validImages.length > 0) {
        // 追加选中的开发要求
        const checkedRequirements = devRequirements.filter(req => req.checked);
        if (checkedRequirements.length > 0) {
          const reqText = '\\n\\n开发要求：\\n' + checkedRequirements.map(req => '- ' + req.text).join('\\n');
          text = text + reqText;
        }

        vscode.postMessage({
          type: 'submit',
          text,
          images: validImages,
          requestId: currentRequestId
        });
        inputText.innerHTML = '';
        images = [];
        imagePreview.innerHTML = '';
        incrementChatCount();
      } else {
        vscode.postMessage({ type: 'continue', requestId: currentRequestId });
        incrementChatCount();
      }
    }

    // 从 contenteditable 中提取文本，将 file-chip 替换为相对路径
    function getTextWithFilePaths() {
      const clonedNode = inputText.cloneNode(true);
      const fileChips = clonedNode.querySelectorAll('.file-chip');

      fileChips.forEach(chip => {
        let path = chip.getAttribute('data-path') || '';
        
        // 转换为相对路径
        if (workspaceRoot && path.startsWith(workspaceRoot)) {
          path = path.substring(workspaceRoot.length);
          // 移除开头的路径分隔符
          while (path.startsWith('\\\\') || path.startsWith('/')) {
            path = path.substring(1);
          }
        }
        
        // 统一使用正斜杠
        path = path.replace(/\\\\/g, '/');
        
        const textNode = document.createTextNode(path || chip.textContent);
        chip.parentNode.replaceChild(textNode, chip);
      });

      // 将 <br> 和块级元素转换为换行符占位符（使用特殊标记避免被 textContent 处理）
      const NEWLINE_MARKER = '___NEWLINE___';
      const brs = clonedNode.querySelectorAll('br');
      brs.forEach(br => {
        br.replaceWith(NEWLINE_MARKER);
      });
      const divs = clonedNode.querySelectorAll('div, p');
      divs.forEach(div => {
        if (div.previousSibling) {
          div.insertBefore(document.createTextNode(NEWLINE_MARKER), div.firstChild);
        }
      });

      // 提取文本并将占位符替换为实际换行符
      let text = clonedNode.textContent || '';
      text = text.split(NEWLINE_MARKER).join('\\n');
      
      // 清理控制字符：移除 ANSI 转义序列和其他控制字符（保留换行和制表符）
      text = text.replace(/\\x1b\\[[0-9;]*[a-zA-Z]/g, ''); // ANSI 转义序列
      text = text.replace(/\\r/g, ''); // 回车符
      text = text.replace(/[\\x00-\\x08\\x0b\\x0c\\x0e-\\x1f]/g, ''); // 其他控制字符
      
      text = text.replace(/\\n{3,}/g, '\\n\\n'); // 合并过多的换行
      return text.trim();
    }

    // 获取纯文本内容（用于判断是否为空）
    function getPlainText() {
      return inputText.textContent.trim();
    }

    // ============ 消息队列功能 ============

    function addToQueue() {
      let text = getTextWithFilePaths();
      const validImages = images.filter(img => img !== null);

      // 空值判断只看输入框数据（不含开发要求）
      if (!text && validImages.length === 0) return;

      const checkedRequirements = devRequirements.filter(req => req.checked);
      if (checkedRequirements.length > 0) {
        const reqText = '\\n\\n开发要求：\\n' + checkedRequirements.map(req => '- ' + req.text).join('\\n');
        text = text ? text + reqText : reqText.trim();
      }

      messageQueue.push({
        id: Date.now() + Math.random(),
        text,
        images: validImages
      });

      inputText.innerHTML = '';
      images = [];
      imagePreview.innerHTML = '';
      renderQueue();
    }

    let dragSrcIndex = -1;

    function renderQueue() {
      queueCount.textContent = messageQueue.length;

      if (messageQueue.length === 0) {
        queueSection.style.display = 'none';
        return;
      }

      queueSection.style.display = 'block';
      queueList.innerHTML = '';

      messageQueue.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'queue-item';
        el.draggable = true;
        el.setAttribute('data-index', index);

        // 拖拽手柄
        const handle = document.createElement('span');
        handle.className = 'queue-drag-handle';
        handle.textContent = '⠿';
        handle.title = '拖拽排序';

        const textEl = document.createElement('div');
        textEl.className = 'queue-item-text';
        const preview = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
        textEl.textContent = (item.images.length > 0 ? '🖼️' + item.images.length + ' ' : '') + (preview || '(空消息)');
        textEl.title = item.text;

        const editBtn = document.createElement('button');
        editBtn.className = 'queue-item-edit';
        editBtn.textContent = '✎';
        editBtn.title = '编辑';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          // 回填文本到输入框
          inputText.textContent = item.text.replace(new RegExp('\\\\n\\\\n开发要求：\\\\n[\\\\s\\\\S]*$'), '');
          // 回填图片
          if (item.images && item.images.length > 0) {
            item.images.forEach(dataUrl => {
              if (dataUrl) {
                const imgIndex = images.length;
                images.push(dataUrl);
                const wrapper = document.createElement('div');
                wrapper.className = 'img-wrapper';
                const imgEl = document.createElement('img');
                imgEl.src = dataUrl;
                imgEl.onclick = () => showModal(dataUrl);
                const delBtn = document.createElement('button');
                delBtn.className = 'img-delete';
                delBtn.textContent = '×';
                delBtn.onclick = (ev) => { ev.stopPropagation(); removeImage(imgIndex, wrapper); };
                wrapper.appendChild(imgEl);
                wrapper.appendChild(delBtn);
                imagePreview.appendChild(wrapper);
              }
            });
          }
          // 从队列移除
          messageQueue.splice(index, 1);
          renderQueue();
          inputText.focus();
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'queue-item-delete';
        deleteBtn.textContent = '×';
        deleteBtn.title = '删除';
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          messageQueue.splice(index, 1);
          renderQueue();
        };

        el.addEventListener('dragstart', (e) => {
          dragSrcIndex = index;
          el.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', '' + index);
        });
        el.addEventListener('dragend', () => {
          el.classList.remove('dragging');
          dragSrcIndex = -1;
          queueList.querySelectorAll('.queue-item').forEach(item => {
            item.classList.remove('drag-over-above', 'drag-over-below');
          });
        });
        el.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dragSrcIndex === index) return;
          const rect = el.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          el.classList.remove('drag-over-above', 'drag-over-below');
          if (e.clientY < midY) {
            el.classList.add('drag-over-above');
          } else {
            el.classList.add('drag-over-below');
          }
        });
        el.addEventListener('dragleave', () => {
          el.classList.remove('drag-over-above', 'drag-over-below');
        });
        el.addEventListener('drop', (e) => {
          e.preventDefault();
          el.classList.remove('drag-over-above', 'drag-over-below');
          if (dragSrcIndex < 0 || dragSrcIndex === index) return;
          const rect = el.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          const moved = messageQueue.splice(dragSrcIndex, 1)[0];
          let targetIndex = e.clientY < midY ? index : index + 1;
          if (dragSrcIndex < index) targetIndex--;
          if (targetIndex < 0) targetIndex = 0;
          messageQueue.splice(targetIndex, 0, moved);
          dragSrcIndex = -1;
          renderQueue();
        });

        el.appendChild(handle);
        el.appendChild(textEl);
        el.appendChild(editBtn);
        el.appendChild(deleteBtn);
        queueList.appendChild(el);
      });
    }

    function dequeueAndSubmit() {
      if (messageQueue.length === 0 || !isWaitingForInput) return;
      const item = messageQueue.shift();
      renderQueue();

      waitingIndicator.classList.remove('show');
      isWaitingForInput = false;

      vscode.postMessage({
        type: 'submit',
        text: item.text,
        images: item.images,
        requestId: currentRequestId
      });
      incrementChatCount();
    }

    queueClearBtn.addEventListener('click', () => {
      messageQueue = [];
      renderQueue();
    });

    // ============ 对话次数记录 ============

    function incrementChatCount() {
      chatCount++;
      chatCountEl.textContent = chatCount;
      vscode.postMessage({ type: 'saveChatCount', count: chatCount });
    }

    chatCountResetBtn.addEventListener('click', () => {
      chatCount = 0;
      chatCountEl.textContent = '0';
      vscode.postMessage({ type: 'saveChatCount', count: 0 });
    });

    inputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        submit();
      } else if (e.key === 'Escape') {
        waitingIndicator.classList.remove('show');
        isWaitingForInput = false;
        btnEnd.classList.remove('show');
        if (autoDequeueTimer) { clearTimeout(autoDequeueTimer); autoDequeueTimer = null; }
        vscode.postMessage({ type: 'end', requestId: currentRequestId });
      }
    });

    inputText.addEventListener('paste', (e) => {
      e.preventDefault();
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      let hasImage = false;
      const items = clipboardData.items;
      if (items) {
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            hasImage = true;
            const file = item.getAsFile();
            if (file) addImage(file);
          }
        }
      }

      if (!hasImage) {
        const text = clipboardData.getData('text/plain');
        if (text) {
          const sel = window.getSelection();
          if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    });

    // 拖拽文件/文件夹处理
    inputText.addEventListener('drop', (e) => {
      e.preventDefault();
      inputText.classList.remove('drag-over');

      // 保存拖放位置的坐标
      const dropX = e.clientX;
      const dropY = e.clientY;

      const items = e.dataTransfer?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // 处理图片文件
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && file.type.startsWith('image/')) {
            addImage(file);
          }
        }

        // 处理文件/文件夹路径
        if (item.kind === 'string' && item.type === 'text/uri-list') {
          item.getAsString((uriString) => {
            if (uriString) {
              let filePath = uriString.trim();
              
              // 解析 file:// URI
              if (filePath.startsWith('file:///')) {
                // file:///d:/path/to/file (Windows) -> d:/path/to/file
                // file:///home/user/file (Unix) -> /home/user/file
                filePath = filePath.substring(8); // 移除 file:///
                
                // Unix 路径需要加回开头的 /
                if (!/^[a-zA-Z]:/.test(filePath)) {
                  filePath = '/' + filePath;
                }
              } else if (filePath.startsWith('file://')) {
                filePath = filePath.substring(7); // 移除 file://
              }
              
              // URL 解码
              filePath = decodeURIComponent(filePath);

              const pathParts = filePath.split(/[\\\\\\/]/);
              const name = pathParts.pop() || '';

              const isFolder = !name.includes('.') || name.startsWith('.');
              const isTextFile = isTextFileByName(name);

              if (isFolder || isTextFile) {
                // 使用拖放坐标插入芯片
                insertFileChipAtPosition(name, filePath, isFolder, dropX, dropY);
              }
            }
          });
        }
      }
    });

    inputText.addEventListener('dragover', (e) => {
      e.preventDefault();
      inputText.classList.add('drag-over');
    });

    inputText.addEventListener('dragleave', (e) => {
      inputText.classList.remove('drag-over');
    });

    // 在指定位置插入文件芯片
    function insertFileChipAtPosition(name, path, isFolder, x, y) {
      // 根据鼠标坐标确定插入位置
      let range;
      if (document.caretRangeFromPoint) {
        range = document.caretRangeFromPoint(x, y);
      } else if (document.caretPositionFromPoint) {
        const position = document.caretPositionFromPoint(x, y);
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
      }
      
      if (!range) {
        // 如果无法获取位置，使用当前光标位置
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        range = selection.getRangeAt(0);
      }

      const chip = document.createElement('span');
      chip.className = 'file-chip';
      chip.contentEditable = 'false';
      chip.setAttribute('data-path', path);
      chip.setAttribute('data-id', 'chip-' + (fileChipIdCounter++));

      const icon = document.createElement('span');
      icon.className = 'chip-icon';
      icon.textContent = isFolder ? '📁' : '📄';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'chip-name';
      nameSpan.textContent = name;
      nameSpan.title = path;

      const deleteBtn = document.createElement('span');
      deleteBtn.className = 'chip-delete';
      deleteBtn.textContent = '×';
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        chip.remove();
      };

      chip.appendChild(icon);
      chip.appendChild(nameSpan);
      chip.appendChild(deleteBtn);

      range.deleteContents();
      range.insertNode(chip);

      const space = document.createTextNode(' ');
      range.setStartAfter(chip);
      range.insertNode(space);

      range.setStartAfter(space);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);

      inputText.focus();
    }

    function addImage(file) {
      // 检查图片数量限制
      if (images.filter(img => img !== null).length >= MAX_IMAGE_COUNT) {
        showToast('图片数量超过限制（最多 ' + MAX_IMAGE_COUNT + ' 张）', true);
        return;
      }

      // 检查图片大小限制
      if (file.size > MAX_IMAGE_SIZE) {
        showToast('图片大小超过限制（单张最大 5MB）', true);
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

    let countdownInterval;
    let displayInterval;
    let remainingSeconds = 0;
    let countdownStartTime = 0;
    let isCountdownRunning = false;

    function startCountdown() {
      if (countdownInterval) clearInterval(countdownInterval);
      if (displayInterval) clearInterval(displayInterval);

      if (timeoutMinutes === 0) {
        countdown.textContent = '⏱️ 不限制';
        isCountdownRunning = false;
        return;
      }

      remainingSeconds = timeoutMinutes * 60;
      countdownStartTime = Date.now();
      isCountdownRunning = true;
      
      countdownInterval = setInterval(() => {
        remainingSeconds--;
        if (remainingSeconds <= 0) {
          clearInterval(countdownInterval);
          clearInterval(displayInterval);
          countdown.textContent = '';
          isCountdownRunning = false;
        }
      }, 1000);
    }

    function updateCountdownForNewTimeout() {
      if (!isCountdownRunning) return;
      
      const elapsed = Math.floor((Date.now() - countdownStartTime) / 1000);
      const newRemaining = timeoutMinutes * 60 - elapsed;
      
      if (newRemaining <= 0) {
        remainingSeconds = 0;
        clearInterval(countdownInterval);
        clearInterval(displayInterval);
        countdown.textContent = '';
        isCountdownRunning = false;
      } else {
        remainingSeconds = newRemaining;
        countdown.textContent = getCountdownText();
      }
    }

    function getCountdownText() {
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      return '⏱️ ' + minutes + ':' + seconds.toString().padStart(2, '0');
    }

    // ============ 开发要求功能 ============
    
    // 展开/收起开发要求
    devReqToggle.addEventListener('click', () => {
      devReqToggle.classList.toggle('collapsed');
      devReqContent.classList.toggle('collapsed');
    });
    
    // 添加开发要求
    function addDevRequirement(text, checked = false) {
      if (!text || !text.trim()) return;
      
      const id = Date.now() + Math.random();
      const requirement = { id, text: text.trim(), checked };
      devRequirements.push(requirement);
      
      renderDevRequirement(requirement);
      saveDevRequirements();
    }

    // 渲染单个开发要求
    function renderDevRequirement(req) {
      const item = document.createElement('div');
      item.className = 'dev-req-item';
      item.setAttribute('data-id', req.id);
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = 'req-' + req.id;
      checkbox.checked = req.checked;
      checkbox.addEventListener('change', () => {
        req.checked = checkbox.checked;
        saveDevRequirements();
      });
      
      const label = document.createElement('label');
      label.htmlFor = 'req-' + req.id;
      label.textContent = req.text;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'dev-req-delete';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', () => {
        devRequirements = devRequirements.filter(r => r.id !== req.id);
        item.remove();
        saveDevRequirements();
      });
      
      item.appendChild(checkbox);
      item.appendChild(label);
      item.appendChild(deleteBtn);
      devReqList.appendChild(item);
    }

    // 渲染所有开发要求
    function renderAllDevRequirements() {
      devReqList.innerHTML = '';
      devRequirements.forEach(req => renderDevRequirement(req));
    }

    // 保存开发要求到 VSCode 配置
    function saveDevRequirements() {
      vscode.postMessage({
        type: 'saveDevRequirements',
        requirements: devRequirements
      });
    }

    // 加载开发要求
    function loadDevRequirements(requirements) {
      if (Array.isArray(requirements)) {
        devRequirements = requirements;
        renderAllDevRequirements();
      }
    }

    // 添加按钮点击事件
    devReqAddBtn.addEventListener('click', () => {
      const text = devReqInput.value.trim();
      if (text) {
        addDevRequirement(text, false);
        devReqInput.value = '';
      }
    });

    // 输入框回车添加
    devReqInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = devReqInput.value.trim();
        if (text) {
          addDevRequirement(text, false);
          devReqInput.value = '';
        }
      }
    });

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (msg.type === 'showPrompt') {
        promptText.textContent = msg.prompt;
        currentRequestId = msg.requestId || '';
        waitingIndicator.classList.add('show');
        isWaitingForInput = true;
        btnEnd.classList.add('show');
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
        // 如果队列有消息，自动出队提交；队列为空时发送系统通知
        if (messageQueue.length > 0) {
          autoDequeueTimer = setTimeout(() => {
            dequeueAndSubmit();
          }, 800);
        } else {
          vscode.postMessage({ type: 'sendNotification' });
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
          updateCountdownForNewTimeout();
        }
      } else if (msg.type === 'setWorkspaceRoot') {
        // 接收工作区根目录
        if (msg.workspaceRoot) {
          workspaceRoot = msg.workspaceRoot;
          console.log('[WindsurfChatOpen] Workspace root set to:', workspaceRoot);
        }
      } else if (msg.type === 'setDevRequirements') {
        // 接收开发要求配置
        if (msg.requirements) {
          loadDevRequirements(msg.requirements);
        }
      } else if (msg.type === 'setChatCount') {
        // 接收对话次数
        if (typeof msg.count === 'number') {
          chatCount = msg.count;
          chatCountEl.textContent = chatCount;
        }
      } else if (msg.type === 'optimizeResult') {
        isOptimizing = false;
        btnOptimize.classList.remove('loading');
        if (msg.success && msg.text) {
          inputText.textContent = msg.text;
          inputText.focus();
        } else if (msg.error) {
          showToast('优化失败: ' + msg.error, true);
        }
      } else if (msg.type === 'setLlmConfig') {
        if (msg.llmConfig) {
          if (msg.llmConfig.baseUrl) llmBaseUrlInput.value = msg.llmConfig.baseUrl;
          if (msg.llmConfig.apiKey) llmApiKeyInput.value = msg.llmConfig.apiKey;
          if (msg.llmConfig.model) llmModelInput.value = msg.llmConfig.model;
        }
      }
    });

    vscode.postMessage({ type: 'ready' });
  `;
}

