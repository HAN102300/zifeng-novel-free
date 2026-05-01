package com.zifeng.module.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminInfoResponse {

    private Long id;
    private String username;
    private String role;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;
}
