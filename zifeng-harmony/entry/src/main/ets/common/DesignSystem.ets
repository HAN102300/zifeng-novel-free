/**
 * 紫枫免费小说鸿蒙应用 - 统一设计系统
 * 适配 HarmonyOS 7.0 beta (API 26) - ImmersiveMaterial 沉浸光感
 *
 * 设计基准：与 zifeng-web 前端 5 套主题色对齐，独立重新设计
 * 规格：docs/superpowers/specs/2026-06-29-harmonyos-mobile-app-design.md §1.1-1.5
 */
import { curves } from "@kit.ArkUI";
import { uiMaterial } from "@kit.ArkUI";

// ============================================================
// 1.1 多主题色彩体系
// ============================================================

/** 主题色阶（50→900） */
export interface ThemeColorScale {
  c50: string;
  c100: string;
  c300: string;
  c400: string;
  c500: string;
  c600: string;
  c700: string;
  c900: string;
  gradient: [string, string]; // 400→600 渐变
}

/** 主题预设（含名称） */
export interface ThemePreset extends ThemeColorScale {
  name: string;
}

/** 主题预设映射表 */
export interface ThemePresetMap {
  purple: ThemePreset;
  green: ThemePreset;
  orange: ThemePreset;
  red: ThemePreset;
  blue: ThemePreset;
}

/** 主题预设数据 */
export const THEME_PRESETS: ThemePresetMap = {
  purple: {
    c50: "#F5F3FF",
    c100: "#EDE9FE",
    c300: "#C4B5FD",
    c400: "#A78BFA",
    c500: "#8B5CF6",
    c600: "#7C3AED",
    c700: "#6D28D9",
    c900: "#4C1D95",
    gradient: ["#A78BFA", "#7C3AED"],
    name: "优雅紫",
  },
  green: {
    c50: "#F6FFED",
    c100: "#D9F7BE",
    c300: "#A0D911",
    c400: "#73D13D",
    c500: "#52C41A",
    c600: "#389E0D",
    c700: "#389E0D",
    c900: "#237804",
    gradient: ["#73D13D", "#389E0D"],
    name: "清新绿",
  },
  orange: {
    c50: "#FFF7E6",
    c100: "#FFE7BA",
    c300: "#FFD591",
    c400: "#FFA940",
    c500: "#FA8C16",
    c600: "#D46B08",
    c700: "#D46B08",
    c900: "#874D00",
    gradient: ["#FFA940", "#D46B08"],
    name: "活力橙",
  },
  red: {
    c50: "#FFF1F0",
    c100: "#FFCCC7",
    c300: "#FFA39E",
    c400: "#FF4D4F",
    c500: "#F5222D",
    c600: "#CF1322",
    c700: "#CF1322",
    c900: "#820014",
    gradient: ["#FF4D4F", "#CF1322"],
    name: "热情红",
  },
  blue: {
    c50: "#E6F7FF",
    c100: "#BAE7FF",
    c300: "#91D5FF",
    c400: "#40A9FF",
    c500: "#1890FF",
    c600: "#096DD9",
    c700: "#096DD9",
    c900: "#003A8C",
    gradient: ["#40A9FF", "#096DD9"],
    name: "经典蓝",
  },
};

/** 跨主题统一的强调色 */
export class AccentColors {
  static readonly MAGENTA: string = "#EC4899"; // 高亮、热搜榜
  static readonly CYAN: string = "#06B6D4"; // 信息提示、更新榜
  static readonly AMBER: string = "#F59E0B"; // 警告、完本榜
  static readonly EMERALD: string = "#10B981"; // 成功、在读状态
  static readonly ROSE: string = "#F43F5E"; // 危险、删除操作
}

/** 榜单强调色映射 */
export interface RankAccentColors {
  mustRead: string;
  potential: string;
  completed: string;
  updated: string;
  search: string;
  comment: string;
}

/** 榜单强调色数据 */
export const RANK_ACCENTS: RankAccentColors = {
  mustRead: "#FAAD14", // 必读榜 - 金色
  potential: "#13C2C2", // 潜力榜 - 薄荷绿
  completed: "#52C41A", // 完本榜 - 翠绿
  updated: "#FA8C16", // 更新榜 - 橙黄
  search: "#F5222D", // 热搜榜 - 朱红
  comment: "#722ED1", // 评论榜 - 深紫
};

