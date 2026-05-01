package com.zifeng.module.source.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zifeng.module.source.entity.BookSource;
import com.zifeng.module.source.repository.BookSourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class BookSourceService {

    private final BookSourceRepository bookSourceRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String SOURCE_CACHE_PREFIX = "book_source:";
    private static final long SOURCE_CACHE_TTL_HOURS = 24;

    public List<BookSource> getUserSources(Long userId) {
        return bookSourceRepository.findByUserIdOrderByCustomOrderAsc(userId);
    }

    public List<BookSource> getEnabledSources(Long userId) {
        String cacheKey = SOURCE_CACHE_PREFIX + "enabled:" + userId;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return (List<BookSource>) cached;
        }

        List<BookSource> sources = bookSourceRepository.findByUserIdAndEnabledTrueOrderByCustomOrderAsc(userId);
        redisTemplate.opsForValue().set(cacheKey, sources, SOURCE_CACHE_TTL_HOURS, TimeUnit.HOURS);
        return sources;
    }

    public BookSource addSource(Long userId, Map<String, Object> sourceData) {
        String sourceUrl = (String) sourceData.get("bookSourceUrl");
        if (sourceUrl == null) {
            throw new RuntimeException("bookSourceUrl 不能为空");
        }

        BookSource existing = bookSourceRepository.findByUserIdAndBookSourceUrl(userId, sourceUrl).orElse(null);
        if (existing != null) {
            updateSourceFromMap(existing, sourceData);
            return bookSourceRepository.save(existing);
        }

        BookSource source = BookSource.builder()
                .userId(userId)
                .bookSourceName("未命名书源")
                .bookSourceUrl(sourceUrl)
                .bookSourceType(0)
                .enabled(true)
                .customOrder(0)
                .weight(0)
                .enabledCookieJar(false)
                .build();
        updateSourceFromMap(source, sourceData);
        return bookSourceRepository.save(source);
    }

    @Transactional
    public void deleteSource(Long userId, String bookSourceUrl) {
        bookSourceRepository.deleteByUserIdAndBookSourceUrl(userId, bookSourceUrl);
        invalidateCache(userId);
    }

    public BookSource toggleSource(Long userId, String bookSourceUrl, boolean enabled) {
        BookSource source = bookSourceRepository.findByUserIdAndBookSourceUrl(userId, bookSourceUrl)
                .orElseThrow(() -> new RuntimeException("书源不存在"));
        source.setEnabled(enabled);
        BookSource saved = bookSourceRepository.save(source);
        invalidateCache(userId);
        return saved;
    }

    @Transactional
    public void importSources(Long userId, List<Map<String, Object>> sources) {
        for (Map<String, Object> sourceData : sources) {
            try {
                addSource(userId, sourceData);
            } catch (Exception e) {
                continue;
            }
        }
        invalidateCache(userId);
    }

    public long count(Long userId) {
        return bookSourceRepository.countByUserId(userId);
    }

    private void invalidateCache(Long userId) {
        redisTemplate.delete(SOURCE_CACHE_PREFIX + "enabled:" + userId);
    }

    private void updateSourceFromMap(BookSource source, Map<String, Object> data) {
        if (data.get("bookSourceName") != null) source.setBookSourceName((String) data.get("bookSourceName"));
        if (data.get("bookSourceUrl") != null) source.setBookSourceUrl((String) data.get("bookSourceUrl"));
        if (data.get("bookSourceGroup") != null) source.setBookSourceGroup((String) data.get("bookSourceGroup"));
        if (data.get("bookSourceType") != null) source.setBookSourceType(((Number) data.get("bookSourceType")).intValue());
        if (data.get("enabled") != null) source.setEnabled((Boolean) data.get("enabled"));
        if (data.get("header") != null) source.setHeader((String) data.get("header"));
        if (data.get("searchUrl") != null) source.setSearchUrl((String) data.get("searchUrl"));
        if (data.get("exploreUrl") != null) source.setExploreUrl((String) data.get("exploreUrl"));
        if (data.get("loginUrl") != null) source.setLoginUrl((String) data.get("loginUrl"));
        if (data.get("loginUi") != null) source.setLoginUi((String) data.get("loginUi"));
        if (data.get("jsLib") != null) source.setJsLib((String) data.get("jsLib"));
        if (data.get("customOrder") != null) source.setCustomOrder(((Number) data.get("customOrder")).intValue());
        if (data.get("weight") != null) source.setWeight(((Number) data.get("weight")).intValue());
        if (data.get("enabledCookieJar") != null) source.setEnabledCookieJar((Boolean) data.get("enabledCookieJar"));
        if (data.get("concurrentRate") != null) source.setConcurrentRate((String) data.get("concurrentRate"));
        if (data.get("respondTime") != null) source.setRespondTime(((Number) data.get("respondTime")).intValue());

        if (data.get("ruleSearch") != null) source.setRuleSearch(serializeRule(data.get("ruleSearch")));
        if (data.get("ruleBookInfo") != null) source.setRuleBookInfo(serializeRule(data.get("ruleBookInfo")));
        if (data.get("ruleToc") != null) source.setRuleToc(serializeRule(data.get("ruleToc")));
        if (data.get("ruleContent") != null) source.setRuleContent(serializeRule(data.get("ruleContent")));
        if (data.get("ruleExplore") != null) source.setRuleExplore(serializeRule(data.get("ruleExplore")));
    }

    private String serializeRule(Object rule) {
        if (rule == null) return null;
        if (rule instanceof String) return (String) rule;
        try {
            return objectMapper.writeValueAsString(rule);
        } catch (JsonProcessingException e) {
            return rule.toString();
        }
    }

    public BookSource updateSource(Long userId, Map<String, Object> sourceData) {
        String url = (String) sourceData.get("bookSourceUrl");
        if (url == null || url.isBlank()) {
            throw new RuntimeException("书源地址不能为空");
        }
        BookSource existing = bookSourceRepository.findByUserIdAndBookSourceUrl(userId, url)
                .orElseThrow(() -> new RuntimeException("书源不存在"));
        updateSourceFromMap(existing, sourceData);
        return bookSourceRepository.save(existing);
    }

    public List<BookSource> getAllSources() {
        return bookSourceRepository.findAll();
    }

    public long getAllSourcesCount() {
        return bookSourceRepository.count();
    }

    public long getEnabledSourcesCount() {
        return bookSourceRepository.countByEnabledTrue();
    }

    public List<BookSource> searchAllSources(String keyword) {
        return bookSourceRepository.findByBookSourceNameContainingOrBookSourceUrlContaining(keyword, keyword);
    }

    public void adminDeleteSource(Long id) {
        bookSourceRepository.deleteById(id);
    }

    public BookSource adminUpdateSource(Long id, Map<String, Object> sourceData) {
        BookSource source = bookSourceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("书源不存在"));
        updateSourceFromMap(source, sourceData);
        return bookSourceRepository.save(source);
    }

    public List<BookSource> getAllEnabledSources() {
        return bookSourceRepository.findByEnabledTrueOrderByCustomOrderAsc();
    }

    public BookSource adminCreateSource(Map<String, Object> sourceData) {
        BookSource source = BookSource.builder()
                .bookSourceName("未命名书源")
                .bookSourceUrl("")
                .bookSourceType(0)
                .enabled(true)
                .customOrder(0)
                .weight(0)
                .enabledCookieJar(false)
                .build();
        updateSourceFromMap(source, sourceData);
        Object userIdObj = sourceData.get("userId");
        if (userIdObj != null) {
            source.setUserId(((Number) userIdObj).longValue());
        } else {
            source.setUserId(0L);
        }
        if (source.getBookSourceUrl() == null || source.getBookSourceUrl().isBlank()) {
            throw new RuntimeException("书源地址不能为空");
        }
        return bookSourceRepository.save(source);
    }
}
