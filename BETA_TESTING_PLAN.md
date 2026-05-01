# 紫枫免费小说 - 对外开放内测方案设计文档

> 版本: 1.0.0 | 日期: 2026-04-29 | 作者: DevOps Team

---

## 目录

- [一、项目架构概览](#一项目架构概览)
- [二、方案A - 局域网内测方案（<50人）](#二方案a---局域网内测方案50人)
- [三、方案B - 云服务器内测方案（50-500人）](#三方案b---云服务器内测方案50-500人)
- [四、方案C - 全功能公测方案（500+人）](#四方案c---全功能公测方案500人)
- [五、通用设计](#五通用设计)

---

## 一、项目架构概览

### 1.1 服务组件

| 服务 | 技术栈 | 端口 | 说明 |
|------|--------|------|------|
| zifeng-server | SpringBoot 3.2.5 + Java 17 + Sa-Token 1.39.0 | 8080 | 主后端服务（用户/管理/书源/解析代理） |
| zifeng-parser | Express + Node.js | 3001 | 小说内容解析引擎 |
| zifeng-web | React 19 + Vite 8 + Antd 6 | 5173 | 用户前端 |
| zifeng-admin | React 19 + Vite 8 + Antd 6 | 3002 | 管理后台 |
| MySQL | 8.0 | 3306 | 数据库 |
| Redis | 7-alpine | 6379 | 缓存/会话 |

### 1.2 请求路由

```
用户浏览器
  |
  +-- zifeng-web (5173)
  |     |-- /api/search, /api/content, /api/toc, /api/explore ... --> zifeng-parser (3001)
  |     |-- /api/auth, /api/bookshelf, /api/reading, /api/sources ... --> zifeng-server (8080)
  |
  +-- zifeng-admin (3002)
        |-- /api/admin/** --> zifeng-server (8080)
        |-- /api/search, /api/content ... --> zifeng-parser (3001)
```

### 1.3 认证体系

- **用户认证**: Sa-Token StpUtil, token名 `zifeng_token`, UUID风格, Cookie-Off/Header-On
- **管理员认证**: Sa-Token StpAdminUtil, 独立登录体系, 验证码保护
- **公开接口**: `/api/auth/register`, `/api/auth/login`, `/api/sources/public/**`, `/api/parse/**`, `/api/public/**`

---

## 二、方案A - 局域网内测方案（<50人）

### 2.1 适用场景

- 团队内部测试、朋友间小范围体验
- 无需云服务器，开发机即可部署
- 快速验证核心功能，收集第一轮反馈

### 2.2 局域网部署配置

#### 2.2.1 Vite 开发服务器配置 - 开放局域网访问

**zifeng-web/vite.config.js** 修改:

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: "0.0.0.0",  // 监听所有网络接口，允许局域网访问
    proxy: {
      "/api/search": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/test-source": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/book-info": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/toc": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/content": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/explore": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/proxy": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/import-from-url": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/import-from-json": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/health": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
      "/api/auth": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api/bookshelf": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api/reading": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api/sources": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api/parse": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/api/user": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

**zifeng-admin/vite.config.js** 修改:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    host: "0.0.0.0",  // 监听所有网络接口
    proxy: {
      // ... 保持原有代理配置不变
    },
  },
})
```

#### 2.2.2 后端 CORS 配置 - 允许局域网来源

**zifeng-server/src/main/java/com/zifeng/config/CorsConfig.java** 修改:

```java
package com.zifeng.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins.split(","))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
```

**application.yml** 中 CORS 配置修改:

```yaml
app:
  cors:
    # 局域网模式：使用你本机的局域网IP（如 192.168.1.100）
    # 同时保留 localhost 以便本机调试
    allowed-origins: "http://localhost:3002,http://localhost:5173,http://127.0.0.1:3002,http://127.0.0.1:5173,http://192.168.1.100:5173,http://192.168.1.100:3002"
```

#### 2.2.3 Parser CORS 配置

**zifeng-parser** 启动时设置环境变量:

```bash
# Windows
set CORS_ORIGINS=http://localhost:5173,http://localhost:3002,http://192.168.1.100:5173,http://192.168.1.100:3002
node index.js

# Linux/macOS
CORS_ORIGINS=http://localhost:5173,http://localhost:3002,http://192.168.1.100:5173,http://192.168.1.100:3002 node index.js
```

#### 2.2.4 Windows 防火墙规则

```powershell
# 以管理员身份运行 PowerShell

# 允许 Vite 开发服务器端口
New-NetFirewallRule -DisplayName "Zifeng Web Dev" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow

# 允许管理后台端口
New-NetFirewallRule -DisplayName "Zifeng Admin Dev" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow

# 允许后端服务端口
New-NetFirewallRule -DisplayName "Zifeng Server" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow

# 允许解析引擎端口
New-NetFirewallRule -DisplayName "Zifeng Parser" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# 查看规则
Get-NetFirewallRule -DisplayName "Zifeng*" | Format-Table DisplayName, Enabled, Direction, Action
```

#### 2.2.5 获取本机局域网 IP

```powershell
# Windows
ipconfig | findstr /i "IPv4"

# 输出示例:
# IPv4 地址 . . . . . . . . . . . . : 192.168.1.100
```

### 2.3 局域网内测操作指南

#### 2.3.1 部署步骤

```bash
# 1. 启动基础设施（MySQL + Redis）
cd zifeng-server
docker-compose up -d

# 2. 启动解析引擎
cd zifeng-parser
npm install
set CORS_ORIGINS=http://192.168.1.100:5173,http://192.168.1.100:3002
npm run dev

# 3. 启动后端服务
cd zifeng-server
mvn spring-boot:run

# 4. 启动用户前端
cd zifeng-web
npm install
npm run dev

# 5. 启动管理后台
cd zifeng-admin
npm install
npm run dev
```

#### 2.3.2 测试人员访问方式

| 服务 | 访问地址 |
|------|----------|
| 用户前端 | `http://192.168.1.100:5173` |
| 管理后台 | `http://192.168.1.100:3002` |

#### 2.3.3 内测注意事项

1. 所有测试人员需在同一局域网内（同一WiFi或有线网络）
2. 确保主机未开启"公用网络"防火墙模式
3. 如使用虚拟机，网络模式需选"桥接"而非"NAT"
4. 建议使用 Chrome/Edge 最新版浏览器
5. 移动端测试需确保手机与电脑在同一网络

---

## 三、方案B - 云服务器内测方案（50-500人）

### 3.1 服务器选型建议

| 规模 | CPU | 内存 | 磁盘 | 带宽 | 参考配置 |
|------|-----|------|------|------|----------|
| 50人 | 2C | 4G | 50G SSD | 5Mbps | 阿里云 ecs.t6-c1m2.large |
| 200人 | 4C | 8G | 100G SSD | 10Mbps | 阿里云 ecs.c6.large |
| 500人 | 4C | 16G | 200G SSD | 20Mbps | 阿里云 ecs.c6.xlarge |

### 3.2 Docker Compose 生产部署配置

#### 3.2.1 完整的 docker-compose.prod.yml

在项目根目录创建 `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # ============ 基础设施 ============
  mysql:
    image: mysql:8.0
    container_name: zifeng-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-zifeng_prod_2026}
      MYSQL_DATABASE: zifeng_novel
      MYSQL_CHARACTER_SET_SERVER: utf8mb4
      MYSQL_COLLATION_SERVER: utf8mb4_unicode_ci
    ports:
      - "127.0.0.1:3306:3306"  # 仅本地访问，不暴露到外网
    volumes:
      - mysql_data:/var/lib/mysql
    command: >
      --default-authentication-plugin=mysql_native_password
      --max-connections=200
      --innodb-buffer-pool-size=512M
      --slow-query-log=ON
      --long-query-time=2
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - zifeng-net

  redis:
    image: redis:7-alpine
    container_name: zifeng-redis
    restart: always
    ports:
      - "127.0.0.1:6379:6379"  # 仅本地访问
    volumes:
      - redis_data:/data
    command: >
      redis-server
      --appendonly yes
      --requirepass ${REDIS_PASSWORD:-zifeng_redis_2026}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-zifeng_redis_2026}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - zifeng-net

  # ============ 后端服务 ============
  zifeng-server:
    build:
      context: ./zifeng-server
      dockerfile: Dockerfile
    container_name: zifeng-server
    restart: always
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/zifeng_novel?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: ${MYSQL_ROOT_PASSWORD:-zifeng_prod_2026}
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      SPRING_DATA_REDIS_PASSWORD: ${REDIS_PASSWORD:-zifeng_redis_2026}
      PARSING_SERVER_URL: http://zifeng-parser:3001
      APP_CORS_ALLOWED_ORIGINS: "https://${DOMAIN:-novel.example.com},https://admin.${DOMAIN:-novel.example.com}"
      SA_TOKEN_TIMEOUT: 7200
      BETA_MODE: "true"
      INVITE_CODE_REQUIRED: "true"
    ports:
      - "127.0.0.1:8080:8080"
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - avatar_uploads:/app/uploads/avatars
    networks:
      - zifeng-net

  # ============ 解析引擎 ============
  zifeng-parser:
    build:
      context: ./zifeng-parser
      dockerfile: Dockerfile
    container_name: zifeng-parser
    restart: always
    environment:
      PORT: 3001
      CORS_ORIGINS: "https://${DOMAIN:-novel.example.com},https://admin.${DOMAIN:-novel.example.com}"
    ports:
      - "127.0.0.1:3001:3001"
    networks:
      - zifeng-net

  # ============ Nginx 反向代理 ============
  nginx:
    image: nginx:1.25-alpine
    container_name: zifeng-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
      - certbot-www:/var/www/certbot
      - zifeng-web-dist:/usr/share/nginx/html/web
      - zifeng-admin-dist:/usr/share/nginx/html/admin
    depends_on:
      - zifeng-server
      - zifeng-parser
    networks:
      - zifeng-net

  # ============ Certbot (Let's Encrypt) ============
  certbot:
    image: certbot/certbot
    container_name: zifeng-certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - certbot-www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  mysql_data:
  redis_data:
  avatar_uploads:
  certbot-www:
  zifeng-web-dist:
  zifeng-admin-dist:

networks:
  zifeng-net:
    driver: bridge
```

#### 3.2.2 zifeng-server Dockerfile

在 `zifeng-server/` 目录创建 `Dockerfile`:

```dockerfile
# 多阶段构建
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/zifeng-novel-backend-1.0.0.jar app.jar

# 创建上传目录
RUN mkdir -p /app/uploads/avatars

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

#### 3.2.3 zifeng-parser Dockerfile

在 `zifeng-parser/` 目录创建 `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "index.js"]
```

#### 3.2.4 生产环境 .env 文件

在项目根目录创建 `.env.prod`:

```bash
# 域名配置
DOMAIN=novel.example.com

# 数据库密码（务必修改为强密码）
MYSQL_ROOT_PASSWORD=YourStrongPassword123!

# Redis密码
REDIS_PASSWORD=YourRedisPassword456!

# 服务器配置
BETA_MODE=true
INVITE_CODE_REQUIRED=true
```

### 3.3 Nginx 反向代理和 HTTPS 配置

#### 3.3.1 目录结构

```
nginx/
  conf.d/
    zifeng.conf
  ssl/           # Let's Encrypt 证书目录
  logs/          # 日志目录
```

#### 3.3.2 Nginx 配置文件

`nginx/conf.d/zifeng.conf`:

```nginx
# 速率限制区域定义
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=global_limit:10m rate=60r/s;

# 连接数限制
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# 用户前端
server {
    listen 80;
    server_name novel.example.com;

    # Let's Encrypt 验证
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # HTTP -> HTTPS 重定向
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name novel.example.com;

    # SSL 证书
    ssl_certificate /etc/nginx/ssl/live/novel.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/novel.example.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 前端静态文件
    root /usr/share/nginx/html/web;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;

    # 静态资源缓存
    location /assets/ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # API 代理 - 解析引擎路由
    location /api/search {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    location /api/test-source {
        limit_req zone=api_limit burst=10 nodelay;
        limit_conn conn_limit 5;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }

    location /api/book-info {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/toc {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/content {
        limit_req zone=api_limit burst=30 nodelay;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/explore {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/proxy {
        limit_req zone=api_limit burst=10 nodelay;
        limit_conn conn_limit 3;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/import-from-url {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/import-from-json {
        limit_req zone=api_limit burst=5 nodelay;
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/health {
        proxy_pass http://zifeng-parser:3001;
        proxy_set_header Host $host;
    }

    # API 代理 - 后端服务路由（认证限流更严格）
    location /api/auth/login {
        limit_req zone=auth_limit burst=3 nodelay;
        limit_req zone=global_limit burst=10 nodelay;
        proxy_pass http://zifeng-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/auth/register {
        limit_req zone=auth_limit burst=2 nodelay;
        limit_req zone=global_limit burst=10 nodelay;
        proxy_pass http://zifeng-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 通用 API 代理
    location /api/ {
        limit_req zone=api_limit burst=20 nodelay;
        limit_conn conn_limit 10;
        proxy_pass http://zifeng-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA 路由回退
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
    }
}

# 管理后台
server {
    listen 80;
    server_name admin.novel.example.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name admin.novel.example.com;

    ssl_certificate /etc/nginx/ssl/live/novel.example.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/novel.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # IP 白名单（仅允许管理员IP访问）
    # allow 1.2.3.4;       # 管理员IP
    # allow 5.6.7.8;       # 备用管理员IP
    # deny all;

    root /usr/share/nginx/html/admin;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    # 管理后台API代理
    location /api/ {
        limit_req zone=auth_limit burst=5 nodelay;
        limit_conn conn_limit 5;
        proxy_pass http://zifeng-server:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ /\. {
        deny all;
    }
}
```

#### 3.3.3 Let's Encrypt 证书申请

```bash
# 首次申请证书（先启动 nginx 的 HTTP 模式）
# 1. 先创建仅 HTTP 的 nginx 配置
mkdir -p nginx/ssl nginx/logs

# 2. 启动 certbot 容器申请证书
docker run -it --rm \
  -v ./nginx/ssl:/etc/letsencrypt \
  -v certbot-www:/var/www/certbot \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@example.com \
  --agree-tos \
  --no-eff-email \
  -d novel.example.com \
  -d admin.novel.example.com

# 3. 证书自动续期已通过 certbot 容器处理
```

### 3.4 邀请码注册机制设计

#### 3.4.1 数据库表设计

```sql
-- 邀请码表
CREATE TABLE invite_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE COMMENT '邀请码',
    created_by BIGINT COMMENT '创建者管理员ID',
    used_by BIGINT COMMENT '使用者用户ID',
    max_uses INT NOT NULL DEFAULT 1 COMMENT '最大使用次数',
    current_uses INT NOT NULL DEFAULT 0 COMMENT '当前使用次数',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=有效, 0=已禁用, 2=已用完',
    user_level VARCHAR(20) NOT NULL DEFAULT 'beta_tester' COMMENT '赋予的用户等级',
    expires_at DATETIME COMMENT '过期时间, NULL表示永不过期',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_code (code),
    INDEX idx_status (status),
    INDEX idx_created_by (created_by),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='邀请码表';

-- 用户等级扩展（在 users 表增加字段）
ALTER TABLE users ADD COLUMN user_level VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT '用户等级: normal/beta_tester/vip/admin' AFTER status;
ALTER TABLE users ADD COLUMN invite_code_id BIGINT COMMENT '使用的邀请码ID' AFTER user_level;

-- 反馈表
CREATE TABLE feedbacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '提交用户ID',
    category VARCHAR(50) NOT NULL COMMENT '分类: bug/feature/ux/performance/other',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    content TEXT NOT NULL COMMENT '内容',
    page_url VARCHAR(500) COMMENT '反馈页面URL',
    user_agent VARCHAR(500) COMMENT '浏览器UA',
    screenshot_urls JSON COMMENT '截图URL列表',
    status TINYINT NOT NULL DEFAULT 0 COMMENT '状态: 0=待处理, 1=处理中, 2=已解决, 3=已关闭',
    priority TINYINT NOT NULL DEFAULT 2 COMMENT '优先级: 1=高, 2=中, 3=低',
    admin_reply TEXT COMMENT '管理员回复',
    replied_by BIGINT COMMENT '回复管理员ID',
    replied_at DATETIME COMMENT '回复时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户反馈表';
```

#### 3.4.2 邀请码后端实现

**实体类 - InviteCode.java**:

```java
package com.zifeng.module.invite.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "invite_codes", uniqueConstraints = {
    @UniqueConstraint(columnNames = "code")
})
public class InviteCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32, unique = true)
    private String code;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "used_by")
    private Long usedBy;

    @Builder.Default
    @Column(name = "max_uses", nullable = false)
    private Integer maxUses = 1;

    @Builder.Default
    @Column(name = "current_uses", nullable = false)
    private Integer currentUses = 0;

    @Builder.Default
    @Column(nullable = false)
    private Integer status = 1;  // 1=有效, 0=已禁用, 2=已用完

    @Column(name = "user_level", nullable = false, length = 20)
    @Builder.Default
    private String userLevel = "beta_tester";

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
```

**Repository - InviteCodeRepository.java**:

```java
package com.zifeng.module.invite.repository;

import com.zifeng.module.invite.entity.InviteCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InviteCodeRepository extends JpaRepository<InviteCode, Long> {

    Optional<InviteCode> findByCode(String code);

    List<InviteCode> findByCreatedByOrderByCreatedAtDesc(Long createdBy);

    List<InviteCode> findByStatusOrderByCreatedAtDesc(Integer status);

    long countByStatus(Integer status);
}
```

**Service - InviteCodeService.java**:

```java
package com.zifeng.module.invite.service;

import com.zifeng.module.invite.entity.InviteCode;
import com.zifeng.module.invite.repository.InviteCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InviteCodeService {

    private final InviteCodeRepository inviteCodeRepository;

    /**
     * 批量生成邀请码
     */
    @Transactional
    public List<InviteCode> generateCodes(Long adminId, int count, int maxUses,
                                           String userLevel, LocalDateTime expiresAt) {
        return java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> {
                    String code = generateCode();
                    return InviteCode.builder()
                            .code(code)
                            .createdBy(adminId)
                            .maxUses(maxUses)
                            .currentUses(0)
                            .status(1)
                            .userLevel(userLevel)
                            .expiresAt(expiresAt)
                            .build();
                })
                .map(inviteCodeRepository::save)
                .toList();
    }

    /**
     * 验证邀请码
     */
    public InviteCode validateCode(String code) {
        InviteCode inviteCode = inviteCodeRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("邀请码不存在"));

        if (inviteCode.getStatus() == 0) {
            throw new RuntimeException("邀请码已被禁用");
        }
        if (inviteCode.getStatus() == 2 || inviteCode.getCurrentUses() >= inviteCode.getMaxUses()) {
            throw new RuntimeException("邀请码已用完");
        }
        if (inviteCode.getExpiresAt() != null && inviteCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("邀请码已过期");
        }
        return inviteCode;
    }

    /**
     * 使用邀请码
     */
    @Transactional
    public void useCode(String code, Long userId) {
        InviteCode inviteCode = validateCode(code);
        inviteCode.setCurrentUses(inviteCode.getCurrentUses() + 1);
        inviteCode.setUsedBy(userId);
        if (inviteCode.getCurrentUses() >= inviteCode.getMaxUses()) {
            inviteCode.setStatus(2);
        }
        inviteCodeRepository.save(inviteCode);
        log.info("邀请码 {} 被用户 {} 使用，当前使用次数 {}/{}",
                code, userId, inviteCode.getCurrentUses(), inviteCode.getMaxUses());
    }

    /**
     * 禁用邀请码
     */
    @Transactional
    public void disableCode(Long codeId) {
        InviteCode inviteCode = inviteCodeRepository.findById(codeId)
                .orElseThrow(() -> new RuntimeException("邀请码不存在"));
        inviteCode.setStatus(0);
        inviteCodeRepository.save(inviteCode);
    }

    /**
     * 获取所有邀请码
     */
    public List<InviteCode> listAll() {
        return inviteCodeRepository.findAll();
    }

    /**
     * 获取统计信息
     */
    public long countActive() {
        return inviteCodeRepository.countByStatus(1);
    }

    private String generateCode() {
        return "ZF" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
```

**Controller - InviteCodeController.java**:

```java
package com.zifeng.module.invite.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.invite.dto.GenerateCodeRequest;
import com.zifeng.module.invite.entity.InviteCode;
import com.zifeng.module.invite.service.InviteCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/invite-codes")
@RequiredArgsConstructor
public class InviteCodeController {

    private final InviteCodeService inviteCodeService;

    /**
     * 批量生成邀请码（管理员）
     */
    @PostMapping("/generate")
    public ApiResponse<List<InviteCode>> generateCodes(
            @Valid @RequestBody GenerateCodeRequest request) {
        Long adminId = StpAdminUtil.getLoginIdAsLong();
        List<InviteCode> codes = inviteCodeService.generateCodes(
                adminId,
                request.getCount(),
                request.getMaxUses(),
                request.getUserLevel(),
                request.getExpiresAt() != null ?
                        LocalDateTime.parse(request.getExpiresAt()) : null
        );
        return ApiResponse.ok(codes);
    }

    /**
     * 列出所有邀请码（管理员）
     */
    @GetMapping
    public ApiResponse<List<InviteCode>> listCodes() {
        return ApiResponse.ok(inviteCodeService.listAll());
    }

    /**
     * 禁用邀请码（管理员）
     */
    @PutMapping("/{id}/disable")
    public ApiResponse<Void> disableCode(@PathVariable Long id) {
        inviteCodeService.disableCode(id);
        return ApiResponse.ok("已禁用", null);
    }

    /**
     * 邀请码统计（管理员）
     */
    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.ok(Map.of(
                "activeCodes", inviteCodeService.countActive()
        ));
    }

    /**
     * 验证邀请码有效性（公开接口）
     */
    @GetMapping("/validate")
    public ApiResponse<Map<String, Object>> validateCode(@RequestParam String code) {
        try {
            InviteCode inviteCode = inviteCodeService.validateCode(code);
            return ApiResponse.ok(Map.of(
                    "valid", true,
                    "userLevel", inviteCode.getUserLevel()
            ));
        } catch (RuntimeException e) {
            return ApiResponse.ok(Map.of(
                    "valid", false,
                    "message", e.getMessage()
            ));
        }
    }
}
```

**DTO - GenerateCodeRequest.java**:

```java
package com.zifeng.module.invite.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GenerateCodeRequest {
    @NotNull(message = "数量不能为空")
    @Min(1) @Max(100)
    private Integer count;

    @NotNull(message = "最大使用次数不能为空")
    @Min(1) @Max(1000)
    private Integer maxUses = 1;

    private String userLevel = "beta_tester";

    private String expiresAt;  // ISO 8601 格式
}
```

#### 3.4.3 注册接口改造

修改 `AuthService.register()` 方法，增加邀请码验证:

```java
// 在 AuthService 中注入 InviteCodeService
private final InviteCodeService inviteCodeService;

@Value("${invite-code.required:false}")
private boolean inviteCodeRequired;

public AuthResponse register(RegisterRequest request) {
    // 邀请码验证（内测模式）
    if (inviteCodeRequired) {
        if (request.getInviteCode() == null || request.getInviteCode().isBlank()) {
            throw new RuntimeException("内测期间需要邀请码才能注册");
        }
        inviteCodeService.validateCode(request.getInviteCode());
    }

    if (userRepository.existsByUsername(request.getUsername())) {
        throw new RuntimeException("用户名已存在");
    }

    if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
        throw new RuntimeException("邮箱已被注册");
    }

    // 确定用户等级
    String userLevel = "normal";
    Long inviteCodeId = null;
    if (inviteCodeRequired && request.getInviteCode() != null) {
        InviteCode code = inviteCodeService.validateCode(request.getInviteCode());
        userLevel = code.getUserLevel();
        inviteCodeId = code.getId();
    }

    User user = User.builder()
            .username(request.getUsername())
            .password(passwordEncoder.encode(request.getPassword()))
            .email(request.getEmail())
            .nickname(request.getNickname() != null ? request.getNickname() : request.getUsername())
            .userLevel(userLevel)
            .inviteCodeId(inviteCodeId)
            .status(1)
            .build();

    user = userRepository.save(user);

    // 使用邀请码
    if (inviteCodeRequired && request.getInviteCode() != null) {
        inviteCodeService.useCode(request.getInviteCode(), user.getId());
    }

    StpUtil.login(user.getId(), 7200);
    String token = StpUtil.getTokenValue();

    return AuthResponse.builder()
            .token(token)
            .username(user.getUsername())
            .nickname(user.getNickname())
            .avatar(user.getAvatar())
            .userId(user.getId())
            .expiresAt(System.currentTimeMillis() + 7200 * 1000)
            .build();
}
```

修改 `RegisterRequest.java`:

```java
@Data
public class RegisterRequest {
    @NotBlank(message = "用户名不能为空")
    @Size(min = 3, max = 50, message = "用户名长度3-50")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 100, message = "密码长度6-100")
    private String password;

    private String email;
    private String nickname;
    private String inviteCode;  // 新增邀请码字段
}
```

在 `application.yml` 中添加:

```yaml
invite-code:
  required: true  # 内测模式开启邀请码
```

#### 3.4.4 Sa-Token 路由放行

修改 `SaTokenConfig.java`，放行邀请码验证接口:

```java
SaRouter.match("/api/**")
        .notMatch(
                "/api/admin/**",
                "/api/sources/admin/**",
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/send-reset-code",
                "/api/auth/reset-password",
                "/api/sources/public/**",
                "/api/user/avatars/**",
                "/api/parse/**",
                "/api/public/**",
                "/api/admin/invite-codes/validate"  // 邀请码验证公开
        )
        .check(r -> StpUtil.checkLogin());
```

### 3.5 速率限制方案

#### 3.5.1 Nginx 层限流（已在 3.3.2 配置中体现）

| 接口 | 速率 | burst | 说明 |
|------|------|-------|------|
| 全局 | 60r/s | 10 | 基础限流 |
| 普通API | 30r/s | 20 | 搜索/目录/内容 |
| 登录 | 5r/m | 3 | 防暴力破解 |
| 注册 | 5r/m | 2 | 防批量注册 |
| 代理 | 30r/s | 10 | 限制代理请求 |
| 测试书源 | 30r/s | 10 | 限制测试频率 |

#### 3.5.2 后端接口限流

**RateLimitConfig.java**:

```java
package com.zifeng.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.core.RedisTemplate;

import java.util.concurrent.TimeUnit;

@Configuration
public class RateLimitConfig {

    /**
     * 基于 Redis 的滑动窗口限流器
     */
    @Bean
    public RateLimiter rateLimiter(RedisTemplate<String, Object> redisTemplate) {
        return new RateLimiter(redisTemplate);
    }

    public static class RateLimiter {
        private final RedisTemplate<String, Object> redisTemplate;

        public RateLimiter(RedisTemplate<String, Object> redisTemplate) {
            this.redisTemplate = redisTemplate;
        }

        /**
         * 滑动窗口限流
         * @param key 限流键
         * @param maxRequests 最大请求数
         * @param windowSeconds 窗口时间（秒）
         * @return 是否允许请求
         */
        public boolean isAllowed(String key, int maxRequests, int windowSeconds) {
            String redisKey = "rate_limit:" + key;
            Long current = redisTemplate.opsForValue().increment(redisKey);
            if (current != null && current == 1) {
                redisTemplate.expire(redisKey, windowSeconds, TimeUnit.SECONDS);
            }
            return current != null && current <= maxRequests;
        }
    }
}
```

**RateLimitInterceptor.java**:

```java
package com.zifeng.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zifeng.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitConfig.RateLimiter rateLimiter;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws Exception {
        String ip = getClientIp(request);
        String uri = request.getRequestURI();

        // 根据接口类型设置不同限流策略
        int maxRequests;
        int windowSeconds;

        if (uri.startsWith("/api/auth/login") || uri.startsWith("/api/auth/register")) {
            maxRequests = 5;
            windowSeconds = 60;
        } else if (uri.startsWith("/api/search")) {
            maxRequests = 30;
            windowSeconds = 60;
        } else if (uri.startsWith("/api/content")) {
            maxRequests = 60;
            windowSeconds = 60;
        } else {
            maxRequests = 60;
            windowSeconds = 60;
        }

        String key = ip + ":" + uri;
        if (!rateLimiter.isAllowed(key, maxRequests, windowSeconds)) {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(429);
            ApiResponse<?> result = ApiResponse.fail("请求过于频繁，请稍后再试");
            response.getWriter().write(new ObjectMapper().writeValueAsString(result));
            return false;
        }

        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // 多级代理取第一个
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
```

在 `WebMvcConfig.java` 中注册:

```java
@Override
public void addInterceptors(InterceptorRegistry registry) {
    // 速率限制拦截器（优先级最高）
    registry.addInterceptor(rateLimitInterceptor)
            .addPathPatterns("/api/**")
            .order(0);

    // 访问日志拦截器
    registry.addInterceptor(visitLogInterceptor)
            .addPathPatterns("/api/**")
            .excludePathPatterns("/api/admin/auth/**", "/api/admin/captcha**")
            .order(1);
}
```

### 3.6 测试数据管理策略

#### 3.6.1 数据脱敏导入

```sql
-- 脱敏后的测试用户数据
INSERT INTO users (username, password, email, nickname, user_level, status) VALUES
('test_user_01', '$2a$10$encoded_password_hash', 'test01@zifeng.test', '测试用户01', 'beta_tester', 1),
('test_user_02', '$2a$10$encoded_password_hash', 'test02@zifeng.test', '测试用户02', 'beta_tester', 1);

-- 脱敏规则:
-- 1. 密码统一使用 BCrypt 加密的 "test123456"
-- 2. 邮箱使用 @zifeng.test 域（不可达）
-- 3. 用户名使用 test_ 前缀
-- 4. 不导入真实用户头像
-- 5. 不导入真实阅读历史中的个人标注
```

#### 3.6.2 定期清理脚本

创建 `scripts/cleanup-test-data.sh`:

```bash
#!/bin/bash
# 测试数据定期清理脚本
# 建议通过 crontab 每天凌晨3点执行: 0 3 * * * /path/to/cleanup-test-data.sh

MYSQL_HOST="127.0.0.1"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASS="${MYSQL_ROOT_PASSWORD}"
MYSQL_DB="zifeng_novel"

# 清理30天前的访问日志
mysql -h${MYSQL_HOST} -P${MYSQL_PORT} -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "
DELETE FROM visit_logs WHERE visit_date < DATE_SUB(NOW(), INTERVAL 30 DAY);
"

# 清理90天前的阅读历史
mysql -h${MYSQL_HOST} -P${MYSQL_PORT} -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "
DELETE FROM reading_histories WHERE last_read < DATE_SUB(NOW(), INTERVAL 90 DAY);
"

# 清理已过期超过7天的邀请码
mysql -h${MYSQL_HOST} -P${MYSQL_PORT} -u${MYSQL_USER} -p${MYSQL_PASS} ${MYSQL_DB} -e "
UPDATE invite_codes SET status = 0
WHERE expires_at < DATE_SUB(NOW(), INTERVAL 7 DAY) AND status = 1;
"

# 清理Redis中的过期限流键
redis-cli -a ${REDIS_PASSWORD} --scan --pattern "rate_limit:*" | xargs -r redis-cli -a ${REDIS_PASSWORD} DEL

# 清理Redis中超过24小时的临时数据
redis-cli -a ${REDIS_PASSWORD} --scan --pattern "reset:code:*" | xargs -r redis-cli -a ${REDIS_PASSWORD} DEL

echo "[$(date)] Cleanup completed"
```

### 3.7 反馈收集机制

#### 3.7.1 后端 - FeedbackController.java

```java
package com.zifeng.module.feedback.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.feedback.dto.CreateFeedbackRequest;
import com.zifeng.module.feedback.dto.UpdateFeedbackRequest;
import com.zifeng.module.feedback.entity.Feedback;
import com.zifeng.module.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /**
     * 提交反馈（用户端）
     */
    @PostMapping("/api/feedback")
    public ApiResponse<Feedback> createFeedback(
            @Valid @RequestBody CreateFeedbackRequest request) {
        Long userId = StpUtil.getLoginIdAsLong();
        return ApiResponse.ok(feedbackService.createFeedback(userId, request));
    }

    /**
     * 获取我的反馈列表（用户端）
     */
    @GetMapping("/api/feedback/mine")
    public ApiResponse<List<Feedback>> getMyFeedbacks() {
        Long userId = StpUtil.getLoginIdAsLong();
        return ApiResponse.ok(feedbackService.getByUserId(userId));
    }

    /**
     * 列出所有反馈（管理员）
     */
    @GetMapping("/api/admin/feedbacks")
    public ApiResponse<Map<String, Object>> listFeedbacks(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(feedbackService.listFeedbacks(category, status, page, size));
    }

    /**
     * 回复反馈（管理员）
     */
    @PutMapping("/api/admin/feedbacks/{id}/reply")
    public ApiResponse<Feedback> replyFeedback(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFeedbackRequest request) {
        Long adminId = StpAdminUtil.getLoginIdAsLong();
        return ApiResponse.ok(feedbackService.replyFeedback(id, adminId, request));
    }

    /**
     * 更新反馈状态（管理员）
     */
    @PutMapping("/api/admin/feedbacks/{id}/status")
    public ApiResponse<Feedback> updateStatus(
            @PathVariable Long id,
            @RequestParam Integer status) {
        return ApiResponse.ok(feedbackService.updateStatus(id, status));
    }

    /**
     * 反馈统计（管理员）
     */
    @GetMapping("/api/admin/feedbacks/stats")
    public ApiResponse<Map<String, Object>> getFeedbackStats() {
        return ApiResponse.ok(feedbackService.getStats());
    }
}
```

#### 3.7.2 前端反馈组件

在 `zifeng-web/src/components/` 下创建 `FeedbackButton.jsx`:

```jsx
import React, { useState } from 'react';
import { FloatButton, Modal, Form, Input, Select, Button, message, Upload } from 'antd';
import { BugOutlined, MessageOutlined } from '@ant-design/icons';
import axios from '../utils/apiClient';

const { TextArea } = Input;
const { Option } = Select;

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post('/api/feedback', {
        ...values,
        pageUrl: window.location.href,
        userAgent: navigator.userAgent,
      });
      message.success('感谢您的反馈！我们会尽快处理');
      form.resetFields();
      setOpen(false);
    } catch (err) {
      message.error(err.response?.data?.message || '提交失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton
        icon={<MessageOutlined />}
        type="primary"
        style={{ right: 24, bottom: 80 }}
        onClick={() => setOpen(true)}
        tooltip="提交反馈"
      />
      <Modal
        title="提交反馈"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="category"
            label="反馈类型"
            rules={[{ required: true, message: '请选择反馈类型' }]}
          >
            <Select placeholder="请选择">
              <Option value="bug">Bug 报告</Option>
              <Option value="feature">功能建议</Option>
              <Option value="ux">体验问题</Option>
              <Option value="performance">性能问题</Option>
              <Option value="other">其他</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="简要描述问题" maxLength={200} />
          </Form.Item>
          <Form.Item
            name="content"
            label="详细描述"
            rules={[{ required: true, message: '请输入详细描述' }]}
          >
            <TextArea rows={4} placeholder="请详细描述您遇到的问题或建议..." maxLength={2000} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              提交反馈
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
```

在 `App.jsx` 中引入:

```jsx
import FeedbackButton from './components/FeedbackButton';

// 在路由组件同级位置添加
<FeedbackButton />
```

### 3.8 部署步骤（方案B 完整流程）

```bash
# ===== 1. 服务器初始化 =====
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# ===== 2. 项目部署 =====
# 克隆项目
git clone <repo-url> /opt/zifeng-novel
cd /opt/zifeng-novel

# 创建环境配置
cp .env.prod .env
# 编辑 .env 填入实际密码和域名
vim .env

# ===== 3. 构建前端 =====
# 构建用户前端
cd zifeng-web
npm install
npm run build

# 构建管理后台
cd ../zifeng-admin
npm install
npm run build

# ===== 4. 启动服务 =====
cd /opt/zifeng-novel
docker-compose -f docker-compose.prod.yml up -d

# ===== 5. 申请 SSL 证书 =====
# 参见 3.3.3 节

# ===== 6. 验证部署 =====
curl -f http://localhost:8080/api/auth/login || echo "Server not ready"
curl -f http://localhost:3001/api/health || echo "Parser not ready"
docker-compose -f docker-compose.prod.yml ps

# ===== 7. 生成邀请码 =====
# 通过管理后台 admin.novel.example.com 生成
# 或直接调用 API:
curl -X POST https://admin.novel.example.com/api/admin/invite-codes/generate \
  -H "Content-Type: application/json" \
  -H "zifeng_token: <admin_token>" \
  -d '{"count": 50, "maxUses": 1, "userLevel": "beta_tester"}'
```

---

## 四、方案C - 全功能公测方案（500+人）

### 4.1 Kubernetes 公测部署方案

#### 4.1.1 集群架构

```
                    +-----------------------+
                    |    Cloudflare CDN     |
                    |   (DDoS防护+CDN加速)   |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    |     Ingress Controller |
                    |     (Nginx Ingress)    |
                    +-----------+-----------+
                                |
            +-------------------+-------------------+
            |                   |                   |
    +-------v------+   +-------v------+   +--------v-----+
    | zifeng-web   |   | zifeng-admin |   | API Services  |
    | (3 replicas) |   | (2 replicas) |   |               |
    +--------------+   +--------------+   |  +----------+ |
                                         |  | server   | |
                                         |  | (3 rep)  | |
                                         |  +----------+ |
                                         |  | parser   | |
                                         |  | (3 rep)  | |
                                         |  +----------+ |
                                         +-------+-------+
                                                 |
                            +--------------------+--------------------+
                            |                    |                    |
                    +-------v------+     +-------v------+     +------v-------+
                    | MySQL主从    |     | Redis Cluster|     | PVC Storage  |
                    | (1主2从)     |     | (3节点)      |     | (头像/日志)  |
                    +--------------+     +--------------+     +--------------+
```

#### 4.1.2 Kubernetes 资源清单

**namespace.yaml**:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: zifeng
  labels:
    app: zifeng-novel
    environment: production
```

**configmap.yaml**:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zifeng-config
  namespace: zifeng
data:
  SPRING_DATASOURCE_URL: "jdbc:mysql://mysql-master:3306/zifeng_novel?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai"
  SPRING_DATA_REDIS_HOST: "redis-cluster"
  SPRING_DATA_REDIS_PORT: "6379"
  PARSING_SERVER_URL: "http://zifeng-parser:3001"
  BETA_MODE: "false"
  INVITE_CODE_REQUIRED: "false"
  CORS_ORIGINS: "https://novel.example.com,https://admin.novel.example.com"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: parser-config
  namespace: zifeng
data:
  CORS_ORIGINS: "https://novel.example.com,https://admin.novel.example.com"
```

**zifeng-server-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zifeng-server
  namespace: zifeng
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zifeng-server
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: zifeng-server
    spec:
      containers:
        - name: zifeng-server
          image: registry.example.com/zifeng-server:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
            limits:
              cpu: "1000m"
              memory: "1Gi"
          envFrom:
            - configMapRef:
                name: zifeng-config
            - secretRef:
                name: zifeng-secrets
          readinessProbe:
            httpGet:
              path: /api/auth/login
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/auth/login
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
          volumeMounts:
            - name: avatar-storage
              mountPath: /app/uploads/avatars
      volumes:
        - name: avatar-storage
          persistentVolumeClaim:
            claimName: avatar-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: zifeng-server
  namespace: zifeng
spec:
  selector:
    app: zifeng-server
  ports:
    - port: 8080
      targetPort: 8080
  type: ClusterIP
```

**zifeng-parser-deployment.yaml**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zifeng-parser
  namespace: zifeng
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zifeng-parser
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: zifeng-parser
    spec:
      containers:
        - name: zifeng-parser
          image: registry.example.com/zifeng-parser:latest
          ports:
            - containerPort: 3001
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          envFrom:
            - configMapRef:
                name: parser-config
          readinessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /api/health
              port: 3001
            initialDelaySeconds: 15
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: zifeng-parser
  namespace: zifeng
spec:
  selector:
    app: zifeng-parser
  ports:
    - port: 3001
      targetPort: 3001
  type: ClusterIP
```

**ingress.yaml**:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zifeng-ingress
  namespace: zifeng
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "60"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      more_set_headers "X-Frame-Options: SAMEORIGIN";
      more_set_headers "X-Content-Type-Options: nosniff";
      more_set_headers "X-XSS-Protection: 1; mode=block";
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - novel.example.com
        - admin.novel.example.com
      secretName: zifeng-tls
  rules:
    - host: novel.example.com
      http:
        paths:
          - path: /api/search
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/test-source
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/book-info
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/toc
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/content
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/explore
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/proxy
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/import-from-url
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/import-from-json
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/health
            pathType: Prefix
            backend:
              service:
                name: zifeng-parser
                port:
                  number: 3001
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: zifeng-server
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: zifeng-web
                port:
                  number: 80
    - host: admin.novel.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: zifeng-server
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: zifeng-admin
                port:
                  number: 80
```

**hpa.yaml** (水平自动扩缩容):

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: zifeng-server-hpa
  namespace: zifeng
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: zifeng-server
  minReplicas: 3
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: zifeng-parser-hpa
  namespace: zifeng
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: zifeng-parser
  minReplicas: 3
  maxReplicas: 8
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### 4.2 OAuth2 第三方登录集成方案

#### 4.2.1 数据库表扩展

```sql
-- 第三方登录关联表
CREATE TABLE oauth_connections (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '关联的本地用户ID',
    provider VARCHAR(20) NOT NULL COMMENT '提供商: wechat/qq/github',
    provider_user_id VARCHAR(100) NOT NULL COMMENT '第三方用户ID',
    access_token TEXT COMMENT '访问令牌',
    refresh_token TEXT COMMENT '刷新令牌',
    token_expires_at DATETIME COMMENT '令牌过期时间',
    nickname VARCHAR(100) COMMENT '第三方昵称',
    avatar_url VARCHAR(500) COMMENT '第三方头像',
    raw_info JSON COMMENT '原始用户信息',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_provider_user (provider, provider_user_id),
    INDEX idx_user_id (user_id),
    CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='第三方登录关联表';
```

#### 4.2.2 OAuth2 集成架构

```
用户点击"微信登录"
    |
    v
前端跳转 /api/auth/oauth/wechat/authorize
    |
    v
后端构建微信授权URL，302重定向到微信
    |
    v
微信授权页 -> 用户扫码/确认
    |
    v
微信回调 /api/auth/oauth/wechat/callback?code=xxx
    |
    v
后端用code换取access_token + openid
    |
    v
查找 oauth_connections 表:
    +-- 已关联 -> 自动登录，返回token
    +-- 未关联 -> 创建新用户 + 关联记录 -> 自动登录
```

#### 4.2.3 后端 OAuth2 控制器

```java
package com.zifeng.module.user.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.user.dto.AuthResponse;
import com.zifeng.module.user.service.OAuthService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/oauth")
@RequiredArgsConstructor
public class OAuthController {

    private final OAuthService oAuthService;

    @Value("${app.oauth.wechat.client-id:}")
    private String wechatClientId;

    @Value("${app.oauth.github.client-id:}")
    private String githubClientId;

    /**
     * 发起微信授权
     */
    @GetMapping("/wechat/authorize")
    public void wechatAuthorize(HttpServletResponse response) throws IOException {
        String redirectUrl = oAuthService.buildWechatAuthUrl();
        response.sendRedirect(redirectUrl);
    }

    /**
     * 微信回调
     */
    @GetMapping("/wechat/callback")
    public ApiResponse<AuthResponse> wechatCallback(@RequestParam String code) {
        try {
            return ApiResponse.ok(oAuthService.handleWechatCallback(code));
        } catch (Exception e) {
            return ApiResponse.fail("微信登录失败: " + e.getMessage());
        }
    }

    /**
     * 发起GitHub授权
     */
    @GetMapping("/github/authorize")
    public void githubAuthorize(HttpServletResponse response) throws IOException {
        String redirectUrl = oAuthService.buildGithubAuthUrl();
        response.sendRedirect(redirectUrl);
    }

    /**
     * GitHub回调
     */
    @GetMapping("/github/callback")
    public ApiResponse<AuthResponse> githubCallback(@RequestParam String code) {
        try {
            return ApiResponse.ok(oAuthService.handleGithubCallback(code));
        } catch (Exception e) {
            return ApiResponse.fail("GitHub登录失败: " + e.getMessage());
        }
    }

    /**
     * 绑定第三方账号（已登录用户）
     */
    @PostMapping("/bind")
    public ApiResponse<Void> bindAccount(@RequestBody Map<String, String> body) {
        Long userId = cn.dev33.satoken.stp.StpUtil.getLoginIdAsLong();
        oAuthService.bindAccount(userId, body.get("provider"), body.get("code"));
        return ApiResponse.ok("绑定成功", null);
    }
}
```

#### 4.2.4 application.yml OAuth2 配置

```yaml
app:
  oauth:
    wechat:
      client-id: ${WECHAT_APP_ID}
      client-secret: ${WECHAT_APP_SECRET}
      redirect-uri: https://novel.example.com/api/auth/oauth/wechat/callback
    qq:
      client-id: ${QQ_APP_ID}
      client-secret: ${QQ_APP_SECRET}
      redirect-uri: https://novel.example.com/api/auth/oauth/qq/callback
    github:
      client-id: ${GITHUB_CLIENT_ID}
      client-secret: ${GITHUB_CLIENT_SECRET}
      redirect-uri: https://novel.example.com/api/auth/oauth/github/callback
```

### 4.3 内容审核机制

#### 4.3.1 敏感词过滤方案

```java
package com.zifeng.module.content.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContentFilterService {

    private final RedisTemplate<String, Object> redisTemplate;

    // DFA 自动机敏感词树
    private final Map<String, Object> sensitiveWordTree = new ConcurrentHashMap<>();

    private static final String SENSITIVE_WORDS_KEY = "system:sensitive_words";

    @PostConstruct
    public void init() {
        loadSensitiveWords();
    }

    /**
     * 加载敏感词库到内存
     */
    public void loadSensitiveWords() {
        // 从Redis或数据库加载敏感词库
        Set<String> words = Set.of(
            // 示例敏感词，实际应从数据库/配置文件加载
            "暴力", "色情", "赌博", "毒品", "诈骗"
        );
        buildTree(words);
        log.info("敏感词库加载完成，共 {} 个敏感词", words.size());
    }

    /**
     * 构建 DFA 树
     */
    @SuppressWarnings("unchecked")
    private void buildTree(Set<String> words) {
        sensitiveWordTree.clear();
        for (String word : words) {
            Map<String, Object> current = sensitiveWordTree;
            for (char c : word.toCharArray()) {
                String key = String.valueOf(c);
                if (!current.containsKey(key)) {
                    current.put(key, new HashMap<String, Object>());
                }
                Object next = current.get(key);
                if (next instanceof Map) {
                    current = (Map<String, Object>) next;
                }
            }
            current.put("isEnd", true);
        }
    }

    /**
     * 检测文本是否包含敏感词
     */
    public boolean containsSensitiveWord(String text) {
        if (text == null || text.isEmpty()) return false;
        for (int i = 0; i < text.length(); i++) {
            int length = checkWord(text, i);
            if (length > 0) return true;
        }
        return false;
    }

    /**
     * 过滤敏感词，替换为 ***
     */
    public String filterSensitiveWords(String text) {
        if (text == null || text.isEmpty()) return text;
        StringBuilder result = new StringBuilder(text);
        for (int i = 0; i < text.length(); i++) {
            int length = checkWord(text, i);
            if (length > 0) {
                for (int j = i; j < i + length; j++) {
                    result.setCharAt(j, '*');
                }
                i += length - 1;
            }
        }
        return result.toString();
    }

    /**
     * 获取文本中的所有敏感词
     */
    public Set<String> findSensitiveWords(String text) {
        Set<String> words = new HashSet<>();
        if (text == null || text.isEmpty()) return words;
        for (int i = 0; i < text.length(); i++) {
            int length = checkWord(text, i);
            if (length > 0) {
                words.add(text.substring(i, i + length));
                i += length - 1;
            }
        }
        return words;
    }

    @SuppressWarnings("unchecked")
    private int checkWord(String text, int startIndex) {
        Map<String, Object> current = sensitiveWordTree;
        int length = 0;
        int wordLength = 0;
        for (int i = startIndex; i < text.length(); i++) {
            String key = String.valueOf(text.charAt(i));
            Object node = current.get(key);
            if (node == null) break;
            length++;
            current = (Map<String, Object>) node;
            if (current.containsKey("isEnd")) {
                wordLength = length;
            }
        }
        return wordLength;
    }
}
```

#### 4.3.2 在用户输入处接入审核

```java
// 在 AuthService.register() 中添加昵称审核
if (contentFilterService.containsSensitiveWord(request.getNickname())) {
    throw new RuntimeException("昵称包含敏感内容，请修改");
}

// 在 FeedbackService.createFeedback() 中添加内容审核
if (contentFilterService.containsSensitiveWord(request.getTitle()) ||
    contentFilterService.containsSensitiveWord(request.getContent())) {
    throw new RuntimeException("内容包含敏感信息，请修改后提交");
}
```

### 4.4 灰度发布和版本控制策略

#### 4.4.1 灰度发布流程

```
v1.0 (稳定版)          v1.1 (灰度版)
    |                      |
    v                      v
+--------+           +-----------+
| 100%   |           | 5%->20%  |
| 流量   |  -------> | ->50%    |
|        |           | ->100%   |
+--------+           +-----------+
```

#### 4.4.2 基于Header的灰度路由（K8s + Nginx Ingress）

```yaml
# canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zifeng-server-canary
  namespace: zifeng
spec:
  replicas: 1
  selector:
    matchLabels:
      app: zifeng-server
      track: canary
  template:
    metadata:
      labels:
        app: zifeng-server
        track: canary
    spec:
      containers:
        - name: zifeng-server
          image: registry.example.com/zifeng-server:v1.1.0
          # ... 同正式环境配置
---
# canary-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: zifeng-server-canary
  namespace: zifeng
spec:
  selector:
    app: zifeng-server
    track: canary
  ports:
    - port: 8080
      targetPort: 8080
---
# canary-ingress.yaml - 基于权重的灰度
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zifeng-canary
  namespace: zifeng
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "20"  # 20%流量到灰度版本
spec:
  ingressClassName: nginx
  rules:
    - host: novel.example.com
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: zifeng-server-canary
                port:
                  number: 8080
```

#### 4.4.3 版本控制策略

```bash
# 镜像标签规范
# 开发版: zifeng-server:dev-<commit-hash>
# 预发版: zifeng-server:rc-<version>
# 正式版: zifeng-server:<version>  (如 v1.0.0)
# 灰度版: zifeng-server:<version>-canary

# CI/CD 流水线中的版本管理
# 1. feature/* 分支 -> dev 镜像
# 2. develop 分支 -> rc 镜像
# 3. release/* 分支 -> 正式镜像
# 4. hotfix/* 分支 -> 紧急修复镜像
```

### 4.5 DDoS 防护和安全加固方案

#### 4.5.1 Cloudflare 防护层

```
用户请求 -> Cloudflare (L7防护) -> 源站服务器
                |
                +-- WAF 规则
                +-- Rate Limiting
                +-- Bot Management
                +-- DDoS Mitigation
                +-- Under Attack Mode (紧急模式)
```

**Cloudflare 配置要点**:

1. DNS 代理模式开启（橙色云朵）
2. SSL 模式设为 "Full (Strict)"
3. 开启 "Always Use HTTPS"
4. 配置 WAF 规则:
   - 阻止已知攻击IP
   - 限制 `/api/auth/login` 和 `/api/auth/register` 的请求频率
   - 阻止无 User-Agent 的请求
5. Rate Limiting 规则:
   - 登录接口: 10次/分钟/IP
   - 注册接口: 5次/小时/IP
   - 全局: 200次/分钟/IP

#### 4.5.2 服务器层面安全加固

```bash
#!/bin/bash
# server-hardening.sh - 服务器安全加固脚本

# 1. 禁用root SSH登录
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

# 2. 禁用密码登录，仅允许密钥
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 3. 修改SSH端口
sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

# 4. 安装 fail2ban
apt-get install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# 5. 配置 fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = 2222
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
bantime = 1800
EOF

# 6. 配置 iptables 基础规则
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 2222 -j ACCEPT
iptables -A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT

# 7. 保存规则
apt-get install -y iptables-persistent
netfilter-persistent save

# 8. 重启 SSH
systemctl restart sshd

echo "Server hardening completed!"
```

#### 4.5.3 应用层安全配置

```yaml
# application-prod.yml 安全配置
spring:
  # 隐藏版本信息
  mvc:
    throw-exception-if-no-handler-found: true

server:
  # 安全响应头
  forward-headers-strategy: native

sa-token:
  token-name: zifeng_token
  timeout: 7200
  active-timeout: 1800  # 30分钟无操作自动过期
  is-concurrent: false  # 不允许多端同时登录
  is-share: false
  token-style: uuid
  is-log: false
  is-read-header: true
  is-read-cookie: false
  is-read-body: false
  # 同端互斥登录
  is-concurrent: false
  # Token 风控
  token-session-check-login: true

app:
  security:
    # XSS 防护
    xss-filter-enabled: true
    # SQL 注入防护
    sql-injection-filter-enabled: true
    # 文件上传白名单
    allowed-upload-types: "image/jpeg,image/png,image/gif,image/webp"
    # 最大请求体大小
    max-request-size: 10MB
```

---

## 五、通用设计

### 5.1 访问权限控制机制

#### 5.1.1 用户分级体系

| 等级 | 标识 | 注册方式 | 权限 |
|------|------|----------|------|
| 普通用户 | `normal` | 开放注册 | 基础阅读功能 |
| 内测用户 | `beta_tester` | 邀请码注册 | 全部功能 + 反馈入口 |
| VIP用户 | `vip` | 邀请码/付费 | 高级功能优先 |
| 管理员 | `admin` | 后台创建 | 管理后台访问 |

#### 5.1.2 权限拦截器

```java
package com.zifeng.config;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.module.user.entity.User;
import com.zifeng.module.user.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zifeng.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
@RequiredArgsConstructor
public class UserLevelInterceptor implements HandlerInterceptor {

    private final UserRepository userRepository;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws Exception {
        // OPTIONS 请求放行
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();

        // 内测专属接口检查
        if (uri.startsWith("/api/feedback") && !"OPTIONS".equalsIgnoreCase(request.getMethod())) {
            try {
                Long userId = StpUtil.getLoginIdAsLong();
                User user = userRepository.findById(userId).orElse(null);
                if (user == null || !"beta_tester".equals(user.getUserLevel())
                        && !"vip".equals(user.getUserLevel())
                        && !"admin".equals(user.getUserLevel())) {
                    response.setContentType("application/json;charset=UTF-8");
                    response.setStatus(403);
                    ApiResponse<?> result = ApiResponse.fail("内测功能，仅限内测用户使用");
                    response.getWriter().write(new ObjectMapper().writeValueAsString(result));
                    return false;
                }
            } catch (Exception e) {
                response.setContentType("application/json;charset=UTF-8");
                response.setStatus(401);
                ApiResponse<?> result = ApiResponse.fail("请先登录");
                response.getWriter().write(new ObjectMapper().writeValueAsString(result));
                return false;
            }
        }

        return true;
    }
}
```

#### 5.1.3 管理员权限分级

```sql
-- 管理员角色权限表
ALTER TABLE admins ADD COLUMN permissions JSON COMMENT '权限列表' AFTER role;

-- 权限定义
-- dashboard:read     - 查看仪表盘
-- users:read         - 查看用户列表
-- users:write        - 封禁/解封用户
-- sources:read       - 查看书源
-- sources:write      - 管理书源
-- invite:read        - 查看邀请码
-- invite:write       - 生成/禁用邀请码
-- feedback:read      - 查看反馈
-- feedback:write     - 回复反馈
-- admins:read        - 查看管理员
-- admins:write       - 管理管理员
-- system:config      - 系统配置

-- super_admin 拥有所有权限
-- admin 默认权限: ["dashboard:read", "users:read", "sources:read", "invite:read", "feedback:read", "feedback:write"]
```

### 5.2 测试反馈收集渠道设计

#### 5.2.1 反馈渠道矩阵

| 渠道 | 适用阶段 | 收集方式 | 响应时间 |
|------|----------|----------|----------|
| 应用内反馈按钮 | A/B/C | FeedbackButton组件 | 24h |
| 管理后台反馈管理 | A/B/C | Admin面板 | 实时 |
| 微信/QQ内测群 | A/B | 群聊收集 | 即时 |
| GitHub Issues | B/C | 仓库Issue | 48h |
| 邮件反馈 | B/C | feedback@zifeng.com | 24h |
| 问卷表单 | A/B | 腾讯问卷/金数据 | 批量 |

#### 5.2.2 反馈分类与优先级

```
反馈分类:
  bug         - Bug报告 (P0/P1)
  feature     - 功能建议 (P2/P3)
  ux          - 体验问题 (P2)
  performance - 性能问题 (P1)
  content     - 内容问题 (P2)
  other       - 其他 (P3)

优先级定义:
  P0 - 系统崩溃/数据丢失/安全漏洞 -> 2小时内响应
  P1 - 核心功能不可用 -> 8小时内响应
  P2 - 体验问题/功能建议 -> 24小时内响应
  P3 - 小问题/优化建议 -> 72小时内响应
```

### 5.3 版本控制与迭代策略

#### 5.3.1 Git 分支策略

```
main (生产分支)
  |
  +-- develop (开发主线)
  |     |
  |     +-- feature/invite-code (功能分支)
  |     +-- feature/oauth-login
  |     +-- feature/content-filter
  |     |
  |     +-- bugfix/login-error (修复分支)
  |
  +-- release/v1.1.0 (发布分支)
  |
  +-- hotfix/critical-fix (紧急修复)
```

#### 5.3.2 版本号规范

```
vMAJOR.MINOR.PATCH[-SUFFIX]

示例:
  v1.0.0        - 首个正式版
  v1.1.0-beta.1 - 内测版
  v1.1.0-rc.1   - 发布候选版
  v1.1.0        - 正式版
  v1.1.1        - 补丁版
```

#### 5.3.3 迭代节奏

| 阶段 | 周期 | 版本 | 内容 |
|------|------|------|------|
| 内测Alpha | 1-2周 | v0.9.x | 核心功能验证 |
| 内测Beta | 2-4周 | v1.0.x | 邀请码+反馈+限流 |
| 公测RC | 2-4周 | v1.1.x | OAuth+审核+灰度 |
| 正式版 | - | v2.0.0 | 全功能上线 |

### 5.4 测试范围与测试用例设计

#### 5.4.1 功能测试矩阵

| 模块 | 测试项 | 优先级 | 测试类型 |
|------|--------|--------|----------|
| **用户认证** | 注册（含邀请码） | P0 | 功能 |
| | 登录/登出 | P0 | 功能 |
| | 密码重置 | P1 | 功能 |
| | Token过期处理 | P1 | 功能 |
| | 多端登录互斥 | P2 | 功能 |
| **小说阅读** | 搜索小说 | P0 | 功能 |
| | 查看目录 | P0 | 功能 |
| | 阅读内容 | P0 | 功能 |
| | 翻页/滚动 | P0 | 功能 |
| | 书架管理 | P1 | 功能 |
| | 阅读进度同步 | P1 | 功能 |
| **书源管理** | 导入书源 | P0 | 功能 |
| | 测试书源 | P1 | 功能 |
| | 切换书源 | P1 | 功能 |
| | 发现/探索 | P2 | 功能 |
| **管理后台** | 仪表盘统计 | P1 | 功能 |
| | 用户管理 | P1 | 功能 |
| | 邀请码管理 | P1 | 功能 |
| | 反馈管理 | P2 | 功能 |
| **性能** | 首屏加载时间 <3s | P1 | 性能 |
| | 搜索响应 <2s | P1 | 性能 |
| | 内容加载 <1s | P1 | 性能 |
| | 并发50用户 | P2 | 压力 |
| **安全** | SQL注入防护 | P0 | 安全 |
| | XSS防护 | P0 | 安全 |
| | CSRF防护 | P1 | 安全 |
| | 速率限制 | P1 | 安全 |
| | 邀请码绕过 | P0 | 安全 |
| **兼容性** | Chrome最新版 | P0 | 兼容 |
| | Safari最新版 | P1 | 兼容 |
| | Firefox最新版 | P1 | 兼容 |
| | 移动端浏览器 | P1 | 兼容 |
| | iOS微信内置浏览器 | P2 | 兼容 |

#### 5.4.2 自动化测试用例示例

```java
// AuthServiceTest.java
@SpringBootTest
@Transactional
class AuthServiceTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private InviteCodeService inviteCodeService;

    @Autowired
    private UserRepository userRepository;

    @Test
    void registerWithoutInviteCode_shouldFail() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        assertThrows(RuntimeException.class, () -> authService.register(request));
    }

    @Test
    void registerWithValidInviteCode_shouldSuccess() {
        // 生成邀请码
        List<InviteCode> codes = inviteCodeService.generateCodes(1L, 1, 1, "beta_tester", null);
        String code = codes.get(0).getCode();

        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setPassword("password123");
        request.setInviteCode(code);

        AuthResponse response = authService.register(request);
        assertNotNull(response.getToken());
        assertEquals("testuser", response.getUsername());

        // 验证邀请码已使用
        assertThrows(RuntimeException.class, () -> inviteCodeService.validateCode(code));
    }

    @Test
    void registerWithUsedInviteCode_shouldFail() {
        // 生成maxUses=1的邀请码
        List<InviteCode> codes = inviteCodeService.generateCodes(1L, 1, 1, "beta_tester", null);
        String code = codes.get(0).getCode();

        // 第一次使用
        RegisterRequest request1 = new RegisterRequest();
        request1.setUsername("user1");
        request1.setPassword("password123");
        request1.setInviteCode(code);
        authService.register(request1);

        // 第二次使用应失败
        RegisterRequest request2 = new RegisterRequest();
        request2.setUsername("user2");
        request2.setPassword("password123");
        request2.setInviteCode(code);
        assertThrows(RuntimeException.class, () -> authService.register(request2));
    }

    @Test
    void loginWithBannedUser_shouldFail() {
        // 创建并封禁用户
        User user = User.builder()
                .username("banned_user")
                .password("$2a$10$hash")
                .status(0)
                .build();
        userRepository.save(user);

        LoginRequest request = new LoginRequest();
        request.setUsername("banned_user");
        request.setPassword("password123");

        assertThrows(RuntimeException.class, () -> authService.login(request));
    }
}
```

### 5.5 确保测试不影响生产环境和数据安全的保障措施

#### 5.5.1 环境隔离策略

| 措施 | 说明 |
|------|------|
| 独立数据库 | 测试环境使用独立的数据库实例，绝不连接生产库 |
| 独立域名 | 测试环境使用 `test.novel.example.com`，与生产域名隔离 |
| 环境变量隔离 | 通过 `.env.test` / `.env.prod` 严格区分 |
| Docker网络隔离 | 测试和生产的Docker Compose使用不同的网络 |
| 数据库前缀 | 测试库表前缀 `test_`，生产无前缀 |

#### 5.5.2 数据安全措施

```yaml
# 安全检查清单
security_checklist:
  # 1. 密码安全
  - 密码使用BCrypt加密存储（已实现）
  - 禁止日志中输出密码明文
  - Token不通过Cookie传输（已实现，Header模式）

  # 2. 数据传输
  - 全站HTTPS（Nginx + Let's Encrypt）
  - API接口强制HTTPS重定向
  - 敏感接口添加CSRF防护

  # 3. 数据存储
  - 数据库禁止外网访问（127.0.0.1绑定）
  - Redis设置密码认证
  - 文件上传类型白名单限制
  - 上传文件重命名（UUID）

  # 4. 访问控制
  - 管理后台IP白名单（Nginx层）
  - 管理员验证码保护（已实现）
  - 用户等级权限拦截
  - 邀请码注册限制

  # 5. 日志审计
  - 访问日志记录（VisitLogInterceptor已实现）
  - 管理员操作日志
  - 登录失败记录
  - 异常请求告警

  # 6. 备份恢复
  - 数据库每日自动备份
  - 备份文件加密存储
  - 定期恢复演练
```

#### 5.5.3 数据库备份脚本

```bash
#!/bin/bash
# backup-database.sh - 数据库自动备份脚本
# crontab: 0 2 * * * /opt/zifeng-novel/scripts/backup-database.sh

BACKUP_DIR="/opt/zifeng-novel/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p ${BACKUP_DIR}

# MySQL 备份
docker exec zifeng-mysql mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  zifeng_novel | gzip > ${BACKUP_DIR}/zifeng_novel_${DATE}.sql.gz

# Redis 备份
docker exec zifeng-redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE
sleep 5
docker cp zifeng-redis:/data/dump.rdb ${BACKUP_DIR}/zifeng_redis_${DATE}.rdb

# 加密备份文件（可选）
# openssl enc -aes-256-cbc -salt -in ${BACKUP_DIR}/zifeng_novel_${DATE}.sql.gz \
#   -out ${BACKUP_DIR}/zifeng_novel_${DATE}.sql.gz.enc -pass pass:${ENCRYPTION_KEY}

# 清理过期备份
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +${RETENTION_DAYS} -delete
find ${BACKUP_DIR} -name "*.rdb" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: zifeng_novel_${DATE}.sql.gz"
```

#### 5.5.4 监控告警配置

```yaml
# Prometheus 监控指标
monitoring:
  # 应用指标
  - jvm_memory_used_bytes        # JVM内存使用
  - http_server_requests_seconds # HTTP请求延迟
  - hikaricp_connections_active  # 数据库连接池
  - lettuce_command_latency      # Redis延迟

  # 基础设施指标
  - node_cpu_seconds_total       # CPU使用率
  - node_memory_available_bytes  # 可用内存
  - node_disk_io_time_seconds    # 磁盘IO
  - container_memory_usage_bytes # 容器内存

  # 业务指标
  - zifeng_active_users          # 活跃用户数
  - zifeng_api_error_rate        # API错误率
  - zifeng_search_latency        # 搜索延迟

# 告警规则
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    notify: [wechat, email]

  - name: HighLatency
    condition: p99_latency > 3s
    duration: 10m
    severity: warning
    notify: [wechat]

  - name: DatabaseConnectionPoolExhausted
    condition: active_connections > 90% of max
    duration: 2m
    severity: critical
    notify: [wechat, email, sms]

  - name: DiskSpaceLow
    condition: disk_available < 10%
    duration: 5m
    severity: warning
    notify: [wechat]
```

---

## 附录A: 方案选择决策树

```
开始
  |
  +-- 测试人数 < 50？
  |     |-- 是 --> 方案A（局域网内测）
  |     |          成本: 0元
  |     |          部署时间: 30分钟
  |     |          所需技能: 基础开发
  |     |
  |     +-- 否 --> 测试人数 < 500？
  |                |-- 是 --> 方案B（云服务器内测）
  |                |          成本: 200-800元/月
  |                |          部署时间: 4-8小时
  |                |          所需技能: Linux运维 + Docker
  |                |
  |                +-- 否 --> 方案C（K8s公测）
  |                           成本: 2000-5000元/月
  |                           部署时间: 1-2周
  |                           所需技能: K8s + DevOps
```

## 附录B: 快速启动检查清单

### 方案A 检查清单

- [ ] 获取本机局域网IP
- [ ] 修改 Vite 配置 host: "0.0.0.0"
- [ ] 修改 CORS 允许局域网来源
- [ ] 配置 Windows 防火墙规则
- [ ] 启动 MySQL + Redis (docker-compose)
- [ ] 启动 zifeng-parser
- [ ] 启动 zifeng-server
- [ ] 启动 zifeng-web
- [ ] 启动 zifeng-admin
- [ ] 局域网内其他设备访问测试

### 方案B 检查清单

- [ ] 购买云服务器并初始化
- [ ] 安装 Docker + Docker Compose
- [ ] 配置域名 DNS 解析
- [ ] 创建 .env.prod 环境配置
- [ ] 构建前端产物
- [ ] 创建 Dockerfile（server + parser）
- [ ] 配置 Nginx 反向代理
- [ ] 申请 SSL 证书
- [ ] 启动全部容器服务
- [ ] 实现邀请码功能
- [ ] 配置速率限制
- [ ] 部署反馈组件
- [ ] 配置数据库备份
- [ ] 安全加固检查
- [ ] 生成首批邀请码
- [ ] 通知测试人员

### 方案C 检查清单

- [ ] 搭建 K8s 集群
- [ ] 配置容器镜像仓库
- [ ] 部署 MySQL 主从
- [ ] 部署 Redis Cluster
- [ ] 配置 Ingress Controller
- [ ] 部署所有微服务
- [ ] 配置 HPA 自动扩缩容
- [ ] 接入 Cloudflare CDN
- [ ] 实现 OAuth2 第三方登录
- [ ] 部署内容审核服务
- [ ] 配置灰度发布策略
- [ ] 部署 Prometheus + Grafana
- [ ] 配置告警通知
- [ ] 全链路压力测试
- [ ] 安全渗透测试
- [ ] 制定回滚预案

---

> 文档维护: 随项目迭代持续更新，每次版本发布前需同步修订本文档。
