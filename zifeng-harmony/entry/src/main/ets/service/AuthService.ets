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
  captchaImage: string;
}

export interface VerifyUserResult {
  username: string;
  email: string;
}

export interface CurrentUserResult {
  username: string;
  avatar: string;
}

interface LoginBody {
  username: string;
  password: string;
  rememberMe: boolean;
  captchaId: string;
  captchaCode: string;
}

interface RegisterBody {
  username: string;
  password: string;
  email: string;
  captchaId: string;
  captchaCode: string;
}

interface VerifyUserParams {
  username: string;
  email: string;
}

interface ResetPasswordBody {
  username: string;
  email: string;
  newPassword: string;
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
    const body: LoginBody = {
      username: username,
      password: password,
      rememberMe: rememberMe,
      captchaId: captchaId,
      captchaCode: captchaCode,
    };
    const result = await ApiClient.post<LoginResult>("/api/user/login", body);
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
    const body: RegisterBody = {
      username: username,
      password: password,
      email: email,
      captchaId: captchaId,
      captchaCode: captchaCode,
    };
    return ApiClient.post<boolean>("/api/user/register", body);
  }

  /** 验证用户身份（重置密码 Step 0） */
  static async verifyUserForReset(
    username: string,
    email: string,
  ): Promise<VerifyUserResult> {
    const params: VerifyUserParams = { username: username, email: email };
    return ApiClient.get<VerifyUserResult>("/api/user/verifyUserForReset", params);
  }

  /** 重置密码（重置密码 Step 1） */
  static async resetPassword(
    username: string,
    email: string,
    newPassword: string,
  ): Promise<boolean> {
    const body: ResetPasswordBody = {
      username: username,
      email: email,
      newPassword: newPassword,
    };
    return ApiClient.post<boolean>("/api/user/resetPasswordDev", body);
  }

  /** 退出登录 */
  static async logout(): Promise<void> {
    try {
      await ApiClient.post<void>("/api/user/logout");
    } finally {
      await ApiClient.clearToken();
    }
  }

  /** 检查登录状态 */
  static async isLoggedIn(): Promise<boolean> {
    const token = await ApiClient.getToken();
    return !!token;
  }

  /** 获取当前登录用户信息 */
  static async getCurrentUser(): Promise<CurrentUserResult> {
    const token = await ApiClient.getToken();
    if (!token) {
      return { username: '', avatar: '' } as CurrentUserResult;
    }
    try {
      return await ApiClient.get<CurrentUserResult>("/api/user/info");
    } catch (e) {
      const username = AppStorage.get<string>("username") ?? "";
      const avatar = AppStorage.get<string>("avatar") ?? "";
      return { username: username, avatar: avatar } as CurrentUserResult;
    }
  }
}
