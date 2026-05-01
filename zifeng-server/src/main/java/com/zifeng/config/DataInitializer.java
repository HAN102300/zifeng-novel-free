package com.zifeng.config;

import com.zifeng.module.admin.entity.Admin;
import com.zifeng.module.admin.repository.AdminRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (!adminRepository.existsByUsername("zifeng")) {
            Admin admin = Admin.builder()
                    .username("zifeng")
                    .password(passwordEncoder.encode("102300"))
                    .role("super_admin")
                    .status(1)
                    .build();
            adminRepository.save(admin);
            log.info("Default admin account created: zifeng");
        }
    }
}
