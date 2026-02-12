import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { LOCAL_DIR_NAME, RULE_MARKER } from './constants';

export class WorkspaceManager {
    constructor(private readonly extensionPath: string) { }

    public setup() {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
            vscode.window.showWarningMessage('Please open a workspace first');
            return;
        }

        const scriptSrc = path.join(this.extensionPath, 'lib', 'windsurf_chat.cjs');

        for (const folder of folders) {
            const workspacePath = folder.uri.fsPath;
            const localDir = path.join(workspacePath, LOCAL_DIR_NAME);

            // Create directory if not exists
            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }

            // Remove old .js script if exists (migration from v1.6.0 to v1.6.1+)
            const oldScriptPath = path.join(localDir, 'windsurf_chat.js');
            if (fs.existsSync(oldScriptPath)) {
                fs.unlinkSync(oldScriptPath);
                console.log(`[WindsurfChatOpen] Removed old script: ${oldScriptPath}`);
            }

            // Copy script to project directory (always overwrite to ensure latest version)
            const scriptDest = path.join(localDir, 'windsurf_chat.cjs');
            if (fs.existsSync(scriptSrc)) {
                fs.copyFileSync(scriptSrc, scriptDest);
            } else {
                console.error(`[WindsurfChatOpen] Script source not found: ${scriptSrc}`);
                vscode.window.showWarningMessage(`WindsurfChatOpen: Script file not found at ${scriptSrc}`);
            }

            // Generate or update .windsurfrules
            this.updateWindsurfRules(workspacePath);

            // Update .gitignore
            this.updateGitignore(workspacePath);

            // Generate project overview md (skip if already exists)
            this.generateProjectOverview(workspacePath, localDir);

            console.log(`[WindsurfChatOpen] Workspace setup complete for: ${localDir}`);
        }

        vscode.window.showInformationMessage('WindsurfChatOpen workspace initialization complete');
    }

    private updateWindsurfRules(workspacePath: string) {
        const rulesDest = path.join(workspacePath, '.windsurfrules');
        const rulesContent = this.generateRulesContent();

        // Always delete and recreate to ensure latest rules
        if (fs.existsSync(rulesDest)) {
            fs.unlinkSync(rulesDest);
        }
        fs.writeFileSync(rulesDest, rulesContent);
        console.log(`[WindsurfChatOpen] Created/Updated .windsurfrules`);
    }

    private updateGitignore(workspacePath: string) {
        const gitignorePath = path.join(workspacePath, '.gitignore');
        const ignoreEntries = [LOCAL_DIR_NAME + '/', '.windsurfrules'];

        if (fs.existsSync(gitignorePath)) {
            const content = fs.readFileSync(gitignorePath, 'utf-8');
            const entriesToAdd = ignoreEntries.filter(entry => !content.includes(entry));
            if (entriesToAdd.length > 0) {
                fs.appendFileSync(gitignorePath, '\n# WindsurfChatOpen\n' + entriesToAdd.join('\n') + '\n');
            }
        } else {
            fs.writeFileSync(gitignorePath, '# WindsurfChatOpen\n' + ignoreEntries.join('\n') + '\n');
        }
    }

    private generateRulesContent(): string {
        const scriptPath = `./${LOCAL_DIR_NAME}/windsurf_chat.cjs`;

        return `${RULE_MARKER}

=======================================================================
CRITICAL SYSTEM RULE - READ THIS FIRST
=======================================================================

YOU MUST CALL windsurf_chat SCRIPT BEFORE ENDING EVERY RESPONSE.
This is NOT optional. This is a MANDATORY system requirement.

=======================================================================

## SCRIPT COMMAND (MUST USE)

\`\`\`bash
node "${scriptPath}" "Task completion reason"
\`\`\`

**Important Notes:**
- Cwd parameter: Current workspace path
- Blocking: true
- SafeToAutoRun: true

**Script Return Value Handling:**
- \`User chose to continue\` → Continue execution
- \`User chose to end\` → End conversation immediately
- \`User instruction: xxx\` → Execute immediately
- \`User instruction: [Content too long, saved to file]\` → Use read_file to read
- \`User provided N images\` → Use read_file to read image files

## MANDATORY RULES

1. **Complete Output** - Do NOT use ellipsis
2. **Continuous Execution** - Complete tasks in one go
3. **End Confirmation** - Call script before ending
4. **Use Chinese** - 所有回复使用中文

## EXECUTION FLOW

1. Complete task
2. Call script with Blocking: true
3. Process script output
4. If user instruction, execute immediately

=======================================================================
ttrigger: always_on
alwaysApply: true
`;
    }

    private generateProjectOverview(workspacePath: string, localDir: string) {
        const overviewPath = path.join(localDir, 'project-overview.md');
        if (fs.existsSync(overviewPath)) {
            return; // 已存在则跳过
        }

        try {
            const projectName = path.basename(workspacePath);
            const lines: string[] = [];
            lines.push(`# ${projectName} 项目概述`);
            lines.push('');
            lines.push(`> 由 WindsurfChatOpen 自动生成于 ${new Date().toISOString()}`);
            lines.push('');

            // package.json
            const pkgPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
                    if (pkg.description) {
                        lines.push(`## 项目描述`);
                        lines.push('');
                        lines.push(pkg.description);
                        lines.push('');
                    }
                    lines.push(`## 技术栈`);
                    lines.push('');
                    const deps = Object.keys(pkg.dependencies || {});
                    const devDeps = Object.keys(pkg.devDependencies || {});
                    if (deps.length > 0) {
                        lines.push(`### 依赖`);
                        lines.push('');
                        deps.forEach(d => lines.push(`- ${d}`));
                        lines.push('');
                    }
                    if (devDeps.length > 0) {
                        lines.push(`### 开发依赖`);
                        lines.push('');
                        devDeps.forEach(d => lines.push(`- ${d}`));
                        lines.push('');
                    }
                } catch { /* ignore */ }
            }

            // requirements.txt
            const reqPath = path.join(workspacePath, 'requirements.txt');
            if (fs.existsSync(reqPath)) {
                try {
                    const content = fs.readFileSync(reqPath, 'utf-8').split('\n').filter(l => l.trim() && !l.startsWith('#'));
                    if (content.length > 0) {
                        lines.push(`## Python 依赖`);
                        lines.push('');
                        content.forEach(d => lines.push(`- ${d.trim()}`));
                        lines.push('');
                    }
                } catch { /* ignore */ }
            }

            // 顶层目录结构
            try {
                const entries = fs.readdirSync(workspacePath, { withFileTypes: true })
                    .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '__pycache__' && e.name !== 'dist' && e.name !== 'build')
                    .slice(0, 30);
                if (entries.length > 0) {
                    lines.push(`## 目录结构`);
                    lines.push('');
                    lines.push('```');
                    entries.forEach(e => {
                        lines.push(e.isDirectory() ? `${e.name}/` : e.name);
                    });
                    lines.push('```');
                    lines.push('');
                }
            } catch { /* ignore */ }

            fs.writeFileSync(overviewPath, lines.join('\n'), 'utf-8');
            console.log(`[WindsurfChatOpen] Generated project overview: ${overviewPath}`);
        } catch (e) {
            console.error(`[WindsurfChatOpen] Failed to generate project overview: ${e}`);
        }
    }
}
