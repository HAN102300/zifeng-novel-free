package com.zifeng.module.user.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CaptchaService {

    private final StringRedisTemplate redisTemplate;
    private static final String CAPTCHA_PREFIX = "captcha:";
    private static final int CAPTCHA_TTL_MINUTES = 5;
    private static final int WIDTH = 120;
    private static final int HEIGHT = 40;
    private static final int CODE_LENGTH = 4;
    private static final String CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

    public String generateCaptchaId() {
        String captchaId = UUID.randomUUID().toString().replace("-", "");
        String code = generateCode();
        BufferedImage image = generateImage(code);
        String base64Image = imageToBase64(image);
        redisTemplate.opsForValue().set(CAPTCHA_PREFIX + captchaId, code, CAPTCHA_TTL_MINUTES, TimeUnit.MINUTES);
        return captchaId;
    }

    public String getCaptchaImageBase64(String captchaId) {
        String code = redisTemplate.opsForValue().get(CAPTCHA_PREFIX + captchaId);
        if (code == null) return null;
        BufferedImage image = generateImage(code);
        return imageToBase64(image);
    }

    public boolean verify(String captchaId, String inputCode) {
        if (captchaId == null || inputCode == null) return false;
        String stored = redisTemplate.opsForValue().get(CAPTCHA_PREFIX + captchaId);
        if (stored == null) return false;
        // 校验后删除，防止重放
        redisTemplate.delete(CAPTCHA_PREFIX + captchaId);
        return stored.equalsIgnoreCase(inputCode);
    }

    private String generateCode() {
        StringBuilder sb = new StringBuilder();
        java.util.Random rnd = new java.util.Random();
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CHARS.charAt(rnd.nextInt(CHARS.length())));
        }
        return sb.toString();
    }

    private BufferedImage generateImage(String code) {
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, WIDTH, HEIGHT);
            g.setFont(new Font("Arial", Font.BOLD, 24));
            java.util.Random rnd = new java.util.Random();
            // 干扰线
            for (int i = 0; i < 6; i++) {
                g.setColor(new Color(rnd.nextInt(200), rnd.nextInt(200), rnd.nextInt(200)));
                g.drawLine(rnd.nextInt(WIDTH), rnd.nextInt(HEIGHT), rnd.nextInt(WIDTH), rnd.nextInt(HEIGHT));
            }
            // 验证码字符
            for (int i = 0; i < code.length(); i++) {
                g.setColor(new Color(20 + rnd.nextInt(110), 20 + rnd.nextInt(110), 20 + rnd.nextInt(110)));
                g.drawString(String.valueOf(code.charAt(i)), 20 + i * 25, 30);
            }
            // 噪点
            for (int i = 0; i < 30; i++) {
                g.setColor(new Color(rnd.nextInt(255), rnd.nextInt(255), rnd.nextInt(255)));
                g.fillRect(rnd.nextInt(WIDTH), rnd.nextInt(HEIGHT), 1, 1);
            }
        } finally {
            g.dispose();
        }
        return image;
    }

    private String imageToBase64(BufferedImage image) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ImageIO.write(image, "png", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            log.error("Failed to convert captcha image to base64", e);
            return null;
        }
    }
}
