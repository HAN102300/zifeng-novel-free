package com.zifeng.module.user.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.module.user.service.CaptchaService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/captcha")
@RequiredArgsConstructor
public class CaptchaController {

    private final CaptchaService captchaService;

    @GetMapping
    public ApiResponse<Map<String, String>> getCaptcha() {
        String captchaId = captchaService.generateCaptchaId();
        String image = captchaService.getCaptchaImageBase64(captchaId);
        if (image == null) {
            return ApiResponse.fail("验证码生成失败");
        }
        return ApiResponse.ok(Map.of("captchaId", captchaId, "image", image));
    }
}
