# 数据截断问题修复说明

## 问题描述
插件在输入数据到控制台时，有时会出现数据被截断的情况，特别是包含中文或长文本时。

## 根本原因
在 HTTP 数据传输过程中，使用字符串拼接 (`body += chunk`) 处理 Buffer 数据流会导致：

1. **多字节字符截断**：当 UTF-8 编码的中文字符（3字节）被分割到不同的数据块时，直接拼接会导致字符损坏
2. **编码转换问题**：Buffer 隐式转换为字符串时可能丢失数据

## 修复内容

### 1. 服务端修复 (`src/httpService.ts`)
**修改前：**
```typescript
let body = '';
req.on('data', chunk => body += chunk);
req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf-8');
    // ...
});
```

**修改后：**
```typescript
const chunks: Buffer[] = [];
req.on('data', chunk => chunks.push(Buffer.from(chunk)));
req.on('end', async () => {
    const body = Buffer.concat(chunks).toString('utf-8');
    // ...
});
```

### 2. 客户端修复 (`lib/windsurf_chat.cjs`)
**修改前：**
```javascript
let body = '';
res.on('data', chunk => body += chunk);
res.on('end', () => {
    resolve(JSON.parse(body));
});
```

**修改后：**
```javascript
const chunks = [];
res.on('data', chunk => chunks.push(Buffer.from(chunk)));
res.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf-8');
    resolve(JSON.parse(body));
});
```

### 3. 服务端响应修复 (`src/httpService.ts` sendResponse方法)
**修改前：**
```typescript
pending.res.writeHead(200, { 'Content-Type': 'application/json' });
pending.res.end(JSON.stringify(response));
```

**修改后：**
```typescript
const jsonData = JSON.stringify(response);
const buffer = Buffer.from(jsonData, 'utf-8');
pending.res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buffer.length
});
pending.res.end(buffer);
```

### 4. 改进错误日志
- 增加响应长度信息
- 将错误日志截断长度从 200 增加到 500 字符

## 技术原理

### 正确的 HTTP 数据接收流程：
1. 创建 Buffer 数组存储所有数据块
2. 使用 `Buffer.from(chunk)` 确保每个块都是 Buffer 对象
3. 使用 `Buffer.concat()` 合并所有块
4. 最后统一使用 `toString('utf-8')` 转换为字符串

### 为什么这样能避免截断：
- Buffer.concat() 在字节级别合并数据，不会破坏多字节字符
- 统一转换确保完整的 UTF-8 解码过程
- 避免了中间状态的隐式类型转换

## 测试建议
1. 发送包含大量中文的长文本（>1000字符）
2. 发送包含特殊 Unicode 字符的文本
3. 测试快速连续的多个请求

## 影响范围
- ✅ 修复了中文字符截断问题
- ✅ 修复了长文本传输问题
- ✅ 提高了错误诊断能力
- ✅ 无性能影响（Buffer 操作是高效的）
