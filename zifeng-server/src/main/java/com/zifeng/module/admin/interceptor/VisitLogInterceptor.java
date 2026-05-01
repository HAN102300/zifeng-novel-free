package com.zifeng.module.admin.interceptor;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.admin.entity.VisitLog;
import com.zifeng.module.admin.repository.VisitLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.LocalDateTime;
import java.util.Set;

@Slf4j
@Component
@RequiredArgsConstructor
public class VisitLogInterceptor implements HandlerInterceptor {

    private final VisitLogRepository visitLogRepository;

    private static final Set<String> PAGE_VIEW_PREFIXES = Set.of(
            "/api/auth/info",
            "/api/bookshelf",
            "/api/reading/history",
            "/api/reading/progress",
            "/api/sources/public",
            "/api/parse/search",
            "/api/parse/bookinfo",
            "/api/parse/toc",
            "/api/parse/content",
            "/api/user/avatar"
    );

    private static final Set<String> EXCLUDED_PREFIXES = Set.of(
            "/api/admin/auth/",
            "/api/admin/captcha",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/send-reset-code",
            "/api/auth/reset-password",
            "/api/reading/progress",
            "/api/user/heartbeat"
    );

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        try {
            String uri = request.getRequestURI();
            String method = request.getMethod();

            for (String prefix : EXCLUDED_PREFIXES) {
                if (uri.startsWith(prefix)) return;
            }
            if (!uri.startsWith("/api/")) return;

            boolean isPageView = false;
            if ("GET".equals(method)) {
                isPageView = true;
            }
            if (!isPageView) {
                for (String prefix : PAGE_VIEW_PREFIXES) {
                    if (uri.startsWith(prefix)) {
                        isPageView = true;
                        break;
                    }
                }
            }
            if (!isPageView) return;

            String ip = getClientIp(request);
            String userAgent = request.getHeader("User-Agent");
            if (userAgent != null && userAgent.length() > 500) {
                userAgent = userAgent.substring(0, 500);
            }

            Long userId = resolveUserId(request);

            VisitLog visitLog = VisitLog.builder()
                    .ip(ip)
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
