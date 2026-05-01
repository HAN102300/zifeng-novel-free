package com.zifeng.module.user.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "reading_history", indexes = {
    @Index(name = "idx_user_book", columnList = "user_id, book_url")
})
public class ReadingHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "book_name", nullable = false, length = 200)
    private String bookName;

    @Column(name = "author", length = 100)
    private String author;

    @Column(name = "book_url", nullable = false, length = 500)
    private String bookUrl;

    @Column(name = "cover_url", length = 500)
    private String coverUrl;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "last_chapter", length = 200)
    private String lastChapter;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "source_name", length = 100)
    private String sourceName;

    @Column(name = "chapter_index")
    private Integer chapterIndex;

    @Column(name = "chapter_name", length = 200)
    private String chapterName;

    @Column(name = "chapter_url", length = 500)
    private String chapterUrl;

    @Column(name = "progress")
    @Builder.Default
    private Double progress = 0.0;

    @CreationTimestamp
    @Column(name = "last_read", updatable = false)
    private LocalDateTime lastRead;
}
