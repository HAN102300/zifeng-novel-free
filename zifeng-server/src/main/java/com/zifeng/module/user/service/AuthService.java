package com.zifeng.module.user.service;

import cn.dev33.satoken.stp.StpUtil;
import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.invite.entity.InviteCode;
import com.zifeng.module.invite.service.InviteCodeService;
import com.zifeng.module.user.dto.*;
import com.zifeng.module.user.entity.User;
import com.zifeng.module.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, Object> redisTemplate;
    private final InviteCodeService inviteCodeService;
    private final CaptchaService captchaService;

    @Value("${invite-code.required:false}")
    private boolean inviteCodeRequired;

    public AuthResponse login(LoginRequest request) {
        // 验证码校验
        if (!captchaService.verify(request.getCaptchaId(), request.getCaptchaCode())) {
            throw new RuntimeException("验证码错误或已过期");
        }
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("用户名或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }

        if (user.getStatus() != 1) {
            throw new RuntimeException("账号已被禁用");
        }

        long timeout = Boolean.TRUE.equals(request.getRememberMe()) ? 259200 : 7200;
        StpUtil.login(user.getId(), timeout);
        String token = StpUtil.getTokenValue();

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .avatar(user.getAvatar())
                .userId(user.getId())
                .expiresAt(System.currentTimeMillis() + timeout * 1000)
                .build();
    }

    public AuthResponse register(RegisterRequest request) {
        // 验证码校验
        if (!captchaService.verify(request.getCaptchaId(), request.getCaptchaCode())) {
            throw new RuntimeException("验证码错误或已过期");
        }
        if (inviteCodeRequired) {
            if (request.getInviteCode() == null || request.getInviteCode().isBlank()) {
                throw new RuntimeException("内测期间需要邀请码才能注册");
            }
            inviteCodeService.validateCode(request.getInviteCode());
        }

        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已存在");
        }

        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("邮箱已被注册");
        }

        String userLevel = "normal";
        Long inviteCodeId = null;
        if (inviteCodeRequired && request.getInviteCode() != null) {
            InviteCode code = inviteCodeService.validateCode(request.getInviteCode());
            userLevel = code.getUserLevel();
            inviteCodeId = code.getId();
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .userLevel(userLevel)
                .inviteCodeId(inviteCodeId)
                .status(1)
                .build();

        user = userRepository.save(user);

        if (inviteCodeRequired && request.getInviteCode() != null) {
            inviteCodeService.useCode(request.getInviteCode(), user.getId());
        }

        StpUtil.login(user.getId(), 7200);
        String token = StpUtil.getTokenValue();

        return AuthResponse.builder()
                .token(token)
                .username(user.getUsername())
                .avatar(user.getAvatar())
                .userId(user.getId())
                .expiresAt(System.currentTimeMillis() + 7200 * 1000)
                .build();
    }

    public User getUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
    }

    private String sanitizeEmail(String email) {
        if (email != null && (email.contains("/api/user/avatars/") || email.startsWith("/api/"))) {
            return null;
        }
        return email;
    }

    public UserInfoResponse updateProfile(Long userId, String avatar, String email) {
        User user = getUserById(userId);
        if (avatar != null) user.setAvatar(avatar);
        if (email != null) user.setEmail(sanitizeEmail(email));
        if (sanitizeEmail(user.getEmail()) == null) user.setEmail(null);
        user = userRepository.save(user);
        return UserInfoResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatar(user.getAvatar())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }

    public boolean changePassword(Long userId, String oldPassword, String newPassword) {
        User user = getUserById(userId);
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new RuntimeException("原密码错误");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return true;
    }

    public ApiResponse<Map<String, Object>> verifyUserForReset(String username, String email) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            return ApiResponse.fail("用户名不存在");
        }
        if (!email.equals(user.getEmail())) {
            return ApiResponse.fail("用户名与邮箱不匹配");
        }
        return ApiResponse.ok(Map.of("verified", true, "username", user.getUsername()));
    }

    public void resetPasswordDev(String username, String email, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("用户名不存在"));
        if (!email.equals(user.getEmail())) {
            throw new RuntimeException("用户名与邮箱不匹配");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public void sendResetCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("该邮箱未注册"));
        String code = String.format("%06d", new java.util.Random().nextInt(1000000));
        redisTemplate.opsForValue().set("reset:code:" + email, code, 10, TimeUnit.MINUTES);
        log.info("Reset code for {}: {}", email, code);
    }

    public void resetPassword(ResetPasswordRequest request) {
        Object cached = redisTemplate.opsForValue().get("reset:code:" + request.getEmail());
        if (cached == null) {
            throw new RuntimeException("验证码已过期");
        }
        if (!cached.toString().equals(request.getCode())) {
            throw new RuntimeException("验证码错误");
        }
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        redisTemplate.delete("reset:code:" + request.getEmail());
    }

    public UserInfoResponse getUserInfo(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        return UserInfoResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(sanitizeEmail(user.getEmail()))
                .avatar(user.getAvatar())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}
