import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 3002,
    host: ['0.0.0.0'],
    allowedHosts: ['0.0.0.0','be391eckzz0g.joggle.cn'],
    proxy: {
      '/api/search': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/test-source': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/login': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/book-info': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/toc': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/content': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/explore': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/import-from-url': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/import-from-json': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/sources': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/bookshelf': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/reading': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/user': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
