package com.zifeng.novel.controller;

import com.zifeng.novel.dto.ApiResponse;
import com.zifeng.novel.dto.ReadingProgressRequest;
import com.zifeng.novel.entity.ReadingHistory;
import com.zifeng.novel.service.ReadingProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reading")
@RequiredArgsConstructor
public class ReadingController {

    private final ReadingProgressService progressService;

    @PostMapping("/progress")
    public ApiResponse<Void> saveProgress(@RequestBody ReadingProgressRequest request) {
        progressService.saveProgress(getCurrentUserId(), request);
        return ApiResponse.ok("保存成功", null);
    }

    @GetMapping("/progress")
    public ApiResponse<ReadingProgressRequest> getProgress(@RequestParam String bookUrl) {
        ReadingProgressRequest progress = progressService.getProgress(getCurrentUserId(), bookUrl);
        if (progress == null) {
            return ApiResponse.fail("无阅读进度");
        }
        return ApiResponse.ok(progress);
    }

    @GetMapping("/history")
    public ApiResponse<List<ReadingHistory>> getHistory() {
        return ApiResponse.ok(progressService.getHistory(getCurrentUserId()));
    }

    @DeleteMapping("/history")
    public ApiResponse<Void> deleteHistory(@RequestBody Map<String, String> body) {
        progressService.deleteHistory(getCurrentUserId(), body.get("bookUrl"));
        return ApiResponse.ok("已删除", null);
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
