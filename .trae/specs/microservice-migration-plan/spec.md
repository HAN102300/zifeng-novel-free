# 微服务架构升级与部署规划 Spec

## Why
当前项目需要同时运行四个独立服务（Express-Node.js 解析引擎、SpringBoot 后端、前端 Web 网站、后端 Admin 管理后台），随着用户规模增长，单体架构将面临扩展性、可用性和运维效率瓶颈。需提前规划 SpringCloud 微服务架构整合方案、对外开放内测方案和部署上线方案，为后续平滑迁移提供路线图。

## What Changes
- 设计多套 SpringCloud 微服务架构整合方案（含服务拆分策略、组件选型、通信机制、数据一致性、迁移步骤）
- 设计多套对外开放内测方案（含测试环境、权限控制、数据管理、反馈收集）
- 设计多套部署上线方案（含部署架构、CI/CD、灰度发布、监控告警、回滚策略）
- 本 Spec 为纯规划文档，不涉及代码变更

## Impact
- Affected specs: 项目整体架构、服务部署方式、运维流程
- Affected code: 未来迁移时影响 zifeng-server 全部代码、zifeng-parser 全部代码、前端代理配置

---

## ADDED Requirements

### Requirement: SpringCloud 微服务架构整合方案

系统 SHALL 提供多套完整的 SpringCloud 微服务架构整合方案，供后续用户规模增长时选择实施。

#### Scenario: 方案A - 最小拆分方案（2服务）
- **WHEN** 用户规模 < 5000，希望最小改动实现微服务化
- **THEN** 将 zifeng-server 拆为 2 个 SpringBoot 应用：
  - `zifeng-business-service`：用户/书架/阅读/书源/管理后台所有业务
  - `zifeng-parse-service`：将 Node.js 解析引擎用 Java 重写为 SpringBoot 应用，或保留 Node.js 通过 Sidecar 模式接入
  - 新增 `zifeng-gateway`：Spring Cloud Gateway 统一入口
  - 组件选型：Nacos（注册/配置）、Gateway、OpenFeign

#### Scenario: 方案B - 标准微服务方案（4服务）
- **WHEN** 用户规模 5000-50000，需要独立扩展各业务域
- **THEN** 拆为 4 个微服务 + 网关 + 基础设施：
  - `zifeng-user-service`：认证/书架/阅读进度/头像/心跳
  - `zifeng-admin-service`：管理员/仪表盘/用户管理/访问日志
  - `zifeng-source-service`：书源 CRUD/导入导出
  - `zifeng-parse-service`：解析代理 + Node.js 解析引擎（Sidecar 或 Java 重写）
  - `zifeng-gateway`：Spring Cloud Gateway 统一入口
  - 组件选型：Nacos、Gateway、OpenFeign、Sentinel、Seata

#### Scenario: 方案C - 完整云原生方案（6+服务）
- **WHEN** 用户规模 > 50000，需要高可用、弹性伸缩、多区域部署
- **THEN** 在方案B基础上进一步拆分和增强：
  - `zifeng-user-service`、`zifeng-admin-service`、`zifeng-source-service` 同方案B
  - `zifeng-parse-service`：解析代理层（Java）
  - `zifeng-parser-engine`：Node.js 解析引擎（独立部署，多副本）
  - `zifeng-notification-service`：通知/消息推送（新增）
  - `zifeng-gateway`：Spring Cloud Gateway
  - 组件选型：Nacos、Gateway、OpenFeign、Sentinel、Seata、Skywalking、ELK、Prometheus+Grafana
  - 基础设施：Kubernetes 编排、Istio 服务网格

#### Scenario: 服务间通信机制
- **WHEN** 微服务之间需要相互调用
- **THEN** 同步调用使用 OpenFeign + 负载均衡（替代当前 RestTemplate 和跨模块 Repository 注入）
- **AND** 异步场景使用 RabbitMQ 消息队列（访问日志异步写入、书源导入通知等）
- **AND** Sa-Token 微服务模式：各服务共享 Redis Token 存储，网关统一鉴权

#### Scenario: 数据一致性保障
- **WHEN** 跨服务操作需要数据一致性
- **THEN** 强一致性场景使用 Seata AT 模式分布式事务
- **AND** 最终一致性场景使用消息队列 + 本地消息表
- **AND** 每个微服务拥有独立数据库（Database per Service），禁止跨库 JOIN

