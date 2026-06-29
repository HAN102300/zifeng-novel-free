import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: ['0.0.0.0'],
    allowedHosts: [],
    host: true,
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
