# Tasks

## 阶段一：SpringCloud 微服务架构整合方案设计

- [x] Task 1: 设计方案A - 最小拆分方案（2服务 + 网关）
  - [x] SubTask 1.1: 绘制服务拆分架构图（zifeng-business-service + zifeng-parse-service + zifeng-gateway）
  - [x] SubTask 1.2: 设计 Nacos 注册/配置中心集成方案
  - [x] SubTask 1.3: 设计 Spring Cloud Gateway 路由规则（替代 Vite 代理）
  - [x] SubTask 1.4: 设计 Sa-Token 微服务模式（网关统一鉴权 + Redis 共享 Token）
  - [x] SubTask 1.5: 设计 Node.js 解析引擎 Sidecar 集成方案
  - [x] SubTask 1.6: 编写迁移步骤和风险评估文档

- [x] Task 2: 设计方案B - 标准微服务方案（4服务 + 网关 + 基础设施）
  - [x] SubTask 2.1: 绘制服务拆分架构图（user/admin/source/parse + gateway）
  - [x] SubTask 2.2: 设计各服务独立数据库方案（Database per Service）
  - [x] SubTask 2.3: 设计 OpenFeign 服务间调用接口（替代跨模块 Repository 注入）
  - [x] SubTask 2.4: 设计 Sentinel 熔断降级规则
  - [x] SubTask 2.5: 设计 Seata 分布式事务方案（强一致性场景）
  - [x] SubTask 2.6: 设计消息队列异步通信方案（RabbitMQ：访问日志、书源导入）
  - [x] SubTask 2.7: 编写迁移步骤和风险评估文档

- [x] Task 3: 设计方案C - 完整云原生方案（6+服务 + K8s + 服务网格）
  - [x] SubTask 3.1: 绘制完整云原生架构图（含 K8s、Istio、监控体系）
  - [x] SubTask 3.2: 设计 Kubernetes 资源规划（Pod/Service/Ingress/HPA）
  - [x] SubTask 3.3: 设计 Istio 服务网格流量管理方案
  - [x] SubTask 3.4: 设计全链路监控方案（Skywalking + ELK + Prometheus）
  - [x] SubTask 3.5: 设计多区域部署和容灾方案
  - [x] SubTask 3.6: 编写迁移步骤和风险评估文档

- [x] Task 4: 微服务通用方案设计
  - [x] SubTask 4.1: 设计 Sa-Token 微服务认证方案（网关鉴权 + 各服务校验）
  - [x] SubTask 4.2: 设计数据一致性保障策略（Seata AT + 消息最终一致性）
  - [x] SubTask 4.3: 设计渐进式迁移路线图（单体 → 网关代理 → 逐步拆分 → 全微服务）
  - [x] SubTask 4.4: 设计 Node.js 解析引擎整合策略（Sidecar / Java 重写 / gRPC 桥接）

## 阶段二：对外开放内测方案设计

- [x] Task 5: 设计方案A - 局域网内测方案
  - [x] SubTask 5.1: 设计局域网部署配置（Vite host 0.0.0.0、CORS 配置）
  - [x] SubTask 5.2: 编写局域网内测操作指南

- [x] Task 6: 设计方案B - 云服务器内测方案
  - [x] SubTask 6.1: 设计 Docker Compose 生产部署配置
  - [x] SubTask 6.2: 设计 Nginx 反向代理和 HTTPS 配置
  - [x] SubTask 6.3: 设计邀请码注册机制（后端 API + 管理后台）
  - [x] SubTask 6.4: 设计速率限制方案（Nginx limit_req + 后端限流）
  - [x] SubTask 6.5: 设计测试数据管理策略（脱敏导入、定期清理）
  - [x] SubTask 6.6: 设计反馈收集机制（前端组件 + 后端存储 + 管理后台）

- [x] Task 7: 设计方案C - 全功能公测方案
  - [x] SubTask 7.1: 设计 Kubernetes 公测部署方案
  - [x] SubTask 7.2: 设计 OAuth2 第三方登录集成方案
  - [x] SubTask 7.3: 设计内容审核机制（敏感词过滤）
  - [x] SubTask 7.4: 设计灰度发布和版本控制策略
  - [x] SubTask 7.5: 设计 DDoS 防护和安全加固方案

## 阶段三：部署上线方案设计

- [x] Task 8: 设计方案A - 单机 Docker Compose 部署
  - [x] SubTask 8.1: 编写生产级 Docker Compose 配置文件
  - [x] SubTask 8.2: 编写 Dockerfile（zifeng-server、zifeng-parser、zifeng-web、zifeng-admin）
  - [x] SubTask 8.3: 设计 GitHub Actions CI/CD 流程
  - [x] SubTask 8.4: 设计数据备份和恢复脚本
  - [x] SubTask 8.5: 设计健康检查和告警脚本

- [x] Task 9: 设计方案B - 多机 Docker Swarm 部署
  - [x] SubTask 9.1: 设计 Docker Swarm 集群架构和节点规划
  - [x] SubTask 9.2: 编写 Docker Stack 部署配置
  - [x] SubTask 9.3: 设计 MySQL 主从 + Redis Sentinel 高可用方案
  - [x] SubTask 9.4: 设计 Nginx 灰度发布流量分配方案
  - [x] SubTask 9.5: 设计 Prometheus + Grafana 监控方案

- [x] Task 10: 设计方案C - Kubernetes 集群部署
  - [x] SubTask 10.1: 编写 Helm Chart（各服务模板）
  - [x] SubTask 10.2: 设计 HPA 自动伸缩策略
  - [x] SubTask 10.3: 设计 ArgoCD GitOps 部署流程
  - [x] SubTask 10.4: 设计 Istio 蓝绿/金丝雀发布方案
  - [x] SubTask 10.5: 设计全链路监控告警体系（Prometheus + Skywalking + ELK）

- [x] Task 11: 通用部署方案设计
  - [x] SubTask 11.1: 编写上线前检查清单
  - [x] SubTask 11.2: 编写上线后验证流程
  - [x] SubTask 11.3: 设计回滚策略（各方案对应）
  - [x] SubTask 11.4: 设计环境管理方案（dev/test/staging/prod）
  - [x] SubTask 11.5: 设计敏感配置管理方案（环境变量 / 密钥管理服务）

# Task Dependencies
- [Task 2] depends on [Task 1] (方案B 在方案A基础上扩展)
- [Task 3] depends on [Task 2] (方案C 在方案B基础上扩展)
- [Task 4] 无依赖，可与 Task 1-3 并行
- [Task 6] depends on [Task 5] (方案B 在方案A基础上扩展)
- [Task 7] depends on [Task 6] (方案C 在方案B基础上扩展)
- [Task 9] depends on [Task 8] (方案B 在方案A基础上扩展)
- [Task 10] depends on [Task 9] (方案C 在方案B基础上扩展)
- [Task 11] 无依赖，可与 Task 8-10 并行
