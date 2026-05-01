package com.zifeng.module.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateAdminRequest {

    @NotBlank(message = "username required")
    @Size(min = 2, max = 8, message = "username must be 2-8 characters")
    private String username;

    @NotBlank(message = "password required")
    @Size(min = 6, max = 20, message = "password must be 6-20 characters")
    private String password;
}
