#!/bin/bash
# ============================================================
# 紫枫免费小说 - 敏感配置管理方案
# 密钥管理策略：分层管理，最小权限
# ============================================================
#
# ============================================================
# 一、密钥分层管理策略
# ============================================================
#
# 层级1: 代码仓库（.gitignore排除所有敏感文件）
#   - application-prod.yml 中的占位符 ${VAR}
#   - .env.production.template（仅模板，不含真实密码）
#   - Helm values.yaml 中的占位符
#
# 层级2: CI/CD 平台（GitHub Actions Secrets）
#   - 存储部署相关的密钥
#   - 仅CI/CD流水线可访问
#
# 层级3: 运行时环境（服务器本地）
#   - .env 文件（权限600）
#   - Docker Secrets（Swarm方案）
#   - Kubernetes Secrets（K8s方案）
#
# 层级4: 专业密钥管理服务（大规模部署）
#   - HashiCorp Vault
#   - AWS Secrets Manager / Azure Key Vault
#   - Kubernetes External Secrets
#
# ============================================================
# 二、各方案密钥管理实现
# ============================================================
#
# ---- 方案A: Docker Compose ----
# 1. 使用 .env 文件（服务器本地）
#    - 文件权限: chmod 600 .env
#    - 文件所有者: root:root
#    - .gitignore排除: .env, .env.local, .env.*.local
#
# 2. docker-compose.prod.yml 中引用环境变量:
#    environment:
#      - MYSQL_PASSWORD=${MYSQL_PASSWORD}
#    # 而非硬编码密码
#
# 3. 部署流程:
#    scp .env.production.template server:/opt/zifeng/.env
#    ssh server "vim /opt/zifeng/.env"  # 在服务器上编辑填入真实密码
#    ssh server "chmod 600 /opt/zifeng/.env"
#
# ---- 方案B: Docker Swarm ----
# 1. 使用 Docker Secrets
#    echo "my_password" | docker secret create mysql_password -
#
# 2. docker-stack.yml 中引用:
#    secrets:
#      - mysql_password
#    environment:
#      MYSQL_PASSWORD_FILE: /run/secrets/mysql_password
#
# 3. 应用代码需要支持 _FILE 后缀读取:
#    # SpringBoot 可通过启动脚本读取
#    --spring.datasource.password=$(cat /run/secrets/mysql_password)
#
# ---- 方案C: Kubernetes ----
# 1. 使用 Kubernetes Secrets + Sealed Secrets
#    # 加密Secret
#    kubectl create secret generic zifeng-db-secret \
#      --from-literal=username=zifeng \
#      --from-literal=password=STRONG_PASSWORD \
#      --dry-run=client -o yaml | kubeseal -o yaml > sealed-secret.yaml
#
# 2. 使用 External Secrets Operator 对接 Vault
#    apiVersion: external-secrets.io/v1beta1
#    kind: ExternalSecret
#    metadata:
#      name: zifeng-db-secret
#    spec:
#      refreshInterval: 1h
#      secretStoreRef:
#        name: vault-backend
#        kind: ClusterSecretStore
#      target:
#        name: zifeng-db-secret
#      data:
#        - secretKey: password
#          remoteRef:
#            key: secret/zifeng/mysql
#            property: password
#
# ============================================================
# 三、GitHub Actions Secrets 配置清单
# ============================================================
#
# Secret名称                      | 用途
# --------------------------------|--------------------------------
# STAGING_HOST                    | Staging服务器地址
# STAGING_USER                    | Staging SSH用户
# STAGING_SSH_KEY                 | Staging SSH私钥
# PROD_HOST                       | 生产服务器地址
# PROD_USER                       | 生产SSH用户
# PROD_SSH_KEY                    | 生产SSH私钥
# SLACK_WEBHOOK_URL               | Slack通知Webhook
# DOCKER_REGISTRY_TOKEN           | 镜像仓库访问令牌
#
# ============================================================
# 四、密钥轮换策略
# ============================================================
#
# 1. 数据库密码: 每90天轮换
#    - 生成新密码
#    - 更新Secret/环境变量
#    - 在MySQL中执行 ALTER USER
#    - 重启服务
#
# 2. Redis密码: 每90天轮换
#    - 更新Secret/环境变量
#    - 重启Redis和服务
#
# 3. SSL证书: 自动续签（cert-manager / Let's Encrypt）
#
# 4. API密钥: 每次版本发布时检查
#
# 5. SSH密钥: 每年轮换
#
# ============================================================
# 五、安全最佳实践
# ============================================================
#
# 1. 所有密码至少16位，包含大小写字母、数字、特殊字符
# 2. 不同环境使用不同密码
# 3. 密码不记录在日志中
# 4. 使用最小权限原则（MySQL用户仅授权必要权限）
# 5. 定期审计密钥访问日志
# 6. 离职人员密钥立即轮换
# 7. 所有密钥传输使用加密通道（SSH/HTTPS）
