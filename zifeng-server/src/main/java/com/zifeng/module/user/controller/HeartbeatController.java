package com.zifeng.module.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class HeartbeatController {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String ONLINE_USER_PREFIX = "online:user:";
    private static final String ONLINE_VISITOR_PREFIX = "online:visitor:";
    private static final long HEARTBEAT_TTL_MINUTES = 3;

    @PostMapping("/heartbeat")
    public ApiResponse<Void> heartbeat(HttpServletRequest request) {
        String clientIp = getClientIp(request);

        try {
            Long userId = null;
            try {
                userId = StpUtil.getLoginIdAsLong();
            } catch (Exception ignored) {}

            if (userId != null) {
                String key = ONLINE_USER_PREFIX + userId;
                redisTemplate.opsForValue().set(key, System.currentTimeMillis(), HEARTBEAT_TTL_MINUTES, TimeUnit.MINUTES);
            }

            if (clientIp != null && !clientIp.isEmpty()) {
                String visitorKey = ONLINE_VISITOR_PREFIX + clientIp.replace(":", "_").replace(".", "_");
                redisTemplate.opsForValue().set(visitorKey, System.currentTimeMillis(), HEARTBEAT_TTL_MINUTES, TimeUnit.MINUTES);
            }
        } catch (Exception e) {
            log.warn("Heartbeat processing failed: {}", e.getMessage());
        }

        return ApiResponse.ok(null);
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
