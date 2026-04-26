package com.zifeng.novel.controller;

import com.zifeng.novel.dto.*;
import com.zifeng.novel.entity.BookSource;
import com.zifeng.novel.service.BookSourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sources")
@RequiredArgsConstructor
public class BookSourceController {

    private final BookSourceService bookSourceService;

    @GetMapping
    public ApiResponse<List<BookSource>> getUserSources() {
        return ApiResponse.ok(bookSourceService.getUserSources(getCurrentUserId()));
    }

    @GetMapping("/enabled")
    public ApiResponse<List<BookSource>> getEnabledSources() {
        return ApiResponse.ok(bookSourceService.getEnabledSources(getCurrentUserId()));
    }

    @PostMapping
    public ApiResponse<BookSource> addSource(@RequestBody Map<String, Object> sourceData) {
        return ApiResponse.ok(bookSourceService.addSource(getCurrentUserId(), sourceData));
    }

    @DeleteMapping
    public ApiResponse<Void> deleteSource(@Valid @RequestBody DeleteBySourceUrlRequest request) {
        bookSourceService.deleteSource(getCurrentUserId(), request.getBookSourceUrl());
        return ApiResponse.ok("已删除", null);
    }

    @PutMapping("/toggle")
    public ApiResponse<BookSource> toggleSource(@Valid @RequestBody ToggleSourceRequest request) {
        return ApiResponse.ok(bookSourceService.toggleSource(getCurrentUserId(), request.getBookSourceUrl(), request.getEnabled()));
    }

    @PostMapping("/import")
    public ApiResponse<String> importSources(@RequestBody List<Map<String, Object>> sources) {
        bookSourceService.importSources(getCurrentUserId(), sources);
        return ApiResponse.ok("导入完成", null);
    }

    @GetMapping("/count")
    public ApiResponse<Long> count() {
        return ApiResponse.ok(bookSourceService.count(getCurrentUserId()));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
