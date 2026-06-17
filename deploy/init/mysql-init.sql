-- Active: 1742100587038@@127.0.0.1@3306@zifeng_novel
-- ============================================================
-- 紫枫免费小说 - MySQL 初始化脚本
-- Docker容器首次启动时自动执行
-- ============================================================

-- 确保字符集
ALTER DATABASE zifeng_novel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 清理遗留字段（JPA ddl-auto:update 不会自动删除列）
ALTER TABLE users DROP COLUMN IF EXISTS nickname;

-- 创建应用用户（应通过环境变量 MYSQL_USER / MYSQL_PASSWORD 配置，不要在此硬编码密码）
-- CREATE USER IF NOT EXISTS 'zifeng'@'%' IDENTIFIED BY '<CHANGE_ME>';
-- GRANT ALL PRIVILEGES ON zifeng_novel.* TO 'zifeng'@'%';
-- FLUSH PRIVILEGES;

-- 创建监控用户（仅允许本地连接，最小权限：仅 SELECT）
CREATE USER IF NOT EXISTS 'monitor'@'127.0.0.1' IDENTIFIED BY '<CHANGE_ME>';
GRANT SELECT ON zifeng_novel.* TO 'monitor'@'127.0.0.1';
FLUSH PRIVILEGES;
