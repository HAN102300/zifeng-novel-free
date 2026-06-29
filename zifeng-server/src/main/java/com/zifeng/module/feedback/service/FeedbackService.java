package com.zifeng.module.feedback.service;

import com.zifeng.module.feedback.dto.CreateFeedbackRequest;
import com.zifeng.module.feedback.dto.UpdateFeedbackRequest;
import com.zifeng.module.feedback.entity.Feedback;
import com.zifeng.module.feedback.repository.FeedbackRepository;
import com.zifeng.module.admin.entity.Admin;
import com.zifeng.module.admin.repository.AdminRepository;
import com.zifeng.module.user.entity.User;
import com.zifeng.module.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;

    public Feedback createFeedback(Long userId, CreateFeedbackRequest request) {
        Feedback feedback = Feedback.builder()
                .userId(userId)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .pageUrl(request.getPageUrl())
                .userAgent(request.getUserAgent())
                .status(0)
                .priority(2)
                .build();
        feedback = feedbackRepository.save(feedback);
        log.info("用户 {} 提交反馈: {}", userId, feedback.getTitle());
        return feedback;
    }

    public List<Feedback> getByUserId(Long userId) {
        return feedbackRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public Map<String, Object> listFeedbacks(String category, Integer status, int page, int size) {
        Page<Feedback> result;
        PageRequest pageRequest = PageRequest.of(page, size);

        if (category != null && !category.isEmpty() && status != null) {
            result = feedbackRepository.findByCategoryAndStatusOrderByCreatedAtDesc(category, status, pageRequest);
        } else if (category != null && !category.isEmpty()) {
            result = feedbackRepository.findByCategoryOrderByCreatedAtDesc(category, pageRequest);
        } else if (status != null) {
            result = feedbackRepository.findByStatusOrderByCreatedAtDesc(status, pageRequest);
        } else {
            result = feedbackRepository.findAll(pageRequest);
        }

        // Batch query usernames
        Set<Long> userIds = result.getContent().stream()
                .map(Feedback::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> adminIds = result.getContent().stream()
                .map(Feedback::getRepliedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, String> usernameMap = userIds.isEmpty() ? Map.of()
                : userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getUsername));
        Map<Long, String> adminNameMap = adminIds.isEmpty() ? Map.of()
                : adminRepository.findAllById(adminIds).stream()
                .collect(Collectors.toMap(Admin::getId, Admin::getUsername));

        List<Map<String, Object>> items = result.getContent().stream().map(fb -> {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", fb.getId());
            map.put("userId", fb.getUserId());
            map.put("username", usernameMap.getOrDefault(fb.getUserId(), "未知用户"));
            map.put("category", fb.getCategory());
            map.put("title", fb.getTitle());
            map.put("content", fb.getContent());
            map.put("pageUrl", fb.getPageUrl());
            map.put("userAgent", fb.getUserAgent());
            map.put("screenshotUrls", fb.getScreenshotUrls());
            map.put("status", fb.getStatus());
            map.put("priority", fb.getPriority());
            map.put("adminReply", fb.getAdminReply());
            map.put("repliedBy", fb.getRepliedBy());
            map.put("repliedByUsername", fb.getRepliedBy() != null
                    ? adminNameMap.getOrDefault(fb.getRepliedBy(), "管理员") : null);
            map.put("repliedAt", fb.getRepliedAt());
            map.put("createdAt", fb.getCreatedAt());
            map.put("updatedAt", fb.getUpdatedAt());
            return map;
        }).collect(Collectors.toList());

        Map<String, Object> map = new HashMap<>();
        map.put("items", items);
        map.put("total", result.getTotalElements());
        map.put("page", page);
        map.put("size", size);
        return map;
    }

    @Transactional
    public Feedback replyFeedback(Long id, Long adminId, UpdateFeedbackRequest request) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("反馈不存在"));
        feedback.setAdminReply(request.getAdminReply());
        feedback.setRepliedBy(adminId);
        feedback.setRepliedAt(LocalDateTime.now());
        feedback.setStatus(1);
        return feedbackRepository.save(feedback);
    }

    // 允许的状态流转规则：key=当前状态, value=可切换到的状态集合
    private static final java.util.Map<Integer, java.util.Set<Integer>> ALLOWED_TRANSITIONS = java.util.Map.of(
            0, java.util.Set.of(1, 3),    // 待处理 → 处理中, 已关闭
            1, java.util.Set.of(2, 3),    // 处理中 → 已解决, 已关闭
            2, java.util.Set.of(1, 3),    // 已解决 → 处理中(重开), 已关闭
            3, java.util.Set.of()         // 已关闭 → 终态，不可切换
    );

    @Transactional
    public Feedback updateStatus(Long id, Integer status) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("反馈不存在"));

        Integer currentStatus = feedback.getStatus();
        java.util.Set<Integer> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, java.util.Set.of());

        if (!allowed.contains(status)) {
            throw new RuntimeException("当前状态不允许切换到目标状态");
        }

        feedback.setStatus(status);
        return feedbackRepository.save(feedback);
    }

    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("pending", feedbackRepository.countByStatus(0));
        stats.put("inProgress", feedbackRepository.countByStatus(1));
        stats.put("resolved", feedbackRepository.countByStatus(2));
        stats.put("closed", feedbackRepository.countByStatus(3));
        stats.put("total", feedbackRepository.count());
        return stats;
    }
}
