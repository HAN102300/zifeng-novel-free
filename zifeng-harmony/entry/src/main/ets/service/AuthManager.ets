import { preferences } from '@kit.ArkData';
import { common } from '@kit.AbilityKit';

// 用户信息接口
export interface UserInfo {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

// Token 信息接口
export interface TokenInfo {
  token: string;
  expireTime: number; // 过期时间戳（毫秒）
}

// Preferences 存储键名
const PREF_STORE_NAME = 'auth_prefs';
const KEY_TOKEN = 'token';
const KEY_TOKEN_EXPIRE_TIME = 'token_expire_time';
const KEY_USER_ID = 'user_id';
const KEY_USER_NAME = 'user_name';
const KEY_USER_EMAIL = 'user_email';
const KEY_USER_AVATAR = 'user_avatar';

export class AuthManager {
  private static instance: AuthManager | null = null;
  private context: common.UIAbilityContext | null = null;
  private prefs: preferences.Preferences | null = null;

  // 登录状态
  private _isLoggedIn: boolean = false;
  // 当前用户信息
  private _currentUser: UserInfo | null = null;
  // 当前 token
  private _token: string = '';

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * 初始化 AuthManager，必须在应用启动时调用
   * @param context UIAbilityContext
   */
  async init(context: common.UIAbilityContext): Promise<void> {
    this.context = context;
    this.prefs = await preferences.getPreferences(context, PREF_STORE_NAME);
    await this.restoreAuthState();
    this.syncToAppStorage();
  }

  // ==================== Getter ====================

  get isLoggedIn(): boolean {
    return this._isLoggedIn;
  }

  get currentUser(): UserInfo | null {
    return this._currentUser;
  }

  get token(): string {
    return this._token;
  }

  // ==================== Token 管理 ====================

  /**
   * 保存 token 及其过期时间
   * @param token token 字符串
   * @param expireTime 过期时间戳（毫秒）
   */
  async saveToken(token: string, expireTime: number): Promise<void> {
    if (!this.prefs) {
      return;
    }
    await this.prefs.put(KEY_TOKEN, token);
    await this.prefs.put(KEY_TOKEN_EXPIRE_TIME, expireTime);
    await this.prefs.flush();

    this._token = token;
    this._isLoggedIn = true;
    this.syncToAppStorage();
  }

  /**
   * 获取已保存的 token
   * @returns token 字符串，不存在则返回空字符串
   */
  async getToken(): Promise<string> {
    if (!this.prefs) {
      return '';
    }
    const token = await this.prefs.get(KEY_TOKEN, '');
    return token as string;
  }

  /**
   * 清除 token 及其过期时间
   */
  async clearToken(): Promise<void> {
    if (!this.prefs) {
      return;
    }
    await this.prefs.delete(KEY_TOKEN);
    await this.prefs.delete(KEY_TOKEN_EXPIRE_TIME);
    await this.prefs.flush();

    this._token = '';
    this._isLoggedIn = false;
    this.syncToAppStorage();
  }

  // ==================== 用户信息管理 ====================

  /**
   * 保存用户信息到 Preferences
   * @param userInfo 用户信息对象
   */
  async saveUserInfo(userInfo: UserInfo): Promise<void> {
    if (!this.prefs) {
      return;
    }
    await this.prefs.put(KEY_USER_ID, userInfo.id);
    await this.prefs.put(KEY_USER_NAME, userInfo.username);
    await this.prefs.put(KEY_USER_EMAIL, userInfo.email);
    await this.prefs.put(KEY_USER_AVATAR, userInfo.avatar);
    await this.prefs.flush();

    this._currentUser = {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      avatar: userInfo.avatar
    };
    this.syncToAppStorage();
  }

  /**
   * 从 Preferences 获取用户信息
   * @returns 用户信息对象，不存在则返回 null
   */
  async getUserInfo(): Promise<UserInfo | null> {
    if (!this.prefs) {
      return null;
    }
    const id = await this.prefs.get(KEY_USER_ID, '') as string;
    const username = await this.prefs.get(KEY_USER_NAME, '') as string;
    const email = await this.prefs.get(KEY_USER_EMAIL, '') as string;
    const avatar = await this.prefs.get(KEY_USER_AVATAR, '') as string;

    if (!id) {
      return null;
    }
    return { id, username, email, avatar };
  }

  /**
   * 清除用户信息
   */
  async clearUserInfo(): Promise<void> {
    if (!this.prefs) {
      return;
    }
    await this.prefs.delete(KEY_USER_ID);
    await this.prefs.delete(KEY_USER_NAME);
    await this.prefs.delete(KEY_USER_EMAIL);
    await this.prefs.delete(KEY_USER_AVATAR);
    await this.prefs.flush();

    this._currentUser = null;
    this.syncToAppStorage();
  }

  // ==================== Token 过期检测 ====================

  /**
   * 检测 token 是否已过期
   * @returns true 表示已过期或不存在
   */
  async isTokenExpired(): Promise<boolean> {
    if (!this.prefs) {
      return true;
    }
    const expireTime = await this.prefs.get(KEY_TOKEN_EXPIRE_TIME, 0) as number;
    if (expireTime === 0) {
      return true;
    }
    return Date.now() > expireTime;
  }

  /**
   * 检查 token 状态，若过期则自动清除并触发登出
   * @returns true 表示 token 有效
   */
  async checkTokenValidity(): Promise<boolean> {
    const expired = await this.isTokenExpired();
    if (expired) {
      await this.logout();
      return false;
    }
    return true;
  }

  // ==================== 登录 / 登出 ====================

  /**
   * 登出：清除 token 和用户信息
   */
  async logout(): Promise<void> {
    await this.clearToken();
    await this.clearUserInfo();
    this._isLoggedIn = false;
    this.syncToAppStorage();
  }

  // ==================== 内部方法 ====================

  /**
   * 应用启动时从 Preferences 恢复认证状态
   */
  private async restoreAuthState(): Promise<void> {
    if (!this.prefs) {
      return;
    }

    // 恢复 token
    const token = await this.prefs.get(KEY_TOKEN, '') as string;
    const expireTime = await this.prefs.get(KEY_TOKEN_EXPIRE_TIME, 0) as number;

    // 检测 token 是否过期
    if (!token || (expireTime > 0 && Date.now() > expireTime)) {
      // token 不存在或已过期，清除所有认证数据
      await this.clearToken();
      await this.clearUserInfo();
      this._isLoggedIn = false;
      return;
    }

    this._token = token;
    this._isLoggedIn = true;

    // 恢复用户信息
    const userInfo = await this.getUserInfo();
    if (userInfo) {
      this._currentUser = userInfo;
    }
  }

  /**
   * 将当前状态同步到 AppStorage，供 UI 层响应
   */
  private syncToAppStorage(): void {
    AppStorage.setOrCreate('isLoggedIn', this._isLoggedIn);
    AppStorage.setOrCreate('zifeng_user', this._currentUser);
    AppStorage.setOrCreate('zifeng_token', this._token);
  }

  /**
   * 清除 AppStorage 中的认证数据
   */
  clearAuthData(): void {
    AppStorage.delete('zifeng_token');
    AppStorage.delete('zifeng_user');
    AppStorage.delete('isLoggedIn');
  }
}
