package com.zifeng.module.source.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "book_sources", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "book_source_url"})
})
public class BookSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "book_source_name", nullable = false, length = 100)
    private String bookSourceName;

    @Column(name = "book_source_url", nullable = false, length = 500)
    private String bookSourceUrl;

    @Column(name = "book_source_group", length = 100)
    private String bookSourceGroup;

    @Builder.Default
    @Column(name = "book_source_type")
    private Integer bookSourceType = 0;

    @Builder.Default
    @Column(name = "enabled")
    private Boolean enabled = true;

    @Column(name = "header", columnDefinition = "TEXT")
    private String header;

    @Column(name = "search_url", length = 1000)
    private String searchUrl;

    @Column(name = "explore_url", columnDefinition = "TEXT")
    private String exploreUrl;

    @Column(name = "login_url", columnDefinition = "TEXT")
    private String loginUrl;

    @Column(name = "login_ui", columnDefinition = "TEXT")
    private String loginUi;

    @Column(name = "js_lib", columnDefinition = "TEXT")
    private String jsLib;

    @Column(name = "rule_search", columnDefinition = "TEXT")
    private String ruleSearch;

    @Column(name = "rule_book_info", columnDefinition = "TEXT")
    private String ruleBookInfo;

    @Column(name = "rule_toc", columnDefinition = "TEXT")
    private String ruleToc;

    @Column(name = "rule_content", columnDefinition = "TEXT")
    private String ruleContent;

    @Column(name = "rule_explore", columnDefinition = "TEXT")
    private String ruleExplore;

    @Builder.Default
    @Column(name = "custom_order")
    private Integer customOrder = 0;

    @Builder.Default
    @Column(name = "weight")
    private Integer weight = 0;

    @Builder.Default
    @Column(name = "enabled_cookie_jar")
    private Boolean enabledCookieJar = false;

    @Column(name = "concurrent_rate", length = 20)
    private String concurrentRate;

    @Column(name = "respond_time")
    private Integer respondTime;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
