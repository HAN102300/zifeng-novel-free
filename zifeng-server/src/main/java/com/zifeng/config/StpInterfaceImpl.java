package com.zifeng.config;

import cn.dev33.satoken.stp.StpInterface;
import com.zifeng.module.admin.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class StpInterfaceImpl implements StpInterface {

    private final AdminRepository adminRepository;

    @Override
    public List<String> getPermissionList(Object loginId, String loginType) {
        return new ArrayList<>();
    }

    @Override
    public List<String> getRoleList(Object loginId, String loginType) {
        List<String> roles = new ArrayList<>();
        if ("admin".equals(loginType)) {
            Long adminId = Long.parseLong(loginId.toString());
            adminRepository.findById(adminId).ifPresent(admin -> {
                if (admin.getRole() != null) roles.add(admin.getRole());
            });
        } else {
            roles.add("user");
        }
        return roles;
    }
}
