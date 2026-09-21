import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@zifeng/ui": fileURLToPath(new URL("../zifeng-ui", import.meta.url)),
    },
    // 仓库根存在遗留 node_modules，共享层若不去重会加载出两份 react → Invalid hook call
    dedupe: ["react", "react-dom", "antd", "@ant-design/icons", "framer-motion"],
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: [],
    fs: { allow: [repoRoot] },
    proxy: {
      // Parser API（解析服务，端口 3001）
      "/api/search": { target: "http://localhost:3001", changeOrigin: true },
      "/api/test-source": { target: "http://localhost:3001", changeOrigin: true },
      "/api/book-info": { target: "http://localhost:3001", changeOrigin: true },
      "/api/toc": { target: "http://localhost:3001", changeOrigin: true },
      "/api/content": { target: "http://localhost:3001", changeOrigin: true },
      "/api/explore": { target: "http://localhost:3001", changeOrigin: true },
      "/api/proxy": { target: "http://localhost:3001", changeOrigin: true },
      "/api/img-proxy": { target: "http://localhost:3001", changeOrigin: true },
      "/api/import-from-url": { target: "http://localhost:3001", changeOrigin: true },
      "/api/import-from-json": { target: "http://localhost:3001", changeOrigin: true },
      "/api/health": { target: "http://localhost:3001", changeOrigin: true },
      // 后端 API（Spring Boot，端口 8080）
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
