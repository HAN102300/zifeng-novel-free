package com.zifeng.novel.repository;

import com.zifeng.novel.entity.ReadingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Long> {
    List<ReadingHistory> findByUserIdOrderByLastReadDesc(Long userId);
    Optional<ReadingHistory> findByUserIdAndBookUrl(Long userId, String bookUrl);
    void deleteByUserIdAndBookUrl(Long userId, String bookUrl);
    long countByUserId(Long userId);
}
