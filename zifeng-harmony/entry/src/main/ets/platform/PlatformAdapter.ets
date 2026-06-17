/**
 * 跨平台适配器接口层
 * 定义平台无关的接口，各平台实现具体逻辑
 */

/**
 * 请求配置
 */
export interface RequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  data?: object
  timeout?: number
}

/**
 * 响应数据
 */
export interface ResponseData<T = object> {
  success: boolean
  message: string
  data: T
  statusCode: number
}

/**
 * 设备信息
 */
export interface DeviceInfo {
  platform: 'harmony' | 'android' | 'ios' | 'web'
  osVersion: string
  deviceModel: string
  screenWidth: number
  screenHeight: number
  pixelRatio: number
  isDarkMode: boolean
}

/**
 * 平台适配器接口
 * 定义跨平台操作的统一接口
 */
export interface IPlatformAdapter {
  /**
   * 获取当前平台标识
   */
  getPlatform(): string

  /**
   * 发起网络请求
   * @param config 请求配置
   */
  request<T>(config: RequestConfig): Promise<ResponseData<T>>

  /**
   * 从本地存储获取数据
   * @param key 存储键
   */
  getStorage(key: string): string | undefined

  /**
   * 存储数据到本地
   * @param key 存储键
   * @param value 存储值
   */
  setStorage(key: string, value: string): void

  /**
   * 导航到指定页面
   * @param pageName 页面名称
   * @param params 页面参数
   */
  navigateTo(pageName: string, params?: Record<string, Object>): void

  /**
   * 返回上一页
   */
  goBack(): void

  /**
   * 获取设备信息
   */
  getDeviceInfo(): DeviceInfo

  /**
   * 监听主题变化
   * @param callback 主题变化回调
   */
  onThemeChange(callback: (isDarkMode: boolean) => void): void
}
