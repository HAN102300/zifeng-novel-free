package com.zifeng.module.parse.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.parse.dto.ParseRequest;
import com.zifeng.module.parse.service.ParsingProxyService;
import com.zifeng.module.parse.service.SourceAggregator;
import com.zifeng.module.parse.service.SourceHealthChecker;
import com.zifeng.module.parse.service.UnifiedAdapter;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/parse")
@RequiredArgsConstructor
public class ParseController {

    private final ParsingProxyService parsingProxyService;
    private final SourceAggregator sourceAggregator;
    private final SourceHealthChecker sourceHealthChecker;
    private final UnifiedAdapter unifiedAdapter;

    @PostMapping("/search")
    public ApiResponse<Map<String, Object>> search(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.search(
                request.getSource(),
                request.getKeyword(),
                request.getPage() != null ? request.getPage() : 1);
        return ApiResponse.ok(result);
    }

    @PostMapping("/search/aggregated")
    public ApiResponse<Map<String, Object>> aggregatedSearch(@RequestBody ParseRequest request) {
        String keyword = request.getKeyword();
        int page = request.getPage() != null ? request.getPage() : 1;

        var aggregated = sourceAggregator.aggregateSearch(keyword, page);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("keyword", aggregated.getKeyword());
        response.put("page", aggregated.getPage());
        response.put("totalSources", aggregated.getTotalSources());
        response.put("succeededSources", aggregated.getSucceededSources());
        response.put("failedSources", aggregated.getFailedSources());
        response.put("totalResults", aggregated.getTotalResults());
        response.put("deduplicatedResults", aggregated.getDeduplicatedResults());
        response.put("elapsedMs", aggregated.getElapsedMs());

        List<Map<String, Object>> books = new ArrayList<>();
        for (var book : aggregated.getBooks()) {
            Map<String, Object> bookMap = unifiedAdapter.unifiedBookInfoToMap(
                toBookInfo(book));
            bookMap.put("sourceTag", book.getSourceName());
            books.add(bookMap);
        }
        response.put("books", books);

        List<Map<String, Object>> sourceDetails = new ArrayList<>();
        for (var detail : aggregated.getSourceDetails()) {
            Map<String, Object> dm = new HashMap<>();
            dm.put("sourceUrl", detail.getSourceUrl());
            dm.put("sourceName", detail.getSourceName());
            dm.put("success", detail.isSuccess());
            dm.put("resultCount", detail.getResultCount());
            dm.put("latencyMs", detail.getLatencyMs());
            dm.put("error", detail.getError());
            sourceDetails.add(dm);
        }
        response.put("sourceDetails", sourceDetails);

        return ApiResponse.ok(response);
    }

    @PostMapping("/test-source")
    public ApiResponse<Map<String, Object>> testSource(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.testSource(
                request.getSource(),
                request.getKeyword(),
                request.getPage() != null ? request.getPage() : 1,
                Boolean.TRUE.equals(request.getFullTest()));
        return ApiResponse.ok(result);
    }

    @PostMapping("/health-check")
    public ApiResponse<List<Map<String, Object>>> healthCheckAll() {
        List<Map<String, Object>> reports = sourceHealthChecker.runManualHealthCheck();
        return ApiResponse.ok(reports);
    }

    @PostMapping("/book-info")
    public ApiResponse<Map<String, Object>> getBookInfo(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.getBookInfo(
                request.getSource(),
                request.getBookUrl(),
                request.getBook());
        return ApiResponse.ok(result);
    }

    @PostMapping("/book-info/unified")
    public ApiResponse<Map<String, Object>> getUnifiedBookInfo(@RequestBody ParseRequest request) {
        Map<String, Object> rawResult = parsingProxyService.getBookInfo(
                request.getSource(),
                request.getBookUrl(),
                request.getBook());

        if (rawResult != null && Boolean.TRUE.equals(rawResult.get("success"))) {
            Map<String, Object> rawInfo = unifiedAdapter.safeGetMap(rawResult, "bookInfo");
            String sourceUrl = request.getSource() != null
                ? String.valueOf(request.getSource().getOrDefault("bookSourceUrl", ""))
                : "";
            String sourceName = request.getSource() != null
                ? String.valueOf(request.getSource().getOrDefault("bookSourceName", ""))
                : "";

            var unifiedInfo = unifiedAdapter.adaptBookInfo(rawInfo, sourceUrl, sourceName);
            Map<String, Object> adapted = unifiedAdapter.unifiedBookInfoToMap(unifiedInfo);
            adapted.put("success", true);
            return ApiResponse.ok(adapted);
        }

        Map<String, Object> fallback = new HashMap<>();
        fallback.put("success", false);
        fallback.put("message", rawResult != null ? rawResult.get("message") : "unknown error");
        return ApiResponse.ok(fallback);
    }

