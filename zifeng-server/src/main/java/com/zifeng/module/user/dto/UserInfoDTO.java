package com.zifeng.module.user.dto;

import com.zifeng.module.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 用户信息 DTO
 * 不包含密码等敏感字段，用于对外返回用户信息
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDTO {

    private Long id;
    private String username;
    private String email;
    private String avatar;
    private String role;
    private LocalDateTime createdAt;

    /**
     * 从 User 实体构造 UserInfoDTO
     * 
     * @param user User 实体
     */
    public UserInfoDTO(User user) {
        this.id = user.getId();
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.avatar = user.getAvatar();
        this.role = user.getUserLevel();
        this.createdAt = user.getCreatedAt();
    }
}
