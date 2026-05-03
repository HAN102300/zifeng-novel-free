package com.zifeng.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final int GLOBAL_LIMIT = 100;
    private static final int GLOBAL_WINDOW_SEC = 60;
    private static final int API_LIMIT = 30;
    private static final int API_WINDOW_SEC = 60;
    private static final int AUTH_LIMIT = 5;
    private static final int AUTH_WINDOW_SEC = 60;

    private static final String AUTH_PREFIX = "/api/auth/login";
    private static final String ADMIN_AUTH_PREFIX = "/api/admin/auth/login";

    private final Map<String, SlidingWindow> localWindows = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();
        if (!uri.startsWith("/api/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = getClientIp(request);
        String globalKey = "rl:global:" + ip;
        String apiKey = "rl:api:" + ip + ":" + uri;

        if (isAuthEndpoint(uri)) {
            String authKey = "rl:auth:" + ip;
            if (!tryRedisRateLimit(authKey, AUTH_LIMIT, AUTH_WINDOW_SEC)) {
                if (!tryLocalRateLimit(authKey, AUTH_LIMIT, AUTH_WINDOW_SEC)) {
                    sendRateLimitResponse(response, "登录尝试过于频繁，请稍后再试");
                    return;
                }
            }
        }

        if (!tryRedisRateLimit(globalKey, GLOBAL_LIMIT, GLOBAL_WINDOW_SEC)) {
            if (!tryLocalRateLimit(globalKey, GLOBAL_LIMIT, GLOBAL_WINDOW_SEC)) {
                sendRateLimitResponse(response, "请求过于频繁，请稍后再试");
                return;
            }
        }

        if (!tryRedisRateLimit(apiKey, API_LIMIT, API_WINDOW_SEC)) {
            if (!tryLocalRateLimit(apiKey, API_LIMIT, API_WINDOW_SEC)) {
                sendRateLimitResponse(response, "该接口请求过于频繁，请稍后再试");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAuthEndpoint(String uri) {
        return AUTH_PREFIX.equals(uri) || ADMIN_AUTH_PREFIX.equals(uri);
    }

    private boolean tryRedisRateLimit(String key, int limit, int windowSec) {
        try {
            Long current = redisTemplate.opsForValue().increment(key);
            if (current != null && current == 1) {
                redisTemplate.expire(key, java.time.Duration.ofSeconds(windowSec));
            }
            return current == null || current <= limit;
        } catch (Exception e) {
            log.debug("Redis rate limit fallback to local: {}", e.getMessage());
            return false;
        }
    }

    private boolean tryLocalRateLimit(String key, int limit, int windowSec) {
        long now = System.currentTimeMillis();
        long windowMs = windowSec * 1000L;
        SlidingWindow window = localWindows.computeIfAbsent(key, k -> new SlidingWindow());
        synchronized (window) {
            if (now - window.startTime > windowMs) {
                window.startTime = now;
                window.count.set(1);
                return true;
            }
            return window.count.incrementAndGet() <= limit;
        }
    }

    private void sendRateLimitResponse(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(objectMapper.writeValueAsString(Map.of(
                "success", false,
                "message", message,
                "code", 429
        )));
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isBlank()) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private static class SlidingWindow {
        long startTime = System.currentTimeMillis();
        AtomicInteger count = new AtomicInteger(0);
    }
}
