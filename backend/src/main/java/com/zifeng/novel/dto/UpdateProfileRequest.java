package com.zifeng.novel.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String nickname;
    private String avatar;
    private String email;
}
