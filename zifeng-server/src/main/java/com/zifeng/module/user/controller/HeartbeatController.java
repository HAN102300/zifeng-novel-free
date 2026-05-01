package com.zifeng.module.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class HeartbeatController {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final String ONLINE_KEY_PREFIX = "online:user:";
    private static final long HEARTBEAT_TTL_MINUTES = 3;

    @PostMapping("/heartbeat")
    public ApiResponse<Void> heartbeat() {
        try {
            Long userId = null;
            try {
                userId = StpUtil.getLoginIdAsLong();
            } catch (Exception ignored) {}

            if (userId != null) {
                String key = ONLINE_KEY_PREFIX + userId;
                redisTemplate.opsForValue().set(key, System.currentTimeMillis(), HEARTBEAT_TTL_MINUTES, TimeUnit.MINUTES);
            }
        } catch (Exception ignored) {}
        return ApiResponse.ok(null);
    }
}
