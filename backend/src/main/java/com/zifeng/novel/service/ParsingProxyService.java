package com.zifeng.novel.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParsingProxyService {

    private final RestTemplate restTemplate;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${parsing.server.url}")
    private String parsingServerUrl;

    @Value("${cache.ttl.search}")
    private long searchTtl;

    @Value("${cache.ttl.book-info}")
    private long bookInfoTtl;

    @Value("${cache.ttl.toc}")
    private long tocTtl;

    @Value("${cache.ttl.content}")
    private long contentTtl;

    public Map<String, Object> search(Map<String, Object> source, String keyword, int page) {
        String cacheKey = "parse:search:" + keyword + ":" + page + ":" + source.get("bookSourceUrl");
        Map<String, Object> cached = getFromCache(cacheKey);
        if (cached != null) return cached;

        Map<String, Object> body = Map.of("source", source, "keyword", keyword, "page", page);
        Map<String, Object> result = postToParsingServer("/api/search", body);
        if (result != null && Boolean.TRUE.equals(result.get("success"))) {
            saveToCache(cacheKey, result, searchTtl);
        }
        return result;
    }

    public Map<String, Object> testSource(Map<String, Object> source, String keyword, int page, boolean fullTest) {
        Map<String, Object> body = Map.of("source", source, "keyword", keyword, "page", page, "fullTest", fullTest);
        return postToParsingServer("/api/test-source", body);
    }

    public Map<String, Object> getBookInfo(Map<String, Object> source, String bookUrl, Map<String, Object> bookData) {
        String cacheKey = "parse:bookinfo:" + bookUrl;
        Map<String, Object> cached = getFromCache(cacheKey);
        if (cached != null) return cached;

        Map<String, Object> body = Map.of("source", source, "bookUrl", bookUrl, "bookData", bookData != null ? bookData : Map.of());
        Map<String, Object> result = postToParsingServer("/api/book-info", body);
        if (result != null && Boolean.TRUE.equals(result.get("success"))) {
            saveToCache(cacheKey, result, bookInfoTtl);
        }
        return result;
    }

    public Map<String, Object> getToc(Map<String, Object> source, String tocUrl, Map<String, Object> book) {
        String cacheKey = "parse:toc:" + tocUrl;
        Map<String, Object> cached = getFromCache(cacheKey);
        if (cached != null) return cached;

        Map<String, Object> body = Map.of("source", source, "tocUrl", tocUrl, "book", book != null ? book : Map.of());
        Map<String, Object> result = postToParsingServer("/api/toc", body);
        if (result != null && Boolean.TRUE.equals(result.get("success"))) {
            saveToCache(cacheKey, result, tocTtl);
        }
        return result;
    }

    public Map<String, Object> getContent(Map<String, Object> source, String chapterUrl, Map<String, Object> book, Map<String, Object> chapter) {
        String cacheKey = "parse:content:" + chapterUrl;
        Map<String, Object> cached = getFromCache(cacheKey);
        if (cached != null) return cached;

        Map<String, Object> body = Map.of("source", source, "chapterUrl", chapterUrl,
                "book", book != null ? book : Map.of(), "chapter", chapter != null ? chapter : Map.of());
        Map<String, Object> result = postToParsingServer("/api/content", body);
        if (result != null && Boolean.TRUE.equals(result.get("success"))) {
            saveToCache(cacheKey, result, contentTtl);
        }
        return result;
    }

    public Map<String, Object> explore(Map<String, Object> source, String exploreUrl) {
        Map<String, Object> body = Map.of("source", source, "exploreUrl", exploreUrl);
        return postToParsingServer("/api/explore", body);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postToParsingServer(String path, Map<String, Object> body) {
        String url = parsingServerUrl + path;
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.POST, entity, Map.class);
            Map<String, Object> result = response.getBody();
            if (result == null) {
                return createFallbackResponse("解析服务返回空响应");
            }
            return result;
        } catch (RestClientException e) {
            log.error("解析服务调用失败: {} - {}", path, e.getMessage());
            return createFallbackResponse("解析服务暂时不可用: " + classifyException(e));
        }
    }

    private String classifyException(Exception e) {
        String msg = e.getMessage();
        if (msg == null) return "未知错误";
        if (msg.contains("Connection refused")) return "解析服务未启动";
        if (msg.contains("Read timed out") || msg.contains("timeout")) return "解析服务响应超时";
        if (msg.contains("Connection reset")) return "网络连接中断";
        return "服务异常";
    }

    private Map<String, Object> createFallbackResponse(String message) {
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("success", false);
        fallback.put("message", message);
        return fallback;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getFromCache(String key) {
        try {
            Object cached = redisTemplate.opsForValue().get(key);
            if (cached instanceof Map) {
                return (Map<String, Object>) cached;
            }
        } catch (Exception e) {
            log.warn("Redis缓存读取失败: {}", e.getMessage());
        }
        return null;
    }

    private void saveToCache(String key, Map<String, Object> value, long ttlSeconds) {
        try {
            redisTemplate.opsForValue().set(key, value, ttlSeconds, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.warn("Redis缓存写入失败: {}", e.getMessage());
        }
    }
}
