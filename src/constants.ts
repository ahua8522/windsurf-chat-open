export const LOCAL_DIR_NAME = '.windsurfchatopen';
export const BASE_PORT = 34500;
export const MAX_PORT_ATTEMPTS = 100;
export const REQUEST_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const TEMP_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
export const WEBVIEW_READY_TIMEOUT_MS = 5000;
export const LONG_TEXT_THRESHOLD = 500;

export const COMMANDS = {
    FOCUS: 'windsurfChatOpen.focus',
    SETUP: 'windsurfChatOpen.setup',
    PANEL_FOCUS: 'windsurfChatOpen.panel.focus'
};

export const VIEWS = {
    PANEL: 'windsurfChatOpen.panel'
};

export const RULE_MARKER = '<!-- WINDSURF_CHAT_OPEN_V1 -->';
