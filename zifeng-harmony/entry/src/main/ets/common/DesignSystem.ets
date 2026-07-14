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
  "50": string;
  "100": string;
  "300": string;
  "400": string;
  "500": string;
  "600": string;
  "700": string;
  "900": string;
  gradient: [string, string]; // 400→600 渐变
}

/** 主题预设 */
export const THEME_PRESETS: Record<string, ThemeColorScale & { name: string }> =
  {
    purple: {
      "50": "#F5F3FF",
      "100": "#EDE9FE",
      "300": "#C4B5FD",
      "400": "#A78BFA",
      "500": "#8B5CF6",
      "600": "#7C3AED",
      "700": "#6D28D9",
      "900": "#4C1D95",
      gradient: ["#A78BFA", "#7C3AED"],
      name: "优雅紫",
    },
    green: {
      "50": "#F6FFED",
      "100": "#D9F7BE",
      "300": "#A0D911",
      "400": "#73D13D",
      "500": "#52C41A",
      "600": "#389E0D",
      "700": "#389E0D",
      "900": "#237804",
      gradient: ["#73D13D", "#389E0D"],
      name: "清新绿",
    },
    orange: {
      "50": "#FFF7E6",
      "100": "#FFE7BA",
      "300": "#FFD591",
      "400": "#FFA940",
      "500": "#FA8C16",
      "600": "#D46B08",
      "700": "#D46B08",
      "900": "#874D00",
      gradient: ["#FFA940", "#D46B08"],
      name: "活力橙",
    },
    red: {
      "50": "#FFF1F0",
      "100": "#FFCCC7",
      "300": "#FFA39E",
      "400": "#FF4D4F",
      "500": "#F5222D",
      "600": "#CF1322",
      "700": "#CF1322",
      "900": "#820014",
      gradient: ["#FF4D4F", "#CF1322"],
      name: "热情红",
    },
    blue: {
      "50": "#E6F7FF",
      "100": "#BAE7FF",
      "300": "#91D5FF",
      "400": "#40A9FF",
      "500": "#1890FF",
      "600": "#096DD9",
      "700": "#096DD9",
      "900": "#003A8C",
      gradient: ["#40A9FF", "#096DD9"],
      name: "经典蓝",
    },
  };

/** 跨主题统一的强调色 */
export class AccentColors {
  static readonly MAGENTA = "#EC4899"; // 高亮、热搜榜
  static readonly CYAN = "#06B6D4"; // 信息提示、更新榜
  static readonly AMBER = "#F59E0B"; // 警告、完本榜
  static readonly EMERALD = "#10B981"; // 成功、在读状态
  static readonly ROSE = "#F43F5E"; // 危险、删除操作

  /** 榜单强调色映射 */
  static readonly RANK_ACCENTS: Record<string, string> = {
    mustRead: "#FAAD14", // 必读榜 - 金色
    potential: "#13C2C2", // 潜力榜 - 薄荷绿
    completed: "#52C41A", // 完本榜 - 翠绿
    updated: "#FA8C16", // 更新榜 - 橙黄
    search: "#F5222D", // 热搜榜 - 朱红
    comment: "#722ED1", // 评论榜 - 深紫
  };
}

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

