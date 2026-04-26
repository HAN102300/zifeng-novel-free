CREATE DATABASE IF NOT EXISTS zifeng_novel
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE zifeng_novel;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    avatar VARCHAR(255),
    nickname VARCHAR(50),
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bookshelf (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_name VARCHAR(200) NOT NULL,
    author VARCHAR(100),
    book_url VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500),
    summary TEXT,
    last_chapter VARCHAR(200),
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    category VARCHAR(50),
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_book (user_id, book_url),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reading_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    book_name VARCHAR(200) NOT NULL,
    author VARCHAR(100),
    book_url VARCHAR(500) NOT NULL,
    cover_url VARCHAR(500),
    summary TEXT,
    last_chapter VARCHAR(200),
    source_url VARCHAR(500),
    source_name VARCHAR(100),
    chapter_index INT,
    chapter_name VARCHAR(200),
    chapter_url VARCHAR(500),
    progress DOUBLE DEFAULT 0.0,
    last_read DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_book (user_id, book_url),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS book_sources (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    book_source_name VARCHAR(100) NOT NULL,
    book_source_url VARCHAR(500) NOT NULL,
    book_source_group VARCHAR(100),
    book_source_type INT DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    header TEXT,
    search_url VARCHAR(1000),
    explore_url TEXT,
    login_url TEXT,
    login_ui TEXT,
    js_lib TEXT,
    rule_search TEXT,
    rule_book_info TEXT,
    rule_toc TEXT,
    rule_content TEXT,
    rule_explore TEXT,
    custom_order INT DEFAULT 0,
    weight INT DEFAULT 0,
    enabled_cookie_jar BOOLEAN DEFAULT FALSE,
    concurrent_rate VARCHAR(20),
    respond_time INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_source (user_id, book_source_url),
    INDEX idx_user_enabled (user_id, enabled),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
