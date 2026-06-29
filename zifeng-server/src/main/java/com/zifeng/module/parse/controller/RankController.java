package com.zifeng.module.parse.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.parse.service.ParsingProxyService;
import com.zifeng.module.source.entity.BookSource;
import com.zifeng.module.source.repository.BookSourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/rank")
@RequiredArgsConstructor
public class RankController {

    private final ParsingProxyService parsingProxyService;
    private final BookSourceRepository bookSourceRepository;

    /**
     * 支持的排行榜类型
     */
    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "mustRead", "potential", "weekly", "monthly", "newBook", "complete");

    /**
     * 排行榜类型中文映射，用于匹配 exploreUrl 中的名称
     */
    private static final Map<String, List<String>> RANK_NAME_MAP = Map.of(
            "mustRead", List.of("必读", "必读榜", "mustRead"),
            "potential", List.of("潜力", "潜力榜", "potential"),
            "weekly", List.of("周榜", "周推荐", "weekly"),
            "monthly", List.of("月榜", "月推荐", "monthly"),
            "newBook", List.of("新书", "新书榜", "newBook"),
            "complete", List.of("完本", "完本榜", "complete"));

    /**
     * 获取排行榜数据
     * 
     * @param type 排行榜类型：mustRead, potential, weekly, monthly, newBook, complete
     * @param page 页码，默认1
     */
    @GetMapping("/{type}")
    public ApiResponse<List<Map<String, Object>>> getRankData(
            @PathVariable String type,
            @RequestParam(defaultValue = "1") int page) {
        if (!SUPPORTED_TYPES.contains(type)) {
            return ApiResponse.fail("不支持的排行榜类型: " + type + "，支持: " + SUPPORTED_TYPES);
        }

        List<String> rankNames = RANK_NAME_MAP.getOrDefault(type, List.of(type));
        List<BookSource> allSources = bookSourceRepository.findByEnabledTrueOrderByCustomOrderAsc();

        for (BookSource source : allSources) {
            String exploreUrl = source.getExploreUrl();
            if (exploreUrl == null || exploreUrl.isBlank()) {
                continue;
            }

            String matchedUrl = findExploreUrlByName(exploreUrl, rankNames);
            if (matchedUrl != null) {
                try {
                    Map<String, Object> sourceMap = buildSourceMap(source);
                    Map<String, Object> result = parsingProxyService.explore(sourceMap, matchedUrl + "?page=" + page);

                    if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                        @SuppressWarnings("unchecked")
                        List<Map<String, Object>> books = (List<Map<String, Object>>) result.getOrDefault("books",
                                new ArrayList<>());
                        return ApiResponse.ok(books);
                    }
                } catch (Exception e) {
                    log.warn("[RankController] 书源 {} 获取排行榜失败: {}", source.getBookSourceName(), e.getMessage());
                    continue;
                }
            }
        }

        return ApiResponse.ok(new ArrayList<>());
    }

    /**
     * 从 exploreUrl 字符串中查找匹配的排行URL
     * exploreUrl 格式示例: "必读榜::/rank/mustRead\n潜力榜::/rank/potential"
     */
    private String findExploreUrlByName(String exploreUrl, List<String> rankNames) {
        String[] entries = exploreUrl.split("[\n\r&&]");
        for (String entry : entries) {
            String trimmed = entry.trim();
            if (trimmed.isEmpty())
                continue;

            // 格式: 名称::URL 或 名称:URL
            String[] parts = trimmed.split("::", 2);
            if (parts.length < 2) {
                parts = trimmed.split(":", 2);
            }
            if (parts.length >= 2) {
                String name = parts[0].trim();
                String url = parts[1].trim();
                for (String rankName : rankNames) {
                    if (name.contains(rankName)) {
                        return url;
                    }
                }
            }
        }
        return null;
    }

    /**
     * 构建 source Map，用于传递给 ParsingProxyService
     */
    private Map<String, Object> buildSourceMap(BookSource source) {
        Map<String, Object> map = new HashMap<>();
        map.put("bookSourceUrl", source.getBookSourceUrl());
        map.put("bookSourceName", source.getBookSourceName());
        map.put("bookSourceType", source.getBookSourceType());
        map.put("bookSourceGroup", source.getBookSourceGroup() != null ? source.getBookSourceGroup() : "");
        map.put("header", source.getHeader() != null ? source.getHeader() : "");
        map.put("searchUrl", source.getSearchUrl() != null ? source.getSearchUrl() : "");
        map.put("exploreUrl", source.getExploreUrl() != null ? source.getExploreUrl() : "");
        map.put("ruleSearch", source.getRuleSearch() != null ? source.getRuleSearch() : "");
        map.put("ruleExplore", source.getRuleExplore() != null ? source.getRuleExplore() : "");
        map.put("ruleBookInfo", source.getRuleBookInfo() != null ? source.getRuleBookInfo() : "");
        map.put("ruleToc", source.getRuleToc() != null ? source.getRuleToc() : "");
        map.put("ruleContent", source.getRuleContent() != null ? source.getRuleContent() : "");
        map.put("enabledCookieJar", source.getEnabledCookieJar() != null ? source.getEnabledCookieJar() : false);
        map.put("jsLib", source.getJsLib() != null ? source.getJsLib() : "");
        return map;
    }
}
