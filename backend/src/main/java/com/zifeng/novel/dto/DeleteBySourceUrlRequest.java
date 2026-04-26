package com.zifeng.novel.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DeleteBySourceUrlRequest {
    @NotBlank(message = "bookSourceUrl不能为空")
    private String bookSourceUrl;
}
