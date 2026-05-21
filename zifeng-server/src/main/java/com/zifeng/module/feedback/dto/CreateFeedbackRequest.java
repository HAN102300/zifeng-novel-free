package com.zifeng.module.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateFeedbackRequest {
    @NotBlank(message = "反馈类型不能为空")
    private String category;

    @NotBlank(message = "标题不能为空")
    @Size(max = 200, message = "标题最大长度200")
    private String title;

    @NotBlank(message = "反馈内容不能为空")
    @Size(max = 2000, message = "反馈内容最大长度2000")
    private String content;

    private String pageUrl;

    private String userAgent;
}
