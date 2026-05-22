package com.zifeng.module.admin.repository;

import com.zifeng.module.admin.entity.VisitLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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

    Page<VisitLog> findByIpContainingAndVisitUrlContainingAndVisitDateBetween(
        String ip, String visitUrl, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    Page<VisitLog> findByIpContainingAndVisitUrlContainingAndUserIdIsNullAndVisitDateBetween(
        String ip, String visitUrl, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    Page<VisitLog> findByIpContainingAndVisitUrlContainingAndUserIdIsNotNullAndVisitDateBetween(
        String ip, String visitUrl, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    Page<VisitLog> findByVisitDateBetween(LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    @Query("SELECT v FROM VisitLog v WHERE v.visitDate BETWEEN :startDate AND :endDate " +
           "AND (:keyword IS NULL OR :keyword = '' OR v.ip LIKE %:keyword% OR v.visitUrl LIKE %:keyword% OR v.userAgent LIKE %:keyword% OR CAST(v.userId AS string) LIKE %:keyword% OR v.ipLocation LIKE %:keyword%) " +
           "AND (:userType IS NULL OR :userType = '' " +
           "  OR (:userType = 'guest' AND v.userId IS NULL) " +
           "  OR (:userType = 'admin' AND v.userId < 0) " +
           "  OR (:userType = 'user' AND v.userId > 0))")
    Page<VisitLog> searchLogs(
        @Param("keyword") String keyword,
        @Param("userType") String userType,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate,
        Pageable pageable);

    void deleteByIdIn(List<Long> ids);
}