/** 中性色令牌键 */
export type NeutralToken =
  | "TEXT_PRIMARY"
  | "TEXT_SECONDARY"
  | "TEXT_MUTED"
  | "TEXT_FAINT"
  | "BG_BASE"
  | "BG_ELEVATED"
  | "BORDER_LIGHT"
  | "BORDER_STRONG";

/** 中性色映射表 */
export interface NeutralColorMap {
  TEXT_PRIMARY: string;
  TEXT_SECONDARY: string;
  TEXT_MUTED: string;
  TEXT_FAINT: string;
  BG_BASE: string;
  BG_ELEVATED: string;
  BORDER_LIGHT: string;
  BORDER_STRONG: string;
}

/** 浅色模式中性色 */
export const LIGHT_NEUTRAL: NeutralColorMap = {
  TEXT_PRIMARY: "#1E1B2E",
  TEXT_SECONDARY: "#475569",
  TEXT_MUTED: "#94A3B8",
  TEXT_FAINT: "#64748B",
  BG_BASE: "#F6F4FF",
  BG_ELEVATED: "#FFFFFF",
  BORDER_LIGHT: "rgba(124,58,237,0.14)",
  BORDER_STRONG: "rgba(124,58,237,0.28)",
};

/** 深色模式中性色 */
export const DARK_NEUTRAL: NeutralColorMap = {
  TEXT_PRIMARY: "#F8FAFC",
  TEXT_SECONDARY: "#CBD5E1",
  TEXT_MUTED: "#94A3B8",
  TEXT_FAINT: "#64748B",
  BG_BASE: "#0B0814",
  BG_ELEVATED: "#131022",
  BORDER_LIGHT: "rgba(255,255,255,0.12)",
  BORDER_STRONG: "rgba(255,255,255,0.20)",
};

// ============================================================
// 1.2 ImmersiveMaterial 材质样式映射
// ============================================================

/** 材质场景配置 */
export interface MaterialConfig {
  style: uiMaterial.ImmersiveStyle;
  materialColor?: ResourceColor;
  applyShadow: boolean;
  interactive: boolean;
  lightEffect?: uiMaterial.LightEffectOptions;
}

/** 材质预设映射表 */
export interface MaterialPresetMap {
  FLOATING: MaterialConfig;
  INPUT: MaterialConfig;
  CARD: MaterialConfig;
  NAV_BAR: MaterialConfig;
  MODAL: MaterialConfig;
}

/** 场景→材质映射表 [Spec §1.2] */
export const MATERIAL_PRESETS: MaterialPresetMap = {
  FLOATING: {
    // 浮动工具栏/浮窗
    style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
    applyShadow: true,
    interactive: true,
    lightEffect: { color: Color.White },
  },
  INPUT: {
    // 搜索框/输入面板
    style: uiMaterial.ImmersiveStyle.THIN,
    materialColor: THEME_PRESETS.purple.c50, // 运行时由 ThemeManager 动态注入
    applyShadow: true,
    interactive: false,
  },
  CARD: {
    // 卡片/列表项
    style: uiMaterial.ImmersiveStyle.REGULAR,
    applyShadow: true,
    interactive: true,
  },
  NAV_BAR: {
    // 底部导航栏/Tab
    style: uiMaterial.ImmersiveStyle.THICK,
    materialColor: THEME_PRESETS.purple.c50,
    applyShadow: true,
    interactive: false,
  },
  MODAL: {
    // 模态弹窗背景
    style: uiMaterial.ImmersiveStyle.ULTRA_THICK,
    applyShadow: true,
    interactive: false,
  },
};

// ============================================================
// 1.3 字体规范
// ============================================================

export class AppTypography {
  static readonly SIZE_DISPLAY: number = 32;
  static readonly SIZE_H1: number = 28;
  static readonly SIZE_H2: number = 24;
  static readonly SIZE_H3: number = 20;
  static readonly SIZE_H4: number = 18;
  static readonly SIZE_BODY_LARGE: number = 16;
  static readonly SIZE_BODY: number = 14;
  static readonly SIZE_BODY_SMALL: number = 13;
  static readonly SIZE_CAPTION: number = 12;
  static readonly SIZE_TINY: number = 10;

