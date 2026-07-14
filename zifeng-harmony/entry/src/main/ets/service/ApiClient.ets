/**
 * ApiClient - HTTP 请求封装
 * 规格：§服务层 ApiClient
 *
 * 基于鸿蒙 @ohos.net.http 实现，支持：
 * - GET/POST 请求
 * - 自动携带认证 Token
 * - 请求超时处理
 * - 统一错误处理
 * - 响应数据解析
 */
import http from "@ohos.net.http";
import preference from "@ohos.data.preferences";

const BASE_URL_KEY = "api_base_url";
const TOKEN_KEY = "auth_token";
const DEFAULT_TIMEOUT = 15000;

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export class ApiClient {
  private static baseUrl: string = "http://192.168.1.100:8080";

  /** 初始化 baseUrl（从 Preferences 读取） */
  static async init(): Promise<void> {
    try {
      const pref = await preference.getPreferences(
        globalThis.context,
        "app_config",
      );
      const url = (await pref.get(BASE_URL_KEY, "")) as string;
      if (url) {
        this.baseUrl = url;
      }
    } catch (e) {
      console.warn("ApiClient init: using default baseUrl");
    }
  }

  /** 设置 baseUrl */
  static async setBaseUrl(url: string): Promise<void> {
    this.baseUrl = url;
    const pref = await preference.getPreferences(
      globalThis.context,
      "app_config",
    );
    await pref.put(BASE_URL_KEY, url);
    await pref.flush();
  }

  /** 获取认证 Token */
  static async getToken(): Promise<string> {
    try {
      const pref = await preference.getPreferences(globalThis.context, "auth");
      return (await pref.get(TOKEN_KEY, "")) as string;
    } catch {
      return "";
    }
  }

  /** 设置认证 Token */
  static async setToken(token: string): Promise<void> {
    const pref = await preference.getPreferences(globalThis.context, "auth");
    await pref.put(TOKEN_KEY, token);
    await pref.flush();
  }

  /** 清除 Token */
  static async clearToken(): Promise<void> {
    const pref = await preference.getPreferences(globalThis.context, "auth");
    await pref.delete(TOKEN_KEY);
    await pref.flush();
  }

  /** GET 请求 */
  static async get<T>(
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.request<T>("GET", url);
  }

  /** POST 请求 */
  static async post<T>(path: string, body?: object): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("POST", url, body);
  }

  /** PUT 请求 */
  static async put<T>(path: string, body?: object): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("PUT", url, body);
  }

  /** DELETE 请求 */
  static async delete<T>(path: string): Promise<T> {
    const url = this.buildUrl(path);
    return this.request<T>("DELETE", url);
  }

  /** 核心请求方法 */
  private static async request<T>(
    method: string,
    url: string,
    body?: object,
  ): Promise<T> {
    const httpReq = http.createHttp();
    const token = await this.getToken();

    const header: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      header["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await httpReq.request(url, {
        method: method as http.RequestMethod,
        header,
        extraData: body ? JSON.stringify(body) : undefined,
        connectTimeout: DEFAULT_TIMEOUT,
        readTimeout: DEFAULT_TIMEOUT,
        expectDataType: http.HttpDataType.STRING,
      });

      if (response.responseCode >= 200 && response.responseCode < 300) {
        const result = JSON.parse(response.result as string) as ApiResponse<T>;
        if (result.code === 200 || result.code === 0) {
          return result.data;
        }
        throw new Error(result.message || "请求失败");
      } else if (response.responseCode === 401) {
        await this.clearToken();
        throw new Error("登录已过期，请重新登录");
      } else {
        throw new Error(`HTTP ${response.responseCode}`);
      }
    } finally {
      httpReq.destroy();
    }
  }

  /** 构建完整 URL */
  private static buildUrl(
    path: string,
    params?: Record<string, string>,
  ): string {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const query = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
      url += `?${query}`;
    }
    return url;
  }
}
