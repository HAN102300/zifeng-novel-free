package com.zifeng.module.parse.dto;

import lombok.Data;
import java.util.Map;

@Data
public class ParseRequest {
    private Map<String, Object> source;
    private String keyword;
    private Integer page;
    private String bookUrl;
    private String tocUrl;
    private String chapterUrl;
    private Map<String, Object> book;
    private Map<String, Object> chapter;
    private String exploreUrl;
    private Boolean fullTest;
}
