/**
 * AuthService - 认证服务
 * 规格：§2.2 登录 + §2.3 注册 + §2.4 重置密码
 *
 * 接口对齐 zifeng-server module-user：
 * - POST /api/user/login
 * - POST /api/user/register
 * - POST /api/user/resetPasswordDev
 * - GET  /api/user/verifyUserForReset
 * - GET  /api/user/captcha
 */
import { ApiClient } from "./ApiClient";

export interface LoginResult {
  token: string;
  userId: string;
  username: string;
  avatar?: string;
}

export interface CaptchaResult {
  captchaId: string;
  captchaImage: string; // base64
}

export class AuthService {
  /** 获取验证码 */
  static async getCaptcha(): Promise<CaptchaResult> {
    return ApiClient.get<CaptchaResult>("/api/user/captcha");
  }

  /** 登录 */
  static async login(
    username: string,
    password: string,
    rememberMe: boolean,
    captchaId: string,
    captchaCode: string,
  ): Promise<LoginResult> {
    const result = await ApiClient.post<LoginResult>("/api/user/login", {
      username,
      password,
      rememberMe,
      captchaId,
      captchaCode,
    });
    await ApiClient.setToken(result.token);
    return result;
  }

  /** 注册 */
  static async register(
    username: string,
    password: string,
    email: string,
    captchaId: string,
    captchaCode: string,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/user/register", {
      username,
      password,
      email,
      captchaId,
      captchaCode,
    });
  }

  /** 验证用户身份（重置密码 Step 0） */
  static async verifyUserForReset(
    username: string,
    email: string,
  ): Promise<{ username: string; email: string }> {
    return ApiClient.get("/api/user/verifyUserForReset", { username, email });
  }

  /** 重置密码（重置密码 Step 1） */
  static async resetPassword(
    username: string,
    email: string,
    newPassword: string,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/user/resetPasswordDev", {
      username,
      email,
      newPassword,
    });
  }

  /** 退出登录 */
  static async logout(): Promise<void> {
    try {
      await ApiClient.post("/api/user/logout");
    } finally {
      await ApiClient.clearToken();
    }
  }

  /** 检查登录状态 */
  static async isLoggedIn(): Promise<boolean> {
    const token = await ApiClient.getToken();
    return !!token;
  }
}
