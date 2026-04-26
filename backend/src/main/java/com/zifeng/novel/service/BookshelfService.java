package com.zifeng.novel.service;

import com.zifeng.novel.dto.BookshelfRequest;
import com.zifeng.novel.entity.BookshelfItem;
import com.zifeng.novel.repository.BookshelfRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookshelfService {

    private final BookshelfRepository bookshelfRepository;

    public List<BookshelfItem> getBookshelf(Long userId) {
        return bookshelfRepository.findByUserIdOrderByAddedAtDesc(userId);
    }

    public BookshelfItem addToBookshelf(Long userId, BookshelfRequest request) {
        if (bookshelfRepository.existsByUserIdAndBookUrl(userId, request.getBookUrl())) {
            BookshelfItem existing = bookshelfRepository.findByUserIdAndBookUrl(userId, request.getBookUrl())
                    .orElseThrow();
            if (request.getLastChapter() != null) {
                existing.setLastChapter(request.getLastChapter());
            }
            return bookshelfRepository.save(existing);
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

        return bookshelfRepository.save(item);
    }

    @Transactional
    public void removeFromBookshelf(Long userId, String bookUrl) {
        bookshelfRepository.deleteByUserIdAndBookUrl(userId, bookUrl);
    }

    public boolean isInBookshelf(Long userId, String bookUrl) {
        return bookshelfRepository.existsByUserIdAndBookUrl(userId, bookUrl);
    }

    public long count(Long userId) {
        return bookshelfRepository.countByUserId(userId);
    }
}
