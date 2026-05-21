package com.zifeng.module.parse.dto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class UnifiedSearchResult {
    private String id;
    private String name;
    private String author;
    private String bookUrl;
    private String coverUrl;
    private String intro;
    private String kind;
    private String lastChapter;
    private String wordCount;
    private String updateTime;
    private String tocUrl;
    private Double score;
    private String chapterCount;
    private String sourceUrl;
    private String sourceName;

    private List<String> availableSourceNames;

    private Map<String, Object> extra;

    public UnifiedSearchResult() {
        this.availableSourceNames = new ArrayList<>();
        this.extra = new HashMap<>();
    }

    public static UnifiedSearchResult fromRaw(Map<String, Object> raw, String sourceUrl, String sourceName) {
        UnifiedSearchResult r = new UnifiedSearchResult();
        r.sourceUrl = sourceUrl;
        r.sourceName = sourceName;
        r.availableSourceNames.add(sourceName);
        r.name = pickFirst(raw, "name", "bookName", "title", "novelName", "book_name");
        r.author = pickFirst(raw, "author", "authorName", "bookAuthor", "author_name");
        r.bookUrl = pickFirst(raw, "bookUrl", "_sourceUrl", "url", "detailUrl", "book_url");
        r.coverUrl = pickFirst(raw, "coverUrl", "cover", "cover_url", "imgUrl", "picUrl", "imageUrl");
        r.intro = pickFirst(raw, "intro", "summary", "description", "desc", "bookIntro");
        r.kind = pickFirst(raw, "kind", "category", "type", "genre", "bookKind");
        r.lastChapter = pickFirst(raw, "lastChapter", "latestChapter", "newChapter", "last_chapter");
        r.wordCount = pickFirst(raw, "wordCount", "wordNum", "words", "word_count");
        r.updateTime = pickFirst(raw, "updateTime", "lastUpdateTime", "updatedAt", "update_time");
        r.tocUrl = pickFirst(raw, "tocUrl", "toc_url", "chapterListUrl");
        r.score = pickDouble(raw, "score", "rating", "rate", "averageScore");
        r.chapterCount = pickFirst(raw, "chapterCount", "chapterNum", "totalChapter", "chapter_count");
        r.id = hashId(sourceUrl, r.bookUrl);
        return r;
    }

    public void mergeFrom(UnifiedSearchResult other) {
        if (other == null) return;
        if (isEmpty(this.coverUrl) && !isEmpty(other.coverUrl)) {
            this.coverUrl = other.coverUrl;
            this.extra.put("coverUrl_source", other.sourceName);
        }
        if (isEmpty(this.intro) && !isEmpty(other.intro)) {
            this.intro = other.intro;
            this.extra.put("intro_source", other.sourceName);
        }
        if (isEmpty(this.kind) && !isEmpty(other.kind)) {
            this.kind = other.kind;
        }
        if (isEmpty(this.lastChapter) && !isEmpty(other.lastChapter)) {
            this.lastChapter = other.lastChapter;
        }
        if (isEmpty(this.wordCount) && !isEmpty(other.wordCount)) {
            this.wordCount = other.wordCount;
        }
        if (isEmpty(this.updateTime) && !isEmpty(other.updateTime)) {
            this.updateTime = other.updateTime;
        }
        if (isEmpty(this.tocUrl) && !isEmpty(other.tocUrl)) {
            this.tocUrl = other.tocUrl;
        }
        if (!this.availableSourceNames.contains(other.sourceName)) {
            this.availableSourceNames.add(other.sourceName);
        }
    }

    public int completenessScore() {
        int myScore = 0;
        if (!isEmpty(name)) myScore += 15;
        if (!isEmpty(author)) myScore += 15;
        if (!isEmpty(coverUrl)) myScore += 15;
        if (!isEmpty(intro)) myScore += 10;
        if (!isEmpty(kind)) myScore += 5;
        if (!isEmpty(lastChapter)) myScore += 10;
        if (!isEmpty(wordCount)) myScore += 5;
        if (!isEmpty(updateTime)) myScore += 5;
        if (!isEmpty(tocUrl)) myScore += 10;
        if (this.score != null && this.score > 0) myScore += 5;
        if (availableSourceNames.size() > 1) myScore += 5;
        return myScore;
    }

    protected static String pickFirst(Map<String, Object> raw, String... candidates) {
        for (String key : candidates) {
            Object val = raw.get(key);
            if (val != null && !val.toString().isEmpty()) {
                if (val instanceof List && !((List<?>) val).isEmpty()) {
                    return ((List<?>) val).get(0).toString().trim();
                }
                return val.toString().trim();
            }
        }
        return "";
    }

    protected static Double pickDouble(Map<String, Object> raw, String... candidates) {
        for (String key : candidates) {
            Object val = raw.get(key);
            if (val instanceof Number) return ((Number) val).doubleValue();
            if (val instanceof String && !((String) val).isEmpty()) {
                try { return Double.parseDouble((String) val); } catch (NumberFormatException ignored) {}
            }
        }
        return 0.0;
    }

    protected static boolean isEmpty(String s) {
        return s == null || s.isEmpty();
    }

    protected static String hashId(String sourceUrl, String bookUrl) {
        String combined = (sourceUrl != null ? sourceUrl : "") + "_" + (bookUrl != null ? bookUrl : "");
        int h = 0;
        for (int i = 0; i < combined.length(); i++) {
            h = 31 * h + combined.charAt(i);
        }
        return "book_" + Integer.toHexString(h & 0x7FFFFFFF);
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public String getBookUrl() { return bookUrl; }
    public void setBookUrl(String bookUrl) { this.bookUrl = bookUrl; }
    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }
    public String getIntro() { return intro; }
    public void setIntro(String intro) { this.intro = intro; }
    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }
    public String getLastChapter() { return lastChapter; }
    public void setLastChapter(String lastChapter) { this.lastChapter = lastChapter; }
    public String getWordCount() { return wordCount; }
    public void setWordCount(String wordCount) { this.wordCount = wordCount; }
    public String getUpdateTime() { return updateTime; }
    public void setUpdateTime(String updateTime) { this.updateTime = updateTime; }
    public String getTocUrl() { return tocUrl; }
    public void setTocUrl(String tocUrl) { this.tocUrl = tocUrl; }
    public Double getScore() { return score; }
    public void setScore(Double score) { this.score = score; }
    public String getChapterCount() { return chapterCount; }
    public void setChapterCount(String chapterCount) { this.chapterCount = chapterCount; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public String getSourceName() { return sourceName; }
    public void setSourceName(String sourceName) { this.sourceName = sourceName; }
    public List<String> getAvailableSourceNames() { return availableSourceNames; }
    public void setAvailableSourceNames(List<String> availableSourceNames) { this.availableSourceNames = availableSourceNames; }
    public Map<String, Object> getExtra() { return extra; }
    public void setExtra(Map<String, Object> extra) { this.extra = extra; }
}