#### Scenario: 迁移实施步骤
- **WHEN** 从当前单体架构迁移至微服务架构
- **THEN** 按以下步骤渐进迁移：
  1. 引入 Nacos + Gateway，当前 zifeng-server 作为单服务注册到 Nacos
  2. 消除跨模块 Repository 直接注入，改为 Service 层 API 调用
  3. 按优先级拆分服务：parse → source → admin → user
  4. 每拆一个服务，先双写验证，再切换流量
  5. 全部拆分完成后，移除旧的单体服务

#### Scenario: 风险评估
- **WHEN** 评估微服务迁移风险
- **THEN** 识别以下风险并制定缓解措施：
  - 分布式事务复杂度增加 → 优先使用最终一致性，减少强事务场景
  - 运维复杂度增加 → 完善监控告警、统一日志、自动化部署
  - Node.js 解析引擎与 Java 生态整合 → Sidecar 模式或逐步 Java 重写
  - Sa-Token 微服务兼容性 → 已有 Redis 集成，网关统一鉴权即可

---

### Requirement: 对外开放内测方案

系统 SHALL 提供多套安全可控的对外开放内测方案，允许真实用户在本机之外的客户端访问网站。

#### Scenario: 方案A - 局域网内测方案
- **WHEN** 内测用户 < 50 人，在可控局域网内测试
- **THEN** 部署方式：开发机或局域网服务器直接运行，通过局域网 IP 访问
- **AND** 网络配置：修改 Vite 的 host 为 0.0.0.0，后端 CORS 允许局域网 IP
- **AND** 安全措施：仅限局域网访问，不暴露公网，测试数据与生产隔离
- **AND** 优点：零成本、快速启动
- **AND** 缺点：仅限局域网用户，无法远程测试

#### Scenario: 方案B - 云服务器内测方案
- **WHEN** 内测用户 50-500 人，需要远程访问
- **THEN** 部署方式：租用云服务器（2C4G 起步），Docker Compose 一键部署全部服务
- **AND** 网络配置：Nginx 反向代理，域名 + Let's Encrypt HTTPS，WAF 防护
- **AND** 安全措施：
  - 邀请码注册机制（仅持有邀请码的用户可注册）
  - 速率限制（Nginx limit_req + 后端接口限流）
  - 数据脱敏（测试环境使用模拟数据，不导入真实生产数据）
  - IP 白名单 / 地域限制（可选）
- **AND** 测试数据管理：独立测试数据库，定期清理，可从生产库脱敏导入
- **AND** 反馈收集：前端嵌入反馈按钮（链接到问卷/Issue），后端日志收集

#### Scenario: 方案C - 全功能公测方案
- **WHEN** 内测用户 500+ 人，需要完整公测体验
- **THEN** 部署方式：Kubernetes 集群部署，多节点高可用
- **AND** 网络配置：CDN 加速静态资源，多地域部署，域名 + HTTPS
- **AND** 安全措施：
  - OAuth2 第三方登录（微信/QQ/GitHub）
  - 内容审核机制（敏感词过滤）
  - 完整审计日志
  - DDoS 防护（云厂商 WAF + CDN）
- **AND** 版本控制：灰度发布，按用户比例逐步放量
- **AND** 监控告警：Prometheus + Grafana 实时监控，异常自动告警

#### Scenario: 访问权限控制机制
- **WHEN** 控制内测用户的访问权限
- **THEN** 实现邀请码注册机制：
  - 管理后台生成批量邀请码
  - 注册时必须输入有效邀请码
  - 邀请码可设置使用次数限制和过期时间
- **AND** 用户分级：内测用户标记 `beta` 角色，可访问测试功能
- **AND** 管理员可随时禁用/启用内测用户

#### Scenario: 测试反馈收集
- **WHEN** 收集内测用户反馈
- **THEN** 前端嵌入反馈组件（浮动按钮 → 弹窗表单）
- **AND** 反馈数据存储到独立数据表 `feedback`
- **AND** 管理后台可查看和处理反馈
- **AND** 可选：集成第三方反馈平台（如腾讯兔小巢）

---

### Requirement: 部署上线方案

系统 SHALL 提供多套适用于不同规模和需求的部署上线方案。

