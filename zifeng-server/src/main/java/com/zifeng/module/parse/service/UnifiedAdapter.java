package com.zifeng.module.parse.service;

import com.zifeng.module.parse.dto.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.net.MalformedURLException;
import java.net.URL;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class UnifiedAdapter {

    private static final Map<String, List<String>> FIELD_ALIASES = Map.ofEntries(
        Map.entry("name", List.of("name", "bookName", "title", "novelName", "book_name")),
        Map.entry("author", List.of("author", "authorName", "bookAuthor", "author_name")),
        Map.entry("coverUrl", List.of("coverUrl", "cover", "cover_url", "imgUrl", "picUrl", "imageUrl")),
        Map.entry("intro", List.of("intro", "summary", "description", "desc", "bookIntro")),
        Map.entry("kind", List.of("kind", "category", "type", "genre", "bookKind")),
        Map.entry("lastChapter", List.of("lastChapter", "latestChapter", "newChapter", "last_chapter")),
        Map.entry("wordCount", List.of("wordCount", "wordNum", "words", "word_count")),
        Map.entry("tocUrl", List.of("tocUrl", "toc_url", "chapterUrl", "chapterListUrl")),
        Map.entry("bookUrl", List.of("bookUrl", "_sourceUrl", "url", "detailUrl", "book_url")),
        Map.entry("updateTime", List.of("updateTime", "lastUpdateTime", "lastUpdate", "updatedAt", "update_time")),
        Map.entry("score", List.of("score", "rating", "rate", "averageScore")),
        Map.entry("chapterCount", List.of("chapterCount", "chapterNum", "totalChapter", "chapter_count"))
    );

    public List<UnifiedSearchResult> adaptSearchResults(List<Map<String, Object>> rawResults,
                                                          String sourceUrl, String sourceName) {
        if (rawResults == null || rawResults.isEmpty()) return Collections.emptyList();
        return rawResults.stream()
            .map(raw -> adaptSearchResult(raw, sourceUrl, sourceName))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    public UnifiedSearchResult adaptSearchResult(Map<String, Object> raw, String sourceUrl, String sourceName) {
        UnifiedSearchResult result = UnifiedSearchResult.fromRaw(raw, sourceUrl, sourceName);
        if (result.getName() == null || result.getName().isEmpty()) return null;
        result.setCoverUrl(resolveUrl(sourceUrl, result.getCoverUrl()));
        result.setBookUrl(resolveUrl(sourceUrl, result.getBookUrl()));
        result.setTocUrl(resolveUrl(sourceUrl, result.getTocUrl()));
        return result;
    }

    public UnifiedBookInfo adaptBookInfo(Map<String, Object> raw, String sourceUrl, String sourceName) {
        UnifiedBookInfo info = UnifiedBookInfo.fromRaw(raw, sourceUrl, sourceName);
        if (info.getName() == null || info.getName().isEmpty()) return null;
        info.setCoverUrl(resolveUrl(sourceUrl, info.getCoverUrl()));
        info.setTocUrl(resolveUrl(sourceUrl, info.getTocUrl()));
        info.setBookUrl(resolveUrl(sourceUrl, info.getBookUrl()));
        return info;
    }

    @SuppressWarnings("unchecked")
    public List<UnifiedChapter> adaptChapterList(List<?> rawChapters, String sourceName) {
        if (rawChapters == null || rawChapters.isEmpty()) return Collections.emptyList();
        List<UnifiedChapter> result = new ArrayList<>();
        for (int i = 0; i < rawChapters.size(); i++) {
            Object item = rawChapters.get(i);
            if (item instanceof Map) {
                result.add(UnifiedChapter.fromRaw((Map<String, Object>) item, i, sourceName));
            } else if (item != null) {
                UnifiedChapter ch = new UnifiedChapter();
                ch.setName(item.toString());
                ch.setIndex(i);
                ch.setSourceName(sourceName);
                result.add(ch);
            }
        }
        return result;
    }

    public UnifiedContent adaptContent(Map<String, Object> raw, String sourceName) {
        UnifiedContent content = UnifiedContent.fromRaw(raw, sourceName);
        if (content.getContent() == null || content.getContent().isEmpty()) {
            if (raw != null && raw.get("content") != null) {
                content.setContent(String.valueOf(raw.get("content")));
            }
        }
        return content;
    }

    public Map<String, Object> unifiedBookInfoToMap(UnifiedBookInfo info) {
        if (info == null) return Map.of();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", info.getId());
        map.put("name", info.getName());
        map.put("author", info.getAuthor());
        map.put("bookUrl", info.getBookUrl());
        map.put("coverUrl", info.getCoverUrl());
        map.put("intro", info.getIntro());
        map.put("kind", info.getKind());
        map.put("lastChapter", info.getLastChapter());
        map.put("wordCount", info.getWordCount());
        map.put("updateTime", info.getUpdateTime());
        map.put("tocUrl", info.getTocUrl());
        map.put("score", info.getScore());
        map.put("chapterCount", info.getChapterCount());
        map.put("canReName", info.getCanReName());
        map.put("sourceUrl", info.getSourceUrl());
        map.put("sourceName", info.getSourceName());
        map.put("availableSourceNames", info.getAvailableSourceNames());
        map.put("completeness", info.completenessScore());
        map.put("extra", info.getExtra());
        return map;
    }

    public Map<String, Object> unifiedChapterToMap(UnifiedChapter ch) {
        if (ch == null) return Map.of();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("name", ch.getName());
        map.put("url", ch.getUrl());
        map.put("index", ch.getIndex());
        map.put("isVip", ch.getIsVip());
        map.put("isPay", ch.getIsPay());
        map.put("isVolume", ch.getIsVolume());
        map.put("tag", ch.getTag());
        map.put("sourceName", ch.getSourceName());
        return map;
    }

    public Map<String, Object> unifiedContentToMap(UnifiedContent content) {
        if (content == null) return Map.of();
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("content", content.getContent());
        map.put("rawHtml", content.getRawHtml());
        map.put("chapterIndex", content.getChapterIndex());
        map.put("chapterName", content.getChapterName());
        map.put("sourceName", content.getSourceName());
        map.put("nextChapterUrl", content.getNextChapterUrl());
        map.put("prevChapterUrl", content.getPrevChapterUrl());
        return map;
    }

    public String resolveUrl(String baseUrl, String url) {
        if (url == null || url.isEmpty()) return "";
        if (url.startsWith("http://") || url.startsWith("https://")) return url;
        if (url.startsWith("//")) return "https:" + url;
        if (baseUrl == null || baseUrl.isEmpty()) return url;
        try {
            return new URL(new URL(baseUrl), url).toString();
        } catch (MalformedURLException e) {
            if (url.startsWith("/")) {
                return baseUrl.replaceAll("/+$", "") + url;
            }
            return baseUrl.replaceAll("/+$", "") + "/" + url;
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> safeGetList(Map<String, Object> result, String key) {
        Object val = result != null ? result.get(key) : null;
        if (val instanceof List) return (List<Map<String, Object>>) val;
        return Collections.emptyList();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> safeGetMap(Map<String, Object> result, String key) {
        Object val = result != null ? result.get(key) : null;
        if (val instanceof Map) return (Map<String, Object>) val;
        return Collections.emptyMap();
    }
}
