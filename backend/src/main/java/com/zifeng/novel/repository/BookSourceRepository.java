package com.zifeng.novel.repository;

import com.zifeng.novel.entity.BookSource;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookSourceRepository extends JpaRepository<BookSource, Long> {
    List<BookSource> findByUserIdOrderByCustomOrderAsc(Long userId);
    List<BookSource> findByUserIdAndEnabledTrueOrderByCustomOrderAsc(Long userId);
    Optional<BookSource> findByUserIdAndBookSourceUrl(Long userId, String bookSourceUrl);
    void deleteByUserIdAndBookSourceUrl(Long userId, String bookSourceUrl);
    long countByUserId(Long userId);
    long countByUserIdAndEnabledTrue(Long userId);
}
