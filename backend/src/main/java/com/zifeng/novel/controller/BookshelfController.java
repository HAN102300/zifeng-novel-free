package com.zifeng.novel.controller;

import com.zifeng.novel.dto.ApiResponse;
import com.zifeng.novel.dto.BookshelfRequest;
import com.zifeng.novel.dto.DeleteByBookUrlRequest;
import com.zifeng.novel.entity.BookshelfItem;
import com.zifeng.novel.service.BookshelfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bookshelf")
@RequiredArgsConstructor
public class BookshelfController {

    private final BookshelfService bookshelfService;

    @GetMapping
    public ApiResponse<List<BookshelfItem>> getBookshelf() {
        return ApiResponse.ok(bookshelfService.getBookshelf(getCurrentUserId()));
    }

    @PostMapping
    public ApiResponse<BookshelfItem> addToBookshelf(@Valid @RequestBody BookshelfRequest request) {
        return ApiResponse.ok(bookshelfService.addToBookshelf(getCurrentUserId(), request));
    }

    @DeleteMapping
    public ApiResponse<Void> removeFromBookshelf(@Valid @RequestBody DeleteByBookUrlRequest request) {
        bookshelfService.removeFromBookshelf(getCurrentUserId(), request.getBookUrl());
        return ApiResponse.ok("已移除", null);
    }

    @GetMapping("/check")
    public ApiResponse<Boolean> checkInBookshelf(@RequestParam String bookUrl) {
        return ApiResponse.ok(bookshelfService.isInBookshelf(getCurrentUserId(), bookUrl));
    }

    @GetMapping("/count")
    public ApiResponse<Long> count() {
        return ApiResponse.ok(bookshelfService.count(getCurrentUserId()));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
