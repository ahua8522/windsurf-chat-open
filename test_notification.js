const http = require('http');
const fs = require('fs');
const path = require('path');

// 读取端口文件
const workspacePath = process.cwd();
const portFile = path.join(workspacePath, '.windsurfchatopen', 'port');

let port = 34500;
if (fs.existsSync(portFile)) {
  port = parseInt(fs.readFileSync(portFile, 'utf-8'), 10);
}

console.log(`Testing notification on port ${port}...`);

// 发送测试请求
const data = JSON.stringify({
  prompt: '测试通知功能',
  requestId: 'test-' + Date.now()
});

const options = {
  hostname: '127.0.0.1',
  port: port,
  path: '/request',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  console.log(`Response status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`Response: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(data);
req.end();
