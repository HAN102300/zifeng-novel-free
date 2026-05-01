package com.zifeng.module.user.repository;

import com.zifeng.module.user.entity.ReadingHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ReadingHistoryRepository extends JpaRepository<ReadingHistory, Long> {
    List<ReadingHistory> findByUserIdOrderByLastReadDesc(Long userId);
    Optional<ReadingHistory> findByUserIdAndBookUrl(Long userId, String bookUrl);
    void deleteByUserIdAndBookUrl(Long userId, String bookUrl);
    long countByUserId(Long userId);
    List<ReadingHistory> findByBookNameContainingOrAuthorContaining(String bookName, String author);
}
