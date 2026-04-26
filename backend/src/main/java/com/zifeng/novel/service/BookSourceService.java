package com.zifeng.novel.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zifeng.novel.entity.BookSource;
import com.zifeng.novel.repository.BookSourceRepository;
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

        try {
            if (data.get("ruleSearch") != null) source.setRuleSearch(objectMapper.writeValueAsString(data.get("ruleSearch")));
            if (data.get("ruleBookInfo") != null) source.setRuleBookInfo(objectMapper.writeValueAsString(data.get("ruleBookInfo")));
            if (data.get("ruleToc") != null) source.setRuleToc(objectMapper.writeValueAsString(data.get("ruleToc")));
            if (data.get("ruleContent") != null) source.setRuleContent(objectMapper.writeValueAsString(data.get("ruleContent")));
            if (data.get("ruleExplore") != null) source.setRuleExplore(objectMapper.writeValueAsString(data.get("ruleExplore")));
        } catch (JsonProcessingException e) {
            throw new RuntimeException("序列化规则失败", e);
        }
    }
}
