package com.zifeng.module.feedback.service;

import com.zifeng.module.feedback.dto.CreateFeedbackRequest;
import com.zifeng.module.feedback.dto.UpdateFeedbackRequest;
import com.zifeng.module.feedback.entity.Feedback;
import com.zifeng.module.feedback.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;

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

        Map<String, Object> map = new HashMap<>();
        map.put("items", result.getContent());
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

    @Transactional
    public Feedback updateStatus(Long id, Integer status) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("反馈不存在"));
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