    @PostMapping("/toc")
    public ApiResponse<Map<String, Object>> getToc(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.getToc(
                request.getSource(),
                request.getTocUrl(),
                request.getBook());
        return ApiResponse.ok(result);
    }

    @PostMapping("/toc/unified")
    public ApiResponse<Map<String, Object>> getUnifiedToc(@RequestBody ParseRequest request) {
        Map<String, Object> rawResult = parsingProxyService.getToc(
                request.getSource(),
                request.getTocUrl(),
                request.getBook());

        if (rawResult != null && Boolean.TRUE.equals(rawResult.get("success"))) {
            List<?> rawChapters = (List<?>) rawResult.getOrDefault("chapters", new ArrayList<>());
            String sourceName = request.getSource() != null
                ? String.valueOf(request.getSource().getOrDefault("bookSourceName", ""))
                : "";

            var chapters = unifiedAdapter.adaptChapterList(rawChapters, sourceName);
            List<Map<String, Object>> chapterMaps = new ArrayList<>();
            for (var ch : chapters) {
                chapterMaps.add(unifiedAdapter.unifiedChapterToMap(ch));
            }
            Map<String, Object> adapted = new HashMap<>();
            adapted.put("success", true);
            adapted.put("chapters", chapterMaps);
            return ApiResponse.ok(adapted);
        }

        Map<String, Object> fallback = new HashMap<>();
        fallback.put("success", false);
        fallback.put("chapters", new ArrayList<>());
        fallback.put("message", rawResult != null ? rawResult.get("message") : "unknown error");
        return ApiResponse.ok(fallback);
    }

    @PostMapping("/content")
    public ApiResponse<Map<String, Object>> getContent(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.getContent(
                request.getSource(),
                request.getChapterUrl(),
                request.getBook(),
                request.getChapter());
        return ApiResponse.ok(result);
    }

    @PostMapping("/content/unified")
    public ApiResponse<Map<String, Object>> getUnifiedContent(@RequestBody ParseRequest request) {
        Map<String, Object> rawResult = parsingProxyService.getContent(
                request.getSource(),
                request.getChapterUrl(),
                request.getBook(),
                request.getChapter());

        if (rawResult != null && Boolean.TRUE.equals(rawResult.get("success"))) {
            String sourceName = request.getSource() != null
                ? String.valueOf(request.getSource().getOrDefault("bookSourceName", ""))
                : "";

            var content = unifiedAdapter.adaptContent(rawResult, sourceName);

            if (request.getChapter() != null) {
                content.setChapterIndex(safeGetInt(request.getChapter(), "index"));
                content.setChapterName(String.valueOf(request.getChapter().getOrDefault("title", request.getChapter().getOrDefault("name", ""))));
            }

            Map<String, Object> adapted = unifiedAdapter.unifiedContentToMap(content);
            adapted.put("success", true);
            return ApiResponse.ok(adapted);
        }

        Map<String, Object> fallback = new HashMap<>();
        fallback.put("success", false);
        fallback.put("content", "");
        fallback.put("message", rawResult != null ? rawResult.get("message") : "unknown error");
        return ApiResponse.ok(fallback);
    }

    @PostMapping("/explore")
    public ApiResponse<Map<String, Object>> explore(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.explore(
                request.getSource(),
                request.getExploreUrl());
        return ApiResponse.ok(result);
    }

    private com.zifeng.module.parse.dto.UnifiedBookInfo toBookInfo(com.zifeng.module.parse.dto.UnifiedSearchResult sr) {
        com.zifeng.module.parse.dto.UnifiedBookInfo info = new com.zifeng.module.parse.dto.UnifiedBookInfo();
        info.setId(sr.getId());
        info.setName(sr.getName());
        info.setAuthor(sr.getAuthor());
        info.setBookUrl(sr.getBookUrl());
        info.setCoverUrl(sr.getCoverUrl());
        info.setIntro(sr.getIntro());
        info.setKind(sr.getKind());
        info.setLastChapter(sr.getLastChapter());
        info.setWordCount(sr.getWordCount());
        info.setUpdateTime(sr.getUpdateTime());
        info.setTocUrl(sr.getTocUrl());
        info.setScore(sr.getScore());
        info.setChapterCount(sr.getChapterCount());
        info.setSourceUrl(sr.getSourceUrl());
        info.setSourceName(sr.getSourceName());
        info.setAvailableSourceNames(sr.getAvailableSourceNames());
        info.setExtra(sr.getExtra());
        return info;
    }

    private int safeGetInt(Map<String, Object> map, String key) {
        Object val = map != null ? map.get(key) : null;
        if (val instanceof Number) return ((Number) val).intValue();
        return 0;
    }
}
