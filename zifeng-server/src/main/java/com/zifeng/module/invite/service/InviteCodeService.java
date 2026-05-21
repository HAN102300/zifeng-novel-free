package com.zifeng.module.invite.service;

import com.zifeng.module.invite.entity.InviteCode;
import com.zifeng.module.invite.repository.InviteCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InviteCodeService {

    private final InviteCodeRepository inviteCodeRepository;

    @Transactional
    public List<InviteCode> generateCodes(Long adminId, int count, int maxUses,
                                           String userLevel, LocalDateTime expiresAt) {
        return java.util.stream.IntStream.range(0, count)
                .mapToObj(i -> {
                    String code = generateCode();
                    return InviteCode.builder()
                            .code(code)
                            .createdBy(adminId)
                            .maxUses(maxUses)
                            .currentUses(0)
                            .status(1)
                            .userLevel(userLevel)
                            .expiresAt(expiresAt)
                            .build();
                })
                .map(inviteCodeRepository::save)
                .toList();
    }

    public InviteCode validateCode(String code) {
        InviteCode inviteCode = inviteCodeRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("邀请码不存在"));

        if (inviteCode.getStatus() == 0) {
            throw new RuntimeException("邀请码已被禁用");
        }
        if (inviteCode.getStatus() == 2 || inviteCode.getCurrentUses() >= inviteCode.getMaxUses()) {
            throw new RuntimeException("邀请码已用完");
        }
        if (inviteCode.getExpiresAt() != null && inviteCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("邀请码已过期");
        }
        return inviteCode;
    }

    @Transactional
    public void useCode(String code, Long userId) {
        InviteCode inviteCode = validateCode(code);
        inviteCode.setCurrentUses(inviteCode.getCurrentUses() + 1);
        inviteCode.setUsedBy(userId);
        if (inviteCode.getCurrentUses() >= inviteCode.getMaxUses()) {
            inviteCode.setStatus(2);
        }
        inviteCodeRepository.save(inviteCode);
        log.info("邀请码 {} 被用户 {} 使用，当前使用次数 {}/{}",
                code, userId, inviteCode.getCurrentUses(), inviteCode.getMaxUses());
    }

    @Transactional
    public void disableCode(Long codeId) {
        InviteCode inviteCode = inviteCodeRepository.findById(codeId)
                .orElseThrow(() -> new RuntimeException("邀请码不存在"));
        inviteCode.setStatus(0);
        inviteCodeRepository.save(inviteCode);
    }

    public List<InviteCode> listAll() {
        return inviteCodeRepository.findAll();
    }

    public long countActive() {
        return inviteCodeRepository.countByStatus(1);
    }

    private String generateCode() {
        return "ZF" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase();
    }
}
