#!/bin/bash
# ============================================================
# 紫枫免费小说 - 数据恢复脚本
# 用法：./restore.sh <备份时间戳> [mysql|redis|uploads|full]
# 示例：./restore.sh 20240101_120000 mysql
# ============================================================
set -euo pipefail

BACKUP_DIR="/opt/zifeng-novel/backups"
RESTORE_TYPE="${2:-full}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 参数检查
if [ $# -lt 1 ]; then
    log_error "缺少备份时间戳参数"
    echo "用法: $0 <备份时间戳> [mysql|redis|uploads|full]"
    echo "示例: $0 20240101_120000 mysql"
    echo ""
    echo "可用备份列表:"
    ls -1 "${BACKUP_DIR}" 2>/dev/null || echo "  (无备份)"
    exit 1
fi

TIMESTAMP="$1"
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

if [ ! -d "${BACKUP_PATH}" ]; then
    log_error "备份目录不存在: ${BACKUP_PATH}"
    exit 1
fi

# 安全确认
log_warn "即将恢复 ${RESTORE_TYPE} 数据，来源: ${TIMESTAMP}"
log_warn "此操作将覆盖当前数据！"
read -p "确认继续？(输入 YES 确认): " confirm
if [ "${confirm}" != "YES" ]; then
    log_info "已取消恢复操作"
    exit 0
fi

# ---- MySQL恢复 ----
restore_mysql() {
    local backup_file="${BACKUP_PATH}/mysql_zifeng_novel.sql.gz"
    if [ ! -f "${backup_file}" ]; then
        log_error "MySQL备份文件不存在: ${backup_file}"
        return 1
    fi

    log_info "开始恢复MySQL数据库..."
    log_warn "恢复期间服务将不可用"

    # 停止后端服务避免写入
    docker stop zifeng-server 2>/dev/null || true

    # 恢复数据
    gunzip -c "${backup_file}" | docker exec -i zifeng-mysql mysql \
        -u root \
        -p"${MYSQL_ROOT_PASSWORD:-Zifeng2024!Root}" \
        zifeng_novel

    log_info "MySQL恢复完成"
    docker start zifeng-server 2>/dev/null || true
}

# ---- Redis恢复 ----
restore_redis() {
    local backup_file="${BACKUP_PATH}/redis_dump.rdb.gz"
    if [ ! -f "${backup_file}" ]; then
        log_error "Redis备份文件不存在: ${backup_file}"
        return 1
    fi

    log_info "开始恢复Redis数据..."

    # 停止Redis
    docker stop zifeng-redis

    # 解压并复制RDB文件
    gunzip -c "${backup_file}" > /tmp/redis_dump.rdb
    docker cp /tmp/redis_dump.rdb zifeng-redis:/data/dump.rdb
    rm -f /tmp/redis_dump.rdb

    # 启动Redis
    docker start zifeng-redis

    log_info "Redis恢复完成"
}

# ---- 上传文件恢复 ----
restore_uploads() {
    local backup_file="${BACKUP_PATH}/uploads.tar.gz"
    if [ ! -f "${backup_file}" ]; then
        log_error "上传文件备份不存在: ${backup_file}"
        return 1
    fi

    log_info "开始恢复上传文件..."

    docker run --rm \
        -v zifeng-server_uploads:/data \
        -v "${BACKUP_PATH}:/backup:ro" \
        alpine sh -c "cd /data && tar xzf /backup/uploads.tar.gz"

    log_info "上传文件恢复完成"
}

# ---- 主流程 ----
main() {
    log_info "========== 开始恢复 [${RESTORE_TYPE}] =========="
    log_info "备份来源: ${TIMESTAMP}"

    case "${RESTORE_TYPE}" in
        full)
            restore_mysql
            restore_redis
            restore_uploads
            ;;
        mysql)
            restore_mysql
            ;;
        redis)
            restore_redis
            ;;
        uploads)
            restore_uploads
            ;;
        *)
            log_error "未知恢复类型: ${RESTORE_TYPE}"
            exit 1
            ;;
    esac

    log_info "========== 恢复完成 =========="
    log_info "建议重启所有服务: docker compose -f docker-compose.prod.yml restart"
}

main
