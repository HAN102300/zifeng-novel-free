#!/bin/bash
# ============================================================
# 紫枫免费小说 - 健康检查与告警脚本
# 建议通过cron每5分钟执行一次
# crontab: */5 * * * * /opt/zifeng-novel/scripts/health-check.sh
# ============================================================
set -euo pipefail

# 配置
COMPOSE_FILE="/opt/zifeng-novel/docker-compose.prod.yml"
LOG_FILE="/opt/zifeng-novel/logs/health-check.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"  # 钉钉/飞书/Slack Webhook
ALERT_EMAIL="${ALERT_EMAIL:-}"           # 告警邮箱

# 阈值配置
CPU_THRESHOLD=80          # CPU使用率告警阈值(%)
MEM_THRESHOLD=85          # 内存使用率告警阈值(%)
DISK_THRESHOLD=90         # 磁盘使用率告警阈值(%)
MYSQL_CONN_THRESHOLD=150  # MySQL连接数阈值
REDIS_MEM_THRESHOLD_MB=200 # Redis内存阈值(MB)

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

mkdir -p "$(dirname ${LOG_FILE})"

# ---- 日志函数 ----
log() {
    local level=$1
    shift
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] $*" | tee -a "${LOG_FILE}"
}

# ---- 告警通知 ----
send_alert() {
    local title=$1
    local message=$2
    log "ALERT" "${title}: ${message}"

    # 钉钉/飞书Webhook通知
    if [ -n "${ALERT_WEBHOOK}" ]; then
        curl -s -X POST "${ALERT_WEBHOOK}" \
            -H 'Content-Type: application/json' \
            -d "{
                \"msgtype\": \"markdown\",
                \"markdown\": {
                    \"title\": \"${title}\",
                    \"text\": \"## ${title}\n\n${message}\n\n> 时间: $(date '+%Y-%m-%d %H:%M:%S')\"
                }
            }" > /dev/null 2>&1 || true
    fi
}

