package com.zifeng.module.admin.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "visit_logs", indexes = {
    @Index(name = "idx_visit_date", columnList = "visit_date"),
    @Index(name = "idx_ip", columnList = "ip")
})
public class VisitLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ip", length = 50)
    private String ip;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "visit_url", length = 500)
    private String visitUrl;

    @Column(name = "visit_date")
    private LocalDateTime visitDate;

    @Column(name = "user_id")
    private Long userId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
