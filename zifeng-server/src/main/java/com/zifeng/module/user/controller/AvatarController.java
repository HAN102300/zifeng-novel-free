package com.zifeng.module.user.controller;

import com.zifeng.common.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class AvatarController {

    @Value("${app.upload.dir:uploads/avatars}")
    private String uploadDir;

    @Value("${app.upload.url-prefix:/api/user/avatars}")
    private String urlPrefix;

    @PostMapping("/avatar")
    public ApiResponse<String> uploadAvatar(@RequestParam("file") MultipartFile file) {
        log.info("[头像上传] 收到上传请求, 文件名: {}, 大小: {}bytes, 类型: {}",
                file.getOriginalFilename(), file.getSize(), file.getContentType());

        if (file.isEmpty()) {
            log.warn("[头像上传] 文件为空");
            return ApiResponse.fail("文件不能为空");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            log.warn("[头像上传] 文件大小超限: {}bytes", file.getSize());
            return ApiResponse.fail("文件大小不能超过5MB");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("[头像上传] 文件类型不支持: {}", contentType);
            return ApiResponse.fail("只能上传图片文件");
        }

        try {
            Path dirPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
                log.info("[头像上传] 创建上传目录: {}", dirPath);
            }

            String originalName = file.getOriginalFilename();
            String ext = "";
            if (originalName != null && originalName.contains(".")) {
                ext = originalName.substring(originalName.lastIndexOf("."));
            }
            String fileName = UUID.randomUUID().toString() + ext;
            Path filePath = dirPath.resolve(fileName);
            file.transferTo(filePath.toFile());

            String avatarUrl = urlPrefix + "/" + fileName;
            log.info("[头像上传] 上传成功: {} -> {}", fileName, avatarUrl);
            return ApiResponse.ok(avatarUrl);
        } catch (IOException e) {
            log.error("[头像上传] 上传失败, 文件名: {}, 错误: {}", file.getOriginalFilename(), e.getMessage(), e);
            return ApiResponse.fail("上传失败: " + e.getMessage());
        } catch (Exception e) {
            log.error("[头像上传] 上传异常, 文件名: {}, 错误: {}", file.getOriginalFilename(), e.getMessage(), e);
            return ApiResponse.fail("上传失败: " + e.getMessage());
        }
    }
}
