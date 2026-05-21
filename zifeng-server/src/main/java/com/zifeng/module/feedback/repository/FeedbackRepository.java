package com.zifeng.module.feedback.repository;

import com.zifeng.module.feedback.entity.Feedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findByUserIdOrderByCreatedAtDesc(Long userId);

    Page<Feedback> findByCategoryOrderByCreatedAtDesc(String category, Pageable pageable);

    Page<Feedback> findByStatusOrderByCreatedAtDesc(Integer status, Pageable pageable);

    Page<Feedback> findByCategoryAndStatusOrderByCreatedAtDesc(String category, Integer status, Pageable pageable);

    long countByStatus(Integer status);
}
