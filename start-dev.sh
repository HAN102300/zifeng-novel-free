#!/bin/bash

# 紫枫小说开发环境一键启动脚本
# 适用于Linux/Mac系统

echo "🚀 正在启动紫枫小说开发环境..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要的服务是否已安装
check_requirements() {
    echo "📋 检查系统要求..."

    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js未安装，请先安装Node.js 18+${NC}"
        exit 1
    fi

    if ! command -v java &> /dev/null; then
        echo -e "${RED}❌ Java未安装，请先安装Java 17+${NC}"
        exit 1
    fi

    if ! command -v mvn &> /dev/null; then
        echo -e "${RED}❌ Maven未安装，请先安装Maven${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 启动解析引擎服务
start_parser() {
    echo -e "${BLUE}🔄 启动解析引擎服务...${NC}"
    cd zifeng-parser
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm start &
    PARSER_PID=$!
    cd ..
    echo -e "${GREEN}✅ 解析引擎已启动 (PID: $PARSER_PID)${NC}"
}

# 启动SpringBoot后端
start_backend() {
    echo -e "${BLUE}🔄 启动SpringBoot后端...${NC}"
    cd zifeng-server
    mvn spring-boot:run &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✅ SpringBoot后端已启动 (PID: $BACKEND_PID)${NC}"
}

# 启动用户前端
start_frontend() {
    echo -e "${BLUE}🔄 启动用户前端...${NC}"
    cd zifeng-web
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    echo -e "${GREEN}✅ 用户前端已启动 (PID: $FRONTEND_PID)${NC}"
}

# 启动管理后台
start_admin() {
    echo -e "${BLUE}🔄 启动管理后台...${NC}"
    cd zifeng-admin
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    npm run dev &
    ADMIN_PID=$!
    cd ..
    echo -e "${GREEN}✅ 管理后台已启动 (PID: $ADMIN_PID)${NC}"
}

# 显示启动信息
show_info() {
    echo -e "\n${GREEN}🎉 所有服务启动完成！${NC}"
    echo -e "\n📊 服务访问地址："
    echo -e "${YELLOW}  用户端: ${NC}http://localhost:5173"
    echo -e "${YELLOW}  管理后台: ${NC}http://localhost:3002"
    echo -e "${YELLOW}  API服务: ${NC}http://localhost:8080"
    echo -e "${YELLOW}  解析引擎: ${NC}http://localhost:3001"
    echo -e "\n💡 提示：使用 Ctrl+C 停止所有服务"
}

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🛑 正在停止所有服务...${NC}"
    pkill -f "npm run dev"
    pkill -f "npm start"
    pkill -f "mvn spring-boot:run"
    echo -e "${GREEN}✅ 所有服务已停止${NC}"
    exit 0
}

# 捕获Ctrl+C信号
trap cleanup SIGINT

# 主函数
main() {
    check_requirements

    # 等待用户确认数据库已启动
    echo -e "\n${YELLOW}⚠️  请确保MySQL和Redis服务已启动${NC}"
    read -p "确认已启动数据库服务？(y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ 请先启动数据库服务${NC}"
        exit 1
    fi

    # 启动所有服务
    start_parser
    sleep 2

    start_backend
    sleep 3

    start_frontend
    sleep 2

    start_admin
    sleep 2

    show_info

    # 保持脚本运行
    wait
}

# 执行主函数
main