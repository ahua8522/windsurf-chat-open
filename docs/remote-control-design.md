# WindsurfChatOpen 远程控制方案设计

> 状态：待实现 | 创建时间：2025-01

## 1. 需求背景

当 AI 完成任务后，插件进入等待用户输入状态。用户可能不在电脑前，需要：
- **手机端接收通知**：知道 AI 已完成，等待下一步指令
- **手机端远程输入**：直接在手机上输入指令，启动新任务

## 2. 技术方案：PWA + WebSocket

### 2.1 整体架构

```
插件（电脑）                              手机（PWA）
┌──────────────────────┐              ┌──────────────────────┐
│  WebSocket Server    │◄── VPN ────►│  WebSocket Client     │
│  (ws://0.0.0.0:9527) │   内网连接   │                      │
│                      │              │  - 连接状态显示       │
│  AI完成 → 推送通知    │─────────────►│  - 通知列表 + 振动    │
│  收到指令 → 填入提交  │◄─────────────│  - 输入框 + 发送      │
└──────────────────────┘              └──────────────────────┘
```

### 2.2 通信协议

WebSocket 消息格式（JSON）：

**服务端 → 客户端（推送通知）：**
```json
{
  "type": "notification",
  "data": {
    "requestId": "xxx",
    "prompt": "AI 的提示内容",
    "timestamp": "2025-01-01T00:00:00Z",
    "project": "项目名称"
  }
}
```

**服务端 → 客户端（状态同步）：**
```json
{
  "type": "status",
  "data": {
    "isWaiting": true,
    "chatCount": 42,
    "project": "项目名称"
  }
}
```

**客户端 → 服务端（发送指令）：**
```json
{
  "type": "command",
  "data": {
    "text": "用户输入的指令",
    "requestId": "xxx"
  }
}
```

**客户端 → 服务端（心跳）：**
```json
{
  "type": "ping"
}
```

### 2.3 安全考虑

- WebSocket Server 仅监听 VPN 内网，不暴露到公网
- 可选：添加简单的 Token 认证（配置面板设置密钥）
- 可选：限制连接数（最多1-2个客户端）

## 3. 插件端改动

### 3.1 新增配置项

在设置面板添加：
- **WebSocket 端口**：默认 9527
- **认证密钥**：可选，用于客户端连接验证
- **启用/禁用开关**

### 3.2 新增模块：WebSocket Server

```
src/
  wsService.ts          # WebSocket 服务端逻辑
```

**主要功能：**
1. 启动 WebSocket Server（使用 Node.js 内置 `ws` 或 HTTP upgrade）
2. 管理客户端连接（心跳检测、断线重连）
3. AI 等待输入时推送通知到所有客户端
4. 接收客户端指令，转发给 ChatPanelProvider 处理

### 3.3 与现有模块集成

- `extension.ts`：初始化 WebSocket Server
- `chatPanel.ts`：AI 等待时通知 WebSocket Server 推送
- `panelScript.ts`：收到远程指令后填入输入框并提交

## 4. 手机端 PWA

### 4.1 技术栈

- 纯 HTML + CSS + JS（单文件或少量文件）
- WebSocket API（浏览器原生支持）
- Notification API + Vibration API（提醒）
- Service Worker（离线缓存 + 后台通知）
- localStorage（保存连接配置）

### 4.2 页面功能

1. **连接配置页**
   - 输入 WebSocket 地址（ws://电脑VPN内网IP:9527）
   - 输入认证密钥（可选）
   - 保存到 localStorage

2. **主页面**
   - 顶部：连接状态指示灯（绿色=已连接，红色=断开）
   - 中部：通知列表（时间、项目名、AI 提示内容）
   - 底部：输入框 + 发送按钮

3. **通知提醒**
   - 收到推送时振动（Vibration API）
   - 浏览器通知（Notification API）
   - 可选声音提醒

### 4.3 PWA 配置

- `manifest.json`：应用名称、图标、主题色
- `service-worker.js`：离线缓存、后台通知
- 支持"添加到主屏幕"

### 4.4 文件结构

```
mobile/
  index.html            # 主页面
  manifest.json         # PWA 配置
  service-worker.js     # Service Worker
  icon-192.png          # 应用图标
  icon-512.png          # 应用图标
```

## 5. 部署方式

### 方案 A：插件内置 HTTP 静态服务
- 插件启动时同时提供 HTTP 服务托管 PWA 文件
- 手机浏览器访问 `http://电脑VPN内网IP:9528` 即可
- 优点：零配置，开箱即用

### 方案 B：独立部署
- PWA 文件部署到任意静态服务器（或本地）
- 手机浏览器打开后配置 WebSocket 地址
- 优点：灵活，可自定义

**推荐方案 A**，插件一键启动，手机扫码连接。

## 6. 实现优先级

1. **P0**：WebSocket Server 基础通信 + 推送通知
2. **P0**：手机端 PWA 基础页面（连接 + 通知列表 + 输入）
3. **P1**：Token 认证
4. **P1**：PWA 离线缓存 + 添加到主屏幕
5. **P2**：历史记录
6. **P2**：多客户端管理

## 7. 依赖

- `ws` npm 包（WebSocket Server 实现）或使用 Node.js HTTP upgrade 自行实现
- 无其他外部依赖

## 8. 风险与注意事项

- iOS Safari 对 PWA 推送通知支持有限（iOS 16.4+ 才支持）
- VPN 断开时连接中断，需要自动重连机制
- WebSocket 长连接需要心跳保活
- 手机浏览器后台运行时 WebSocket 可能被系统杀死
