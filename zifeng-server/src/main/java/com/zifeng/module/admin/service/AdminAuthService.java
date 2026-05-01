package com.zifeng.module.admin.service;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.admin.dto.*;
import com.zifeng.module.admin.entity.Admin;
import com.zifeng.module.admin.entity.VisitLog;
import com.zifeng.module.admin.repository.AdminRepository;
import com.zifeng.module.admin.repository.VisitLogRepository;
import com.zifeng.module.user.entity.User;
import com.zifeng.module.user.repository.BookshelfRepository;
import com.zifeng.module.user.repository.ReadingHistoryRepository;
import com.zifeng.module.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.MessageSource;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Locale;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final BookshelfRepository bookshelfRepository;
    private final ReadingHistoryRepository readingHistoryRepository;
    private final VisitLogRepository visitLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, Object> redisTemplate;
    private final MessageSource messageSource;

    private static final String CAPTCHA_PREFIX = "admin:captcha:";
    private static final long CAPTCHA_TTL_MINUTES = 5;
    private static final Long SUPER_ADMIN_ID = 1L;

    public Map<String, String> generateCaptcha() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < 4; i++) {
            code.append(chars.charAt(random.nextInt(chars.length())));
        }
        String captchaText = code.toString();
        String captchaKey = UUID.randomUUID().toString();

        redisTemplate.opsForValue().set(CAPTCHA_PREFIX + captchaKey, captchaText, CAPTCHA_TTL_MINUTES, TimeUnit.MINUTES);

        int width = 120;
        int height = 40;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        g.setColor(new Color(random.nextInt(100), random.nextInt(100), random.nextInt(100)));
        g.setFont(new Font("Arial", Font.BOLD, 28));
        for (int i = 0; i < captchaText.length(); i++) {
            g.drawString(String.valueOf(captchaText.charAt(i)), 20 + i * 25, 30);
        }
        Random rng = new Random();
        for (int i = 0; i < 6; i++) {
            g.setColor(new Color(rng.nextInt(256), rng.nextInt(256), rng.nextInt(256)));
            int x1 = rng.nextInt(width);
            int y1 = rng.nextInt(height);
            int x2 = rng.nextInt(width);
            int y2 = rng.nextInt(height);
            g.drawLine(x1, y1, x2, y2);
        }
        g.dispose();

        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            String base64Image = Base64.getEncoder().encodeToString(baos.toByteArray());
            return Map.of("captchaKey", captchaKey, "captchaImage", "data:image/png;base64," + base64Image);
        } catch (Exception e) {
            throw new RuntimeException(messageSource.getMessage("system.error", null, Locale.CHINA));
        }
    }

    public ApiResponse<Map<String, Object>> login(AdminLoginRequest request) {
        Object cachedCaptcha = redisTemplate.opsForValue().get(CAPTCHA_PREFIX + request.getCaptchaKey());
        if (cachedCaptcha == null) {
            return ApiResponse.fail(messageSource.getMessage("auth.login.captcha.expired", null, Locale.CHINA));
        }
        if (!cachedCaptcha.toString().equalsIgnoreCase(request.getCaptcha())) {
            redisTemplate.delete(CAPTCHA_PREFIX + request.getCaptchaKey());
            return ApiResponse.fail(messageSource.getMessage("auth.login.captcha.error", null, Locale.CHINA));
        }
        redisTemplate.delete(CAPTCHA_PREFIX + request.getCaptchaKey());

        Admin admin = adminRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException(messageSource.getMessage("auth.login.fail", null, Locale.CHINA)));

        if (!passwordEncoder.matches(request.getPassword(), admin.getPassword())) {
            return ApiResponse.fail(messageSource.getMessage("auth.login.fail", null, Locale.CHINA));
        }

        if (admin.getStatus() != 1) {
            return ApiResponse.fail(messageSource.getMessage("auth.login.account.disabled", null, Locale.CHINA));
        }

        StpAdminUtil.logout(admin.getId());
        StpAdminUtil.login(admin.getId(), 86400);
        String token = StpAdminUtil.getTokenValue();

        admin.setLastLoginAt(LocalDateTime.now());
        adminRepository.save(admin);

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("admin", AdminInfoResponse.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .role(admin.getRole())
                .status(admin.getStatus())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build());

        return ApiResponse.ok(result);
    }

    public AdminInfoResponse getAdminInfo(Long adminId) {
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException(messageSource.getMessage("admin.not.found", null, Locale.CHINA)));
        return AdminInfoResponse.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .role(admin.getRole())
                .status(admin.getStatus())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }

    public List<AdminInfoResponse> listAdmins() {
        return adminRepository.findAll().stream()
                .map(a -> AdminInfoResponse.builder()
                        .id(a.getId())
                        .username(a.getUsername())
                        .role(a.getRole())
                        .status(a.getStatus())
                        .createdAt(a.getCreatedAt())
                        .lastLoginAt(a.getLastLoginAt())
                        .build())
                .toList();
    }

    public AdminInfoResponse createAdmin(CreateAdminRequest request) {
        if (adminRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException(messageSource.getMessage("admin.username.exists", null, Locale.CHINA));
        }
        Admin admin = Admin.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("admin")
                .status(1)
                .build();
        admin = adminRepository.save(admin);
        return AdminInfoResponse.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .role(admin.getRole())
                .status(admin.getStatus())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }

    public AdminInfoResponse updateAdminUsername(Long adminId, UpdateAdminRequest request) {
        if (SUPER_ADMIN_ID.equals(adminId)) {
            throw new RuntimeException("超级管理员不可编辑");
        }
        Admin admin = adminRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException(messageSource.getMessage("admin.not.found", null, Locale.CHINA)));
        if (adminRepository.existsByUsername(request.getUsername()) && !admin.getUsername().equals(request.getUsername())) {
            throw new RuntimeException(messageSource.getMessage("admin.username.exists", null, Locale.CHINA));
        }
        admin.setUsername(request.getUsername());
        admin = adminRepository.save(admin);
        return AdminInfoResponse.builder()
                .id(admin.getId())
                .username(admin.getUsername())
                .role(admin.getRole())
                .status(admin.getStatus())
                .createdAt(admin.getCreatedAt())
                .lastLoginAt(admin.getLastLoginAt())
                .build();
    }

    public void deleteAdmin(Long adminId) {
        if (SUPER_ADMIN_ID.equals(adminId)) {
            throw new RuntimeException("超级管理员不可删除");
        }
        adminRepository.deleteById(adminId);
        StpAdminUtil.logout(adminId);
    }

    public void banUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setStatus(0);
        userRepository.save(user);
        try {
            cn.dev33.satoken.stp.StpUtil.logout(userId);
        } catch (Exception ignored) {}
    }

    public void unbanUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("用户不存在"));
        user.setStatus(1);
        userRepository.save(user);
    }

    public DashboardStats getDashboardStats() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime thirtyDaysAgo = LocalDate.now().minusDays(30).atStartOfDay();

        long totalVisits = visitLogRepository.count();
        long todayVisits = visitLogRepository.countByVisitDateBetween(todayStart, todayEnd);
        long totalIps = visitLogRepository.findDistinctIpsBetween(thirtyDaysAgo, todayEnd).size();
        long todayIps = visitLogRepository.findDistinctIpsBetween(todayStart, todayEnd).size();
        long onlineUsers = 0;
        try {
            Set<String> keys = redisTemplate.keys("online:user:*");
            if (keys != null) {
                onlineUsers = keys.size();
            }
        } catch (Exception ignored) {}
        long totalUsers = userRepository.count();
        long totalBookshelfItems = bookshelfRepository.count();
        long totalReadingHistory = readingHistoryRepository.count();

        List<Object[]> rawTrend = visitLogRepository.countByDateBetween(thirtyDaysAgo, todayEnd);
        List<Map<String, Object>> visitTrend = rawTrend.stream()
                .map(row -> Map.of("date", row[0].toString(), "count", row[1]))
                .toList();

        List<VisitLog> recentLogs = visitLogRepository.findTop50ByOrderByVisitDateDesc();
        Map<Long, User> userMap = new HashMap<>();
        try {
            List<User> allUsers = userRepository.findAll();
            for (User u : allUsers) {
                userMap.put(u.getId(), u);
            }
        } catch (Exception ignored) {}

        Map<Long, Long> ipCountMap = new HashMap<>();
        try {
            List<Object[]> ipCounts = visitLogRepository.countByIpBetween(thirtyDaysAgo, todayEnd);
            for (Object[] row : ipCounts) {
                String ip = (String) row[0];
                Long count = (Long) row[1];
                ipCountMap.put(ip.hashCode() & 0xFFFFFFFFL, count);
            }
        } catch (Exception ignored) {}

        List<Map<String, Object>> recentVisitLogs = recentLogs.stream()
                .map(log -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("id", log.getId());
                    map.put("ip", log.getIp());
                    map.put("visitUrl", log.getVisitUrl());
                    map.put("visitDate", log.getVisitDate() != null ? log.getVisitDate().toString() : null);
                    map.put("userId", log.getUserId());
                    if (log.getUserId() != null) {
                        if (log.getUserId() < 0) {
                            Long adminId = -log.getUserId();
                            try {
                                Admin admin = adminRepository.findById(adminId).orElse(null);
                                map.put("username", admin != null ? admin.getUsername() + "(管理员)" : "管理员");
                            } catch (Exception e) {
                                map.put("username", "管理员");
                            }
                        } else if (userMap.containsKey(log.getUserId())) {
                            map.put("username", userMap.get(log.getUserId()).getUsername());
                        } else {
                            map.put("username", null);
                        }
                    } else {
                        map.put("username", null);
                    }
                    map.put("visitCount", 1);
                    return map;
                })
                .toList();

        return DashboardStats.builder()
                .totalVisits(totalVisits)
                .todayVisits(todayVisits)
                .totalIps(totalIps)
                .todayIps(todayIps)
                .onlineUsers(onlineUsers)
                .totalUsers(totalUsers)
                .totalBookshelfItems(totalBookshelfItems)
                .totalReadingHistory(totalReadingHistory)
                .visitTrend(visitTrend)
                .recentVisitLogs(recentVisitLogs)
                .build();
    }

    public List<User> listUsers() {
        return userRepository.findAll();
    }

    public List<User> searchUsers(String keyword) {
        return userRepository.findByUsernameContainingOrEmailContaining(keyword, keyword);
    }
}
