package com.zifeng.module.source.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ToggleSourceRequest {
    @NotBlank(message = "bookSourceUrl不能为空")
    private String bookSourceUrl;

    @NotNull(message = "enabled不能为空")
    private Boolean enabled;
}
