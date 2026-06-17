/**
 * 认证服务
 * 封装登录、注册、登出、获取用户信息、发送重置密码验证码、重置密码等业务逻辑
 */
import apiClient from './ApiClient';
import { AuthManager, UserInfo } from './AuthManager';

// 登录响应数据结构
interface LoginData {
  token: string;
  userId: string;
  username: string;
  avatar: string;
  expiresAt: number; // 过期时间戳（毫秒）
}

// 注册响应数据结构
interface RegisterData {
  message: string;
}

// 获取用户信息响应数据结构
interface UserInfoData extends UserInfo {}

// 发送重置验证码响应数据结构
interface SendResetCodeData {
  message: string;
}

// 重置密码响应数据结构
interface ResetPasswordData {
  message: string;
}

interface LoginResult {
  success: boolean;
  data?: LoginData;
  message?: string;
}

interface SimpleResult {
  success: boolean;
  message?: string;
}

interface UserInfoResult {
  success: boolean;
  data?: UserInfoData;
  message?: string;
}

export interface ResetPasswordParams {
  email: string;
  code: string;
  newPassword: string;
}

/**
 * 登录请求参数
 */
interface LoginParams {
  username: string;
  password: string;
  rememberMe: boolean;
}

/**
 * 注册请求参数
 */
interface RegisterParams {
  username: string;
  password: string;
  email: string;
}

/**
 * 发送重置验证码请求参数
 */
interface SendResetCodeParams {
  email: string;
}

/**
 * 认证服务类
 * 提供用户认证相关的业务方法
 */
export class AuthService {
  private static instance: AuthService | null = null;

  private constructor() {}

  /**
   * 获取 AuthService 单例实例
   */
  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * 用户登录
   * @param username 用户名
   * @param password 密码
   * @param rememberMe 是否记住登录状态
   * @returns 登录结果
   */
  async login(username: string, password: string, rememberMe: boolean): Promise<LoginResult> {
    try {
      const params: LoginParams = {
        username,
        password,
        rememberMe
      };
      const response = await apiClient.post<LoginData>('/auth/login', params);

      // 登录成功，保存 token 和用户信息
      if (response.data) {
        const loginData = response.data;

        // 保存 token
        await AuthManager.getInstance().saveToken(loginData.token, loginData.expiresAt);

        // 保存用户信息
        const userInfo: UserInfo = {
          id: loginData.userId,
          username: loginData.username,
          email: '', // 登录接口未返回 email，可后续通过 getUserInfo 补充
          avatar: loginData.avatar
        };
        await AuthManager.getInstance().saveUserInfo(userInfo);

        return { success: true, data: loginData } as LoginResult;
      }

      return { success: false, message: response.message || '登录失败' } as LoginResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '登录失败，请检查网络';
      return { success: false, message: errorMessage } as LoginResult;
    }
  }

  /**
   * 用户注册
   * @param username 用户名
   * @param password 密码
   * @param email 邮箱
   * @returns 注册结果
   */
  async register(username: string, password: string, email: string): Promise<SimpleResult> {
    try {
      const params: RegisterParams = {
        username,
        password,
        email
      };
      const response = await apiClient.post<RegisterData>('/auth/register', params);

      return { success: true, message: response.message || '注册成功' } as SimpleResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '注册失败，请检查网络';
      return { success: false, message: errorMessage } as SimpleResult;
    }
  }

  /**
   * 获取当前登录用户信息
   * @returns 用户信息
   */
  async getUserInfo(): Promise<UserInfoResult> {
    try {
      const response = await apiClient.get<UserInfoData>('/auth/info');

      if (response.data) {
        // 更新本地缓存的用户信息
        await AuthManager.getInstance().saveUserInfo(response.data);
        return { success: true, data: response.data } as UserInfoResult;
      }

      return { success: false, message: response.message || '获取用户信息失败' } as UserInfoResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '获取用户信息失败';
      return { success: false, message: errorMessage } as UserInfoResult;
    }
  }

  /**
   * 用户登出
   * 清除本地 token 和用户信息，重置 AppStorage 中的登录状态
   */
  async logout(): Promise<void> {
    // 清除 token
    await AuthManager.getInstance().clearToken();

    // 清除用户信息
    await AuthManager.getInstance().clearUserInfo();

    // 委托 AuthManager 清除 AppStorage 中的登录状态
    AuthManager.getInstance().clearAuthData();
  }

  /**
   * 发送重置密码验证码到邮箱
   * @param email 目标邮箱
   * @returns 发送结果
   */
  async sendResetCode(email: string): Promise<SimpleResult> {
    try {
      const params: SendResetCodeParams = {
        email
      };
      const response = await apiClient.post<SendResetCodeData>('/auth/send-reset-code', params);

      return { success: true, message: response.message || '验证码已发送' } as SimpleResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '发送验证码失败';
      return { success: false, message: errorMessage } as SimpleResult;
    }
  }

  /**
   * 重置密码
   * @param data 包含邮箱、验证码、新密码的对象
   * @returns 重置结果
   */
  async resetPassword(data: ResetPasswordParams): Promise<SimpleResult> {
    try {
      const response = await apiClient.post<ResetPasswordData>('/auth/reset-password', data);

      return { success: true, message: response.message || '密码重置成功' } as SimpleResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重置密码失败';
      return { success: false, message: errorMessage } as SimpleResult;
    }
  }
}

// 导出单例实例
export default AuthService.getInstance();
