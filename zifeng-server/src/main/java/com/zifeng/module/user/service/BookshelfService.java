package com.zifeng.module.user.service;

import com.zifeng.module.user.dto.BookshelfRequest;
import com.zifeng.module.user.entity.BookshelfItem;
import com.zifeng.module.user.entity.ReadingHistory;
import com.zifeng.module.user.repository.BookshelfRepository;
import com.zifeng.module.user.repository.ReadingHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookshelfService {

    private final BookshelfRepository bookshelfRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String BOOKSHELF_KEY_PREFIX = "bookshelf:";
    private static final long BOOKSHELF_TTL_HOURS = 24;

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getBookshelf(Long userId) {
        String cacheKey = BOOKSHELF_KEY_PREFIX + userId;
        try {
            Object cached = redisTemplate.opsForValue().get(cacheKey);
            if (cached instanceof List) {
                return (List<Map<String, Object>>) cached;
            }
        } catch (Exception e) {
            // 缓存读取失败不影响正常流程，直接查库
        }

        List<BookshelfItem> items = bookshelfRepository.findByUserIdOrderByAddedAtDesc(userId);

        List<ReadingHistory> histories = readingHistoryRepository.findByUserIdOrderByLastReadDesc(userId);
        Map<String, Double> progressMap = histories.stream()
                .filter(h -> h.getBookUrl() != null && h.getProgress() != null)
                .collect(Collectors.toMap(
                        ReadingHistory::getBookUrl,
                        ReadingHistory::getProgress,
                        (a, b) -> b
                ));

        List<Map<String, Object>> result = items.stream().map(item -> {
            Map<String, Object> map = new java.util.LinkedHashMap<>();
            map.put("id", item.getId());
            map.put("userId", item.getUserId());
            map.put("bookName", item.getBookName());
            map.put("author", item.getAuthor());
            map.put("bookUrl", item.getBookUrl());
            map.put("coverUrl", item.getCoverUrl());
            map.put("summary", item.getSummary());
            map.put("lastChapter", item.getLastChapter());
            map.put("sourceUrl", item.getSourceUrl());
            map.put("sourceName", item.getSourceName());
            map.put("category", item.getCategory());
            map.put("addedAt", item.getAddedAt());
            map.put("progress", progressMap.getOrDefault(item.getBookUrl(), 0.0));
            return map;
        }).collect(Collectors.toList());

        try {
            redisTemplate.opsForValue().set(cacheKey, result, BOOKSHELF_TTL_HOURS, java.util.concurrent.TimeUnit.HOURS);
        } catch (Exception e) {
            // 缓存写入失败不影响正常流程
        }

        return result;
    }

    public BookshelfItem addToBookshelf(Long userId, BookshelfRequest request) {
        if (bookshelfRepository.existsByUserIdAndBookUrl(userId, request.getBookUrl())) {
            BookshelfItem existing = bookshelfRepository.findByUserIdAndBookUrl(userId, request.getBookUrl())
                    .orElseThrow();
            if (request.getLastChapter() != null) {
                existing.setLastChapter(request.getLastChapter());
            }
            BookshelfItem saved = bookshelfRepository.save(existing);
            invalidateCache(userId);
            return saved;
        }

        BookshelfItem item = BookshelfItem.builder()
                .userId(userId)
                .bookName(request.getBookName())
                .author(request.getAuthor())
                .bookUrl(request.getBookUrl())
                .coverUrl(request.getCoverUrl())
                .summary(request.getSummary())
                .lastChapter(request.getLastChapter())
                .sourceUrl(request.getSourceUrl())
                .sourceName(request.getSourceName())
                .category(request.getCategory())
                .build();

        BookshelfItem saved = bookshelfRepository.save(item);
        invalidateCache(userId);
        return saved;
    }

    @Transactional
    public void removeFromBookshelf(Long userId, String bookUrl) {
        // 从书架表中删除 (MySQL)，并同步清除书架缓存 (Redis)
        bookshelfRepository.deleteByUserIdAndBookUrl(userId, bookUrl);
        invalidateCache(userId);
    }

    public boolean isInBookshelf(Long userId, String bookUrl) {
        return bookshelfRepository.existsByUserIdAndBookUrl(userId, bookUrl);
    }

    public long count(Long userId) {
        return bookshelfRepository.countByUserId(userId);
    }

    private void invalidateCache(Long userId) {
        redisTemplate.delete(BOOKSHELF_KEY_PREFIX + userId);
    }
}
