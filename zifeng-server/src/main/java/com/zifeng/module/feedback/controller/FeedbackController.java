package com.zifeng.module.feedback.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.feedback.dto.CreateFeedbackRequest;
import com.zifeng.module.feedback.dto.UpdateFeedbackRequest;
import com.zifeng.module.feedback.entity.Feedback;
import com.zifeng.module.feedback.service.FeedbackService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping("/api/feedback")
    public ApiResponse<Feedback> createFeedback(
            @Valid @RequestBody CreateFeedbackRequest request) {
        Long userId = StpUtil.getLoginIdAsLong();
        return ApiResponse.ok(feedbackService.createFeedback(userId, request));
    }

    @GetMapping("/api/feedback/mine")
    public ApiResponse<List<Feedback>> getMyFeedbacks() {
        Long userId = StpUtil.getLoginIdAsLong();
        return ApiResponse.ok(feedbackService.getByUserId(userId));
    }

    @GetMapping("/api/admin/feedbacks")
    public ApiResponse<Map<String, Object>> listFeedbacks(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Integer status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(feedbackService.listFeedbacks(category, status, page, size));
    }

    @PutMapping("/api/admin/feedbacks/{id}/reply")
    public ApiResponse<Feedback> replyFeedback(
            @PathVariable Long id,
            @Valid @RequestBody UpdateFeedbackRequest request) {
        Long adminId = StpAdminUtil.getLoginIdAsLong();
        return ApiResponse.ok(feedbackService.replyFeedback(id, adminId, request));
    }

    @PutMapping("/api/admin/feedbacks/{id}/status")
    public ApiResponse<Feedback> updateStatus(
            @PathVariable Long id,
            @RequestParam Integer status) {
        return ApiResponse.ok(feedbackService.updateStatus(id, status));
    }

    @GetMapping("/api/admin/feedbacks/stats")
    public ApiResponse<Map<String, Object>> getFeedbackStats() {
        return ApiResponse.ok(feedbackService.getStats());
    }
}
