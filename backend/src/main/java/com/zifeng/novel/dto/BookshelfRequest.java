package com.zifeng.novel.dto;

import lombok.Data;

@Data
public class BookshelfRequest {
    private String bookName;
    private String author;
    private String bookUrl;
    private String coverUrl;
    private String summary;
    private String lastChapter;
    private String sourceUrl;
    private String sourceName;
    private String category;
}