# ---- 检查容器状态 ----
check_containers() {
    local failed=()
    local services="zifeng-nginx zifeng-server zifeng-parser zifeng-web zifeng-admin zifeng-mysql zifeng-redis"

    for svc in ${services}; do
        local status=$(docker inspect -f '{{.State.Status}}' "${svc}" 2>/dev/null || echo "not_found")
        local health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${svc}" 2>/dev/null || echo "unknown")

        if [ "${status}" != "running" ]; then
            failed+=("${svc}: 状态=${status}")
        elif [ "${health}" = "unhealthy" ]; then
            failed+=("${svc}: 健康检查失败")
        fi
    done

    if [ ${#failed[@]} -gt 0 ]; then
        send_alert "容器异常告警" "以下容器状态异常:\n$(printf '%s\n' "${failed[@]}")"
        return 1
    fi

    log "INFO" "所有容器状态正常"
    return 0
}

# ---- 检查HTTP端点 ----
check_http_endpoints() {
    local failed=()
    local endpoints=(
        "http://localhost/nginx-health|Nginx网关"
        "http://localhost/api/health|Parser服务"
    )

    for ep in "${endpoints[@]}"; do
        local url="${ep%%|*}"
        local name="${ep##*|}"
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "${url}" 2>/dev/null || echo "000")

        if [ "${http_code}" != "200" ]; then
            failed+=("${name}(${url}): HTTP ${http_code}")
        fi
    done

    if [ ${#failed[@]} -gt 0 ]; then
        send_alert "HTTP端点异常" "以下端点响应异常:\n$(printf '%s\n' "${failed[@]}")"
        return 1
    fi

    log "INFO" "所有HTTP端点正常"
    return 0
}

# ---- 检查系统资源 ----
check_system_resources() {
    local alerts=()

    # CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d. -f1)
    if [ -n "${cpu_usage}" ] && [ "${cpu_usage}" -gt ${CPU_THRESHOLD} ]; then
        alerts+=("CPU使用率: ${cpu_usage}% (阈值: ${CPU_THRESHOLD}%)")
    fi

    # 内存使用率
    local mem_usage=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100)}')
    if [ -n "${mem_usage}" ] && [ "${mem_usage}" -gt ${MEM_THRESHOLD} ]; then
        alerts+=("内存使用率: ${mem_usage}% (阈值: ${MEM_THRESHOLD}%)")
    fi

    # 磁盘使用率
    local disk_usage=$(df -h / | tail -1 | awk '{print $5}' | tr -d '%')
    if [ -n "${disk_usage}" ] && [ "${disk_usage}" -gt ${DISK_THRESHOLD} ]; then
        alerts+=("磁盘使用率: ${disk_usage}% (阈值: ${DISK_THRESHOLD}%)")
    fi

    if [ ${#alerts[@]} -gt 0 ]; then
        send_alert "系统资源告警" "以下资源超过阈值:\n$(printf '%s\n' "${alerts[@]}")"
        return 1
    fi

    log "INFO" "系统资源正常 (CPU:${cpu_usage}% MEM:${mem_usage}% DISK:${disk_usage}%)"
    return 0
}

# ---- 检查MySQL状态 ----
check_mysql() {
    local alerts=()

    # 连接数
    local conn_count=$(docker exec zifeng-mysql mysql \
        -u root -p"${MYSQL_ROOT_PASSWORD:-Zifeng2024!Root}" \
        -e "SHOW STATUS LIKE 'Threads_connected'" -sN 2>/dev/null | awk '{print $2}')

    if [ -n "${conn_count}" ] && [ "${conn_count}" -gt ${MYSQL_CONN_THRESHOLD} ]; then
        alerts+=("MySQL连接数: ${conn_count} (阈值: ${MYSQL_CONN_THRESHOLD})")
    fi

    # 从库延迟（如果有）
    local slave_status=$(docker exec zifeng-mysql mysql \
        -u root -p"${MYSQL_ROOT_PASSWORD:-Zifeng2024!Root}" \
        -e "SHOW SLAVE STATUS\G" 2>/dev/null || echo "")

    if echo "${slave_status}" | grep -q "Seconds_Behind_Master"; then
        local delay=$(echo "${slave_status}" | grep "Seconds_Behind_Master" | awk '{print $2}')
        if [ "${delay}" != "0" ] && [ "${delay}" != "NULL" ]; then
            alerts+=("MySQL从库延迟: ${delay}s")
        fi
    fi

    if [ ${#alerts[@]} -gt 0 ]; then
        send_alert "MySQL告警" "$(printf '%s\n' "${alerts[@]}")"
        return 1
    fi

    log "INFO" "MySQL状态正常 (连接数:${conn_count:-N/A})"
    return 0
}

# ---- 检查Redis状态 ----
check_redis() {
    local alerts=()

    local info=$(docker exec zifeng-redis redis-cli \
        -a "${REDIS_PASSWORD:-Zifeng2024!Redis}" \
        INFO memory 2>/dev/null)

    local used_memory_mb=$(echo "${info}" | grep "used_memory:" | awk '{printf("%.0f", $2/1024/1024)}')

    if [ -n "${used_memory_mb}" ] && [ "${used_memory_mb}" -gt ${REDIS_MEM_THRESHOLD_MB} ]; then
        alerts+=("Redis内存: ${used_memory_mb}MB (阈值: ${REDIS_MEM_THRESHOLD_MB}MB)")
    fi

    if [ ${#alerts[@]} -gt 0 ]; then
        send_alert "Redis告警" "$(printf '%s\n' "${alerts[@]}")"
        return 1
    fi

    log "INFO" "Redis状态正常 (内存:${used_memory_mb:-N/A}MB)"
    return 0
}

# ---- 自动恢复 ----
auto_recover() {
    local service=$1
    log "WARN" "尝试自动恢复 ${service}..."

    case "${service}" in
        zifeng-server|zifeng-parser|zifeng-web|zifeng-admin|zifeng-nginx)
            docker restart "${service}"
            sleep 15
            local new_status=$(docker inspect -f '{{.State.Status}}' "${service}" 2>/dev/null || echo "unknown")
            if [ "${new_status}" = "running" ]; then
                log "INFO" "${service} 自动恢复成功"
            else
                send_alert "自动恢复失败" "${service} 重启后仍然异常，需要人工介入"
            fi
            ;;
        *)
            log "WARN" "${service} 不支持自动恢复，需要人工处理"
            ;;
    esac
}

# ---- 主流程 ----
main() {
    log "INFO" "========== 健康检查开始 =========="

    local has_error=0

    check_containers  || has_error=1
    check_http_endpoints || has_error=1
    check_system_resources || has_error=1
    check_mysql || has_error=1
    check_redis || has_error=1

    if [ ${has_error} -eq 0 ]; then
        log "INFO" "========== 健康检查通过 =========="
    else
        log "WARN" "========== 健康检查发现问题 =========="
    fi

    return ${has_error}
}

main
