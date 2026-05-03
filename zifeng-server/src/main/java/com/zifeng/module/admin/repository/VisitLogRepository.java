package com.zifeng.module.admin.repository;

import com.zifeng.module.admin.entity.VisitLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface VisitLogRepository extends JpaRepository<VisitLog, Long> {
    long countByVisitDateBetween(LocalDateTime start, LocalDateTime end);

    @Query("SELECT DISTINCT v.ip FROM VisitLog v WHERE v.visitDate BETWEEN :start AND :end")
    List<String> findDistinctIpsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT v.userId) FROM VisitLog v WHERE v.visitDate BETWEEN :start AND :end AND v.userId IS NOT NULL")
    long countDistinctOnlineUsersBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT DATE(v.visitDate) as date, COUNT(v) as count FROM VisitLog v WHERE v.visitDate BETWEEN :start AND :end GROUP BY DATE(v.visitDate) ORDER BY DATE(v.visitDate)")
    List<Object[]> countByDateBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<VisitLog> findTop500ByOrderByVisitDateDesc();

    @Query("SELECT v.ip, COUNT(v) as cnt FROM VisitLog v WHERE v.visitDate BETWEEN :start AND :end GROUP BY v.ip ORDER BY cnt DESC")
    List<Object[]> countByIpBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
