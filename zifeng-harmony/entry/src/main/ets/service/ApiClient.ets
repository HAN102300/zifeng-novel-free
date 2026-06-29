/**
 * API 客户端基础架构
 * 封装 HTTP 请求，提供统一的请求拦截、响应拦截和错误处理
 */
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from '@ohos/axios';
import { promptAction } from '@kit.ArkUI';

/**
 * API 响应数据结构
 * 与后端 ApiResponse<T> 格式一致：{ success: boolean, message: string, data: T }
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * API 客户端单例类
 * 负责管理 HTTP 请求的基础配置、拦截器和错误处理
 */
class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;

  // 基础配置
  private static readonly BASE_URL = 'http://localhost:8080/api';
  private static readonly TIMEOUT = 15000;

  private constructor() {
    // 创建 axios 实例
    this.axiosInstance = axios.create({
      baseURL: ApiClient.BASE_URL,
      timeout: ApiClient.TIMEOUT,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 配置请求拦截器
    this.setupRequestInterceptor();

    // 配置响应拦截器
    this.setupResponseInterceptor();
  }

  /**
   * 获取 ApiClient 单例实例
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * 配置请求拦截器
   * 从 AppStorage 获取 token 并添加到请求头
   */
  private setupRequestInterceptor(): void {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // 从 AppStorage 获取 token
        const token = AppStorage.get<string>('zifeng_token');

        // 如果 token 存在，添加到请求头
        if (token && config.headers) {
          config.headers['zifeng_token'] = token;
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * 配置响应拦截器
   * 处理 401 未授权错误和统一错误提示
   */
  private setupResponseInterceptor(): void {
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        // 检查业务状态码
        const resData = response.data as ApiResponse<object>;

        // 如果业务状态不是成功（后端返回 success: false）
        if (!resData.success) {
          // 显示业务错误提示
          this.showError(resData.message || '业务处理失败');
          return Promise.reject(new Error(resData.message || '业务处理失败'));
        }

        return response;
      },
      (error: AxiosError) => {
        // 处理 HTTP 错误
        if (error.response) {
          const status = error.response.status;

          switch (status) {
            case 401:
              // 未授权错误：清除 token 和用户信息
              this.handleUnauthorized();
              break;
            case 403:
              this.showError('拒绝访问');
              break;
            case 404:
              this.showError('请求资源不存在');
              break;
            case 500:
              this.showError('服务器错误');
              break;
            case 502:
              this.showError('网关错误');
              break;
            case 503:
              this.showError('服务不可用');
              break;
            default:
              this.showError(`请求失败 (${status})`);
          }
        } else if (error.request) {
          // 网络错误
          this.showError('网络连接失败，请检查网络设置');
        } else {
          // 其他错误
          this.showError('请求发生错误');
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * 处理 401 未授权错误
   * 清除 token 和用户信息，触发登出逻辑
   */
  private handleUnauthorized(): void {
    // 清除 token
    AppStorage.delete('zifeng_token');

    // 清除用户信息
    AppStorage.delete('zifeng_user');

    // 显示错误提示
    this.showError('登录已过期，请重新登录');

    // 触发登出逻辑（可以通过 AppStorage 中的状态来通知页面）
    AppStorage.setOrCreate('zifeng_logout_event', Date.now());
  }

  /**
   * 显示错误提示
   * @param message 错误信息
   */
  private showError(message: string): void {
    promptAction.showToast({
      message: message,
      duration: 2000
    });
  }

  /**
   * GET 请求
   * @param url 请求 URL
   * @param config 请求配置
   */
  public get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.get(url, config).then((response: AxiosResponse) => {
      return response.data as ApiResponse<T>;
    });
  }

  /**
   * POST 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   */
  public post<T>(url: string, data?: object, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.post(url, data, config).then((response: AxiosResponse) => {
      return response.data as ApiResponse<T>;
    });
  }

  /**
   * PUT 请求
   * @param url 请求 URL
   * @param data 请求数据
   * @param config 请求配置
   */
  public put<T>(url: string, data?: object, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.put(url, data, config).then((response: AxiosResponse) => {
      return response.data as ApiResponse<T>;
    });
  }

  /**
   * DELETE 请求
   * @param url 请求 URL
   * @param config 请求配置
   */
  public delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.axiosInstance.delete(url, config).then((response: AxiosResponse) => {
      return response.data as ApiResponse<T>;
    });
  }

  /**
   * 获取 axios 实例（用于特殊需求）
   */
  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

// 导出单例实例
export default ApiClient.getInstance();
