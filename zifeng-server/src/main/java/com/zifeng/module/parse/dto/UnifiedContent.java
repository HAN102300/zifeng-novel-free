package com.zifeng.module.parse.dto;

import java.util.Map;

public class UnifiedContent {
    private Integer chapterIndex;
    private String chapterName;
    private String content;
    private String rawHtml;
    private String sourceName;
    private String nextChapterUrl;
    private String prevChapterUrl;

    public UnifiedContent() {}

    public static UnifiedContent fromRaw(Map<String, Object> raw, String sourceName) {
        UnifiedContent c = new UnifiedContent();
        c.sourceName = sourceName;
        c.content = pickFirst(raw, "content", "text", "body");
        c.rawHtml = pickFirst(raw, "rawHtml", "html");
        c.nextChapterUrl = pickFirst(raw, "nextChapterUrl", "nextContentUrl");
        c.prevChapterUrl = pickFirst(raw, "prevChapterUrl");
        return c;
    }

    private static String pickFirst(Map<String, Object> raw, String... candidates) {
        for (String key : candidates) {
            Object val = raw.get(key);
            if (val != null && !val.toString().isEmpty()) {
                return val.toString().trim();
            }
        }
        return "";
    }

    public Integer getChapterIndex() { return chapterIndex; }
    public void setChapterIndex(Integer chapterIndex) { this.chapterIndex = chapterIndex; }
    public String getChapterName() { return chapterName; }
    public void setChapterName(String chapterName) { this.chapterName = chapterName; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getRawHtml() { return rawHtml; }
    public void setRawHtml(String rawHtml) { this.rawHtml = rawHtml; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public String getNextChapterUrl() { return nextChapterUrl; }
    public void setNextChapterUrl(String nextChapterUrl) { this.nextChapterUrl = nextChapterUrl; }
    public String getPrevChapterUrl() { return prevChapterUrl; }
    public void setPrevChapterUrl(String prevChapterUrl) { this.prevChapterUrl = prevChapterUrl; }
}
