package com.zifeng.config;

import cn.dev33.satoken.interceptor.SaInterceptor;
import cn.dev33.satoken.router.SaRouter;
import cn.dev33.satoken.stp.StpUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class SaTokenConfig implements WebMvcConfigurer {

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new SaInterceptor(handle -> {
            ServletRequestAttributes attributes =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                    return;
                }
            }

            SaRouter.match("/api/admin/**")
                    .notMatch(
                            "/api/admin/auth/**",
                            "/api/admin/captcha**"
                    )
                    .check(r -> StpAdminUtil.checkLogin());

            SaRouter.match("/api/sources/admin/**")
                    .check(r -> StpAdminUtil.checkLogin());

            SaRouter.match("/api/**")
                    .notMatch(
                            "/api/admin/**",
                            "/api/sources/admin/**",
                            "/api/auth/register",
                            "/api/auth/login",
                            "/api/auth/send-reset-code",
                            "/api/auth/reset-password",
                            "/api/sources/public/**",
                            "/api/user/avatars/**",
                            "/api/user/heartbeat",
                            "/api/parse/**",
                            "/api/public/**"
                    )
                    .check(r -> StpUtil.checkLogin());
        })).addPathPatterns("/api/**");
    }
}
