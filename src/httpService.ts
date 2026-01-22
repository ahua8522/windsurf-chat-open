import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    BASE_PORT,
    MAX_PORT_ATTEMPTS,
    LOCAL_DIR_NAME,
    DEFAULT_REQUEST_TIMEOUT_MS,
    MAX_REQUEST_BODY_SIZE,
    ERROR_MESSAGES
} from './constants';

export interface RequestData {
    prompt: string;
    requestId: string;
    timeoutMinutes?: number;
}

interface ErrorResponse {
    action: 'error';
    error: string;
    text: string;
    images: string[];
}

export class HttpService {
    private server: http.Server | null = null;
    private port: number = 0;
    private pendingRequests: Map<string, { res: http.ServerResponse, timer: NodeJS.Timeout }> = new Map();
    private activeRequestId: string | null = null;
    private triedPorts: Set<number> = new Set();

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly onRequest: (data: RequestData) => Promise<void>
    ) { }

    public getPort(): number {
        return this.port;
    }

    public async start(): Promise<number> {
        this.cleanupAllPortFiles();
        this.server = http.createServer((req, res) => this.handleIncomingRequest(req, res));

        return new Promise((resolve, reject) => {
            this.tryListen(BASE_PORT, 0, resolve, reject);
        });
    }

    private cleanupAllPortFiles() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) return;

        for (const folder of folders) {
            const portFile = path.join(folder.uri.fsPath, LOCAL_DIR_NAME, 'port');
            if (fs.existsSync(portFile)) {
                try {
                    fs.unlinkSync(portFile);
                } catch (e) {
                    console.error(`[WindsurfChatOpen] Failed to delete port file in ${folder.name}: ${e}`);
                }
            }
        }
    }

    private tryListen(port: number, attempt: number, resolve: (port: number) => void, reject: (err: any) => void) {
        if (attempt >= MAX_PORT_ATTEMPTS) {
            reject(new Error('Could not find an available port'));
            return;
        }

        // 避免重复尝试相同端口
        if (this.triedPorts.has(port)) {
            const nextPort = this.getNextPort(port);
            this.tryListen(nextPort, attempt + 1, resolve, reject);
            return;
        }

        this.triedPorts.add(port);

        const onListenError = (err: any) => {
            if (err.code === 'EADDRINUSE') {
                const nextPort = this.getNextPort(port);
                this.tryListen(nextPort, attempt + 1, resolve, reject);
            } else {
                reject(err);
            }
        };

        this.server!.once('error', onListenError);

        this.server!.listen(port, '127.0.0.1', () => {
            this.server!.removeListener('error', onListenError);
            this.port = port;
            this.writePortFiles(port);
            resolve(port);
        });
    }

    private getNextPort(currentPort: number): number {
        let nextPort = currentPort + 1;
        if (nextPort > BASE_PORT + MAX_PORT_ATTEMPTS) {
            nextPort = BASE_PORT;
        }
        return nextPort;
    }

    public writePortFiles(port: number) {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) return;

        for (const folder of folders) {
            const workspacePath = folder.uri.fsPath;
            const localDir = path.join(workspacePath, LOCAL_DIR_NAME);
            const portFile = path.join(localDir, 'port');

            try {
                if (!fs.existsSync(localDir)) {
                    fs.mkdirSync(localDir, { recursive: true });
                }
                fs.writeFileSync(portFile, port.toString(), 'utf-8');
            } catch (e) {
                console.error(`[WindsurfChatOpen] Failed to write port file in ${folder.name}: ${e}`);
            }
        }
    }

    private handleIncomingRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        if (req.method === 'POST' && req.url === '/request') {
            let body = '';
            let bodySize = 0;

            req.on('data', chunk => {
                bodySize += chunk.length;
                if (bodySize > MAX_REQUEST_BODY_SIZE) {
                    req.destroy();
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Request body too large' }));
                    return;
                }
                body += chunk;
            });

            req.on('end', async () => {
                try {
                    const data = JSON.parse(body) as RequestData;

                    // 验证必需字段
                    if (!data.prompt || typeof data.prompt !== 'string') {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid prompt field' }));
                        return;
                    }

                    const requestId = this.validateRequestId(data.requestId);

                    // Clear any existing request with same ID, sending cancellation response
                    this.clearPendingRequest(requestId, true, this.createErrorResponse(ERROR_MESSAGES.REQUEST_SUPERSEDED));

                    this.activeRequestId = requestId;
                    await this.onRequest({ ...data, requestId });

                    // 计算超时时间：0 表示不限制，否则使用配置的分钟数
                    const timeoutMinutes = data.timeoutMinutes ?? (DEFAULT_REQUEST_TIMEOUT_MS / 60000);
                    const timeoutMs = timeoutMinutes === 0 ? 0 : timeoutMinutes * 60 * 1000;

                    let timer: NodeJS.Timeout | undefined;
                    if (timeoutMs > 0) {
                        timer = setTimeout(() => {
                            const pending = this.pendingRequests.get(requestId);
                            if (pending && !pending.res.writableEnded) {
                                pending.res.writeHead(200, { 'Content-Type': 'application/json' });
                                pending.res.end(JSON.stringify(this.createErrorResponse(ERROR_MESSAGES.REQUEST_TIMEOUT)));
                                this.pendingRequests.delete(requestId);
                            }
                        }, timeoutMs);
                    }

                    this.pendingRequests.set(requestId, { res, timer: timer! });

                } catch (e) {
                    if (!res.writableEnded) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: ERROR_MESSAGES.INVALID_JSON }));
                    }
                }
            });

            req.on('error', (err) => {
                console.error('[WindsurfChatOpen] Request error:', err);
                if (!res.writableEnded) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Request error' }));
                }
            });
        } else if (req.method === 'GET' && req.url === '/health') {
            res.writeHead(200);
            res.end('OK');
        } else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }

    private validateRequestId(requestId?: string): string {
        if (!requestId || typeof requestId !== 'string' || requestId.trim() === '') {
            return Date.now().toString();
        }
        return requestId.trim();
    }

    private createErrorResponse(error: string): ErrorResponse {
        return {
            action: 'error',
            error,
            text: '',
            images: []
        };
    }

    private clearPendingRequest(requestId: string, sendResponse: boolean = false, responseData?: ErrorResponse) {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
            if (pending.timer) {
                clearTimeout(pending.timer);
            }
            if (sendResponse && !pending.res.writableEnded) {
                try {
                    pending.res.writeHead(200, { 'Content-Type': 'application/json' });
                    pending.res.end(JSON.stringify(responseData || this.createErrorResponse(ERROR_MESSAGES.REQUEST_CANCELLED)));
                } catch (e) {
                    console.error('[WindsurfChatOpen] Failed to send response:', e);
                }
            }
            this.pendingRequests.delete(requestId);
        }
    }

    public sendResponse(response: any, requestId?: string) {
        const id = requestId || this.activeRequestId;
        if (id && this.pendingRequests.has(id)) {
            const pending = this.pendingRequests.get(id)!;
            if (!pending.res.writableEnded) {
                try {
                    pending.res.writeHead(200, { 'Content-Type': 'application/json' });
                    pending.res.end(JSON.stringify(response));
                } catch (e) {
                    console.error('[WindsurfChatOpen] Failed to send response:', e);
                }
            }
            this.clearPendingRequest(id);
            if (this.activeRequestId === id) {
                this.activeRequestId = null;
            }
        }
    }

    public dispose() {
        this.cleanupAllPortFiles();
        for (const requestId of Array.from(this.pendingRequests.keys())) {
            this.clearPendingRequest(requestId, true, this.createErrorResponse(ERROR_MESSAGES.EXTENSION_DEACTIVATED));
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
