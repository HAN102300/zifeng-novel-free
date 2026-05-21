package com.zifeng.module.parse.dto;

import java.util.Map;

public class UnifiedBookInfo extends UnifiedSearchResult {

    private Boolean canReName;
    private String downloadUrls;

    public static UnifiedBookInfo fromRaw(Map<String, Object> raw, String sourceUrl, String sourceName) {
        UnifiedBookInfo info = new UnifiedBookInfo();
        info.setSourceUrl(sourceUrl);
        info.setSourceName(sourceName);
        info.getAvailableSourceNames().add(sourceName);
        info.setName(pickFirst(raw, "name", "bookName", "title", "novelName", "book_name"));
        info.setAuthor(pickFirst(raw, "author", "authorName", "bookAuthor", "author_name"));
        info.setCoverUrl(pickFirst(raw, "coverUrl", "cover", "cover_url", "imgUrl", "picUrl", "imageUrl"));
        info.setIntro(pickFirst(raw, "intro", "summary", "description", "desc", "bookIntro"));
        info.setKind(pickFirst(raw, "kind", "category", "type", "genre", "bookKind"));
        info.setLastChapter(pickFirst(raw, "lastChapter", "latestChapter", "newChapter", "last_chapter"));
        info.setWordCount(pickFirst(raw, "wordCount", "wordNum", "words", "word_count"));
        info.setUpdateTime(pickFirst(raw, "updateTime", "lastUpdateTime", "updatedAt", "update_time"));
        info.setTocUrl(pickFirst(raw, "tocUrl", "toc_url", "chapterListUrl"));
        info.setScore(pickDouble(raw, "score", "rating", "rate", "averageScore"));
        info.setChapterCount(pickFirst(raw, "chapterCount", "chapterNum", "totalChapter", "chapter_count"));
        info.setBookUrl(pickFirst(raw, "bookUrl", "_sourceUrl", "url", "detailUrl", "book_url"));
        info.setId(hashId(sourceUrl, info.getBookUrl()));
        info.canReName = raw.get("canReName") instanceof Boolean ? (Boolean) raw.get("canReName") : null;
        info.downloadUrls = pickFirst(raw, "downloadUrls");
        return info;
    }

    public void mergeFrom(UnifiedBookInfo other) {
        super.mergeFrom(other);
    }

    public Boolean getCanReName() { return canReName; }
    public void setCanReName(Boolean canReName) { this.canReName = canReName; }
    public String getDownloadUrls() { return downloadUrls; }
    public void setDownloadUrls(String downloadUrls) { this.downloadUrls = downloadUrls; }
}
