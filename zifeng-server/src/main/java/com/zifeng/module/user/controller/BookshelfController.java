package com.zifeng.module.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.user.dto.BookshelfRequest;
import com.zifeng.module.user.dto.DeleteByBookUrlRequest;
import com.zifeng.module.user.entity.BookshelfItem;
import com.zifeng.module.user.service.BookshelfService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookshelf")
@RequiredArgsConstructor
public class BookshelfController {

    private final BookshelfService bookshelfService;

    @GetMapping
    public ApiResponse<List<Map<String, Object>>> getBookshelf() {
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
        return StpUtil.getLoginIdAsLong();
    }
}
