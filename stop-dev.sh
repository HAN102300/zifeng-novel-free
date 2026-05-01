#!/bin/bash

# 紫枫小说开发环境一键停止脚本
# 适用于Linux/Mac系统

echo ""
echo "========================================"
echo "  紫枫小说 - 停止所有服务"
echo "========================================"
echo ""

echo "[1/3] 停止Node.js服务 (解析引擎/前端/管理后台)..."
pkill -f "node.*zifeng-parser" 2>/dev/null
pkill -f "node.*zifeng-web" 2>/dev/null
pkill -f "node.*zifeng-admin" 2>/dev/null
pkill -f "vite.*zifeng-web" 2>/dev/null
pkill -f "vite.*zifeng-admin" 2>/dev/null

echo "[2/3] 停止SpringBoot后端..."
pkill -f "spring-boot:run.*zifeng-server" 2>/dev/null
pkill -f "zifeng-server" 2>/dev/null

echo "[3/3] 清理残留进程..."
for port in 3001 5173 3002 8080; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ -n "$pid" ]; then
        kill -9 $pid 2>/dev/null
        echo "  已终止端口 $port 的进程 (PID: $pid)"
    fi
done

echo ""
echo "========================================"
echo "  所有服务已停止"
echo "========================================"
