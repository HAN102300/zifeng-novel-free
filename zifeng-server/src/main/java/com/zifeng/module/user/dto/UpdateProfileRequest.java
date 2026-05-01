package com.zifeng.module.user.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String nickname;
    private String avatar;
    private String email;
}
