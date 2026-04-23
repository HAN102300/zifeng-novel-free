# 子风小说阅读 - 完整版部署指南

## 架构说明

本项目采用前后端分离架构：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   React 前端    │────▶│  Node.js 后端   │────▶│   书源网站      │
│  (端口 5173)    │◀────│  (端口 3001)    │◀────│  (各种小说站)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## 本地开发

### 1. 启动后端服务

```bash
cd server
npm install
npm start
```

后端服务将在 `http://localhost:3001` 启动。

### 2. 启动前端开发服务器

```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动，并自动代理 API 请求到后端。

## 生产部署

### 方案 1：同一服务器部署（推荐）

```bash
# 1. 构建前端
cd zifeng-novel-free
npm run build

# 2. 将 dist 文件夹复制到服务器
# 3. 在服务器上启动后端

cd server
npm install
npm start
```

修改 `server/index.js` 添加静态文件服务：

```js
// 在 app.listen 之前添加
app.use(express.static('../dist'));
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../dist/index.html'));
});
```

### 方案 2：Vercel + Railway 部署

#### 前端 (Vercel)

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 设置环境变量：`VITE_API_URL=https://your-backend.railway.app/api`

#### 后端 (Railway/Render)

1. 推送 `server` 文件夹到单独仓库
2. 在 Railway 部署
3. 设置环境变量：`PORT=3001`

### 方案 3：Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装后端依赖
COPY server/package*.json ./server/
RUN cd server && npm install

# 安装前端依赖并构建
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 复制构建产物
RUN cp -r dist server/public

WORKDIR /app/server

EXPOSE 3001

CMD ["node", "index.js"]
```

## 支持的规则类型

| 规则类型 | 支持度 | 说明 |
|---------|-------|------|
| JSONPath | ✅ 100% | `$.data[*]`, `$..field` |
| 模板 | ✅ 100% | `{{$.name}}` |
| CSS 选择器 | ✅ 100% | `.class@text`, `tag.name@href` |
| JS 规则 | ✅ 90% | `<js>...</js>`, `@js:...` |
| AES 解密 | ✅ 100% | `java.aesBase64DecodeToString` |
| Base64 | ✅ 100% | `java.base64Decode/Encode` |
| MD5/HMAC | ✅ 100% | `java.md5Encode`, `java.hmacMD5` |
| 同步请求 | ✅ 100% | `java.ajax()` |

## API 端点

- `GET /api/proxy?url=...` - 代理请求
- `POST /api/test-source` - 测试书源
- `POST /api/search` - 搜索书籍
- `POST /api/book-info` - 获取书籍详情
- `POST /api/toc` - 获取目录
- `POST /api/content` - 获取章节内容
- `GET /api/import-from-url?url=...` - 从 URL 导入书源

## 环境变量

### 前端

- `VITE_API_URL` - 后端 API 地址

### 后端

- `PORT` - 服务端口（默认 3001）

## 常见问题

### 1. 后端启动失败

检查端口 3001 是否被占用：
```bash
lsof -i :3001
```

### 2. 前端无法连接后端

确保 `.env.development` 中的 `VITE_API_URL` 正确，且后端已启动。

### 3. 书源测试失败

查看后端日志，检查目标网站是否可访问：
```bash
curl -I https://target-site.com
```

### 4. JS 规则执行失败

某些复杂的 JS 规则可能依赖浏览器环境，后端使用 Node.js 执行，可能有差异。

## 更新日志

### v2.0.0 - 完整后端支持

- ✅ 添加 Node.js 后端服务
- ✅ 支持完整 JS 规则执行
- ✅ 支持 CSS 选择器解析（cheerio）
- ✅ 支持 AES/MD5/HMAC 加密
- ✅ 解决 CORS 跨域问题
- ✅ 支持从 URL 导入书源