  static readonly WEIGHT_LIGHT: FontWeight = FontWeight.Lighter;
  static readonly WEIGHT_REGULAR: FontWeight = FontWeight.Normal;
  static readonly WEIGHT_MEDIUM: FontWeight = FontWeight.Medium;
  static readonly WEIGHT_SEMIBOLD: FontWeight = FontWeight.Bolder;
  static readonly WEIGHT_BOLD: FontWeight = FontWeight.Bold;

  static readonly LINE_HEIGHT_TIGHT: number = 1.2;
  static readonly LINE_HEIGHT_NORMAL: number = 1.5;
  static readonly LINE_HEIGHT_LOOSE: number = 1.8;

  /** 阅读正文字号范围（用户可调） */
  static readonly READING_SIZE_MIN: number = 16;
  static readonly READING_SIZE_MAX: number = 24;
  static readonly READING_SIZE_DEFAULT: number = 18;
  static readonly READING_LINE_HEIGHT_MIN: number = 1.6;
  static readonly READING_LINE_HEIGHT_MAX: number = 2.0;
  static readonly READING_LINE_HEIGHT_DEFAULT: number = 1.8;
}

// ============================================================
// 1.4 间距与圆角
// ============================================================

export class AppSpacing {
  static readonly S1: number = 4;
  static readonly S2: number = 8;
  static readonly S3: number = 12;
  static readonly S4: number = 16;
  static readonly S5: number = 20;
  static readonly S6: number = 24;
  static readonly S8: number = 32;
  static readonly S10: number = 40;
  static readonly S12: number = 48;
  static readonly S16: number = 64;
}

export class AppRadius {
  static readonly R_SM: number = 8;
  static readonly R_MD: number = 12;
  static readonly R_LG: number = 16;
  static readonly R_XL: number = 22;
  static readonly R_FULL: number = 999;
}

// ============================================================
// 1.5 动效规范
// ============================================================

export class AppCurves {
  static readonly MICRO: Curve = Curve.EaseOut;
  static readonly PAGE_TRANSITION: Curve = Curve.EaseInOut;
  static readonly SPRING: Curve = Curve.EaseOut;
  static readonly LIST_ENTRANCE: Curve = Curve.EaseIn;
  static readonly EASE_IN_OUT: Curve = Curve.EaseInOut;
  static readonly EASE_OUT: Curve = Curve.EaseOut;
}

export class AppDuration {
  static readonly FAST: number = 180;
  static readonly NORMAL: number = 320;
  static readonly SLOW: number = 600;
  static readonly SLOWER: number = 1100;
}

// ============================================================
// 阅读背景色预设 [Spec §4.2]
// ============================================================

export interface ReadingTheme {
  name: string;
  backgroundColor: string;
  textColor: string;
}

export const READING_THEMES: ReadingTheme[] = [
  { name: "白色", backgroundColor: "#FFFFFF", textColor: "#1E1B2E" },
  { name: "米色", backgroundColor: "#F5F0E8", textColor: "#3D3326" },
  { name: "绿色", backgroundColor: "#C7EDCC", textColor: "#2D4A2D" },
  { name: "深灰", backgroundColor: "#2B2B2B", textColor: "#B0B0B0" },
  { name: "深褐", backgroundColor: "#1A1410", textColor: "#8A7A6A" },
  { name: "纯黑", backgroundColor: "#000000", textColor: "#888888" },
];

// ============================================================
// 底部导航栏配置
// ============================================================

export class NavBarConfig {
  static readonly HEIGHT: number = 64;
  static readonly COLLAPSED_HEIGHT: number = 48;
  static readonly ICON_SIZE: number = 24;
  static readonly LABEL_SIZE: number = 11;
  static readonly INDICATOR_WIDTH: number = 24;
  static readonly INDICATOR_HEIGHT: number = 3;
}

// ============================================================
// 动画时长别名（兼容旧引用）
// ============================================================

export class AppAnimation {
  static readonly DUR_FAST: number = 180;
  static readonly DUR_NORMAL: number = 320;
  static readonly DUR_SLOW: number = 600;
  static readonly DUR_SLOWER: number = 1100;
}