/** 浅色模式中性色 */
export const LIGHT_NEUTRAL: Record<NeutralToken, string> = {
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
export const DARK_NEUTRAL: Record<NeutralToken, string> = {
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
  lightEffect: boolean;
}

/** 场景→材质映射表 [Spec §1.2] */
export const MATERIAL_PRESETS: Record<string, MaterialConfig> = {
  FLOATING: {
    // 浮动工具栏/浮窗
    style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
    applyShadow: true,
    interactive: true,
    lightEffect: true,
  },
  INPUT: {
    // 搜索框/输入面板
    style: uiMaterial.ImmersiveStyle.THIN,
    materialColor: THEME_PRESETS.purple["50"], // 运行时由 ThemeManager 动态注入
    applyShadow: true,
    interactive: false,
    lightEffect: false,
  },
  CARD: {
    // 卡片/列表项
    style: uiMaterial.ImmersiveStyle.REGULAR,
    applyShadow: true,
    interactive: true,
    lightEffect: false,
  },
  NAV_BAR: {
    // 底部导航栏/Tab
    style: uiMaterial.ImmersiveStyle.THICK,
    materialColor: THEME_PRESETS.purple["50"],
    applyShadow: true,
    interactive: false,
    lightEffect: false,
  },
  MODAL: {
    // 模态弹窗背景
    style: uiMaterial.ImmersiveStyle.ULTRA_THICK,
    applyShadow: true,
    interactive: false,
    lightEffect: false,
  },
};

// ============================================================
// 1.3 字体规范
// ============================================================

export class AppTypography {
  static readonly SIZE_DISPLAY = 32;
  static readonly SIZE_H1 = 28;
  static readonly SIZE_H2 = 24;
  static readonly SIZE_H3 = 20;
  static readonly SIZE_H4 = 18;
  static readonly SIZE_BODY_LARGE = 16;
  static readonly SIZE_BODY = 14;
  static readonly SIZE_BODY_SMALL = 13;
  static readonly SIZE_CAPTION = 12;
  static readonly SIZE_TINY = 10;

  static readonly WEIGHT_LIGHT = FontWeight.Lighter;
  static readonly WEIGHT_REGULAR = FontWeight.Normal;
  static readonly WEIGHT_MEDIUM = FontWeight.Medium;
  static readonly WEIGHT_SEMIBOLD = FontWeight.Bolder;
  static readonly WEIGHT_BOLD = FontWeight.Bold;

  static readonly LINE_HEIGHT_TIGHT = 1.2;
  static readonly LINE_HEIGHT_NORMAL = 1.5;
  static readonly LINE_HEIGHT_LOOSE = 1.8;

  /** 阅读正文字号范围（用户可调） */
  static readonly READING_SIZE_MIN = 16;
  static readonly READING_SIZE_MAX = 24;
  static readonly READING_SIZE_DEFAULT = 18;
  static readonly READING_LINE_HEIGHT_MIN = 1.6;
  static readonly READING_LINE_HEIGHT_MAX = 2.0;
  static readonly READING_LINE_HEIGHT_DEFAULT = 1.8;
}

// ============================================================
// 1.4 间距与圆角
// ============================================================

export class AppSpacing {
  static readonly S1 = 4;
  static readonly S2 = 8;
  static readonly S3 = 12;
  static readonly S4 = 16;
  static readonly S5 = 20;
  static readonly S6 = 24;
  static readonly S8 = 32;
  static readonly S10 = 40;
  static readonly S12 = 48;
  static readonly S16 = 64;
}

export class AppRadius {
  static readonly R_SM = 8;
  static readonly R_MD = 12;
  static readonly R_LG = 16;
  static readonly R_XL = 22;
  static readonly R_FULL = 999;
}

// ============================================================
// 1.5 动效规范
// ============================================================

export class AppCurves {
  static readonly MICRO = curves.easeOutCubic;
  static readonly PAGE_TRANSITION = curves.interpolatingSpring(
    0.5,
    0.5,
    0.6,
    0.7,
  );
  static readonly SPRING = curves.springMotion(0.6, 0.8);
  static readonly LIST_ENTRANCE = curves.responsiveSpringMotion(0.4, 0.6);
  static readonly EASE_IN_OUT = Curve.EaseInOut;
  static readonly EASE_OUT = Curve.EaseOut;
}

export class AppDuration {
  static readonly FAST = 180;
  static readonly NORMAL = 320;
  static readonly SLOW = 600;
  static readonly SLOWER = 1100;
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
  static readonly HEIGHT = 64;
  static readonly COLLAPSED_HEIGHT = 48;
  static readonly ICON_SIZE = 24;
  static readonly LABEL_SIZE = 11;
  static readonly INDICATOR_WIDTH = 24;
  static readonly INDICATOR_HEIGHT = 3;
}
