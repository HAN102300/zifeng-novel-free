/**
 * 主题管理服务 - 管理多主题色切换和深浅色模式
 * 规格：§1.1 多主题色彩体系
 */
import { AppStorage } from "@kit.ArkUI";
import {
  THEME_PRESETS,
  ThemeColorScale,
  LIGHT_NEUTRAL,
  DARK_NEUTRAL,
  NeutralToken,
  MATERIAL_PRESETS,
  MaterialConfig,
} from "../common/DesignSystem";

const STORAGE_KEY_THEME = "app_theme_key";
const STORAGE_KEY_DARK_MODE = "app_dark_mode";

export class ThemeManager {
  private static currentTheme: string = "purple";
  private static isDarkMode: boolean = false;

  /** 初始化：从 AppStorage 恢复用户偏好 */
  static init(): void {
    const savedTheme = AppStorage.get<string>(STORAGE_KEY_THEME);
    if (savedTheme && THEME_PRESETS[savedTheme]) {
      this.currentTheme = savedTheme;
    }
    const savedDark = AppStorage.get<boolean>(STORAGE_KEY_DARK_MODE);
    if (savedDark !== undefined) {
      this.isDarkMode = savedDark;
    }
    this.applyToStorage();
  }

  /** 获取当前主题色阶 */
  static getColors(): ThemeColorScale {
    return THEME_PRESETS[this.currentTheme];
  }

  /** 获取主色（500 色阶） */
  static getPrimaryColor(): string {
    return THEME_PRESETS[this.currentTheme]["500"];
  }

  /** 获取主色渐变 */
  static getGradient(): [string, string] {
    return THEME_PRESETS[this.currentTheme].gradient;
  }

  /** 获取主色渐变（用于 linearGradient 配置） */
  static getGradientColors(): [ResourceColor, number][] {
    const g = THEME_PRESETS[this.currentTheme].gradient;
    return [
      [g[0], 0],
      [g[1], 1],
    ];
  }

  /** 获取中性色（自动适配深浅色） */
  static getNeutral(token: NeutralToken): string {
    return this.isDarkMode ? DARK_NEUTRAL[token] : LIGHT_NEUTRAL[token];
  }

  /** 获取材质配置（动态注入当前主题色） */
  static getMaterial(scene: keyof typeof MATERIAL_PRESETS): MaterialConfig {
    const config = { ...MATERIAL_PRESETS[scene] };
    // INPUT 和 NAV_BAR 场景的 materialColor 跟随主题
    if (scene === "INPUT" || scene === "NAV_BAR") {
      config.materialColor = THEME_PRESETS[this.currentTheme]["50"];
    }
    return config;
  }

  /** 切换主题 */
  static setTheme(themeKey: string): void {
    if (!THEME_PRESETS[themeKey]) {
      console.warn(`ThemeManager: unknown theme "${themeKey}"`);
      return;
    }
    this.currentTheme = themeKey;
    AppStorage.setOrCreate(STORAGE_KEY_THEME, themeKey);
    this.applyToStorage();
  }

  /** 切换深浅色模式 */
  static setDarkMode(dark: boolean): void {
    this.isDarkMode = dark;
    AppStorage.setOrCreate(STORAGE_KEY_DARK_MODE, dark);
    this.applyToStorage();
  }

  /** 获取当前深浅色状态 */
  static isDark(): boolean {
    return this.isDarkMode;
  }

  /** 获取当前主题 key */
  static getThemeKey(): string {
    return this.currentTheme;
  }

  /** 获取所有可用主题 */
  static getAllThemes(): Array<{ key: string; name: string; primary: string }> {
    return Object.entries(THEME_PRESETS).map(([key, val]) => ({
      key,
      name: val.name,
      primary: val["500"],
    }));
  }

  /** 将关键色写入 AppStorage，供 UI 组件响应式监听 */
  private static applyToStorage(): void {
    const colors = THEME_PRESETS[this.currentTheme];
    AppStorage.setOrCreate("theme_primary", colors["500"]);
    AppStorage.setOrCreate("theme_primary_light", colors["400"]);
    AppStorage.setOrCreate("theme_primary_dark", colors["700"]);
    AppStorage.setOrCreate("theme_gradient_start", colors.gradient[0]);
    AppStorage.setOrCreate("theme_gradient_end", colors.gradient[1]);
    AppStorage.setOrCreate("theme_is_dark", this.isDarkMode);
    AppStorage.setOrCreate(
      "theme_neutral_text",
      this.getNeutral("TEXT_PRIMARY"),
    );
    AppStorage.setOrCreate(
      "theme_neutral_text_secondary",
      this.getNeutral("TEXT_SECONDARY"),
    );
    AppStorage.setOrCreate("theme_neutral_bg", this.getNeutral("BG_BASE"));
    AppStorage.setOrCreate(
      "theme_neutral_bg_elevated",
      this.getNeutral("BG_ELEVATED"),
    );
    AppStorage.setOrCreate(
      "theme_neutral_border",
      this.getNeutral("BORDER_LIGHT"),
    );
  }
}
