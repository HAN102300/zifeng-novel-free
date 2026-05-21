package com.zifeng.module.feedback.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateFeedbackRequest {
    @Size(max = 2000, message = "回复内容最大长度2000")
    private String adminReply;
}
