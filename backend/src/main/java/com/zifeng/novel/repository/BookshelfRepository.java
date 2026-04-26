package com.zifeng.novel.repository;

import com.zifeng.novel.entity.BookshelfItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BookshelfRepository extends JpaRepository<BookshelfItem, Long> {
    List<BookshelfItem> findByUserIdOrderByAddedAtDesc(Long userId);
    Optional<BookshelfItem> findByUserIdAndBookUrl(Long userId, String bookUrl);
    void deleteByUserIdAndBookUrl(Long userId, String bookUrl);
    boolean existsByUserIdAndBookUrl(Long userId, String bookUrl);
    long countByUserId(Long userId);
}
