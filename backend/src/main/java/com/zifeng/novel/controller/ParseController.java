package com.zifeng.novel.controller;

import com.zifeng.novel.dto.ApiResponse;
import com.zifeng.novel.dto.ParseRequest;
import com.zifeng.novel.service.ParsingProxyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/parse")
@RequiredArgsConstructor
public class ParseController {

    private final ParsingProxyService parsingProxyService;

    @PostMapping("/search")
    public ApiResponse<Map<String, Object>> search(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.search(
                request.getSource(),
                request.getKeyword(),
                request.getPage() != null ? request.getPage() : 1);
        return ApiResponse.ok(result);
    }

    @PostMapping("/test-source")
    public ApiResponse<Map<String, Object>> testSource(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.testSource(
                request.getSource(),
                request.getKeyword(),
                request.getPage() != null ? request.getPage() : 1,
                Boolean.TRUE.equals(request.getFullTest()));
        return ApiResponse.ok(result);
    }

    @PostMapping("/book-info")
    public ApiResponse<Map<String, Object>> getBookInfo(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.getBookInfo(
                request.getSource(),
                request.getBookUrl(),
                request.getBook());
        return ApiResponse.ok(result);
    }

    @PostMapping("/toc")
    public ApiResponse<Map<String, Object>> getToc(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.getToc(
                request.getSource(),
                request.getTocUrl(),
                request.getBook());
        return ApiResponse.ok(result);
    }

    @PostMapping("/content")
    public ApiResponse<Map<String, Object>> getContent(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.getContent(
                request.getSource(),
                request.getChapterUrl(),
                request.getBook(),
                request.getChapter());
        return ApiResponse.ok(result);
    }

    @PostMapping("/explore")
    public ApiResponse<Map<String, Object>> explore(@RequestBody ParseRequest request) {
        Map<String, Object> result = parsingProxyService.explore(
                request.getSource(),
                request.getExploreUrl());
        return ApiResponse.ok(result);
    }
}
