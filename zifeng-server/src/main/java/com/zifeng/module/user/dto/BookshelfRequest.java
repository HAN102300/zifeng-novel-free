package com.zifeng.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BookshelfRequest {
    @NotBlank(message = "书名不能为空")
    private String bookName;

    private String author;

    @NotBlank(message = "书籍URL不能为空")
    private String bookUrl;

    private String coverUrl;
    private String summary;
    private String lastChapter;
    private String sourceUrl;
    private String sourceName;
    private String category;
}
