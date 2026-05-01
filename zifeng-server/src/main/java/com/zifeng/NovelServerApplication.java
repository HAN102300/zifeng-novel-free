package com.zifeng;

import cn.dev33.satoken.SaManager;
import com.zifeng.config.StpAdminUtil;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.servlet.SecurityFilterAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {
    SecurityAutoConfiguration.class,
    SecurityFilterAutoConfiguration.class
})
@EnableAsync
@EnableScheduling
public class NovelServerApplication {

    @PostConstruct
    public void init() {
        SaManager.putStpLogic(StpAdminUtil.getStpLogic());
    }

    public static void main(String[] args) {
        SpringApplication.run(NovelServerApplication.class, args);
    }
}
