package com.zifeng.novel.service;

import com.zifeng.novel.dto.ReadingProgressRequest;
import com.zifeng.novel.entity.ReadingHistory;
import com.zifeng.novel.repository.ReadingHistoryRepository;
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
                .orElse(ReadingHistory.builder()
                        .userId(userId)
                        .bookUrl(request.getBookUrl())
                        .build());

        history.setBookName(request.getBookName());
        history.setAuthor(request.getAuthor());
        history.setCoverUrl(request.getCoverUrl());
        history.setSummary(request.getSummary());
        history.setLastChapter(request.getLastChapter());
        history.setSourceUrl(request.getSourceUrl());
        history.setSourceName(request.getSourceName());
        history.setChapterIndex(request.getChapterIndex());
        history.setChapterName(request.getChapterName());
        history.setChapterUrl(request.getChapterUrl());
        history.setProgress(request.getProgress() != null ? request.getProgress() : 0.0);

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