#### Scenario: 方案A - 单机 Docker Compose 部署（小规模）
- **WHEN** 用户规模 < 5000，预算有限
- **THEN** 部署架构：单台云服务器（4C8G），Docker Compose 编排所有服务
- **AND** 服务清单：Nginx + zifeng-web + zifeng-admin + zifeng-server + zifeng-parser + MySQL + Redis
- **AND** CI/CD：GitHub Actions 自动构建 Docker 镜像，SSH 部署到服务器
- **AND** 数据备份：每日 mysqldump + Redis RDB 自动备份到 OSS
- **AND** 监控：简单 Shell 脚本 + Crontab 健康检查，异常邮件通知
- **AND** 回滚：保留最近 3 个 Docker 镜像版本，`docker-compose down` + `docker-compose up` 回滚

#### Scenario: 方案B - 多机 Docker Swarm 部署（中等规模）
- **WHEN** 用户规模 5000-50000，需要高可用
- **THEN** 部署架构：3+ 台云服务器，Docker Swarm 集群
- **AND** 服务编排：
  - 管理节点(1)：Nginx + 监控
  - 工作节点(2+)：zifeng-server(2副本) + zifeng-parser(2副本) + 前端静态
  - 数据节点(1)：MySQL 主从 + Redis Sentinel
- **AND** CI/CD：GitHub Actions → Docker Registry → Swarm 滚动更新
- **AND** 灰度发布：Nginx weight 调整流量比例
- **AND** 监控：Prometheus + Grafana + AlertManager
- **AND** 回滚：`docker service rollback` 一键回滚

#### Scenario: 方案C - Kubernetes 集群部署（大规模）
- **WHEN** 用户规模 > 50000，需要弹性伸缩和完整云原生能力
- **THEN** 部署架构：Kubernetes 集群（云厂商托管 K8s）
- **AND** 资源规划：
  - Ingress Controller（Nginx Ingress）
  - 前端：Nginx Pod（2+ 副本，HPA 自动伸缩）
  - 后端：SpringBoot Pod（3+ 副本，HPA 按 CPU/内存伸缩）
  - 解析引擎：Node.js Pod（2+ 副本，HPA 按请求量伸缩）
  - 数据库：云厂商 RDS MySQL（主从）+ ElastiCache Redis
  - 存储：云 OSS（头像等文件）
- **AND** CI/CD：GitHub Actions → Docker Registry → Helm Chart → ArgoCD GitOps 部署
- **AND** 灰度发布：Istio VirtualService 按权重/用户特征分流
- **AND** 蓝绿部署：两套环境交替切换，DNS 切换实现零停机
- **AND** 监控：Prometheus + Grafana + Skywalking + ELK
- **AND** 回滚：`helm rollback` 或 ArgoCD 一键回滚

#### Scenario: 环境管理
- **WHEN** 管理多套环境
- **THEN** 至少维护以下环境：
  - 开发环境(dev)：本地开发，Docker Compose
  - 测试环境(test)：云服务器，Docker Compose，内测用户访问
  - 预发布环境(staging)：与生产环境一致，仅内部可访问
  - 生产环境(prod)：正式上线环境
- **AND** 各环境配置通过 Nacos Config / 环境变量隔离

#### Scenario: 上线前检查清单
- **WHEN** 准备上线
- **THEN** 完成以下检查项：
  - [ ] 所有 API 接口功能测试通过
  - [ ] 安全扫描无高危漏洞（SQL 注入、XSS、CSRF）
  - [ ] 性能压测达标（目标 QPS、响应时间、错误率）
  - [ ] 数据库索引优化完成
  - [ ] HTTPS 证书配置正确
  - [ ] CORS 配置仅允许生产域名
  - [ ] 敏感配置（数据库密码、JWT 密钥）使用环境变量/密钥管理
  - [ ] 日志级别调整为 WARN/ERROR
  - [ ] 监控告警配置完成
  - [ ] 数据备份策略就绪
  - [ ] 回滚方案验证通过
  - [ ] 灰度发布流程验证通过

#### Scenario: 上线后验证流程
- **WHEN** 部署完成
- **THEN** 按以下顺序验证：
  1. 健康检查：所有服务 `/api/health` 返回 200
  2. 核心流程：注册 → 登录 → 搜索 → 加入书架 → 阅读 → 保存进度
  3. 管理后台：登录 → 仪表盘 → 用户管理 → 书源管理
  4. 性能指标：响应时间 < 500ms，错误率 < 1%
  5. 监控确认：Grafana 仪表盘数据正常，告警规则生效

---

## MODIFIED Requirements

无修改需求。

## REMOVED Requirements

无移除需求。
