package com.zifeng.module.source.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.source.dto.*;
import com.zifeng.module.source.entity.BookSource;
import com.zifeng.module.source.service.BookSourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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

    @PutMapping
    public ApiResponse<BookSource> updateSource(@RequestBody Map<String, Object> sourceData) {
        try {
            Long userId = getCurrentUserId();
            BookSource updated = bookSourceService.updateSource(userId, sourceData);
            return ApiResponse.ok(updated);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @GetMapping("/export")
    public ApiResponse<List<BookSource>> exportSources() {
        Long userId = getCurrentUserId();
        return ApiResponse.ok(bookSourceService.getUserSources(userId));
    }

    @GetMapping("/public/all")
    public ApiResponse<List<BookSource>> getAllEnabledSources() {
        return ApiResponse.ok(bookSourceService.getAllEnabledSources());
    }

    @GetMapping("/admin/all")
    @Cacheable(value = "sourceList", key = "#keyword ?: 'all'")
    public ApiResponse<List<BookSource>> adminListAllSources(
            @RequestParam(required = false) String keyword) {
        List<BookSource> sources;
        if (keyword != null && !keyword.isBlank()) {
            sources = bookSourceService.searchAllSources(keyword);
        } else {
            sources = bookSourceService.getAllSources();
        }
        return ApiResponse.ok(sources);
    }

    @DeleteMapping("/admin/{id}")
    @CacheEvict(value = {"sourceList", "sourceStats"}, allEntries = true)
    public ApiResponse<Void> adminDeleteSource(@PathVariable Long id) {
        try {
            bookSourceService.adminDeleteSource(id);
            return ApiResponse.ok("删除成功", null);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PutMapping("/admin/{id}")
    @CacheEvict(value = {"sourceList", "sourceStats"}, allEntries = true)
    public ApiResponse<BookSource> adminUpdateSource(@PathVariable Long id, @RequestBody Map<String, Object> sourceData) {
        try {
            BookSource updated = bookSourceService.adminUpdateSource(id, sourceData);
            return ApiResponse.ok(updated);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/admin")
    @CacheEvict(value = {"sourceList", "sourceStats"}, allEntries = true)
    public ApiResponse<BookSource> adminCreateSource(@RequestBody Map<String, Object> sourceData) {
        try {
            BookSource created = bookSourceService.adminCreateSource(sourceData);
            return ApiResponse.ok(created);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/admin/import")
    @CacheEvict(value = {"sourceList", "sourceStats"}, allEntries = true)
    public ApiResponse<Map<String, Object>> adminImportSources(@RequestBody List<Map<String, Object>> sourcesData) {
        int success = 0;
        int fail = 0;
        for (Map<String, Object> data : sourcesData) {
            try {
                bookSourceService.adminCreateSource(data);
                success++;
            } catch (Exception e) {
                fail++;
            }
        }
        return ApiResponse.ok(Map.of("success", success, "fail", fail));
    }

    @GetMapping("/admin/count")
    @Cacheable(value = "sourceStats", key = "'stats'")
    public ApiResponse<Map<String, Object>> adminSourceStats() {
        long total = bookSourceService.getAllSourcesCount();
        long enabled = bookSourceService.getEnabledSourcesCount();
        return ApiResponse.ok(Map.of("total", total, "enabled", enabled, "disabled", total - enabled));
    }

    private Long getCurrentUserId() {
        return StpUtil.getLoginIdAsLong();
    }
}
