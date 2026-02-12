/**
 * Webview 面板的 CSS 样式
 */
export function getPanelStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }

    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb {
      background: var(--vscode-scrollbarSlider-background);
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--vscode-scrollbarSlider-hoverBackground);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      padding: 10px 12px;
      height: 100vh;
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    /* ========== Header ========== */
    .header {
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header h1 {
      font-size: 13px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.2px;
    }
    .version {
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
      line-height: 16px;
    }
    .header-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ========== Chat Counter ========== */
    .chat-counter-display {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-badge-background);
      padding: 2px 6px;
      border-radius: 10px;
      line-height: 16px;
    }
    .counter-reset-btn {
      width: 16px;
      height: 16px;
      padding: 0;
      background: transparent;
      border: none;
      color: var(--vscode-badge-foreground);
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      opacity: 0.5;
      transition: opacity 0.15s;
      border-radius: 50%;
    }
    .counter-reset-btn:hover {
      opacity: 1;
      background: rgba(128,128,128,0.2);
    }

    /* ========== Settings Toggle ========== */
    .settings-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      padding: 0;
      background: transparent;
      color: var(--vscode-foreground);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      transition: background 0.15s, opacity 0.15s;
      opacity: 0.6;
    }
    .settings-toggle:hover {
      background: var(--vscode-toolbar-hoverBackground);
      opacity: 1;
    }
    .settings-toggle-icon {
      transition: transform 0.25s ease;
      display: inline-block;
    }
    .settings-toggle.expanded .settings-toggle-icon {
      transform: rotate(90deg);
    }

    /* ========== Port Display ========== */
    .port-display {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.8;
    }
    .connection-status {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--vscode-testing-iconPassed);
      box-shadow: 0 0 4px var(--vscode-testing-iconPassed);
    }
    .connection-status.disconnected {
      background: var(--vscode-testing-iconFailed);
      box-shadow: 0 0 4px var(--vscode-testing-iconFailed);
    }

    /* ========== Config Bar ========== */
    .config-bar {
      display: none;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 10px;
      padding: 0;
      background: var(--vscode-sideBar-background);
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
      border-radius: 6px;
      font-size: 12px;
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height 0.25s ease, opacity 0.2s ease, padding 0.25s ease;
    }
    .config-bar.show {
      display: flex;
      max-height: 300px;
      padding: 10px 12px;
      opacity: 1;
      overflow: visible;
    }
    .config-bar-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .config-bar-row > label {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
      flex-shrink: 0;
    }
    .config-input-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 1;
    }
    .config-input-group input {
      width: 64px;
      padding: 4px 8px;
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.35));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-size: 12px;
      text-align: center;
    }
    .config-input-group input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .config-unit {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .hint-text {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.6;
    }
    .timeout-presets {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .timeout-preset-btn {
      padding: 3px 10px;
      font-size: 11px;
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
      background: transparent;
      color: var(--vscode-foreground);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s;
      opacity: 0.8;
    }
    .timeout-preset-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
      opacity: 1;
    }
    .timeout-preset-btn:active {
      transform: scale(0.96);
    }
    .confirm-config-btn {
      padding: 5px 16px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s;
      align-self: flex-end;
    }
    .confirm-config-btn:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .confirm-config-btn:active {
      transform: scale(0.97);
    }

    /* ========== Waiting Indicator ========== */
    .waiting-indicator {
      display: none;
      align-items: center;
      gap: 8px;
      background: var(--vscode-inputValidation-infoBackground);
      border: 1px solid var(--vscode-inputValidation-infoBorder);
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .waiting-indicator.show {
      display: flex;
      animation: fadeSlideIn 0.3s ease;
    }
    .waiting-indicator-text {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-inputValidation-infoForeground);
    }
    .countdown {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.7;
      margin-left: auto;
      font-variant-numeric: tabular-nums;
    }
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ========== Queue Section ========== */
    .queue-section {
      display: none;
      margin-bottom: 10px;
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
      border-radius: 6px;
      background: var(--vscode-sideBar-background);
      overflow: hidden;
      flex-shrink: 0;
      animation: fadeSlideIn 0.25s ease;
    }
    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
    }
    .queue-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .queue-clear-btn {
      padding: 2px 8px;
      font-size: 10px;
      border: none;
      background: transparent;
      color: var(--vscode-errorForeground);
      border-radius: 4px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.15s, background 0.15s;
    }
    .queue-clear-btn:hover {
      opacity: 1;
      background: rgba(128,128,128,0.15);
    }
    .queue-list {
      padding: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 180px;
      overflow-y: auto;
    }
    .queue-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.15));
      border-radius: 4px;
      font-size: 12px;
      transition: background 0.1s;
    }
    .queue-item:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .queue-drag-handle {
      flex-shrink: 0;
      cursor: grab;
      font-size: 14px;
      line-height: 1;
      opacity: 0.3;
      transition: opacity 0.15s;
      user-select: none;
      padding: 0 2px;
    }
    .queue-item:hover .queue-drag-handle {
      opacity: 0.7;
    }
    .queue-drag-handle:active {
      cursor: grabbing;
    }
    .queue-item.dragging {
      opacity: 0.4;
      background: var(--vscode-list-dropBackground);
    }
    .queue-item.drag-over-above {
      border-top: 2px solid var(--vscode-focusBorder);
      padding-top: 3px;
    }
    .queue-item.drag-over-below {
      border-bottom: 2px solid var(--vscode-focusBorder);
      padding-bottom: 3px;
    }
    .queue-item-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--vscode-foreground);
      font-size: 11px;
      opacity: 0.85;
    }
    .queue-item-edit,
    .queue-item-delete {
      flex-shrink: 0;
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 13px;
      padding: 0 2px;
      opacity: 0.4;
      transition: opacity 0.1s, color 0.1s;
      line-height: 1;
    }
    .queue-item-edit:hover {
      opacity: 1;
      color: var(--vscode-textLink-foreground, #3794ff);
    }
    .queue-item-delete:hover {
      opacity: 1;
      color: var(--vscode-errorForeground);
    }

    /* ========== Prompt Area ========== */
    .prompt-area {
      max-height: 100px;
      overflow-y: auto;
      margin-bottom: 10px;
      padding: 8px 10px;
      font-size: 12px;
      line-height: 1.6;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-sideBar-background);
      border-radius: 6px;
      border-left: 3px solid var(--vscode-focusBorder);
      flex-shrink: 0;
    }
    #promptText {
      white-space: pre-wrap;
      word-break: break-word;
    }
    #promptText::before {
      content: '🤖 ';
    }

    /* ========== Input Area ========== */
    .input-area {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
      min-height: 0;
    }
    .input-container {
      position: relative;
    }
    #inputText {
      width: 100%;
      min-height: 112px;
      max-height: 280px;
      padding: 10px 42px 10px 10px;
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.35));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-word;
      transition: border-color 0.2s;
    }
    #inputText:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
      box-shadow: 0 0 0 1px var(--vscode-focusBorder);
    }
    #inputText:empty:before {
      content: attr(data-placeholder);
      color: var(--vscode-input-placeholderForeground);
      opacity: 0.5;
    }
    #inputText.drag-over {
      border-color: var(--vscode-focusBorder);
      background: var(--vscode-list-dropBackground);
      box-shadow: 0 0 0 2px var(--vscode-focusBorder);
    }

    /* ========== File Chips ========== */
    .file-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      margin: 0 2px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      font-size: 11px;
      cursor: default;
      user-select: none;
      vertical-align: middle;
      white-space: nowrap;
    }
    .file-chip .chip-icon {
      font-size: 12px;
      line-height: 1;
    }
    .file-chip .chip-name {
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-chip .chip-delete {
      margin-left: 2px;
      cursor: pointer;
      opacity: 0.6;
      font-weight: bold;
      font-size: 13px;
      line-height: 1;
      padding: 0 1px;
      transition: opacity 0.1s;
    }
    .file-chip .chip-delete:hover {
      opacity: 1;
      color: var(--vscode-errorForeground);
    }

    /* ========== Buttons ========== */
    button {
      padding: 6px 14px;
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.25));
      background: transparent;
      color: var(--vscode-foreground);
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }
    button:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .input-actions {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      z-index: 2;
    }
    .btn-end,
    .btn-send {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(0,0,0,0.12);
    }
    .btn-end {
      background: rgba(128,128,128,0.12);
      color: var(--vscode-descriptionForeground, #888);
      opacity: 0.6;
      display: none;
    }
    .btn-end.show {
      display: flex;
    }
    .btn-end:hover {
      opacity: 1;
      background: rgba(255,80,80,0.15);
      color: var(--vscode-errorForeground, #f44);
      box-shadow: 0 2px 8px rgba(255,80,80,0.2);
      transform: scale(1.08);
    }
    .btn-end:active {
      transform: scale(0.93);
    }
    .btn-send {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      opacity: 0.9;
    }
    .btn-send:hover {
      opacity: 1;
      background: var(--vscode-button-hoverBackground);
      box-shadow: 0 2px 8px rgba(0,120,255,0.25);
      transform: scale(1.08);
    }
    .btn-send:active {
      transform: scale(0.93);
    }

    /* ========== Image Preview ========== */
    .image-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 2px;
    }
    .image-preview .img-wrapper {
      position: relative;
      display: inline-block;
    }
    .image-preview img {
      width: 52px;
      height: 52px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
      display: block;
      cursor: pointer;
      transition: border-color 0.15s;
    }
    .image-preview img:hover {
      border-color: var(--vscode-focusBorder);
    }
    .image-preview .img-delete {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 18px;
      height: 18px;
      background: var(--vscode-errorForeground);
      color: white;
      border: 2px solid var(--vscode-editor-background);
      border-radius: 50%;
      cursor: pointer;
      z-index: 10;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      line-height: 1;
      opacity: 0;
      transition: opacity 0.15s;
    }
    .image-preview .img-wrapper:hover .img-delete {
      opacity: 1;
    }
    .image-preview .img-delete:hover {
      background: #c62828;
    }

    /* ========== Modal ========== */
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      z-index: 100;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(4px);
    }
    .modal.show {
      display: flex;
    }
    .modal img {
      max-width: 90%;
      max-height: 90%;
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .modal-close {
      position: absolute;
      top: 16px;
      right: 16px;
      color: white;
      font-size: 24px;
      cursor: pointer;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      opacity: 0.8;
    }
    .modal-close:hover {
      background: rgba(255,255,255,0.2);
      opacity: 1;
    }

    /* ========== Hint ========== */
    .hint {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      opacity: 0.4;
      text-align: center;
    }

    /* ========== Dev Requirements ========== */
    .dev-requirements-section {
      margin-top: 4px;
      border: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.2));
      border-radius: 6px;
      background: var(--vscode-sideBar-background);
      overflow: hidden;
    }
    .dev-requirements-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 5px 10px;
      gap: 6px;
    }
    .dev-requirements-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-foreground);
      flex-shrink: 0;
      opacity: 0.8;
    }
    .dev-requirements-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      flex: 1;
      min-width: 0;
    }
    .dev-requirements-header-actions input {
      flex: 1;
      padding: 3px 8px;
      border: 1px solid var(--vscode-input-border, rgba(128,128,128,0.35));
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      font-size: 11px;
      min-width: 0;
    }
    .dev-requirements-header-actions input:focus {
      outline: none;
      border-color: var(--vscode-focusBorder);
    }
    .dev-requirements-header-actions button {
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
      flex-shrink: 0;
    }
    .dev-requirements-header-actions button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .dev-requirements-toggle {
      background: transparent !important;
      border: none !important;
      color: var(--vscode-foreground) !important;
      font-size: 9px !important;
      opacity: 0.5;
      transition: transform 0.2s, opacity 0.15s;
    }
    .dev-requirements-toggle:hover {
      opacity: 1 !important;
      background: rgba(128,128,128,0.15) !important;
    }
    .dev-requirements-toggle.collapsed {
      transform: rotate(-90deg);
    }
    .dev-requirements-content {
      max-height: 160px;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      overflow-y: auto;
      transition: max-height 0.25s ease, padding 0.25s ease;
      border-top: 1px solid var(--vscode-widget-border, rgba(128,128,128,0.12));
    }
    .dev-requirements-content.collapsed {
      max-height: 0;
      padding: 0 8px;
      overflow: hidden;
      border-top-color: transparent;
    }
    .dev-requirements-list {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .dev-req-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid transparent;
      border-radius: 4px;
      font-size: 11px;
      transition: all 0.1s;
    }
    .dev-req-item:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-widget-border, rgba(128,128,128,0.15));
    }
    .dev-req-item input[type="checkbox"] {
      cursor: pointer;
      width: 13px;
      height: 13px;
      margin: 0;
      accent-color: var(--vscode-focusBorder);
    }
    .dev-req-item label {
      flex: 1;
      cursor: pointer;
      color: var(--vscode-foreground);
      user-select: none;
      line-height: 1.4;
    }
    .dev-req-item .dev-req-delete {
      background: transparent;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 14px;
      padding: 0 2px;
      opacity: 0;
      transition: opacity 0.1s, color 0.1s;
      line-height: 1;
    }
    .dev-req-item:hover .dev-req-delete {
      opacity: 0.5;
    }
    .dev-req-item .dev-req-delete:hover {
      opacity: 1;
      color: var(--vscode-errorForeground);
    }
  `;
}

