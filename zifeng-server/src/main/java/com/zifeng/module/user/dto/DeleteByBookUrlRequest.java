package com.zifeng.module.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeleteByBookUrlRequest {
    @NotBlank(message = "bookUrl不能为空")
    private String bookUrl;
}
