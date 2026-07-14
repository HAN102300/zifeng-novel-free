/**
 * 主题管理服务 - 管理多主题色切换和深浅色模式
 * 规格：§1.1 多主题色彩体系
 */
import {
  THEME_PRESETS,
  ThemeColorScale,
  ThemePreset,
  LIGHT_NEUTRAL,
  DARK_NEUTRAL,
  NeutralToken,
  NeutralColorMap,
  MATERIAL_PRESETS,
  MaterialConfig,
  AccentColors,
} from "../common/DesignSystem";

const STORAGE_KEY_THEME: string = "app_theme_key";
const STORAGE_KEY_DARK_MODE: string = "app_dark_mode";

/** 主题预设条目（用于 getAllThemes 返回） */
export interface ThemeEntry {
  key: string;
  name: string;
  primary: string;
}

/** 通过 key 获取主题预设（switch 替代索引访问） */
function getPreset(key: string): ThemePreset | undefined {
  switch (key) {
    case "purple":
      return THEME_PRESETS.purple;
    case "green":
      return THEME_PRESETS.green;
    case "orange":
      return THEME_PRESETS.orange;
    case "red":
      return THEME_PRESETS.red;
    case "blue":
      return THEME_PRESETS.blue;
    default:
      return undefined;
  }
}

/** 获取指定色阶（switch 替代索引访问） */
function getColorByLevel(colors: ThemeColorScale, level: number): string {
  switch (level) {
    case 50:
      return colors.c50;
    case 100:
      return colors.c100;
    case 300:
      return colors.c300;
    case 400:
      return colors.c400;
    case 500:
      return colors.c500;
    case 600:
      return colors.c600;
    case 700:
      return colors.c700;
    case 900:
      return colors.c900;
    default:
      return colors.c500;
  }
}

/** 获取中性色（switch 替代索引访问） */
function getNeutralColor(map: NeutralColorMap, token: NeutralToken): string {
  switch (token) {
    case "TEXT_PRIMARY":
      return map.TEXT_PRIMARY;
    case "TEXT_SECONDARY":
      return map.TEXT_SECONDARY;
    case "TEXT_MUTED":
      return map.TEXT_MUTED;
    case "TEXT_FAINT":
      return map.TEXT_FAINT;
    case "BG_BASE":
      return map.BG_BASE;
    case "BG_ELEVATED":
      return map.BG_ELEVATED;
    case "BORDER_LIGHT":
      return map.BORDER_LIGHT;
    case "BORDER_STRONG":
      return map.BORDER_STRONG;
    default:
      return map.TEXT_PRIMARY;
  }
}

/** 获取材质预设（switch 替代索引访问） */
function getMaterialPreset(scene: string): MaterialConfig | undefined {
  switch (scene) {
    case "FLOATING":
      return MATERIAL_PRESETS.FLOATING;
    case "INPUT":
      return MATERIAL_PRESETS.INPUT;
    case "CARD":
      return MATERIAL_PRESETS.CARD;
    case "NAV_BAR":
      return MATERIAL_PRESETS.NAV_BAR;
    case "MODAL":
      return MATERIAL_PRESETS.MODAL;
    default:
      return undefined;
  }
}

/** 获取强调色（switch 替代索引访问） */
function getAccentColor(name: string): string {
  switch (name) {
    case "Rose":
      return AccentColors.ROSE;
    case "Emerald":
      return AccentColors.EMERALD;
    case "Amber":
      return AccentColors.AMBER;
    case "Magenta":
      return AccentColors.MAGENTA;
    case "Cyan":
      return AccentColors.CYAN;
    default:
      return AccentColors.ROSE;
  }
}

/** 克隆 MaterialConfig（显式属性复制替代 spread） */
function cloneMaterialConfig(src: MaterialConfig): MaterialConfig {
  const dst: MaterialConfig = {
    style: src.style,
    applyShadow: src.applyShadow,
    interactive: src.interactive,
    lightEffect: src.lightEffect,
  };
  if (src.materialColor !== undefined) {
    dst.materialColor = src.materialColor;
  }
  return dst;
}

export class ThemeManager {
  private static currentTheme: string = "purple";
  private static isDarkMode: boolean = false;

  /** 初始化：从 AppStorage 恢复用户偏好 */
  static init(): void {
    const savedTheme: string | undefined = AppStorage.get<string>(STORAGE_KEY_THEME);
    if (savedTheme !== undefined && savedTheme !== null) {
      const preset: ThemePreset | undefined = getPreset(savedTheme);
      if (preset !== undefined) {
        ThemeManager.currentTheme = savedTheme;
      }
    }
    const savedDark: boolean | undefined = AppStorage.get<boolean>(STORAGE_KEY_DARK_MODE);
    if (savedDark !== undefined && savedDark !== null) {
      ThemeManager.isDarkMode = savedDark;
    }
    ThemeManager.applyToStorage();
  }

  /** 获取当前主题色阶 */
  static getColors(): ThemeColorScale {
    const preset: ThemePreset | undefined = getPreset(ThemeManager.currentTheme);
    if (preset !== undefined) {
      return preset;
    }
    return THEME_PRESETS.purple;
  }

