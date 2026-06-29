package com.zifeng.module.admin.interceptor;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.admin.entity.VisitLog;
import com.zifeng.module.admin.repository.VisitLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import com.zifeng.module.admin.service.IpRegionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
@RequiredArgsConstructor
public class VisitLogInterceptor implements HandlerInterceptor {

    private final VisitLogRepository visitLogRepository;
    private final IpRegionService ipRegionService;

    private static final Set<String> TRACKED_PATHS = Set.of(
            // === 用户认证 ===
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/info",
            "/api/auth/me",
            "/api/auth/profile",
            "/api/auth/password",
            "/api/auth/reset-password",
            "/api/auth/send-reset-code",
            "/api/auth/captcha",
            "/api/auth/verify-email",
            "/api/auth/reset-password-dev",
            // === 书架 ===
            "/api/bookshelf",
            "/api/bookshelf/check",
            "/api/bookshelf/count",
            // === 阅读 ===
            "/api/reading/progress",
            "/api/reading/history",
            // === 用户操作 ===
            "/api/user/avatar",
            "/api/user/heartbeat",
            // === 书源 ===
            "/api/sources",
            "/api/sources/enabled",
            "/api/sources/import",
            "/api/sources/public/all",
            "/api/sources/toggle",
            "/api/sources/import-url",
            "/api/sources/export",
            "/api/sources/list",
            "/api/sources/admin/all",
            "/api/sources/admin/import",
            "/api/sources/admin/count",
            // === 反馈 ===
            "/api/feedback",
            "/api/feedback/mine",
            // === 解析 ===
            "/api/parse/search",
            "/api/parse/search/aggregated",
            "/api/parse/test-source",
            "/api/parse/book-info",
            "/api/parse/book-info/unified",
            "/api/parse/toc",
            "/api/parse/toc/unified",
            "/api/parse/content",
            "/api/parse/content/unified",
            "/api/parse/explore",
            "/api/parse/proxy",
            // === 管理端 ===
            "/api/admin/auth/login",
            "/api/admin/auth/captcha",
            "/api/admin/auth/info",
            "/api/admin/dashboard",
            "/api/admin/users",
            "/api/admin/admins",
            "/api/admin/reading/bookshelf",
            "/api/admin/reading/history"
    );

    private static final Set<String> TRACKED_PREFIXES = Set.of(
            "/api/admin/users/",
            "/api/admin/admins/",
            "/api/sources/admin/",
            "/api/categories/",
            "/api/rank/"
    );

    private static final Set<String> DEDUPLICATE_PATHS = Set.of(
            "/api/auth/info",
            "/api/auth/me",
            "/api/auth/captcha",
            "/api/sources",
            "/api/sources/enabled",
            "/api/sources/public/all",
            "/api/sources/list",
            "/api/admin/auth/info",
            "/api/admin/auth/captcha",
            "/api/admin/dashboard",
            "/api/user/heartbeat",
            "/api/parse/proxy"
    );

    private static final long DEDUP_WINDOW_MS = 10_000L;
    private final Map<String, Long> dedupCache = new ConcurrentHashMap<>();

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            String uri = request.getRequestURI();
            String method = request.getMethod();

            if (!uri.startsWith("/api/")) return;
            if ("OPTIONS".equalsIgnoreCase(method)) return;

            boolean shouldTrack = TRACKED_PATHS.contains(uri);
            if (!shouldTrack) {
                for (String prefix : TRACKED_PREFIXES) {
                    if (uri.startsWith(prefix)) {
                        shouldTrack = true;
                        break;
                    }
                }
            }
            if (!shouldTrack) return;

            if (DEDUPLICATE_PATHS.contains(uri)) {
                Long userId = resolveUserId(request);
                String ip = getClientIp(request);
                String dedupKey = uri + ":" + ip + ":" + (userId != null ? userId : "guest");
                long now = System.currentTimeMillis();
                Long lastTime = dedupCache.get(dedupKey);
                if (lastTime != null && (now - lastTime) < DEDUP_WINDOW_MS) {
                    return;
                }
                dedupCache.put(dedupKey, now);
            }

            if (dedupCache.size() > 10000) {
                dedupCache.clear();
            }

            String ip = getClientIp(request);
            String userAgent = request.getHeader("User-Agent");
            if (userAgent != null && userAgent.length() > 500) {
                userAgent = userAgent.substring(0, 500);
            }

            Long userId = resolveUserId(request);

            VisitLog visitLog = VisitLog.builder()
                    .ip(ip)
                    .ipLocation(ipRegionService.getRegion(ip))
                    .userAgent(userAgent)
                    .visitUrl(uri)
                    .visitDate(LocalDateTime.now())
                    .userId(userId)
                    .build();

            visitLogRepository.save(visitLog);
        } catch (Exception e) {
            log.warn("visit log error: {}", e.getMessage());
        }
    }

    private Long resolveUserId(HttpServletRequest request) {
        String adminToken = request.getHeader("zifeng_admin_token");
        if (adminToken != null && !adminToken.isBlank()) {
            try {
                Object loginId = StpAdminUtil.getStpLogic().getLoginIdByToken(adminToken);
                if (loginId != null) {
                    return -Long.parseLong(loginId.toString());
                }
            } catch (Exception e) {
                log.debug("admin token validation failed: {}", e.getMessage());
            }
        }

        String userToken = request.getHeader("zifeng_token");
        if (userToken != null && !userToken.isBlank()) {
            try {
                Object loginId = StpUtil.getLoginIdByToken(userToken);
                if (loginId != null) {
                    return Long.parseLong(loginId.toString());
                }
            } catch (Exception e) {
                log.debug("user token validation failed: {}", e.getMessage());
            }
        }

        try {
            if (StpAdminUtil.isLogin()) {
                return -StpAdminUtil.getLoginIdAsLong();
            }
            if (StpUtil.isLogin()) {
                return StpUtil.getLoginIdAsLong();
            }
        } catch (Exception ignored) {}

        return null;
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
}
