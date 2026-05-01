package com.zifeng.module.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminLoginRequest {

    @NotBlank(message = "username required")
    @Size(min = 2, max = 8, message = "username must be 2-8 characters")
    private String username;

    @NotBlank(message = "password required")
    private String password;

    @NotBlank(message = "captcha required")
    private String captcha;

    @NotBlank(message = "captcha key required")
    private String captchaKey;
}
