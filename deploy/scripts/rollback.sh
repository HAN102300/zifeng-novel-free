#!/bin/bash
# ============================================================
# 紫枫免费小说 - 回滚脚本
# 用法：./rollback.sh [compose|swarm|k8s] [版本标签]
# ============================================================
set -euo pipefail

DEPLOY_TYPE="${1:-compose}"
ROLLBACK_VERSION="${2:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================================"
echo "  紫枫免费小说 - 回滚操作"
echo "  部署类型: ${DEPLOY_TYPE}"
echo "  回滚版本: ${ROLLBACK_VERSION:-上一个版本}"
echo "============================================================"
echo ""

# 安全确认
log_warn "回滚操作将恢复到之前的版本，当前版本数据可能受影响！"
read -p "确认执行回滚？(输入 ROLLBACK 确认): " confirm
if [ "${confirm}" != "ROLLBACK" ]; then
    log_info "已取消回滚操作"
    exit 0
fi

# ==================== 方案A: Docker Compose 回滚 ====================
rollback_compose() {
    log_info "开始 Docker Compose 回滚..."

    # 1. 拉取指定版本镜像
    if [ -n "${ROLLBACK_VERSION}" ]; then
        log_info "拉取回滚版本镜像: ${ROLLBACK_VERSION}"
        export IMAGE_TAG="${ROLLBACK_VERSION}"
    fi

    # 2. 恢复数据库（如果有备份）
    LATEST_BACKUP=$(ls -1t /opt/zifeng-novel/backups 2>/dev/null | head -1)
    if [ -n "${LATEST_BACKUP}" ]; then
        log_warn "发现最新备份: ${LATEST_BACKUP}"
        read -p "是否同时恢复数据库？(y/N): " restore_db
        if [ "${restore_db}" = "y" ] || [ "${restore_db}" = "Y" ]; then
            /opt/zifeng-novel/scripts/restore.sh "${LATEST_BACKUP}" mysql
        fi
    fi

    # 3. 停止当前服务
    log_info "停止当前服务..."
    docker compose -f deploy/docker-compose.prod.yml down

    # 4. 使用之前版本的镜像启动
    log_info "启动回滚版本..."
    docker compose -f deploy/docker-compose.prod.yml up -d

    # 5. 等待服务就绪
    log_info "等待服务启动..."
    sleep 30

    # 6. 验证
    curl -sf http://localhost/nginx-health && log_info "Nginx网关正常" || log_error "Nginx网关异常"
    curl -sf http://localhost/api/health && log_info "Parser服务正常" || log_error "Parser服务异常"
}

# ==================== 方案B: Docker Swarm 回滚 ====================
rollback_swarm() {
    log_info "开始 Docker Swarm 回滚..."

    if [ -n "${ROLLBACK_VERSION}" ]; then
        # 回滚到指定版本
        log_info "回滚到版本: ${ROLLBACK_VERSION}"
        export IMAGE_TAG="${ROLLBACK_VERSION}"
        docker stack deploy -c deploy/swarm/docker-stack.yml zifeng
    else
        # 使用Docker Swarm内置回滚
        log_info "使用Docker Swarm内置回滚机制..."

        SERVICES="server parser web admin"
        for svc in ${SERVICES}; do
            log_info "回滚服务: zifeng_${svc}"
            docker service rollback zifeng_${svc} 2>/dev/null && \
                log_info "${svc} 回滚成功" || \
                log_warn "${svc} 无可回滚版本"
        done
    fi

    # 验证
    sleep 30
    curl -sf http://localhost/nginx-health && log_info "回滚验证通过" || log_error "回滚验证失败"
}

# ==================== 方案C: Kubernetes 回滚 ====================
rollback_k8s() {
    log_info "开始 Kubernetes 回滚..."

    if [ -n "${ROLLBACK_VERSION}" ]; then
        # 通过ArgoCD回滚到指定版本
        log_info "通过ArgoCD回滚到版本: ${ROLLBACK_VERSION}"

        # 方法1: 回退Git仓库到指定tag
        # argocd app set zifeng-novel --revision ${ROLLBACK_VERSION}
        # argocd app sync zifeng-novel

        # 方法2: 直接修改Helm values中的image tag
        helm upgrade zifeng-novel deploy/k8s/helm/zifeng-novel \
            --set server.image.tag=${ROLLBACK_VERSION} \
            --set parser.image.tag=${ROLLBACK_VERSION} \
            --set web.image.tag=${ROLLBACK_VERSION} \
            --set admin.image.tag=${ROLLBACK_VERSION} \
            --namespace zifeng-novel
    else
        # 使用Kubernetes Deployment回滚
        DEPLOYMENTS="server parser web admin"
        for dep in ${DEPLOYMENTS}; do
            log_info "回滚Deployment: zifeng-novel-${dep}"
            kubectl rollout undo deployment/zifeng-novel-${dep} -n zifeng-novel && \
                log_info "${dep} 回滚成功" || \
                log_warn "${dep} 无可回滚版本"
        done
    fi

    # 等待回滚完成
    log_info "等待回滚完成..."
    kubectl rollout status deployment/zifeng-novel-server -n zifeng-novel --timeout=300s

    # 验证
    log_info "验证回滚结果..."
    kubectl get pods -n zifeng-novel -l app.kubernetes.io/name=zifeng-novel
}

# ==================== 主流程 ====================
case "${DEPLOY_TYPE}" in
    compose)
        rollback_compose
        ;;
    swarm)
        rollback_swarm
        ;;
    k8s)
        rollback_k8s
        ;;
    *)
        log_error "未知部署类型: ${DEPLOY_TYPE}"
        echo "用法: $0 [compose|swarm|k8s] [版本标签]"
        exit 1
        ;;
esac

log_info "========== 回滚操作完成 =========="
