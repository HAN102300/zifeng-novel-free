/**
 * 深色模式主题管理器
 * 提供主题切换和颜色适配功能
 * 适配 API 26：支持系统主题跟随
 */
import { preferences } from '@kit.ArkData'
import { common, Configuration } from '@kit.AbilityKit'

/**
 * 主题类型
 */
export enum ThemeType {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * 主题颜色配置
 */
export interface ThemeColors {
  // 背景色
  bgPrimary: string
  bgSecondary: string
  bgTertiary: string
  
  // 文字色
  textPrimary: string
  textSecondary: string
  textTertiary: string
  
  // 边框色
  border: string
  
  // 卡片背景
  cardBg: string
  
  // 分割线
  divider: string
}

/**
 * 浅色主题
 */
const LIGHT_THEME: ThemeColors = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f5',
  bgTertiary: '#eeeeee',
  textPrimary: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  border: '#e0e0e0',
  cardBg: '#ffffff',
  divider: '#f0f0f0'
}

/**
 * 深色主题
 */
const DARK_THEME: ThemeColors = {
  bgPrimary: '#1a1a1a',
  bgSecondary: '#2a2a2a',
  bgTertiary: '#3a3a3a',
  textPrimary: '#ffffff',
  textSecondary: '#cccccc',
  textTertiary: '#999999',
  border: '#444444',
  cardBg: '#2a2a2a',
  divider: '#3a3a3a'
}

/**
 * 主题管理器
 */
export class ThemeManager {
  private static instance: ThemeManager | null = null
  private context: common.UIAbilityContext | null = null
  private prefs: preferences.Preferences | null = null
  private _currentTheme: ThemeType = ThemeType.LIGHT
  private _colors: ThemeColors = LIGHT_THEME

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager()
    }
    return ThemeManager.instance
  }

  /**
   * 初始化主题管理器
   */
  async init(context: common.UIAbilityContext): Promise<void> {
    this.context = context
    this.prefs = await preferences.getPreferences(context, 'theme_prefs')
    await this.restoreTheme()
  }

  /**
   * 获取当前主题类型
   */
  get currentTheme(): ThemeType {
    return this._currentTheme
  }

  /**
   * 获取当前主题颜色
   */
  get colors(): ThemeColors {
    return this._colors
  }

  /**
   * 判断是否为深色模式
   */
  get isDarkMode(): boolean {
    if (this._currentTheme === ThemeType.SYSTEM) {
      // 跟随系统主题：检查 AppStorage 中的 colorMode
      const colorMode = AppStorage.get<string>('colorMode')
      return colorMode === 'dark'
    }
    return this._currentTheme === ThemeType.DARK
  }

  /**
   * 设置主题
   */
  async setTheme(theme: ThemeType): Promise<void> {
    this._currentTheme = theme
    
    if (theme === ThemeType.SYSTEM) {
      // 跟随系统主题：检查 AppStorage 中的 colorMode
      const colorMode = AppStorage.get<string>('colorMode')
      this._colors = colorMode === 'dark' ? DARK_THEME : LIGHT_THEME
    } else if (theme === ThemeType.DARK) {
      this._colors = DARK_THEME
    } else {
      this._colors = LIGHT_THEME
    }

    // 保存到 Preferences
    if (this.prefs) {
      await this.prefs.put('theme', theme)
      await this.prefs.flush()
    }

    // 同步到 AppStorage
    AppStorage.setOrCreate('isDarkMode', this.isDarkMode)
    AppStorage.setOrCreate('themeColors', this._colors)
  }

  /**
   * 切换深色/浅色模式
   */
  async toggleDarkMode(): Promise<void> {
    const newTheme = this.isDarkMode ? ThemeType.LIGHT : ThemeType.DARK
    await this.setTheme(newTheme)
  }

  /**
   * 从 Preferences 恢复主题设置
   */
  private async restoreTheme(): Promise<void> {
    if (!this.prefs) {
      return
    }

    const savedTheme = await this.prefs.get('theme', ThemeType.LIGHT) as string
    this._currentTheme = savedTheme as ThemeType
    
    if (this._currentTheme === ThemeType.SYSTEM) {
      // 跟随系统主题
      const colorMode = AppStorage.get<string>('colorMode')
      this._colors = colorMode === 'dark' ? DARK_THEME : LIGHT_THEME
    } else if (this._currentTheme === ThemeType.DARK) {
      this._colors = DARK_THEME
    } else {
      this._colors = LIGHT_THEME
    }

    // 同步到 AppStorage
    AppStorage.setOrCreate('isDarkMode', this.isDarkMode)
    AppStorage.setOrCreate('themeColors', this._colors)
  }

  /**
   * 系统配置变更回调
   * 由 EntryAbility.onConfigurationUpdate 调用
   */
  onConfigurationUpdate(config: Configuration): void {
    // 更新 AppStorage 中的 colorMode
    const colorMode = config.colorMode !== undefined ? (config.colorMode === 1 ? 'dark' : 'light') : 'light'
    AppStorage.setOrCreate('colorMode', colorMode)

    // 如果当前主题是跟随系统，重新应用
    if (this._currentTheme === ThemeType.SYSTEM) {
      this._colors = colorMode === 'dark' ? DARK_THEME : LIGHT_THEME
      AppStorage.setOrCreate('isDarkMode', this.isDarkMode)
      AppStorage.setOrCreate('themeColors', this._colors)
    }
  }

  /**
   * 获取适配的颜色值
   * @param lightColor 浅色模式颜色
   * @param darkColor 深色模式颜色
   */
  getColor(lightColor: string, darkColor: string): string {
    return this.isDarkMode ? darkColor : lightColor
  }

  /**
   * 获取背景色
   */
  getBgColor(level: 1 | 2 | 3 = 1): string {
    switch (level) {
      case 1:
        return this._colors.bgPrimary
      case 2:
        return this._colors.bgSecondary
      case 3:
        return this._colors.bgTertiary
      default:
        return this._colors.bgPrimary
    }
  }

  /**
   * 获取文字色
   */
  getTextColor(level: 1 | 2 | 3 = 1): string {
    switch (level) {
      case 1:
        return this._colors.textPrimary
      case 2:
        return this._colors.textSecondary
      case 3:
        return this._colors.textTertiary
      default:
        return this._colors.textPrimary
    }
  }
}
