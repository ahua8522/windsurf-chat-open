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
    private pendingCallback: ((response: any) => void) | null = null;

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
                    await this.onRequest(data);

                    this.pendingCallback = (response) => {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(response));
                    };

                    // Timeout handler
                    setTimeout(() => {
                        if (this.pendingCallback) {
                            this.pendingCallback({ action: 'error', error: 'Timed out waiting for user response', text: '', images: [] });
                            this.pendingCallback = null;
                        }
                    }, REQUEST_TIMEOUT_MS);

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

    public sendResponse(response: any) {
        if (this.pendingCallback) {
            this.pendingCallback(response);
            this.pendingCallback = null;
        }
    }

    public dispose() {
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
}
