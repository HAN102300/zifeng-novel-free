package com.zifeng.config;

import cn.dev33.satoken.stp.StpLogic;

public class AdminStpLogic extends StpLogic {

    public AdminStpLogic() {
        super("admin");
    }

    @Override
    public String splicingKeyTokenName() {
        return "zifeng_admin_token";
    }
}
