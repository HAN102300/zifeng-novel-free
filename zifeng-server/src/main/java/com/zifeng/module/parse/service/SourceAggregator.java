package com.zifeng.module.parse.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zifeng.module.parse.dto.AggregatedSearchResult;
import com.zifeng.module.parse.dto.UnifiedSearchResult;
import com.zifeng.module.source.entity.BookSource;
import com.zifeng.module.source.service.BookSourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SourceAggregator {

    private final ParsingProxyService parsingProxyService;
    private final UnifiedAdapter unifiedAdapter;
    private final BookSourceService bookSourceService;
    private final ObjectMapper objectMapper;

    private final ExecutorService executor = Executors.newFixedThreadPool(
        Math.min(50, Runtime.getRuntime().availableProcessors() * 4));

    private static final long SOURCE_TIMEOUT_SECONDS = 15;
    private static final long AGGREGATE_TIMEOUT_SECONDS = 30;

    public AggregatedSearchResult aggregateSearch(String keyword, int page) {
        long startTime = System.currentTimeMillis();
        List<BookSource> sources = bookSourceService.getAllEnabledSources();
        if (sources.isEmpty()) {
            log.warn("[AGGREGATOR] No enabled sources found");
            return emptyResult(keyword, page, startTime);
        }

        log.info("[AGGREGATOR] Searching '{}' across {} sources", keyword, sources.size());

        List<CompletableFuture<SourceResult>> futures = sources.stream()
            .map(source -> CompletableFuture.supplyAsync(() -> searchSingleSource(source, keyword, page), executor)
                .orTimeout(SOURCE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
                .exceptionally(ex -> failedSourceResult(source, ex)))
            .toList();

        List<SourceResult> allSourceResults;
        try {
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
                .get(AGGREGATE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            allSourceResults = futures.stream()
                .map(f -> {
                    try { return f.getNow(null); } catch (Exception e) { return null; }
                })
                .filter(Objects::nonNull)
                .toList();
        } catch (InterruptedException | ExecutionException | TimeoutException e) {
            log.warn("[AGGREGATOR] Aggregate timeout or interrupted: {}", e.getMessage());
            allSourceResults = futures.stream()
                .filter(CompletableFuture::isDone)
                .map(f -> {
                    try { return f.get(); } catch (Exception ex) { return null; }
                })
                .filter(Objects::nonNull)
                .toList();
        }

        AggregatedSearchResult aggregated = buildAggregatedResult(keyword, page, allSourceResults, startTime);

        log.info("[AGGREGATOR] Done: {} sources, {} books found in {}ms",
            aggregated.getSucceededSources(), aggregated.getDeduplicatedResults(), aggregated.getElapsedMs());

        return aggregated;
    }

    private SourceResult searchSingleSource(BookSource source, String keyword, int page) {
        long start = System.currentTimeMillis();
        try {
            Map<String, Object> sourceMap = bookSourceToMap(source);
            Map<String, Object> response = parsingProxyService.search(sourceMap, keyword, page);

            long latency = System.currentTimeMillis() - start;

            if (response != null && Boolean.TRUE.equals(response.get("success"))) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> rawResults = (List<Map<String, Object>>) response.getOrDefault("results", Collections.emptyList());
                List<UnifiedSearchResult> adapted = unifiedAdapter.adaptSearchResults(
                    rawResults, source.getBookSourceUrl(), source.getBookSourceName());

                log.debug("[AGGREGATOR] {} -> {} results in {}ms", source.getBookSourceName(), adapted.size(), latency);
                return SourceResult.success(source, adapted, latency);
            } else {
                String msg = response != null ? String.valueOf(response.getOrDefault("message", "unknown")) : "no response";
                log.debug("[AGGREGATOR] {} -> FAILED: {} in {}ms", source.getBookSourceName(), msg, latency);
                return SourceResult.failed(source, msg, latency);
            }
        } catch (Exception e) {
            long latency = System.currentTimeMillis() - start;
            log.debug("[AGGREGATOR] {} -> ERROR: {} in {}ms", source.getBookSourceName(), e.getMessage(), latency);
            return SourceResult.failed(source, e.getMessage(), latency);
        }
    }

    private AggregatedSearchResult buildAggregatedResult(String keyword, int page,
                                                           List<SourceResult> sourceResults, long startTime) {
        AggregatedSearchResult result = new AggregatedSearchResult();
        result.setKeyword(keyword);
        result.setPage(page);
        result.setTotalSources(sourceResults.size());
        result.setElapsedMs(System.currentTimeMillis() - startTime);

        int succeeded = 0;
        int failed = 0;
        List<UnifiedSearchResult> allBooks = new ArrayList<>();

        for (SourceResult sr : sourceResults) {
            AggregatedSearchResult.SourceSearchMeta meta = new AggregatedSearchResult.SourceSearchMeta();
            meta.setSourceUrl(sr.source.getBookSourceUrl());
            meta.setSourceName(sr.source.getBookSourceName());
            meta.setSuccess(sr.success);
            meta.setResultCount(sr.books.size());
            meta.setLatencyMs(sr.latencyMs);
            meta.setError(sr.error);

            result.getSourceDetails().add(meta);

            if (sr.success) {
                succeeded++;
                allBooks.addAll(sr.books);
            } else {
                failed++;
            }
        }

        result.setSucceededSources(succeeded);
        result.setFailedSources(failed);
        result.setTotalResults(allBooks.size());

        List<UnifiedSearchResult> deduplicated = deduplicate(allBooks);
        result.setDeduplicatedResults(deduplicated.size());
        result.setBooks(sortByCompleteness(deduplicated));

        return result;
    }

    private List<UnifiedSearchResult> deduplicate(List<UnifiedSearchResult> books) {
        Map<String, UnifiedSearchResult> map = new LinkedHashMap<>();
        for (UnifiedSearchResult book : books) {
            String key = normalizeForDedup(book.getName(), book.getAuthor());
            if (map.containsKey(key)) {
                map.get(key).mergeFrom(book);
            } else {
                map.put(key, book);
            }
        }
        return new ArrayList<>(map.values());
    }

    private String normalizeForDedup(String name, String author) {
        return (name != null ? name.replaceAll("[\\s\\-_,.\\(\\)（）\\[\\]【】]", "").toLowerCase() : "")
            + "_" + (author != null ? author.replaceAll("[\\s\\-_,.·]", "").toLowerCase() : "");
    }

    private List<UnifiedSearchResult> sortByCompleteness(List<UnifiedSearchResult> books) {
        return books.stream()
            .sorted(Comparator.comparingInt(UnifiedSearchResult::completenessScore).reversed())
            .collect(Collectors.toList());
    }

    private AggregatedSearchResult emptyResult(String keyword, int page, long startTime) {
        AggregatedSearchResult result = new AggregatedSearchResult();
        result.setKeyword(keyword);
        result.setPage(page);
        result.setElapsedMs(System.currentTimeMillis() - startTime);
        return result;
    }

    private SourceResult failedSourceResult(BookSource source, Throwable ex) {
        return SourceResult.failed(source, ex != null ? ex.getMessage() : "timeout", SOURCE_TIMEOUT_SECONDS * 1000);
    }

    private Map<String, Object> bookSourceToMap(BookSource source) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("bookSourceName", source.getBookSourceName());
        map.put("bookSourceUrl", source.getBookSourceUrl());
        map.put("bookSourceGroup", source.getBookSourceGroup());
        map.put("bookSourceType", source.getBookSourceType());
        map.put("enabled", source.getEnabled());
        map.put("header", source.getHeader());
        map.put("searchUrl", source.getSearchUrl());
        map.put("exploreUrl", source.getExploreUrl());
        map.put("loginUrl", source.getLoginUrl());
        map.put("loginUi", source.getLoginUi());
        map.put("jsLib", source.getJsLib());
        map.put("ruleSearch", deserializeRule(source.getRuleSearch()));
        map.put("ruleBookInfo", deserializeRule(source.getRuleBookInfo()));
        map.put("ruleToc", deserializeRule(source.getRuleToc()));
        map.put("ruleContent", deserializeRule(source.getRuleContent()));
        map.put("ruleExplore", deserializeRule(source.getRuleExplore()));
        map.put("weight", source.getWeight());
        map.put("enabledCookieJar", source.getEnabledCookieJar());
        return map;
    }

    private Object deserializeRule(String ruleJson) {
        if (ruleJson == null || ruleJson.isBlank()) return null;
        try {
            return objectMapper.readValue(ruleJson, Map.class);
        } catch (JsonProcessingException e) {
            return ruleJson;
        }
    }

    private static class SourceResult {
        final BookSource source;
        final boolean success;
        final List<UnifiedSearchResult> books;
        final long latencyMs;
        final String error;

        SourceResult(BookSource source, boolean success, List<UnifiedSearchResult> books, long latencyMs, String error) {
            this.source = source;
            this.success = success;
            this.books = books != null ? books : Collections.emptyList();
            this.latencyMs = latencyMs;
            this.error = error;
        }

        static SourceResult success(BookSource source, List<UnifiedSearchResult> books, long latencyMs) {
            return new SourceResult(source, true, books, latencyMs, null);
        }

        static SourceResult failed(BookSource source, String error, long latencyMs) {
            return new SourceResult(source, false, null, latencyMs, error);
        }
    }
}
