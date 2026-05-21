package com.zifeng.module.invite.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GenerateCodeRequest {
    @NotNull(message = "数量不能为空")
    @Min(1) @Max(100)
    private Integer count;

    @NotNull(message = "最大使用次数不能为空")
    @Min(1) @Max(1000)
    private Integer maxUses = 1;

    private String userLevel = "beta_tester";

    private String expiresAt;
}
