package com.zifeng.module.invite.controller;

import com.zifeng.common.dto.ApiResponse;
import com.zifeng.config.StpAdminUtil;
import com.zifeng.module.invite.dto.GenerateCodeRequest;
import com.zifeng.module.invite.entity.InviteCode;
import com.zifeng.module.invite.service.InviteCodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/invite-codes")
@RequiredArgsConstructor
public class InviteCodeController {

    private final InviteCodeService inviteCodeService;

    @PostMapping("/generate")
    public ApiResponse<List<InviteCode>> generateCodes(
            @Valid @RequestBody GenerateCodeRequest request) {
        Long adminId = StpAdminUtil.getLoginIdAsLong();
        List<InviteCode> codes = inviteCodeService.generateCodes(
                adminId,
                request.getCount(),
                request.getMaxUses(),
                request.getUserLevel(),
                request.getExpiresAt() != null ?
                        LocalDateTime.parse(request.getExpiresAt()) : null
        );
        return ApiResponse.ok(codes);
    }

    @GetMapping
    public ApiResponse<List<InviteCode>> listCodes() {
        return ApiResponse.ok(inviteCodeService.listAll());
    }

    @PutMapping("/{id}/disable")
    public ApiResponse<Void> disableCode(@PathVariable Long id) {
        inviteCodeService.disableCode(id);
        return ApiResponse.ok("已禁用", null);
    }

    @GetMapping("/stats")
    public ApiResponse<Map<String, Object>> getStats() {
        return ApiResponse.ok(Map.of(
                "activeCodes", inviteCodeService.countActive()
        ));
    }

    @GetMapping("/validate")
    public ApiResponse<Map<String, Object>> validateCode(@RequestParam String code) {
        try {
            InviteCode inviteCode = inviteCodeService.validateCode(code);
            return ApiResponse.ok(Map.of(
                    "valid", true,
                    "userLevel", inviteCode.getUserLevel()
            ));
        } catch (RuntimeException e) {
            return ApiResponse.ok(Map.of(
                    "valid", false,
                    "message", e.getMessage()
            ));
        }
    }
}
