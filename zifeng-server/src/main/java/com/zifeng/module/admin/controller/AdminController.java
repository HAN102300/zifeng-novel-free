package com.zifeng.module.admin.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.admin.dto.*;
import com.zifeng.module.admin.service.AdminAuthService;
import com.zifeng.module.user.entity.BookshelfItem;
import com.zifeng.module.user.entity.ReadingHistory;
import com.zifeng.module.user.entity.User;
import com.zifeng.module.user.repository.BookshelfRepository;
import com.zifeng.module.user.repository.ReadingHistoryRepository;
import com.zifeng.module.user.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminAuthService adminAuthService;
    private final BookshelfRepository bookshelfRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final UserRepository userRepository;

    @GetMapping("/auth/captcha")
    public ApiResponse<Map<String, String>> getCaptcha() {
        return ApiResponse.ok(adminAuthService.generateCaptcha());
    }

    @PostMapping("/auth/login")
    public ApiResponse<Map<String, Object>> login(@Valid @RequestBody AdminLoginRequest request) {
        try {
            return adminAuthService.login(request);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @GetMapping("/auth/info")
    public ApiResponse<AdminInfoResponse> getAdminInfo() {
        try {
            Long adminId = getCurrentAdminId();
            return ApiResponse.ok(adminAuthService.getAdminInfo(adminId));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @GetMapping("/dashboard")
    @Cacheable(value = "dashboard", key = "'stats'")
    public ApiResponse<DashboardStats> getDashboard() {
        return ApiResponse.ok(adminAuthService.getDashboardStats());
    }

    @GetMapping("/dashboard/online")
    public ApiResponse<Map<String, Object>> getOnlineUsers() {
        long onlineUsers = adminAuthService.getOnlineUsersCount();
        return ApiResponse.ok(Map.of("onlineUsers", onlineUsers));
    }

    @GetMapping("/users")
    @Cacheable(value = "users", key = "#keyword ?: 'all'")
    public ApiResponse<List<User>> listUsers(@RequestParam(required = false) String keyword) {
        if (keyword != null && !keyword.isBlank()) {
            return ApiResponse.ok(adminAuthService.searchUsers(keyword));
        }
        return ApiResponse.ok(adminAuthService.listUsers());
    }

    @PutMapping("/users/{id}/ban")
    @CacheEvict(value = "users", allEntries = true)
    public ApiResponse<Void> banUser(@PathVariable Long id) {
        try {
            adminAuthService.banUser(id);
            return ApiResponse.ok("封禁成功", null);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PutMapping("/users/{id}/unban")
    @CacheEvict(value = "users", allEntries = true)
    public ApiResponse<Void> unbanUser(@PathVariable Long id) {
        try {
            adminAuthService.unbanUser(id);
            return ApiResponse.ok("解封成功", null);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @GetMapping("/admins")
    @Cacheable(value = "admins", key = "'all'")
    public ApiResponse<List<AdminInfoResponse>> listAdmins() {
        return ApiResponse.ok(adminAuthService.listAdmins());
    }

    @PostMapping("/admins")
    @CacheEvict(value = "admins", allEntries = true)
    public ApiResponse<AdminInfoResponse> createAdmin(@Valid @RequestBody CreateAdminRequest request) {
        try {
            return ApiResponse.ok(adminAuthService.createAdmin(request));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PutMapping("/admins/{id}")
    @CacheEvict(value = "admins", allEntries = true)
    public ApiResponse<AdminInfoResponse> updateAdmin(@PathVariable Long id, @Valid @RequestBody UpdateAdminRequest request) {
        try {
            return ApiResponse.ok(adminAuthService.updateAdminUsername(id, request));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @DeleteMapping("/admins/{id}")
    @CacheEvict(value = "admins", allEntries = true)
    public ApiResponse<Void> deleteAdmin(@PathVariable Long id) {
        try {
            adminAuthService.deleteAdmin(id);
            return ApiResponse.ok("deleted", null);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @GetMapping("/reading/bookshelf")
    @Cacheable(value = "bookshelf", key = "#keyword ?: 'all'")
    public ApiResponse<List<Map<String, Object>>> listBookshelf(@RequestParam(required = false) String keyword) {
        List<BookshelfItem> items;
        if (keyword != null && !keyword.isBlank()) {
            items = bookshelfRepository.findByBookNameContainingOrAuthorContaining(keyword, keyword);
        } else {
            items = bookshelfRepository.findAll();
        }
        Set<Long> userIds = items.stream().map(BookshelfItem::getUserId).collect(Collectors.toSet());
        Map<Long, String> usernameMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        List<Map<String, Object>> result = items.stream().map(item -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", item.getId());
            map.put("userId", item.getUserId());
            map.put("username", usernameMap.getOrDefault(item.getUserId(), "未知"));
            map.put("bookName", item.getBookName());
            map.put("author", item.getAuthor());
            map.put("bookUrl", item.getBookUrl());
            map.put("coverUrl", item.getCoverUrl());
            map.put("summary", item.getSummary());
            map.put("lastChapter", item.getLastChapter());
            map.put("sourceUrl", item.getSourceUrl());
            map.put("sourceName", item.getSourceName());
            map.put("category", item.getCategory());
            map.put("addedAt", item.getAddedAt());
            return map;
        }).collect(Collectors.toList());
        return ApiResponse.ok(result);
    }

    @GetMapping("/reading/history")
    @Cacheable(value = "readingHistory", key = "#keyword ?: 'all'")
    public ApiResponse<List<Map<String, Object>>> listReadingHistory(@RequestParam(required = false) String keyword) {
        List<ReadingHistory> items;
        if (keyword != null && !keyword.isBlank()) {
            items = readingHistoryRepository.findByBookNameContainingOrAuthorContaining(keyword, keyword);
        } else {
            items = readingHistoryRepository.findAll();
        }
        Set<Long> userIds = items.stream().map(ReadingHistory::getUserId).collect(Collectors.toSet());
        Map<Long, String> usernameMap = userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        List<Map<String, Object>> result = items.stream().map(item -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", item.getId());
            map.put("userId", item.getUserId());
            map.put("username", usernameMap.getOrDefault(item.getUserId(), "未知"));
            map.put("bookName", item.getBookName());
            map.put("author", item.getAuthor());
            map.put("bookUrl", item.getBookUrl());
            map.put("coverUrl", item.getCoverUrl());
            map.put("summary", item.getSummary());
            map.put("lastChapter", item.getLastChapter());
            map.put("sourceUrl", item.getSourceUrl());
            map.put("sourceName", item.getSourceName());
            map.put("chapterIndex", item.getChapterIndex());
            map.put("chapterName", item.getChapterName());
            map.put("chapterUrl", item.getChapterUrl());
            map.put("progress", item.getProgress());
            map.put("lastRead", item.getLastRead());
            return map;
        }).collect(Collectors.toList());
        return ApiResponse.ok(result);
    }

    private Long getCurrentAdminId() {
        return StpAdminUtil.getLoginIdAsLong();
    }
}
