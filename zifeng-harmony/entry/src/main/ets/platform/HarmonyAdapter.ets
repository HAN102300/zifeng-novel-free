/**
 * HarmonyOS 平台适配器实现
 * 实现 IPlatformAdapter 接口，使用 HarmonyOS 原生 API
 */
import { IPlatformAdapter, RequestConfig, ResponseData, DeviceInfo } from './PlatformAdapter'
import apiClient from '../service/ApiClient'
import { NavPathStack } from '@kit.ArkUI'

/**
 * HarmonyOS 平台适配器
 */
class HarmonyAdapter implements IPlatformAdapter {
  private static instance: HarmonyAdapter | null = null
  private navPathStack: NavPathStack | null = null
  private themeCallbacks: ((isDarkMode: boolean) => void)[] = []

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): HarmonyAdapter {
    if (!HarmonyAdapter.instance) {
      HarmonyAdapter.instance = new HarmonyAdapter()
    }
    return HarmonyAdapter.instance
  }

  /**
   * 设置 NavPathStack（由 Index 页面初始化时调用）
   */
  setNavPathStack(stack: NavPathStack): void {
    this.navPathStack = stack
  }

  getPlatform(): string {
    return 'harmony'
  }

  async request<T>(config: RequestConfig): Promise<ResponseData<T>> {
    try {
      const method = config.method || 'GET'
      let response

      switch (method) {
        case 'GET':
          response = await apiClient.get<T>(config.url, { headers: config.headers, timeout: config.timeout })
          break
        case 'POST':
          response = await apiClient.post<T>(config.url, config.data, { headers: config.headers, timeout: config.timeout })
          break
        case 'PUT':
          response = await apiClient.put<T>(config.url, config.data, { headers: config.headers, timeout: config.timeout })
          break
        case 'DELETE':
          response = await apiClient.delete<T>(config.url, { headers: config.headers, timeout: config.timeout })
          break
        default:
          response = await apiClient.get<T>(config.url, { headers: config.headers, timeout: config.timeout })
      }

      return {
        success: response.success,
        message: response.message,
        data: response.data,
        statusCode: 200
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error),
        data: null as T,
        statusCode: -1
      }
    }
  }

  getStorage(key: string): string | undefined {
    return AppStorage.get<string>(key)
  }

  setStorage(key: string, value: string): void {
    AppStorage.setOrCreate(key, value)
  }

  navigateTo(pageName: string, params?: Record<string, Object>): void {
    if (this.navPathStack) {
      this.navPathStack.pushPath({ name: pageName, param: params })
    }
  }

  goBack(): void {
    if (this.navPathStack && this.navPathStack.size() > 0) {
      this.navPathStack.pop()
    }
  }

  getDeviceInfo(): DeviceInfo {
    const isDarkMode = AppStorage.get<boolean>('isDarkMode') ?? false
    return {
      platform: 'harmony',
      osVersion: '',
      deviceModel: '',
      screenWidth: 0,
      screenHeight: 0,
      pixelRatio: 1,
      isDarkMode: isDarkMode
    }
  }

  onThemeChange(callback: (isDarkMode: boolean) => void): void {
    this.themeCallbacks.push(callback)
  }

  /**
   * 内部方法：通知主题变化
   */
  notifyThemeChange(isDarkMode: boolean): void {
    this.themeCallbacks.forEach(cb => cb(isDarkMode))
  }
}

// 导出单例
export default HarmonyAdapter.getInstance()