  /** 获取主色（500 色阶） */
  static getPrimaryColor(): string {
    const preset: ThemePreset | undefined = getPreset(ThemeManager.currentTheme);
    if (preset !== undefined) {
      return preset.c500;
    }
    return THEME_PRESETS.purple.c500;
  }

  /** 获取主色指定色阶（如 50/100/300/400/500/600/700/900） */
  static getPrimary(level: number): string {
    const preset: ThemePreset | undefined = getPreset(ThemeManager.currentTheme);
    if (preset !== undefined) {
      return getColorByLevel(preset, level);
    }
    return getColorByLevel(THEME_PRESETS.purple, level);
  }

  /** 获取强调色（Rose/Emerald/Amber/Magenta/Cyan） */
  static getAccent(name: string): string {
    return getAccentColor(name);
  }

  /** 获取主色渐变 */
  static getGradient(): [string, string] {
    const preset: ThemePreset | undefined = getPreset(ThemeManager.currentTheme);
    if (preset !== undefined) {
      return preset.gradient;
    }
    return THEME_PRESETS.purple.gradient;
  }

  /** 获取主色渐变（用于 linearGradient 配置） */
  static getGradientColors(): Array<[ResourceColor, number]> {
    const g: [string, string] = ThemeManager.getGradient();
    const result: Array<[ResourceColor, number]> = [
      [g[0], 0],
      [g[1], 1],
    ];
    return result;
  }

  /** 获取中性色（自动适配深浅色） */
  static getNeutral(token: NeutralToken): string {
    const map: NeutralColorMap = ThemeManager.isDarkMode ? DARK_NEUTRAL : LIGHT_NEUTRAL;
    return getNeutralColor(map, token);
  }

  /** 获取材质配置（动态注入当前主题色） */
  static getMaterial(scene: string): MaterialConfig {
    const src: MaterialConfig | undefined = getMaterialPreset(scene);
    if (src === undefined) {
      return cloneMaterialConfig(MATERIAL_PRESETS.CARD);
    }
    const config: MaterialConfig = cloneMaterialConfig(src);
    // INPUT 和 NAV_BAR 场景的 materialColor 跟随主题
    if (scene === "INPUT" || scene === "NAV_BAR") {
      config.materialColor = ThemeManager.getPrimary(50);
    }
    return config;
  }

  /** 切换主题 */
  static setTheme(themeKey: string): void {
    const preset: ThemePreset | undefined = getPreset(themeKey);
    if (preset === undefined) {
      console.warn(`ThemeManager: unknown theme "${themeKey}"`);
      return;
    }
    ThemeManager.currentTheme = themeKey;
    AppStorage.setOrCreate(STORAGE_KEY_THEME, themeKey);
    ThemeManager.applyToStorage();
  }

  /** 切换深浅色模式 */
  static setDarkMode(dark: boolean): void {
    ThemeManager.isDarkMode = dark;
    AppStorage.setOrCreate(STORAGE_KEY_DARK_MODE, dark);
    ThemeManager.applyToStorage();
  }

  /** 获取当前深浅色状态 */
  static isDark(): boolean {
    return ThemeManager.isDarkMode;
  }

  /** 获取当前主题 key */
  static getThemeKey(): string {
    return ThemeManager.currentTheme;
  }

  /** 获取所有可用主题（手动构建数组替代 Object.entries） */
  static getAllThemes(): Array<ThemeEntry> {
    const result: Array<ThemeEntry> = [
      { key: "purple", name: THEME_PRESETS.purple.name, primary: THEME_PRESETS.purple.c500 },
      { key: "green", name: THEME_PRESETS.green.name, primary: THEME_PRESETS.green.c500 },
      { key: "orange", name: THEME_PRESETS.orange.name, primary: THEME_PRESETS.orange.c500 },
      { key: "red", name: THEME_PRESETS.red.name, primary: THEME_PRESETS.red.c500 },
      { key: "blue", name: THEME_PRESETS.blue.name, primary: THEME_PRESETS.blue.c500 },
    ];
    return result;
  }

  /** 将关键色写入 AppStorage，供 UI 组件响应式监听 */
  private static applyToStorage(): void {
    const colors: ThemeColorScale = ThemeManager.getColors();
    AppStorage.setOrCreate("theme_primary", colors.c500);
    AppStorage.setOrCreate("theme_primary_light", colors.c400);
    AppStorage.setOrCreate("theme_primary_dark", colors.c700);
    AppStorage.setOrCreate("theme_gradient_start", colors.gradient[0]);
    AppStorage.setOrCreate("theme_gradient_end", colors.gradient[1]);
    AppStorage.setOrCreate("theme_is_dark", ThemeManager.isDarkMode);
    AppStorage.setOrCreate(
      "theme_neutral_text",
      ThemeManager.getNeutral("TEXT_PRIMARY"),
    );
    AppStorage.setOrCreate(
      "theme_neutral_text_secondary",
      ThemeManager.getNeutral("TEXT_SECONDARY"),
    );
    AppStorage.setOrCreate("theme_neutral_bg", ThemeManager.getNeutral("BG_BASE"));
    AppStorage.setOrCreate(
      "theme_neutral_bg_elevated",
      ThemeManager.getNeutral("BG_ELEVATED"),
    );
    AppStorage.setOrCreate(
      "theme_neutral_border",
      ThemeManager.getNeutral("BORDER_LIGHT"),
    );
  }
}
