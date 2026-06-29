package com.zifeng.module.source.repository;

import com.zifeng.module.source.entity.BookSource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface BookSourceRepository extends JpaRepository<BookSource, Long> {
    List<BookSource> findByUserIdOrderByCustomOrderAsc(Long userId);
    List<BookSource> findByUserIdAndEnabledTrueOrderByCustomOrderAsc(Long userId);
    Optional<BookSource> findByUserIdAndBookSourceUrl(Long userId, String bookSourceUrl);
    void deleteByUserIdAndBookSourceUrl(Long userId, String bookSourceUrl);
    long countByUserId(Long userId);
    long countByUserIdAndEnabledTrue(Long userId);
    long countByEnabledTrue();

    @Query("SELECT s FROM BookSource s WHERE " +
           "LOWER(s.bookSourceName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.bookSourceUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.bookSourceGroup) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.searchUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.exploreUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.loginUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.header) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleSearch) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleBookInfo) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleToc) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleContent) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleExplore) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.jsLib) LIKE LOWER(CONCAT('%', :kw, '%'))")
    List<BookSource> searchAllFields(@Param("kw") String keyword);

    @Query("SELECT s FROM BookSource s WHERE " +
           "LOWER(s.bookSourceName) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.bookSourceUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.bookSourceGroup) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.searchUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.exploreUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.loginUrl) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.header) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleSearch) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleBookInfo) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleToc) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleContent) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.ruleExplore) LIKE LOWER(CONCAT('%', :kw, '%')) OR " +
           "LOWER(s.jsLib) LIKE LOWER(CONCAT('%', :kw, '%'))")
    Page<BookSource> searchAllFieldsPaged(@Param("kw") String keyword, Pageable pageable);

    List<BookSource> findByEnabledTrueOrderByCustomOrderAsc();
    Page<BookSource> findAll(Pageable pageable);
    void deleteAllByIdIn(Iterable<Long> ids);

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.loginUrl IS NOT NULL AND TRIM(s.loginUrl) <> ''")
    long countHasLogin();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.jsLib IS NOT NULL AND TRIM(s.jsLib) <> ''")
    long countHasJs();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.ruleExplore IS NOT NULL AND TRIM(s.ruleExplore) <> ''")
    long countHasExplore();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.ruleSearch IS NOT NULL AND TRIM(s.ruleSearch) <> ''")
    long countHasSearch();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.ruleContent IS NOT NULL AND TRIM(s.ruleContent) <> ''")
    long countHasContent();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.exploreUrl IS NOT NULL AND TRIM(s.exploreUrl) <> ''")
    long countHasExploreUrl();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.bookSourceType = 0")
    long countTypeText();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.bookSourceType = 1")
    long countTypeWeb();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.bookSourceType = 2")
    long countTypeComic();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.bookSourceType = 3")
    long countTypeAudio();

    @Query("SELECT COUNT(s) FROM BookSource s WHERE s.enabledCookieJar = true")
    long countHasCookie();
}
