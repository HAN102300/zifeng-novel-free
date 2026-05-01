package com.zifeng.module.user.service;

import com.zifeng.module.user.dto.ReadingProgressRequest;
import com.zifeng.module.user.entity.ReadingHistory;
import com.zifeng.module.user.repository.ReadingHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class ReadingProgressService {

    private final ReadingHistoryRepository historyRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String PROGRESS_KEY_PREFIX = "reading_progress:";
    private static final long PROGRESS_TTL_HOURS = 72;

    public void saveProgress(Long userId, ReadingProgressRequest request) {
        String redisKey = PROGRESS_KEY_PREFIX + userId + ":" + request.getBookUrl();
        redisTemplate.opsForValue().set(redisKey, request, PROGRESS_TTL_HOURS, TimeUnit.HOURS);

        ReadingHistory history = historyRepository.findByUserIdAndBookUrl(userId, request.getBookUrl())
                .orElse(null);

        boolean isNew = (history == null);
        if (isNew) {
            history = ReadingHistory.builder()
                    .userId(userId)
                    .bookUrl(request.getBookUrl())
                    .bookName("未知书名")
                    .build();
        }

        if (request.getBookName() != null && !request.getBookName().isBlank()) {
            history.setBookName(request.getBookName());
        }
        if (request.getAuthor() != null && !request.getAuthor().isBlank()) {
            history.setAuthor(request.getAuthor());
        }
        if (request.getCoverUrl() != null && !request.getCoverUrl().isBlank()) {
            history.setCoverUrl(request.getCoverUrl());
        }
        if (request.getSummary() != null && !request.getSummary().isBlank()) {
            history.setSummary(request.getSummary());
        }
        if (request.getLastChapter() != null && !request.getLastChapter().isBlank()) {
            history.setLastChapter(request.getLastChapter());
        }
        if (request.getSourceUrl() != null && !request.getSourceUrl().isBlank()) {
            history.setSourceUrl(request.getSourceUrl());
        }
        if (request.getSourceName() != null && !request.getSourceName().isBlank()) {
            history.setSourceName(request.getSourceName());
        }
        if (request.getChapterIndex() != null) {
            history.setChapterIndex(request.getChapterIndex());
        }
        if (request.getChapterName() != null && !request.getChapterName().isBlank()) {
            history.setChapterName(request.getChapterName());
        }
        if (request.getChapterUrl() != null && !request.getChapterUrl().isBlank()) {
            history.setChapterUrl(request.getChapterUrl());
        }
        double progress = request.getProgress() != null ? request.getProgress() : 0.0;
        progress = Math.round(progress * 100000.0) / 100000.0;
        history.setProgress(progress);

        historyRepository.save(history);
    }

    public ReadingProgressRequest getProgress(Long userId, String bookUrl) {
        String redisKey = PROGRESS_KEY_PREFIX + userId + ":" + bookUrl;
        Object cached = redisTemplate.opsForValue().get(redisKey);
        if (cached instanceof ReadingProgressRequest) {
            return (ReadingProgressRequest) cached;
        }

        return historyRepository.findByUserIdAndBookUrl(userId, bookUrl)
                .map(history -> {
                    ReadingProgressRequest req = new ReadingProgressRequest();
                    req.setBookUrl(history.getBookUrl());
                    req.setBookName(history.getBookName());
                    req.setAuthor(history.getAuthor());
                    req.setCoverUrl(history.getCoverUrl());
                    req.setChapterIndex(history.getChapterIndex());
                    req.setChapterName(history.getChapterName());
                    req.setChapterUrl(history.getChapterUrl());
                    req.setProgress(history.getProgress());
                    return req;
                })
                .orElse(null);
    }

    public List<ReadingHistory> getHistory(Long userId) {
        return historyRepository.findByUserIdOrderByLastReadDesc(userId);
    }

    @Transactional
    public void deleteHistory(Long userId, String bookUrl) {
        historyRepository.deleteByUserIdAndBookUrl(userId, bookUrl);
        String redisKey = PROGRESS_KEY_PREFIX + userId + ":" + bookUrl;
        redisTemplate.delete(redisKey);
    }
}
