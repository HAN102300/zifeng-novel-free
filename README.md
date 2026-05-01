<div align="center">

# 🌸 紫枫免费小说

**一款现代化开源小说阅读器 — 聚合多书源，沉浸式阅读，自由无界**

[![Stars](https://img.shields.io/github/stars/HAN102300/zifeng-novel-free?style=for-the-badge&label=⭐%20Stars)](https://github.com/HAN102300/zifeng-novel-free/stargazers)
[![Forks](https://img.shields.io/github/forks/HAN102300/zifeng-novel-free?style=for-the-badge)](https://github.com/HAN102300/zifeng-novel-free/network)
[![License](https://img.shields.io/github/license/HAN102300/zifeng-novel-free?style=for-the-badge)](https://github.com/HAN102300/zifeng-novel-free/blob/main/LICENSE)
[![Issues](https://img.shields.io/github/issues/HAN102300/zifeng-novel-free?style=for-the-badge)](https://github.com/HAN102300/zifeng-novel-free/issues)

<br/>

<img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
<img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white" />
<img src="https://img.shields.io/badge/Ant_Design-6-0170FE?style=flat-square&logo=antdesign&logoColor=white" />
<img src="https://img.shields.io/badge/Spring_Boot-3.2-6DB33F?style=flat-square&logo=springboot&logoColor=white" />
<img src="https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express&logoColor=white" />
<img src="https://img.shields.io/badge/MySQL-8-4479A1?style=flat-square&logo=mysql&logoColor=white" />
<img src="https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white" />
<img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white" />

</div>

---

## ✨ 为什么选择紫枫？

<table>
<tr>
<td width="33%" valign="top">

### 🔍 聚合搜索
多书源并行检索，一键触达全网小说。支持 API、HTML、JS 脚本等多种解析规则。

</td>
<td width="33%" valign="top">

### 📖 沉浸阅读
8 种阅读主题、自由调节字体/行距/背景、章节缓存预加载，打造极致阅读体验。

</td>
<td width="33%" valign="top">

### 🏗️ 全栈架构
前后端分离 + 独立解析引擎，Spring Boot + React + Express 三端协同，Docker 一键部署。

</td>
</tr>
</table>

---

## 🖼️ 功能一览

<table>
<tr>
<th>🏠 首页推荐</th>
<th>📖 沉浸阅读</th>
</tr>
<tr>
<td>

- 热门榜单实时更新
- 分类导航快速探索
- 个性化书籍推荐
- Framer Motion 流畅动画

</td>
<td>

- 8 种阅读主题（暗夜/护眼/羊皮纸...）
- 字体大小 / 行间距 / 列宽自由调节
- 章节缓存 + 离线续读
- 阅读进度云端同步

</td>
</tr>
<tr>
<th>📚 智能书架</th>
<th>⚙️ 书源管理</th>
</tr>
<tr>
<td>

- 收藏管理 + 进度追踪
- 阅读历史自动记录
- 精美进度条可视化
- 一键续读上次章节

</td>
<td>

- 自定义书源规则
- JSON / 在线导入导出
- 启用 / 禁用独立控制
- 兼容 Legado 书源格式

</td>
</tr>
</table>

---

## 🏗️ 项目架构

```
zifeng-novel-free/
├── zifeng-web/          🎨 用户前端      React 19 + Ant Design 6 + Vite 8
├── zifeng-admin/        🛠️ 管理后台      React 19 + Ant Design 6 + Vite 8
├── zifeng-server/       ☕ 后端服务       Spring Boot 3.2 + JPA + Sa-Token
└── zifeng-parser/       ⚡ 解析引擎       Express + Cheerio + Puppeteer
```

### 服务端口

| 服务 | 端口 | 说明 |
|:-----|:-----|:-----|
| zifeng-web | `5173` | 用户前端 |
| zifeng-admin | `3002` | 管理后台 |
| zifeng-server | `8080` | Spring Boot API |
| zifeng-parser | `3001` | 解析引擎 |

### 后端模块

| 模块 | 职责 |
|:-----|:-----|
| `module-user` | 用户认证、书架管理、阅读进度 |
| `module-source` | 书源 CRUD、导入导出 |
| `module-parse` | 解析代理、缓存策略 |
| `module-admin` | 系统管理、数据统计 |

---

## 🔧 技术亮点

### 前端

- **React 19** — 最新并发特性，极速渲染
- **Ant Design 6** — 企业级 UI 组件，精美交互
- **Framer Motion** — 丝滑页面过渡与微动画
- **Vite 8** — 毫秒级 HMR，闪电构建

### 后端

- **Spring Boot 3.2** — Java 17+，现代化后端框架
- **Sa-Token** — 轻量级权限认证，支持多端登录
- **Spring Data JPA** — 优雅的数据持久层
- **Redis** — 会话缓存 + 热数据加速

### 解析引擎

- **Cheerio** — HTML DOM 高速解析
- **Puppeteer** — 动态页面渲染，突破 JS 反爬
- **JSONPath + XPath + CSS Selector** — 三重规则引擎
- **crypto-js** — AES / MD5 内容解密
- **opencc-js** — 繁简中文自动转换

---

## 🌐 书源解析能力

| 规则类型 | 支持度 | 引擎 | 典型场景 |
|:---------|:-------|:-----|:---------|
| **API 接口** | ✅ 完整 | JSONPath + 模板引擎 | RESTful 小说站 |
| **HTML 页面** | ✅ 完整 | CSS 选择器 + Cheerio | 传统网页站点 |
| **JS 动态页** | ✅ 完整 | Puppeteer + 沙箱执行 | SPA / 反爬站点 |
| **加密内容** | ✅ 完整 | AES / MD5 / Base64 | 加密小说源 |
| **登录站点** | ✅ 完整 | Cookie 管理 + 自动化 | 需认证的聚合站 |

---

## 🚀 快速开始

### 前置要求

| 依赖 | 版本 | 用途 |
|:-----|:-----|:-----|
| Node.js | 18+ | 前端 & 解析引擎 |
| Java | 17+ | Spring Boot 后端 |
| Maven | 3.8+ | Java 项目构建 |
| MySQL | 8.0+ | 数据存储 |
| Redis | 7+ | 缓存 & 会话 |

### 方式一：一键启动（推荐）

```bash
git clone https://github.com/HAN102300/zifeng-novel-free.git
cd zifeng-novel-free

# Linux / macOS
./start-dev.sh

# Windows
start-dev.bat
```

### 方式二：手动启动

```bash
# 1. 解析引擎
cd zifeng-parser && npm install && npm start

# 2. Spring Boot 后端（新终端）
cd zifeng-server && mvn spring-boot:run

# 3. 用户前端（新终端）
cd zifeng-web && npm install && npm run dev

# 4. 管理后台（新终端）
cd zifeng-admin && npm install && npm run dev
```

### 方式三：Docker Compose 生产部署

```bash
cd deploy

# 配置环境变量
cp .env.production.template .env.production
# 编辑 .env.production 填入实际配置

# 启动全部 7 个服务
docker-compose -f docker-compose.prod.yml up -d
```

Docker Compose 包含：**Nginx 网关 + Spring Boot + Parser + Web + Admin + MySQL + Redis**

### 数据库初始化

确保 MySQL 已启动，创建数据库：

```sql
CREATE DATABASE zifeng_novel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 📁 环境配置

| 配置文件 | 说明 |
|:---------|:-----|
| `zifeng-server/src/main/resources/application.yml` | Spring Boot 主配置 |
| `zifeng-server/src/main/resources/application-prod.yml` | 生产环境配置 |
| `.env.development` | 前端开发环境变量 |
| `deploy/.env.production.template` | 生产部署环境变量模板 |

---

## 🐳 生产部署架构

```
                    ┌──────────────┐
                    │   Nginx 网关  │ :80 / :443
                    │  (SSL + 路由) │
                    └──────┬───────┘
               ┌───────────┼───────────┐
               ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   Web    │ │  Admin   │ │  Server  │ :8080
        │ (静态站)  │ │ (静态站)  │ │ Spring   │
        └──────────┘ └──────────┘ └─────┬────┘
                                       │
                              ┌────────┼────────┐
                              ▼        ▼        ▼
                        ┌─────────┐ ┌──────┐ ┌────────┐
                        │ Parser  │ │MySQL │ │ Redis  │
                        │ :3001   │ │ :3306│ │ :6379  │
                        └─────────┘ └──────┘ └────────┘
```

---

## 🤝 参与贡献

1. **Fork** 本仓库
2. 创建特性分支 `git checkout -b feature/AmazingFeature`
3. 提交更改 `git commit -m 'Add some AmazingFeature'`
4. 推送分支 `git push origin feature/AmazingFeature`
5. 提交 **Pull Request**

### 贡献方向

| 方向 | 说明 |
|:-----|:-----|
| 📚 书源规则 | 分享优质书源，完善解析规则 |
| 🎨 界面优化 | 改进 UI/UX，提升阅读体验 |
| ⚡ 性能优化 | 加载速度、资源占用、缓存策略 |
| 🐛 Bug 修复 | 已知问题修复，稳定性增强 |
| 🌐 国际化 | 多语言支持 |
| 🔧 新功能 | TTS 朗读、离线下载、社交分享等 |

---

## 📄 开源协议

本项目基于 **MIT License** 开源 — 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

### 技术栈

**前端** — [React](https://react.dev/) · [Vite](https://vitejs.dev/) · [Ant Design](https://ant.design/) · [Framer Motion](https://motion.dev/) · [Axios](https://axios-http.com/)

**后端** — [Spring Boot](https://spring.io/projects/spring-boot) · [Sa-Token](https://sa-token.cc/) · [Spring Data JPA](https://spring.io/projects/spring-data-jpa) · [Lombok](https://projectlombok.org/)

**解析引擎** — [Express](https://expressjs.com/) · [Cheerio](https://cheerio.js.org/) · [Puppeteer](https://pptr.dev/) · [crypto-js](https://github.com/brix/crypto-js) · [opencc-js](https://github.com/nicktomlin/opencc-js)

### 灵感来源

- [Legado](https://github.com/gedoor/legado) — 开源阅读 App
- [阅读](https://github.com/evorion/iread) — 小说阅读器

### 贡献者

<a href="https://github.com/HAN102300/zifeng-novel-free/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=HAN102300/zifeng-novel-free" />
</a>

---

## 📞 联系我们

- 🐛 **Bug 反馈**：[GitHub Issues](https://github.com/HAN102300/zifeng-novel-free/issues)
- 💡 **功能建议**：[GitHub Discussions](https://github.com/HAN102300/zifeng-novel-free/discussions)
- 📧 **邮件**：2692528141@qq.com

---

<div align="center">

**如果这个项目对你有帮助，给个 ⭐ Star 支持一下吧！**

[![Star](https://img.shields.io/github/stars/HAN102300/zifeng-novel-free?style=social)](https://github.com/HAN102300/zifeng-novel-free/stargazers)
[![Fork](https://img.shields.io/github/forks/HAN102300/zifeng-novel-free?style=social)](https://github.com/HAN102300/zifeng-novel-free/network)

*让阅读成为享受，让知识自由流动* 🌸

</div>
