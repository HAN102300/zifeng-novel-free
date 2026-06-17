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
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final ParsingProxyService parsingProxyService;
    private final BookSourceRepository bookSourceRepository;

    /**
     * 频道中文映射，用于匹配 exploreUrl 中的名称
     */
    private static final Map<String, List<String>> CHANNEL_NAME_MAP = Map.of(
            "male", List.of("男生", "男频", "male"),
            "female", List.of("女生", "女频", "female"));

    /**
     * 获取分类列表
     * 
     * @param channel 频道：male 男生 | female 女生
     */
    @GetMapping("/{channel}")
    public ApiResponse<List<Map<String, Object>>> getCategories(@PathVariable String channel) {
        List<String> channelNames = CHANNEL_NAME_MAP.getOrDefault(channel, List.of(channel));
        List<BookSource> allSources = bookSourceRepository.findByEnabledTrueOrderByCustomOrderAsc();

        for (BookSource source : allSources) {
            String exploreUrl = source.getExploreUrl();
            if (exploreUrl == null || exploreUrl.isBlank()) {
                continue;
            }

            String matchedUrl = findExploreUrlByName(exploreUrl, channelNames);
            if (matchedUrl != null) {
                try {
                    Map<String, Object> sourceMap = buildSourceMap(source);
                    Map<String, Object> result = parsingProxyService.explore(sourceMap, matchedUrl);

                    if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                        // 将 explore 结果转换为分类列表
                        List<Map<String, Object>> categories = extractCategories(exploreUrl, channelNames);
                        return ApiResponse.ok(categories);
                    }
                } catch (Exception e) {
                    log.warn("[CategoryController] 书源 {} 获取分类失败: {}", source.getBookSourceName(), e.getMessage());
                    continue;
                }
            }
        }

        return ApiResponse.ok(new ArrayList<>());
    }

    /**
     * 获取分类下的小说列表
     * 
     * @param channel    频道：male 男生 | female 女生
     * @param categoryId 分类 ID
     * @param page       页码，默认1
     */
    @GetMapping("/{channel}/{categoryId}")
    public ApiResponse<Map<String, Object>> getCategoryNovels(
            @PathVariable String channel,
            @PathVariable String categoryId,
            @RequestParam(defaultValue = "1") int page) {
        List<String> channelNames = CHANNEL_NAME_MAP.getOrDefault(channel, List.of(channel));
        List<BookSource> allSources = bookSourceRepository.findByEnabledTrueOrderByCustomOrderAsc();

        for (BookSource source : allSources) {
            String exploreUrl = source.getExploreUrl();
            if (exploreUrl == null || exploreUrl.isBlank()) {
                continue;
            }

            // 先找到频道对应的 URL 前缀
            String channelUrl = findExploreUrlByName(exploreUrl, channelNames);
            if (channelUrl == null) {
                continue;
            }

            // 尝试匹配分类ID对应的 URL
            String categoryUrl = findCategoryUrl(exploreUrl, categoryId);
            if (categoryUrl == null) {
                // 如果找不到精确匹配，使用频道URL拼接分类参数
                categoryUrl = channelUrl;
            }

            try {
                Map<String, Object> sourceMap = buildSourceMap(source);
                String fullUrl = categoryUrl.contains("?")
                        ? categoryUrl + "&page=" + page
                        : categoryUrl + "?page=" + page;
                Map<String, Object> result = parsingProxyService.explore(sourceMap, fullUrl);

                if (result != null && Boolean.TRUE.equals(result.get("success"))) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> books = (List<Map<String, Object>>) result.getOrDefault("books",
                            new ArrayList<>());
                    Map<String, Object> response = new HashMap<>();
                    response.put("list", books);
                    response.put("total", books.size());
                    return ApiResponse.ok(response);
                }
            } catch (Exception e) {
                log.warn("[CategoryController] 书源 {} 获取分类小说失败: {}", source.getBookSourceName(), e.getMessage());
                continue;
            }
        }

        Map<String, Object> emptyResult = new HashMap<>();
        emptyResult.put("list", new ArrayList<>());
        emptyResult.put("total", 0);
        return ApiResponse.ok(emptyResult);
    }

    /**
     * 从 exploreUrl 中提取分类列表
     */
    private List<Map<String, Object>> extractCategories(String exploreUrl, List<String> channelNames) {
        List<Map<String, Object>> categories = new ArrayList<>();
        String[] entries = exploreUrl.split("[\n\r&&]");
        boolean inChannel = false;

        for (String entry : entries) {
            String trimmed = entry.trim();
            if (trimmed.isEmpty())
                continue;

            String[] parts = trimmed.split("::", 2);
            if (parts.length < 2) {
                parts = trimmed.split(":", 2);
            }

            if (parts.length >= 2) {
                String name = parts[0].trim();
                String url = parts[1].trim();

                // 检查是否是频道标题
                boolean isChannelHeader = false;
                for (String channelName : channelNames) {
                    if (name.contains(channelName)) {
                        isChannelHeader = true;
                        break;
                    }
                }

                if (isChannelHeader) {
                    inChannel = true;
                    continue;
                }

                // 如果在频道内或者是顶级分类，添加到列表
                if (inChannel || channelNames.isEmpty()) {
                    Map<String, Object> category = new HashMap<>();
                    category.put("id", url);
                    category.put("name", name);
                    category.put("channel", channelNames.get(0));
                    categories.add(category);
                }
            }
        }

        return categories;
    }

    /**
     * 从 exploreUrl 中查找分类ID对应的URL
     */
    private String findCategoryUrl(String exploreUrl, String categoryId) {
        String[] entries = exploreUrl.split("[\n\r&&]");
        for (String entry : entries) {
            String trimmed = entry.trim();
            if (trimmed.isEmpty())
                continue;

            String[] parts = trimmed.split("::", 2);
            if (parts.length < 2) {
                parts = trimmed.split(":", 2);
            }

            if (parts.length >= 2) {
                String url = parts[1].trim();
                if (url.equals(categoryId) || url.endsWith("/" + categoryId)) {
                    return url;
                }
            }
        }
        return null;
    }

    /**
     * 从 exploreUrl 字符串中查找匹配的 URL
     */
    private String findExploreUrlByName(String exploreUrl, List<String> names) {
        String[] entries = exploreUrl.split("[\n\r&&]");
        for (String entry : entries) {
            String trimmed = entry.trim();
            if (trimmed.isEmpty())
                continue;

            String[] parts = trimmed.split("::", 2);
            if (parts.length < 2) {
                parts = trimmed.split(":", 2);
            }
            if (parts.length >= 2) {
                String name = parts[0].trim();
                String url = parts[1].trim();
                for (String targetName : names) {
                    if (name.contains(targetName)) {
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
