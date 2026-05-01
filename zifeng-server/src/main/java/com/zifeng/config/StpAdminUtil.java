package com.zifeng.config;

import cn.dev33.satoken.SaManager;
import cn.dev33.satoken.config.SaTokenConfig;
import cn.dev33.satoken.stp.StpLogic;

public class StpAdminUtil {

    private StpAdminUtil() {}

    public static final String TYPE = "admin";

    private static final StpLogic stpLogic;

    static {
        stpLogic = new AdminStpLogic();
        SaTokenConfig config = SaManager.getConfig();
        if (config != null) {
            stpLogic.setConfig(config);
        }
    }

    public static StpLogic getStpLogic() {
        return stpLogic;
    }

    public static String getTokenName() {
        return stpLogic.getTokenName();
    }

    public static void login(Object id) {
        stpLogic.login(id);
    }

    public static void login(Object id, long timeout) {
        stpLogic.login(id, timeout);
    }

    public static boolean isLogin() {
        return stpLogic.isLogin();
    }

    public static Object getLoginId() {
        return stpLogic.getLoginId();
    }

    public static long getLoginIdAsLong() {
        return stpLogic.getLoginIdAsLong();
    }

    public static void logout() {
        stpLogic.logout();
    }

    public static void logout(Object loginId) {
        stpLogic.logout(loginId);
    }

    public static String getTokenValue() {
        return stpLogic.getTokenValue();
    }

    public static void checkLogin() {
        stpLogic.checkLogin();
    }
}
