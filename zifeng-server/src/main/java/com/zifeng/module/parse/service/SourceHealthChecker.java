package com.zifeng.module.parse.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zifeng.module.source.entity.BookSource;
import com.zifeng.module.source.repository.BookSourceRepository;
import com.zifeng.module.source.service.BookSourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
@EnableScheduling
@RequiredArgsConstructor
public class SourceHealthChecker {

    private final ParsingProxyService parsingProxyService;
    private final BookSourceService bookSourceService;
    private final BookSourceRepository bookSourceRepository;
    private final ObjectMapper objectMapper;

    private static final String HEALTH_KEYWORD = "人";
    private static final int CONSECUTIVE_FAILURE_THRESHOLD = 3;
    private static final int MIN_HEALTH_SCORE_TO_KEEP = 30;

    public List<Map<String, Object>> runManualHealthCheck() {
        List<BookSource> sources = bookSourceService.getAllEnabledSources();
        List<Map<String, Object>> reports = new ArrayList<>();
        for (BookSource source : sources) {
            try {
                HealthReport report = checkSourceHealth(source);
                reports.add(report.toMap());
            } catch (Exception e) {
                log.warn("[HEALTHCHECK] Error checking {}: {}", source.getBookSourceName(), e.getMessage());
            }
        }
        return reports;
    }

    @Scheduled(cron = "0 0 */6 * * *")
    public void scheduledHealthCheck() {
        log.info("[HEALTHCHECK] Starting scheduled health check...");
        List<BookSource> sources = bookSourceService.getAllEnabledSources();
        AtomicInteger checked = new AtomicInteger(0);
        AtomicInteger disabled = new AtomicInteger(0);

        for (BookSource source : sources) {
            try {
                HealthReport report = checkSourceHealth(source);
                applyHealthReport(source, report, disabled);
                checked.incrementAndGet();
            } catch (Exception e) {
                log.warn("[HEALTHCHECK] Error checking {}: {}", source.getBookSourceName(), e.getMessage());
            }
        }

        log.info("[HEALTHCHECK] Done: checked={}, disabled={}", checked.get(), disabled.get());
    }

    public HealthReport checkSourceHealth(BookSource source) {
        HealthReport report = new HealthReport();
        report.sourceName = source.getBookSourceName();
        report.timestamp = Instant.now();

        Map<String, Object> sourceMap = bookSourceToMap(source);

        try {
            Map<String, Object> testResult = parsingProxyService.testSource(
                sourceMap, HEALTH_KEYWORD, 1, true);

            if (testResult == null || !Boolean.TRUE.equals(testResult.get("success"))) {
                report.connectivityOk = false;
                if (testResult != null) {
                    report.connectivityError = String.valueOf(testResult.getOrDefault("message", "unknown"));
                } else {
                    report.connectivityError = "no response";
                }
            } else {
                report.connectivityOk = true;
            }

            Map<String, Object> stages = safeGetMap(testResult, "stages");
            if (stages != null) {
                Map<String, Object> search = safeGetMap(stages, "search");
                report.searchOk = search != null && Boolean.TRUE.equals(search.get("success"));
                if (search != null) report.resultCount = safeGetInt(search, "resultCount");

                Map<String, Object> bookInfo = safeGetMap(stages, "bookInfo");
                report.bookInfoOk = bookInfo != null && Boolean.TRUE.equals(bookInfo.get("success"));

                Map<String, Object> toc = safeGetMap(stages, "toc");
                report.tocOk = toc != null && Boolean.TRUE.equals(toc.get("success"));
                if (toc != null) report.chapterCount = safeGetInt(toc, "chapterCount");

                Map<String, Object> content = safeGetMap(stages, "content");
                report.contentOk = content != null && Boolean.TRUE.equals(content.get("success"));
                if (content != null) report.contentLength = safeGetInt(content, "contentLength");
            }

            report.loginRequired = Boolean.TRUE.equals(testResult != null ? testResult.get("requiresLogin") : false);

        } catch (Exception e) {
            report.connectivityOk = false;
            report.connectivityError = e.getMessage();
        }

        report.computeScore();
        return report;
    }

    private void applyHealthReport(BookSource source, HealthReport report, AtomicInteger disabled) {
        source.setRespondTime(report.healthScore);

        try {
            source.setHeader(null);
        } catch (Exception ignored) {}

        if (report.healthScore < MIN_HEALTH_SCORE_TO_KEEP) {
            int currentFailures = source.getWeight() != null ? source.getWeight() : 0;
            currentFailures++;
            source.setWeight(currentFailures);

            if (currentFailures >= CONSECUTIVE_FAILURE_THRESHOLD) {
                source.setEnabled(false);
                disabled.incrementAndGet();
                log.warn("[HEALTHCHECK] Auto-disabled {} after {} consecutive failures",
                    source.getBookSourceName(), currentFailures);
            }
        } else {
            source.setWeight(0);
        }

        bookSourceRepository.save(source);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> safeGetMap(Map<String, Object> source, String key) {
        if (source == null) return null;
        Object val = source.get(key);
        if (val instanceof Map) return (Map<String, Object>) val;
        return null;
    }

    private int safeGetInt(Map<String, Object> source, String key) {
        if (source == null) return 0;
        Object val = source.get(key);
        if (val instanceof Number) return ((Number) val).intValue();
        return 0;
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
        map.put("loginUrl", source.getLoginUrl());
        map.put("loginUi", source.getLoginUi());
        map.put("jsLib", source.getJsLib());
        map.put("ruleSearch", source.getRuleSearch());
        map.put("ruleBookInfo", source.getRuleBookInfo());
        map.put("ruleToc", source.getRuleToc());
        map.put("ruleContent", source.getRuleContent());
        map.put("ruleExplore", source.getRuleExplore());
        map.put("weight", source.getWeight());
        map.put("enabledCookieJar", source.getEnabledCookieJar());
        return map;
    }

    public static class HealthReport {
        public String sourceName;
        public Instant timestamp;
        public boolean connectivityOk;
        public String connectivityError;
        public boolean searchOk;
        public int resultCount;
        public boolean bookInfoOk;
        public boolean tocOk;
        public int chapterCount;
        public boolean contentOk;
        public int contentLength;
        public boolean loginRequired;
        public int healthScore;

        void computeScore() {
            int score = 0;
            if (connectivityOk) score += 25;
            if (searchOk) score += 25;
            if (bookInfoOk) score += 20;
            if (tocOk) score += 15;
            if (contentOk) score += 15;
            if (loginRequired) score = Math.min(score, 50);
            healthScore = score;
        }

        public Map<String, Object> toMap() {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("sourceName", sourceName);
            map.put("timestamp", timestamp.toString());
            map.put("connectivityOk", connectivityOk);
            map.put("connectivityError", connectivityError);
            map.put("searchOk", searchOk);
            map.put("resultCount", resultCount);
            map.put("bookInfoOk", bookInfoOk);
            map.put("tocOk", tocOk);
            map.put("chapterCount", chapterCount);
            map.put("contentOk", contentOk);
            map.put("contentLength", contentLength);
            map.put("loginRequired", loginRequired);
            map.put("healthScore", healthScore);
            return map;
        }
    }
}
