#!/bin/bash
# ============================================================
# 紫枫免费小说 - 上线前检查清单脚本
# 用法：./pre-deploy-check.sh [compose|swarm|k8s]
# ============================================================
set -euo pipefail

DEPLOY_TYPE="${1:-compose}"
PASS=0
FAIL=0
WARN=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_pass() { PASS=$((PASS+1)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
check_fail() { FAIL=$((FAIL+1)); echo -e "  ${RED}[FAIL]${NC} $1"; }
check_warn() { WARN=$((WARN+1)); echo -e "  ${YELLOW}[WARN]${NC} $1"; }

echo "============================================================"
echo "  紫枫免费小说 - 上线前检查清单 (${DEPLOY_TYPE})"
echo "  检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# ==================== 1. 代码与构建 ====================
echo ">>> 1. 代码与构建检查"

# 检查Git状态
if git diff --quiet 2>/dev/null; then
    check_pass "Git工作区干净，无未提交变更"
else
    check_fail "Git工作区有未提交变更，请先提交或暂存"
fi

# 检查当前分支
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
if [ "${BRANCH}" = "main" ] || [ "${BRANCH}" = "staging" ] || [[ "${BRANCH}" == v* ]]; then
    check_pass "当前分支: ${BRANCH}"
else
    check_warn "当前分支: ${BRANCH} (非main/staging/tag)"
fi

# 检查是否有未推送的提交
if git log @{upstream}.. --oneline 2>/dev/null | grep -q .; then
    check_warn "存在未推送到远程的提交"
else
    check_pass "所有提交已推送到远程"
fi

# 检查后端构建
if [ -f "zifeng-server/target/zifeng-novel-backend-1.0.0.jar" ]; then
    check_pass "后端JAR包已构建"
else
    check_warn "后端JAR包未找到（Docker构建时会自动编译）"
fi

echo ""

# ==================== 2. 配置检查 ====================
echo ">>> 2. 配置检查"

# 检查.env文件
if [ -f "deploy/.env" ]; then
    check_pass ".env文件存在"

    # 检查是否使用了默认密码
    if grep -q "CHANGE_ME" deploy/.env; then
        check_fail ".env中存在未修改的默认密码占位符"
    else
        check_pass ".env中无默认密码占位符"
    fi
else
    check_fail ".env文件不存在，请复制.env.production.template并修改"
fi

# 检查生产配置
if [ -f "zifeng-server/src/main/resources/application-prod.yml" ]; then
    check_pass "SpringBoot生产配置文件存在"
else
    check_fail "SpringBoot生产配置文件缺失"
fi

# 检查SSL证书
if [ "${DEPLOY_TYPE}" != "k8s" ]; then
    if [ -d "deploy/nginx/ssl" ] && [ -f "deploy/nginx/ssl/fullchain.pem" ]; then
        check_pass "SSL证书文件存在"
        # 检查证书有效期
        if command -v openssl &>/dev/null; then
            EXPIRY=$(openssl x509 -enddate -noout -in deploy/nginx/ssl/fullchain.pem 2>/dev/null | cut -d= -f2)
            if [ -n "${EXPIRY}" ]; then
                EXPIRY_EPOCH=$(date -d "${EXPIRY}" +%s 2>/dev/null || echo "0")
                NOW_EPOCH=$(date +%s)
                DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))
                if [ ${DAYS_LEFT} -gt 30 ]; then
                    check_pass "SSL证书有效期剩余 ${DAYS_LEFT} 天"
                elif [ ${DAYS_LEFT} -gt 0 ]; then
                    check_warn "SSL证书即将过期，剩余 ${DAYS_LEFT} 天"
                else
                    check_fail "SSL证书已过期"
                fi
            fi
        fi
    else
        check_warn "SSL证书文件未找到（首次部署可使用自签名证书）"
    fi
fi

echo ""

# ==================== 3. Docker检查 ====================
echo ">>> 3. Docker环境检查"

if command -v docker &>/dev/null; then
    check_pass "Docker已安装: $(docker --version)"

    if docker info &>/dev/null; then
        check_pass "Docker守护进程运行中"
    else
        check_fail "Docker守护进程未运行"
    fi

    # 检查Docker磁盘空间
    DOCKER_DISK=$(docker system df 2>/dev/null | grep -A1 "TYPE" | tail -1 | awk '{print $3}' || echo "unknown")
    check_warn "Docker磁盘使用: ${DOCKER_DISK}"

else
    check_fail "Docker未安装"
fi

if command -v docker-compose &>/dev/null || docker compose version &>/dev/null; then
    check_pass "Docker Compose已安装"
else
    check_fail "Docker Compose未安装"
fi

echo ""

