package com.zifeng.novel.dto;

import lombok.Data;

@Data
public class ReadingProgressRequest {
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
