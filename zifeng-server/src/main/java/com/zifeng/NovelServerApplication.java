package com.zifeng;

import cn.dev33.satoken.SaManager;
import com.zifeng.config.StpAdminUtil;
import jakarta.annotation.PostConstruct;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class NovelServerApplication {

    @PostConstruct
    public void init() {
        SaManager.putStpLogic(StpAdminUtil.getStpLogic());
    }

    public static void main(String[] args) {
        SpringApplication.run(NovelServerApplication.class, args);
    }
}
