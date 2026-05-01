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
    public ApiResponse<User> getCurrentUser() {
        try {
            Long userId = getCurrentUserId();
            return ApiResponse.ok(authService.getUserById(userId));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PutMapping("/profile")
    public ApiResponse<User> updateProfile(@Valid @RequestBody UpdateProfileRequest request) {
        try {
            Long userId = getCurrentUserId();
            User updated = authService.updateProfile(userId,
                    request.getNickname(), request.getAvatar(), request.getEmail());
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
