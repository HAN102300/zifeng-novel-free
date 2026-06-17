package com.zifeng.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReadingProgressRequest {
    @NotBlank(message = "书籍URL不能为空")
    private String bookUrl;

    private String bookName;
    private String author;
    private String coverUrl;
    private String summary;
    private String lastChapter;
    private String sourceUrl;
    private String sourceName;
    private Integer chapterIndex;
    private String chapterName;
    private String chapterUrl;
    private Double progress;
}
