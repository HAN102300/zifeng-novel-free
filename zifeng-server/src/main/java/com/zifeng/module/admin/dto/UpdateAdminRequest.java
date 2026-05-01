package com.zifeng.module.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateAdminRequest {

    @NotBlank(message = "username required")
    @Size(min = 2, max = 8, message = "username must be 2-8 characters")
    private String username;
}