# ==================== 4. 端口检查 ====================
echo ">>> 4. 端口占用检查"

REQUIRED_PORTS="80 443"
for port in ${REQUIRED_PORTS}; do
    if ss -tlnp 2>/dev/null | grep -q ":${port} " || netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
        check_warn "端口 ${port} 已被占用（可能是旧服务）"
    else
        check_pass "端口 ${port} 可用"
    fi
done

echo ""

# ==================== 5. 数据库检查 ====================
echo ">>> 5. 数据库检查"

# 检查MySQL连接（如果已有运行中的MySQL）
if docker exec zifeng-mysql mysqladmin ping -h localhost --silent 2>/dev/null; then
    check_pass "MySQL连接正常"

    # 检查数据库大小
    DB_SIZE=$(docker exec zifeng-mysql mysql -u root -p"${MYSQL_ROOT_PASSWORD:-root}" -e \
        "SELECT ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size_MB' FROM information_schema.tables WHERE table_schema = 'zifeng_novel';" -sN 2>/dev/null || echo "N/A")
    check_warn "数据库大小: ${DB_SIZE} MB"
else
    check_warn "MySQL未运行（首次部署将自动创建）"
fi

echo ""

# ==================== 6. 磁盘空间检查 ====================
echo ">>> 6. 系统资源检查"

# 磁盘空间
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "${DISK_USAGE}" -lt 70 ]; then
    check_pass "磁盘使用率: ${DISK_USAGE}%"
elif [ "${DISK_USAGE}" -lt 90 ]; then
    check_warn "磁盘使用率: ${DISK_USAGE}% (建议清理)"
else
    check_fail "磁盘使用率: ${DISK_USAGE}% (空间不足)"
fi

# 内存
MEM_AVAILABLE=$(free -m | grep Mem | awk '{printf("%.0f", $7)}')
if [ "${MEM_AVAILABLE}" -gt 2048 ]; then
    check_pass "可用内存: ${MEM_AVAILABLE}MB"
elif [ "${MEM_AVAILABLE}" -gt 1024 ]; then
    check_warn "可用内存: ${MEM_AVAILABLE}MB (偏低)"
else
    check_fail "可用内存: ${MEM_AVAILABLE}MB (不足)"
fi

echo ""

# ==================== 7. 安全检查 ====================
echo ">>> 7. 安全检查"

# 检查是否有敏感文件在Git中
if git ls-files | grep -qiE '\.(pem|key|p12)\.production$'; then
    check_fail "发现敏感文件被Git追踪"
else
    check_pass "无敏感文件被Git追踪"
fi

# 检查.gitignore
if grep -q "\.env" .gitignore 2>/dev/null; then
    check_pass ".env已在.gitignore中"
else
    check_fail ".env未在.gitignore中"
fi

# 检查CORS配置
if grep -q "localhost" deploy/.env 2>/dev/null; then
    check_warn "CORS配置中包含localhost（生产环境应使用实际域名）"
fi

echo ""

# ==================== 8. 备份检查 ====================
echo ">>> 8. 备份检查"

BACKUP_DIR="/opt/zifeng-novel/backups"
if [ -d "${BACKUP_DIR}" ]; then
    LATEST_BACKUP=$(ls -1t "${BACKUP_DIR}" 2>/dev/null | head -1)
    if [ -n "${LATEST_BACKUP}" ]; then
        check_pass "最新备份: ${LATEST_BACKUP}"
    else
        check_warn "备份目录为空"
    fi
else
    check_warn "备份目录不存在（首次部署可忽略）"
fi

# 检查备份cron
if crontab -l 2>/dev/null | grep -q "backup.sh"; then
    check_pass "备份定时任务已配置"
else
    check_warn "备份定时任务未配置"
fi

echo ""

# ==================== 检查结果汇总 ====================
echo "============================================================"
echo "  检查结果汇总"
echo "============================================================"
echo -e "  ${GREEN}通过: ${PASS}${NC}"
echo -e "  ${YELLOW}警告: ${WARN}${NC}"
echo -e "  ${RED}失败: ${FAIL}${NC}"
echo ""

if [ ${FAIL} -gt 0 ]; then
    echo -e "${RED}存在 ${FAIL} 项失败检查，请修复后再上线！${NC}"
    exit 1
elif [ ${WARN} -gt 0 ]; then
    echo -e "${YELLOW}存在 ${WARN} 项警告，建议处理后再上线。${NC}"
    echo -n "是否忽略警告继续？(y/N): "
    read -r answer
    if [ "${answer}" != "y" ] && [ "${answer}" != "Y" ]; then
        echo "已取消上线"
        exit 1
    fi
fi

echo -e "${GREEN}检查通过，可以上线！${NC}"
exit 0
