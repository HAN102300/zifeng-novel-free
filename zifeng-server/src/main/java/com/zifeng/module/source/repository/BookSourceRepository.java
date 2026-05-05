package com.zifeng.module.source.repository;

import com.zifeng.module.source.entity.BookSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
    long countByEnabledTrue();
    List<BookSource> findByBookSourceNameContainingOrBookSourceUrlContaining(String name, String url);
    Page<BookSource> findByBookSourceNameContainingOrBookSourceUrlContaining(String name, String url, Pageable pageable);
    List<BookSource> findByEnabledTrueOrderByCustomOrderAsc();
    Page<BookSource> findAll(Pageable pageable);
    void deleteAllByIdIn(Iterable<Long> ids);
}
