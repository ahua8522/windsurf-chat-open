#!/usr/bin/env node
/**
 * WindsurfChat CLI - 纯终端交互版本
 * 不需要 VS Code 插件，直接在终端进行人机对话。
 * 
 * 使用方法:
 * node lib/windsurf_chat_cli.js "你的问题是什么？"
 */

const readline = require('readline');

// ANSI 颜色代码
const COLORS = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Cyan: "\x1b[36m",
    Red: "\x1b[31m"
};

function askQuestion(promptText) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        // 打印分割线和问题
        console.log('\n' + COLORS.Cyan + '━'.repeat(50) + COLORS.Reset);
        console.log(COLORS.Bright + COLORS.Green + '🤖 AI 请求反馈:' + COLORS.Reset);
        console.log(COLORS.Bright + promptText + COLORS.Reset);
        console.log(COLORS.Cyan + '━'.repeat(50) + COLORS.Reset);
        console.log(COLORS.Yellow + '👉 请输入指令 (按两次回车结束输入):' + COLORS.Reset);

        let lines = [];
        let emptyLineCount = 0;

        rl.prompt();

        rl.on('line', (line) => {
            if (line.trim() === '') {
                emptyLineCount++;
            } else {
                emptyLineCount = 0;
            }

            // 连续两次回车视为结束（或输入 explicit 结束符）
            if (emptyLineCount >= 1 || line.trim() === '/end') {
                rl.close();
                return;
            }

            lines.push(line);
        });

        rl.on('close', () => {
            const fullText = lines.join('\n').trim();
            console.log(COLORS.Cyan + '━'.repeat(50) + COLORS.Reset);

            if (!fullText) {
                // 如果用户没输入直接退出了，视为 Continue
                resolve({
                    action: 'continue',
                    text: '',
                    images: []
                });
            } else if (fullText.toLowerCase() === 'end' || fullText.toLowerCase() === 'exit') {
                resolve({
                    action: 'end',
                    text: '',
                    images: []
                });
            } else {
                resolve({
                    action: 'instruction',
                    text: fullText,
                    images: []
                });
            }
        });
    });
}

function formatOutput(response) {
    // 保持与 windsurf_chat.js 相同的输出格式以便 AI 解析
    const { action, text } = response;

    if (action === 'end') {
        return 'User chose to end';
    }

    if (action === 'continue' && !text) {
        return 'User chose to continue';
    }

    let output = 'User chose to continue\n';
    if (text) {
        output += `User instruction: ${text}`;
    }
    return output;
}

async function main() {
    const prompt = process.argv.slice(2).join(' ') || '等待用户反馈';

    // 调用交互函数
    const response = await askQuestion(prompt);

    // 输出 AI 可读的标准格式
    const output = formatOutput(response);
    console.log(output);
}

main().catch(console.error);
