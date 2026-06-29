package com.zifeng.module.user.controller;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.user.dto.*;
import com.zifeng.module.user.entity.User;
import com.zifeng.module.user.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            return ApiResponse.ok(authService.register(request));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ApiResponse.ok(authService.login(request));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/send-reset-code")
    public ApiResponse<Void> sendResetCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ApiResponse.fail("邮箱不能为空");
        }
        try {
            authService.sendResetCode(email);
            return ApiResponse.ok(null);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            authService.resetPassword(request);
            return ApiResponse.ok(null);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/verify-email")
    public ApiResponse<Map<String, Object>> verifyEmail(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        if (username == null || username.isBlank() || email == null || email.isBlank()) {
            return ApiResponse.fail("用户名和邮箱不能为空");
        }
        return authService.verifyUserForReset(username, email);
    }

    @PostMapping("/reset-password-dev")
    public ApiResponse<Void> resetPasswordDev(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String email = body.get("email");
        String newPassword = body.get("newPassword");
        if (username == null || username.isBlank() || email == null || email.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ApiResponse.fail("参数不完整");
        }
        if (newPassword.length() < 6) {
            return ApiResponse.fail("密码长度至少6位");
        }
        authService.resetPasswordDev(username, email, newPassword);
        return ApiResponse.ok(null);
    }

    @GetMapping("/info")
    public ApiResponse<UserInfoResponse> getUserInfo() {
        try {
            Long userId = getCurrentUserId();
            return ApiResponse.ok(authService.getUserInfo(userId));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ApiResponse<UserInfoDTO> getCurrentUser() {
        try {
            Long userId = getCurrentUserId();
            User user = authService.getUserById(userId);
            return ApiResponse.ok(new UserInfoDTO(user));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PutMapping("/profile")
    @org.springframework.cache.annotation.CacheEvict(value = "users", allEntries = true)
    public ApiResponse<UserInfoResponse> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        try {
            Long userId = getCurrentUserId();
            UserInfoResponse updated = authService.updateProfile(userId,
                    request.getAvatar(), request.getEmail());
            return ApiResponse.ok(updated);
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PutMapping("/password")
    public ApiResponse<Boolean> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        try {
            Long userId = getCurrentUserId();
            return ApiResponse.ok(authService.changePassword(userId,
                    request.getOldPassword(), request.getNewPassword()));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    private Long getCurrentUserId() {
        return StpUtil.getLoginIdAsLong();
    }
}
