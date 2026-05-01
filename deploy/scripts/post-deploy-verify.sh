#!/bin/bash
# ============================================================
# 紫枫免费小说 - 上线后验证脚本
# 用法：./post-deploy-verify.sh [compose|swarm|k8s]
# 在部署完成后执行，验证所有服务是否正常
# ============================================================
set -euo pipefail

DEPLOY_TYPE="${1:-compose}"
DOMAIN="${DOMAIN:-localhost}"
PROTOCOL="https"

if [ "${DOMAIN}" = "localhost" ]; then
    PROTOCOL="http"
fi

BASE_URL="${PROTOCOL}://${DOMAIN}"
PASS=0
FAIL=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

verify_pass() { PASS=$((PASS+1)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
verify_fail() { FAIL=$((FAIL+1)); echo -e "  ${RED}[FAIL]${NC} $1"; }

echo "============================================================"
echo "  紫枫免费小说 - 上线后验证"
echo "  验证时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  目标地址: ${BASE_URL}"
echo "============================================================"
echo ""

# ==================== 1. 容器/服务状态 ====================
echo ">>> 1. 服务状态验证"

if [ "${DEPLOY_TYPE}" = "compose" ]; then
    SERVICES="zifeng-nginx zifeng-server zifeng-parser zifeng-web zifeng-admin zifeng-mysql zifeng-redis"
    for svc in ${SERVICES}; do
        STATUS=$(docker inspect -f '{{.State.Status}}' "${svc}" 2>/dev/null || echo "not_found")
        HEALTH=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${svc}" 2>/dev/null || echo "unknown")
        if [ "${STATUS}" = "running" ] && [ "${HEALTH}" != "unhealthy" ]; then
            verify_pass "${svc}: running (health: ${HEALTH})"
        else
            verify_fail "${svc}: ${STATUS} (health: ${HEALTH})"
        fi
    done
elif [ "${DEPLOY_TYPE}" = "swarm" ]; then
    # Docker Swarm验证
    SERVICES="nginx server parser web admin mysql-master redis-master"
    for svc in ${SERVICES}; do
        REPLICAS=$(docker service ls --filter "name=zifeng_${svc}" --format "{{.Replicas}}" 2>/dev/null || echo "0/0")
        if echo "${REPLICAS}" | grep -q "/"; then
            CURRENT=$(echo "${REPLICAS}" | cut -d/ -f1)
            DESIRED=$(echo "${REPLICAS}" | cut -d/ -f2)
            if [ "${CURRENT}" = "${DESIRED}" ]; then
                verify_pass "${svc}: ${REPLICAS}"
            else
                verify_fail "${svc}: ${REPLICAS} (未达到期望副本数)"
            fi
        else
            verify_fail "${svc}: 服务未找到"
        fi
    done
elif [ "${DEPLOY_TYPE}" = "k8s" ]; then
    # Kubernetes验证
    DEPLOYMENTS="server parser web admin"
    for dep in ${DEPLOYMENTS}; do
        READY=$(kubectl get deployment zifeng-novel-${dep} -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        DESIRED=$(kubectl get deployment zifeng-novel-${dep} -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
        if [ "${READY}" = "${DESIRED}" ] && [ "${READY}" != "0" ]; then
            verify_pass "${dep}: ${READY}/${DESIRED} ready"
        else
            verify_fail "${dep}: ${READY}/${DESIRED} ready"
        fi
    done
fi

echo ""

# ==================== 2. HTTP端点验证 ====================
echo ">>> 2. HTTP端点验证"

# Nginx网关健康检查
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/nginx-health" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    verify_pass "Nginx网关: HTTP ${HTTP_CODE}"
else
    verify_fail "Nginx网关: HTTP ${HTTP_CODE}"
fi

# Parser健康检查
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/health" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    verify_pass "Parser API: HTTP ${HTTP_CODE}"
else
    verify_fail "Parser API: HTTP ${HTTP_CODE}"
fi

# SpringBoot健康检查
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/api/auth/info" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ] || [ "${HTTP_CODE}" = "401" ]; then
    verify_pass "Server API: HTTP ${HTTP_CODE}"
else
    verify_fail "Server API: HTTP ${HTTP_CODE}"
fi

# 前台页面
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    verify_pass "前台页面: HTTP ${HTTP_CODE}"
else
    verify_fail "前台页面: HTTP ${HTTP_CODE}"
fi

# 后台管理页面
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}/admin/" 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" = "200" ]; then
    verify_pass "后台管理: HTTP ${HTTP_CODE}"
else
    verify_fail "后台管理: HTTP ${HTTP_CODE}"
fi

echo ""

# ==================== 3. 功能验证 ====================
echo ">>> 3. 核心功能验证"

# 搜索API
SEARCH_RESULT=$(curl -s --max-time 15 -X POST "${BASE_URL}/api/search" \
    -H "Content-Type: application/json" \
    -d '{"source":{"bookSourceUrl":"https://www.biquge.cn","bookSourceName":"测试","ruleSearch":{"bookList":".result-list .result-item","name":".result-game-item-detail a h3","author":".result-game-item-detail .result-game-item-info span:nth-child(1) em"}},"keyword":"斗破苍穹"}' 2>/dev/null || echo "")
if echo "${SEARCH_RESULT}" | grep -q '"success"'; then
    verify_pass "搜索API响应正常"
else
    verify_fail "搜索API响应异常"
fi

# 注册API（检查端点可达）
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST "${BASE_URL}/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{}' 2>/dev/null || echo "000")
if [ "${HTTP_CODE}" != "000" ]; then
    verify_pass "注册API端点可达: HTTP ${HTTP_CODE}"
else
    verify_fail "注册API端点不可达"
fi

echo ""

# ==================== 4. 安全验证 ====================
echo ">>> 4. 安全验证"

# HTTPS检查
if [ "${PROTOCOL}" = "https" ]; then
    SSL_VERIFY=$(curl -s -o /dev/null -w "%{ssl_verify_result}" --max-time 10 "${BASE_URL}" 2>/dev/null || echo "1")
    if [ "${SSL_VERIFY}" = "0" ]; then
        verify_pass "SSL证书验证通过"
    else
        verify_fail "SSL证书验证失败"
    fi
fi

# 安全头检查
SECURITY_HEADERS=$(curl -sI --max-time 10 "${BASE_URL}" 2>/dev/null || echo "")
if echo "${SECURITY_HEADERS}" | grep -qi "X-Content-Type-Options"; then
    verify_pass "X-Content-Type-Options头存在"
else
    verify_fail "X-Content-Type-Options头缺失"
fi

if echo "${SECURITY_HEADERS}" | grep -qi "X-Frame-Options"; then
    verify_pass "X-Frame-Options头存在"
else
    verify_fail "X-Frame-Options头缺失"
fi

echo ""

# ==================== 5. 性能基线 ====================
echo ">>> 5. 性能基线（首次请求）"

# 首页加载时间
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 30 "${BASE_URL}/" 2>/dev/null || echo "99")
if [ "$(echo "${RESPONSE_TIME} < 3.0" | bc 2>/dev/null || echo "0")" = "1" ]; then
    verify_pass "首页响应时间: ${RESPONSE_TIME}s"
else
    verify_fail "首页响应时间: ${RESPONSE_TIME}s (超过3秒)"
fi

# API响应时间
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "${BASE_URL}/api/health" 2>/dev/null || echo "99")
if [ "$(echo "${RESPONSE_TIME} < 1.0" | bc 2>/dev/null || echo "0")" = "1" ]; then
    verify_pass "API响应时间: ${RESPONSE_TIME}s"
else
    verify_fail "API响应时间: ${RESPONSE_TIME}s (超过1秒)"
fi

echo ""

# ==================== 验证结果汇总 ====================
echo "============================================================"
echo "  验证结果汇总"
echo "============================================================"
echo -e "  ${GREEN}通过: ${PASS}${NC}"
echo -e "  ${RED}失败: ${FAIL}${NC}"
echo ""

if [ ${FAIL} -gt 0 ]; then
    echo -e "${RED}存在 ${FAIL} 项验证失败，请检查服务状态！${NC}"
    echo ""
    echo "排查建议："
    echo "  1. 查看容器日志: docker logs <container_name>"
    echo "  2. 检查网络连通: docker network inspect zifeng-net"
    echo "  3. 检查配置文件: cat deploy/.env"
    echo "  4. 检查磁盘空间: df -h"
    exit 1
else
    echo -e "${GREEN}所有验证通过，上线成功！${NC}"
    exit 0
fi
