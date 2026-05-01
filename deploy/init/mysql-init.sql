-- ============================================================
-- 紫枫免费小说 - MySQL 初始化脚本
-- Docker容器首次启动时自动执行
-- ============================================================

-- 确保字符集
ALTER DATABASE zifeng_novel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建应用用户（如果通过环境变量未创建）
-- CREATE USER IF NOT EXISTS 'zifeng'@'%' IDENTIFIED BY 'Zifeng2024!Prod';
-- GRANT ALL PRIVILEGES ON zifeng_novel.* TO 'zifeng'@'%';
-- FLUSH PRIVILEGES;

-- 创建监控用户
CREATE USER IF NOT EXISTS 'monitor'@'%' IDENTIFIED BY 'Monitor2024!ReadOnly';
GRANT SELECT, PROCESS, REPLICATION CLIENT ON *.* TO 'monitor'@'%';
FLUSH PRIVILEGES;
