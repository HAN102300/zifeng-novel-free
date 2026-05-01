#!/bin/bash
# ============================================================
# 紫枫免费小说 - 数据备份脚本
# 用法：./backup.sh [full|mysql|redis|uploads]
# 默认：full（全量备份）
# ============================================================
set -euo pipefail

# 配置
BACKUP_DIR="/opt/zifeng-novel/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="${1:-full}"
COMPOSE_FILE="/opt/zifeng-novel/docker-compose.prod.yml"

# 创建备份目录
mkdir -p "${BACKUP_DIR}/${TIMESTAMP}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ---- MySQL备份 ----
backup_mysql() {
    log_info "开始备份MySQL数据库..."
    local backup_file="${BACKUP_DIR}/${TIMESTAMP}/mysql_zifeng_novel.sql.gz"

    docker exec zifeng-mysql mysqldump \
        -u root \
        -p"${MYSQL_ROOT_PASSWORD:-Zifeng2024!Root}" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        --set-gtid-purged=OFF \
        zifeng_novel | gzip > "${backup_file}"

    local size=$(du -h "${backup_file}" | cut -f1)
    log_info "MySQL备份完成: ${backup_file} (${size})"
}

# ---- Redis备份 ----
backup_redis() {
    log_info "开始备份Redis数据..."
    local backup_file="${BACKUP_DIR}/${TIMESTAMP}/redis_dump.rdb"

    # 触发BGSAVE
    docker exec zifeng-redis redis-cli \
        -a "${REDIS_PASSWORD:-Zifeng2024!Redis}" \
        BGSAVE

    # 等待BGSAVE完成
    local retry=0
    while [ $retry -lt 30 ]; do
        local status=$(docker exec zifeng-redis redis-cli \
            -a "${REDIS_PASSWORD:-Zifeng2024!Redis}" \
            LASTSAVE)
        sleep 1
        retry=$((retry + 1))
        # 简单等待
        if [ $retry -gt 3 ]; then break; fi
    done

    # 从容器中复制RDB文件
    docker cp zifeng-redis:/data/dump.rdb "${backup_file}"

    # 压缩
    gzip "${backup_file}"

    local size=$(du -h "${backup_file}.gz" | cut -f1)
    log_info "Redis备份完成: ${backup_file}.gz (${size})"
}

# ---- 上传文件备份 ----
backup_uploads() {
    log_info "开始备份上传文件..."
    local backup_file="${BACKUP_DIR}/${TIMESTAMP}/uploads.tar.gz"

    docker run --rm \
        -v zifeng-server_uploads:/data:ro \
        -v "${BACKUP_DIR}/${TIMESTAMP}:/backup" \
        alpine tar czf /backup/uploads.tar.gz -C /data .

    local size=$(du -h "${backup_file}" | cut -f1)
    log_info "上传文件备份完成: ${backup_file} (${size})"
}

# ---- 清理过期备份 ----
cleanup_old_backups() {
    log_info "清理${RETENTION_DAYS}天前的备份..."
    find "${BACKUP_DIR}" -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +
    log_info "过期备份清理完成"
}

# ---- 生成备份元信息 ----
generate_manifest() {
    cat > "${BACKUP_DIR}/${TIMESTAMP}/manifest.json" << EOF
{
    "timestamp": "${TIMESTAMP}",
    "type": "${BACKUP_TYPE}",
    "date": "$(date -Iseconds)",
    "version": "$(git -C /opt/zifeng-novel describe --tags --always 2>/dev/null || echo 'unknown')",
    "files": $(ls -1 "${BACKUP_DIR}/${TIMESTAMP}/" | jq -R . | jq -s .)
}
EOF
    log_info "备份清单已生成"
}

# ---- 主流程 ----
main() {
    log_info "========== 开始备份 [${BACKUP_TYPE}] =========="
    log_info "备份目录: ${BACKUP_DIR}/${TIMESTAMP}"

    case "${BACKUP_TYPE}" in
        full)
            backup_mysql
            backup_redis
            backup_uploads
            ;;
        mysql)
            backup_mysql
            ;;
        redis)
            backup_redis
            ;;
        uploads)
            backup_uploads
            ;;
        *)
            log_error "未知备份类型: ${BACKUP_TYPE}"
            echo "用法: $0 [full|mysql|redis|uploads]"
            exit 1
            ;;
    esac

    generate_manifest
    cleanup_old_backups

    # 计算总备份大小
    local total_size=$(du -sh "${BACKUP_DIR}/${TIMESTAMP}" | cut -f1)
    log_info "========== 备份完成 =========="
    log_info "总大小: ${total_size}"
    log_info "备份路径: ${BACKUP_DIR}/${TIMESTAMP}"
}

main
