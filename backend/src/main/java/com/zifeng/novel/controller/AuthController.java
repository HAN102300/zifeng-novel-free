package com.zifeng.novel.controller;

import com.zifeng.novel.dto.*;
import com.zifeng.novel.entity.User;
import com.zifeng.novel.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ApiResponse.ok(authService.login(request));
        } catch (RuntimeException e) {
            return ApiResponse.fail(e.getMessage());
        }
    }

    @PostMapping("/register")
    public ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            return ApiResponse.ok(authService.register(request));
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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
