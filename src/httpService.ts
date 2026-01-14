import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { BASE_PORT, MAX_PORT_ATTEMPTS, LOCAL_DIR_NAME, REQUEST_TIMEOUT_MS } from './constants';

export interface RequestData {
    prompt: string;
    requestId: string;
}

export class HttpService {
    private server: http.Server | null = null;
    private port: number = 0;
    private pendingRequests: Map<string, { res: http.ServerResponse, timer: NodeJS.Timeout }> = new Map();
    private activeRequestId: string | null = null;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly onRequest: (data: RequestData) => Promise<void>
    ) { }

    public async start(): Promise<number> {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            console.log('[WindsurfChatOpen] No workspace open, skipping HTTP server start');
            return 0;
        }

        const localDir = path.join(workspacePath, LOCAL_DIR_NAME);
        const portFile = path.join(localDir, 'port');

        this.cleanupPortFile(portFile);

        this.server = http.createServer((req, res) => this.handleIncomingRequest(req, res));

        return new Promise((resolve, reject) => {
            this.tryListen(BASE_PORT + Math.floor(Math.random() * MAX_PORT_ATTEMPTS), 0, resolve, reject);
        });
    }

    private cleanupPortFile(portFile: string) {
        if (fs.existsSync(portFile)) {
            try {
                fs.unlinkSync(portFile);
            } catch (e) {
                console.error(`[WindsurfChatOpen] Failed to delete old port file: ${e}`);
            }
        }
    }

    private tryListen(port: number, attempt: number, resolve: (port: number) => void, reject: (err: any) => void) {
        if (attempt >= MAX_PORT_ATTEMPTS) {
            reject(new Error('Could not find an available port'));
            return;
        }

        this.server!.once('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
                const nextPort = BASE_PORT + Math.floor(Math.random() * MAX_PORT_ATTEMPTS);
                this.tryListen(nextPort, attempt + 1, resolve, reject);
            } else {
                reject(err);
            }
        });

        this.server!.listen(port, '127.0.0.1', () => {
            this.port = port;
            this.writePortFile(port);
            resolve(port);
        });
    }

    private writePortFile(port: number) {
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) return;

        const localDir = path.join(workspacePath, LOCAL_DIR_NAME);
        const portFile = path.join(localDir, 'port');

        try {
            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }
            fs.writeFileSync(portFile, port.toString(), 'utf-8');
        } catch (e) {
            console.error(`[WindsurfChatOpen] Failed to write port file: ${e}`);
        }
    }

    private handleIncomingRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        if (req.method === 'POST' && req.url === '/request') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body) as RequestData;
                    const requestId = data.requestId || Date.now().toString();

                    // Clear any existing request with same ID
                    this.clearPendingRequest(requestId);

                    this.activeRequestId = requestId;
                    await this.onRequest(data);

                    const timeout = (typeof REQUEST_TIMEOUT_MS === 'number' && REQUEST_TIMEOUT_MS > 0)
                        ? REQUEST_TIMEOUT_MS
                        : 30 * 60 * 1000;

                    const timer = setTimeout(() => {
                        const pending = this.pendingRequests.get(requestId);
                        if (pending) {
                            pending.res.writeHead(200, { 'Content-Type': 'application/json' });
                            pending.res.end(JSON.stringify({
                                action: 'error',
                                error: 'Timed out waiting for user response',
                                text: '',
                                images: []
                            }));
                            this.pendingRequests.delete(requestId);
                        }
                    }, timeout);

                    this.pendingRequests.set(requestId, { res, timer });

                } catch (e) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Invalid JSON' }));
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

    private clearPendingRequest(requestId: string) {
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(requestId);
        }
    }

    public sendResponse(response: any) {
        const requestId = this.activeRequestId;
        if (requestId && this.pendingRequests.has(requestId)) {
            const pending = this.pendingRequests.get(requestId)!;
            pending.res.writeHead(200, { 'Content-Type': 'application/json' });
            pending.res.end(JSON.stringify(response));
            this.clearPendingRequest(requestId);
            if (this.activeRequestId === requestId) {
                this.activeRequestId = null;
            }
        }
    }

    public dispose() {
        for (const requestId of Array.from(this.pendingRequests.keys())) {
            this.clearPendingRequest(requestId);
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
