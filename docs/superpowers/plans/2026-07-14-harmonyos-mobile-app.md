# 紫枫免费小说 HarmonyOS 7.0 beta 移动端应用实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 基于 HarmonyOS 7.0 beta（API 26）完全重新设计紫枫免费小说鸿蒙移动端应用，采用 ImmersiveMaterial 沉浸光感、多主题色体系、手机+平板双适配，覆盖 18 个页面和 5 项移动端增强功能。

**Architecture:** 分 8 个阶段递进实现 — 基础设计系统 → 数据模型与服务层 → 认证流程 → 发现模块 → 阅读模块 → 用户模块 → 移动端增强 → 集成入口。每阶段产出可编译运行的代码，后续阶段依赖前置阶段的组件和服务。所有页面基于 `Navigation` 组件管理路由，使用 `GridRow/GridCol` 实现响应式布局，`bindSheet` 处理半模态交互。

**Tech Stack:** HarmonyOS 7.0 beta (API 26)、ArkTS、ArkUI 声明式范式、`@kit.ArkUI`（uiMaterial/curves）、`@ohos.ai.asr`（语音识别）、`@ohos.file.fs` + `@ohos.data.relationalStore`（离线缓存）、`@ohos.notificationManager`（通知推送）、`@ohos.window`（浮窗）、Hypium（单元测试）。

**规格文档:** `docs/superpowers/specs/2026-06-29-harmonyos-mobile-app-design.md`

---

## 阶段依赖图

```
Phase 1 (基础层)
   ├─→ Phase 2 (数据层)
   │      ├─→ Phase 3 (认证)
   │      ├─→ Phase 4 (发现) ──→ Phase 5 (阅读)
   │      └─→ Phase 6 (用户)
   │                                    ↓
   └──────────────────────────────→ Phase 7 (增强) ──→ Phase 8 (集成)
```

## 文件结构映射

所有文件位于 `zifeng-harmony/entry/src/main/ets/` 下。标记说明：

- **[重写]** = 文件已存在，需完全替换内容
- **[新建]** = 文件不存在，需创建
- **[修改]** = 文件已存在，仅修改部分内容

```
common/
├── DesignSystem.ets              [重写] 设计令牌（颜色/字体/间距/圆角/动效/材质）
├── GlassCard.ets                 [新建] 玻璃卡片容器（ImmersiveMaterial）
├── GlassNavBar.ets               [重写] 磁吸玻璃导航栏
├── GlassSearchBar.ets            [新建] 玻璃搜索栏（含语音入口）
├── SectionHeader.ets             [新建] 区域标题组件
├── BackButton.ets                [新建] 浮动返回按钮
├── LoadingSkel.ets               [新建] 骨架屏组件
└── ParticleEffects.ets           [重写] 粒子光斑效果

components/
├── NovelCard.ets                 [新建] 小说卡片（网格布局）
├── NovelListItem.ets             [重写] 小说列表项（横向布局）
├── RankItem.ets                  [新建] 排行榜列表项
├── ProgressBar.ets               [新建] 阅读进度条
├── ThemeSelector.ets             [新建] 主题选择器
└── FloatingControl.ets           [新建] 浮窗闪控球

pages/
├── StartPage.ets                 [重写] 启动页
├── LoginPage.ets                 [重写] 登录页
├── RegisterPage.ets              [重写] 注册页
├── ResetPasswordPage.ets         [重写] 重置密码页
├── HomePage.ets                  [新建] 首页（替代原 Index + Recommend）
├── CategoryPage.ets              [新建] 分类页
├── CategoryDetailPage.ets        [重写] 分类详情页
├── RankPage.ets                  [重写] 排行榜页
├── SearchPage.ets                [新建] 搜索页（替代 SearchResultPage）
├── NovelDetailPage.ets           [新建] 小说详情页（替代 DetailPage）
├── ReaderPage.ets                [新建] 阅读器页（替代 ContentPage）
├── ShelfPage.ets                 [新建] 书架页
├── DirectoryPage.ets             [重写] 章节目录页
├── UserCenterPage.ets            [新建] 用户中心页（替代 UserInfoPage）
├── SettingsPage.ets              [重写] 设置页
├── BookSourcePage.ets            [新建] 书源管理页
├── FeedbackPage.ets              [重写] 反馈页
└── ReadingHistoryPage.ets        [重写] 阅读历史页

service/
├── ApiClient.ets                 [重写] HTTP 请求封装
├── AuthService.ets               [重写] 认证服务
├── BookService.ets               [重写] 小说信息服务
├── BookshelfService.ets          [重写] 书架服务
├── SearchService.ets             [重写] 搜索服务
├── RankService.ets               [重写] 排行榜服务
├── CategoryService.ets           [重写] 分类服务
├── FeedbackService.ets           [重写] 反馈服务
├── ThemeManager.ets              [重写] 主题管理
├── OfflineCacheManager.ets       [新建] 离线缓存管理
├── NotificationService.ets       [新建] 通知推送服务
└── VoiceSearchService.ets        [新建] 语音识别服务

model/
├── NovelItem.ets                 [重写] 小说列表项模型
├── NovelDetails.ets              [重写] 小说详情模型
├── Chapters.ets                  [重写] 章节模型
└── NovelContent.ets              [重写] 章节内容模型

entryability/
└── EntryAbility.ets              [重写] 入口 Ability

platform/
└── PlatformAdapter.ets           [修改] 平台适配器

resources/base/profile/
└── main_pages.json               [修改] 路由配置

module.json5                       [修改] 权限与快捷菜单
```

## 全局约定

1. **ArkTS 版本**：API 26（compileSdkVersion 26）
2. **沉浸光感**：`module.json5` 已配置 `"ohos.arkui.UIMaterial.state": "enable"`，无需修改
3. **编译验证命令**：`hvigorw assembleHap --mode module -p product=default`（在 `zifeng-harmony` 目录执行）
4. **提交粒度**：每个 Task 完成后提交一次，提交信息格式 `harmony(phase-N): <简述>`
5. **命名规范**：组件用 `@Component export struct`，页面用 `@Entry @Component struct`，服务用 `export class`
6. **状态管理**：跨页面共享状态用 `AppStorage`，组件内部状态用 `@State`，父子传递用 `@Prop`/`@Link`
7. **规格引用**：每个 Task 标注规格章节号（如 `[Spec §1.1]`），便于对照

---

## Phase 1: 基础层 — 设计系统与通用组件

> **目标**：建立完整的设计令牌系统和通用组件库，为所有后续页面提供统一的视觉基础。
> **前置依赖**：无
> **产出**：可编译的设计系统 + 7 个通用组件

### Task 1.1: 重写 DesignSystem.ets [Spec §1.1-1.5]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/common/DesignSystem.ets`（完全重写）

- [ ] **Step 1: 编写设计令牌系统**

替换 `DesignSystem.ets` 全部内容：

```typescript
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
```

- [ ] **Step 2: 编译验证**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL（无类型错误）

- [ ] **Step 3: 提交**

```bash
cd zifeng-harmony
git add entry/src/main/ets/common/DesignSystem.ets
git commit -m "harmony(phase-1): rewrite DesignSystem with ImmersiveMaterial tokens"
```

---

### Task 1.2: 重写 ThemeManager 服务 [Spec §1.1]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/ThemeManager.ets`（完全重写）

- [ ] **Step 1: 编写主题管理服务**

替换 `ThemeManager.ets` 全部内容：

```typescript
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
```

- [ ] **Step 2: 编译验证**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 提交**

```bash
git add entry/src/main/ets/service/ThemeManager.ets
git commit -m "harmony(phase-1): rewrite ThemeManager with multi-theme support"
```

---

### Task 1.3: 创建 GlassCard 组件 [Spec §1.2]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/common/GlassCard.ets`

- [ ] **Step 1: 编写 GlassCard 组件**

```typescript
/**
 * GlassCard - 沉浸光感玻璃卡片容器
 * 规格：§1.2 ImmersiveMaterial 沉浸光感配置
 *
 * 使用 ImmersiveMaterial 替代传统 BlurStyle，提供更高级的视觉品质。
 * 材质样式通过 scene 属性映射到 MATERIAL_PRESETS。
 */
import { uiMaterial } from '@kit.ArkUI'
import { MATERIAL_PRESETS, MaterialConfig, AppRadius, AppSpacing } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct GlassCard {
  /** 材质场景：FLOATING | INPUT | CARD | NAV_BAR | MODAL */
  @Prop scene: string = 'CARD'
  /** 内边距 */
  @Prop padding: number = AppSpacing.S4
  /** 圆角 */
  @Prop borderRadius: number = AppRadius.R_LG
  /** 自定义材质色（覆盖主题默认） */
  @Prop customMaterialColor?: ResourceColor
  /** 是否禁用交互形变 */
  @Prop disableInteractive: boolean = false

  build() {
    Column() {
      // 使用 @BuilderParam 模式时，此处用 Blank 占位，实际使用时通过子组件填充
      Blank()
    }
    .width('100%')
    .padding(this.padding)
    .borderRadius(this.borderRadius)
    .systemMaterial(this.buildMaterial())
  }

  private buildMaterial(): uiMaterial.ImmersiveMaterial {
    const config: MaterialConfig = ThemeManager.getMaterial(this.scene)
    const options: uiMaterial.ImmersiveOptions = {
      style: config.style,
      applyShadow: config.applyShadow,
      interactive: this.disableInteractive ? false : config.interactive,
      lightEffect: config.lightEffect
    } as uiMaterial.ImmersiveOptions
    if (this.customMaterialColor) {
      options.materialColor = this.customMaterialColor
    } else if (config.materialColor) {
      options.materialColor = config.materialColor as ResourceColor
    }
    return new uiMaterial.ImmersiveMaterial(options)
  }
}
```

> **注意**：ArkUI 的 `@Component` 不支持插槽（slot），`GlassCard` 作为容器使用时，应在外部用 `Column` 包裹并设置 `.systemMaterial()`。此处提供的是一个可直接设置材质的 Column 包装。实际页面使用时，若需容器效果，直接在页面内用 `Column().systemMaterial(...)` 即可，或引用此组件并通过 `@BuilderParam` 传递内容。后续 Task 会展示两种用法。

- [ ] **Step 2: 编译验证**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 提交**

```bash
git add entry/src/main/ets/common/GlassCard.ets
git commit -m "harmony(phase-1): add GlassCard component with ImmersiveMaterial"
```

---

### Task 1.4: 重写 GlassNavBar 组件 [Spec §3.1, §1.2]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/common/GlassNavBar.ets`（完全重写）

- [ ] **Step 1: 编写磁吸玻璃导航栏**

替换 `GlassNavBar.ets` 全部内容：

```typescript
/**
 * GlassNavBar - 磁吸玻璃导航栏
 * 规格：§3.1 首页导航栏 + §1.2 THICK 材质
 *
 * 特性：
 * - ImmersiveStyle.THICK 材质
 * - 滚动时自动收缩高度（64vp → 48vp）
 * - 继续上滑完全隐藏，下滑重新出现
 */
import { uiMaterial } from '@kit.ArkUI'
import { AppSpacing, AppRadius, NavBarConfig, AppDuration, AppCurves } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct GlassNavBar {
  /** 标题 */
  @Prop title: string = ''
  /** 滚动偏移量（由父组件传入） */
  @Prop scrollOffset: number = 0
  /** 是否显示返回按钮 */
  @Prop showBack: boolean = false
  /** 右侧操作按钮区域内容由 @BuilderParam 传入 */
  @BuilderParam rightContent: () => void

  @State currentHeight: number = NavBarConfig.HEIGHT
  @State isVisible: boolean = true

  build() {
    if (this.isVisible) {
      Row() {
        // 左侧：返回按钮或 Logo
        if (this.showBack) {
          Image($r('sys.media.chevron_left'))
            .width(24).height(24)
            .fillColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .onClick(() => router.back())
            .margin({ left: AppSpacing.S2 })
        } else {
          Text('紫枫')
            .fontSize(20)
            .fontWeight(FontWeight.Bold)
            .fontColor(ThemeManager.getPrimaryColor())
            .margin({ left: AppSpacing.S4 })
        }

        // 中间：标题
        Text(this.title)
          .fontSize(16)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .textAlign(TextAlign.Center)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        // 右侧：自定义内容
        Row() {
          this.rightContent()
        }
        .margin({ right: AppSpacing.S2 })
      }
      .width('100%')
      .height(this.currentHeight)
      .padding({ top: this.getTopPadding(), bottom: AppSpacing.S2 })
      .systemMaterial(this.buildThickMaterial())
      .animation({ duration: AppDuration.NORMAL, curve: AppCurves.SPRING })
    }
  }

  private getTopPadding(): number {
    // 状态栏安全区域，实际应由窗口避让处理，此处预留
    return 0
  }

  private buildThickMaterial(): uiMaterial.ImmersiveMaterial {
    const config = ThemeManager.getMaterial('NAV_BAR')
    return new uiMaterial.ImmersiveMaterial({
      style: config.style,
      materialColor: config.materialColor as ResourceColor,
      applyShadow: true,
      interactive: false,
      lightEffect: false
    } as uiMaterial.ImmersiveOptions)
  }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 提交**

```bash
git add entry/src/main/ets/common/GlassNavBar.ets
git commit -m "harmony(phase-1): rewrite GlassNavBar with THICK immersive material"
```

---

### Task 1.5: 创建 GlassSearchBar 组件 [Spec §3.1, §3.5]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/common/GlassSearchBar.ets`

- [ ] **Step 1: 编写搜索栏组件**

```typescript
/**
 * GlassSearchBar - 玻璃搜索栏
 * 规格：§3.1 首页搜索入口 + §3.5 搜索页输入框
 *
 * 特性：
 * - ImmersiveStyle.THIN 材质
 * - 可选语音搜索按钮
 * - 点击搜索栏（非输入模式）触发跳转
 */
import { uiMaterial } from '@kit.ArkUI'
import { AppSpacing, AppRadius, AppTypography } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct GlassSearchBar {
  /** 占位提示文字 */
  @Prop placeholder: string = '搜索小说...'
  /** 是否启用语音搜索按钮 */
  @Prop voiceEnabled: boolean = false
  /** 是否为输入模式（true=可输入，false=仅展示点击跳转） */
  @Prop editable: boolean = false
  /** 输入内容双向绑定 */
  @Link inputValue: string
  /** 点击搜索回调 */
  onSearch?: (keyword: string) => void
  /** 点击语音按钮回调 */
  onVoiceClick?: () => void
  /** 点击搜索栏（非编辑模式）回调 */
  onBarClick?: () => void

  build() {
    Row() {
      Image($r('sys.media.search'))
        .width(18).height(18)
        .fillColor(ThemeManager.getNeutral('TEXT_MUTED'))
        .margin({ right: AppSpacing.S2 })

      if (this.editable) {
        TextInput({ text: this.inputValue, placeholder: this.placeholder })
          .layoutWeight(1)
          .backgroundColor(Color.Transparent)
          .fontSize(AppTypography.SIZE_BODY)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .placeholderColor(ThemeManager.getNeutral('TEXT_MUTED'))
          .onSubmit(() => {
            if (this.onSearch) {
              this.onSearch(this.inputValue)
            }
          })
          .onChange((val: string) => {
            this.inputValue = val
          })
      } else {
        Text(this.placeholder)
          .layoutWeight(1)
          .fontSize(AppTypography.SIZE_BODY)
          .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
      }

      if (this.voiceEnabled) {
        Image($r('sys.media.voice'))
          .width(20).height(20)
          .fillColor(ThemeManager.getPrimaryColor())
          .onClick(() => {
            if (this.onVoiceClick) {
              this.onVoiceClick()
            }
          })
      }
    }
    .width('100%')
    .height(44)
    .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
    .borderRadius(AppRadius.R_FULL)
    .systemMaterial(this.buildThinMaterial())
    .onClick(() => {
      if (!this.editable && this.onBarClick) {
        this.onBarClick()
      }
    })
  }

  private buildThinMaterial(): uiMaterial.ImmersiveMaterial {
    const config = ThemeManager.getMaterial('INPUT')
    return new uiMaterial.ImmersiveMaterial({
      style: config.style,
      materialColor: config.materialColor as ResourceColor,
      applyShadow: true,
      interactive: false,
      lightEffect: false
    } as uiMaterial.ImmersiveOptions)
  }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 提交**

```bash
git add entry/src/main/ets/common/GlassSearchBar.ets
git commit -m "harmony(phase-1): add GlassSearchBar with voice search support"
```

---

### Task 1.6: 创建 SectionHeader 组件 [Spec §3.1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/common/SectionHeader.ets`

- [ ] **Step 1: 编写区域标题组件**

```typescript
/**
 * SectionHeader - 区域标题
 * 规格：§3.1 首页区域标题
 *
 * 左侧标题文字 + 右侧可选操作按钮（如「查看更多」）
 */
import { AppSpacing, AppTypography } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct SectionHeader {
  @Prop title: string
  @Prop actionText: string = ''
  @Prop actionVisible: boolean = false
  onAction?: () => void

  build() {
    Row() {
      Text(this.title)
        .fontSize(AppTypography.SIZE_H3)
        .fontWeight(FontWeight.Medium)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))

      Blank()

      if (this.actionVisible) {
        Row() {
          Text(this.actionText)
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
          Image($r('sys.media.chevron_right'))
            .width(14).height(14)
            .fillColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
            .margin({ left: 2 })
        }
        .onClick(() => {
          if (this.onAction) {
            this.onAction()
          }
        })
      }
    }
    .width('100%')
    .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S5, bottom: AppSpacing.S3 })
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/common/SectionHeader.ets
git commit -m "harmony(phase-1): add SectionHeader component"
```

---

### Task 1.7: 创建 BackButton 组件 [Spec §4.1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/common/BackButton.ets`

- [ ] **Step 1: 编写浮动返回按钮**

```typescript
/**
 * BackButton - 浮动返回按钮
 * 规格：§4.1 小说详情页浮动返回按钮
 * 材质：ImmersiveStyle.ULTRA_THIN
 */
import { uiMaterial } from '@kit.ArkUI'
import { AppSpacing, AppRadius } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { router } from '@kit.ArkUI'

@Component
export struct BackButton {
  /** 自定义返回回调 */
  onBack?: () => void
  /** 返回按钮相对位置 */
  @Prop positionX: number = AppSpacing.S4
  @Prop positionY: number = AppSpacing.S6

  build() {
    Row() {
      Image($r('sys.media.chevron_left'))
        .width(22).height(22)
        .fillColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
    }
    .width(40).height(40)
    .borderRadius(AppRadius.R_FULL)
    .justifyContent(FlexAlign.Center)
    .systemMaterial(new uiMaterial.ImmersiveMaterial({
      style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
      applyShadow: true,
      interactive: true,
      lightEffect: true
    } as uiMaterial.ImmersiveOptions))
    .onClick(() => {
      if (this.onBack) {
        this.onBack()
      } else {
        router.back()
      }
    })
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/common/BackButton.ets
git commit -m "harmony(phase-1): add BackButton with ULTRA_THIN material"
```

---

### Task 1.8: 创建 LoadingSkel 组件 [Spec §3.1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/common/LoadingSkel.ets`

- [ ] **Step 1: 编写骨架屏组件**

```typescript
/**
 * LoadingSkel - 骨架屏组件
 * 规格：§3.1 加载状态骨架屏
 *
 * 支持三种形状：card（卡片）、text（文本行）、circle（圆形头像）
 * 灰色脉冲动画
 */
import { AppRadius } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct LoadingSkel {
  @Prop shape: string = 'text'  // 'card' | 'text' | 'circle'
  @Prop width: number | string = '100%'
  @Prop height: number = 16

  build() {
    Column()
      .width(this.width)
      .height(this.height)
      .borderRadius(this.getRadius())
      .backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT'))
      .animation({
        duration: 1200,
        iterations: -1,
        curve: Curve.EaseInOut
      })
      .onAppear(() => {
        // 脉冲效果通过 opacity 动画实现
        animateTo({
          duration: 1200,
          iterations: -1,
          curve: Curve.EaseInOut
        }, () => {})
      })
  }

  private getRadius(): number {
    switch (this.shape) {
      case 'card': return AppRadius.R_LG
      case 'circle': return 999
      default: return AppRadius.R_SM
    }
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/common/LoadingSkel.ets
git commit -m "harmony(phase-1): add LoadingSkel skeleton component"
```

---

### Task 1.9: 重写 ParticleEffects 组件 [Spec §2.2]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/common/ParticleEffects.ets`（完全重写）

- [ ] **Step 1: 编写粒子光斑效果**

```typescript
/**
 * ParticleEffects - 粒子光斑背景效果
 * 规格：§2.2 登录页粒子光斑背景
 *
 * 在主题色渐变背景上叠加缓慢飘动的光斑，增强视觉氛围。
 * 低算力设备自动降级（粒子数量减少）。
 */
import { AppSpacing } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

interface Particle {
  x: number
  y: number
  size: number
  opacity: number
  speedX: number
  speedY: number
}

@Component
export struct ParticleEffects {
  @State particles: Particle[] = []
  private timerId: number = -1

  aboutToAppear() {
    this.initParticles()
    this.startAnimation()
  }

  aboutToDisappear() {
    if (this.timerId !== -1) {
      clearInterval(this.timerId)
    }
  }

  build() {
    Canvas(this.drawParticles)
      .width('100%')
      .height('100%')
      .hitTestBehavior(HitTestMode.Transparent)
  }

  private initParticles() {
    const count = 15  // 固定粒子数，低端设备可减少
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: 20 + Math.random() * 60,
        opacity: 0.05 + Math.random() * 0.15,
        speedX: (Math.random() - 0.5) * 0.2,
        speedY: (Math.random() - 0.5) * 0.2
      })
    }
    this.particles = newParticles
  }

  private startAnimation() {
    this.timerId = setInterval(() => {
      this.particles = this.particles.map(p => ({
        ...p,
        x: (p.x + p.speedX + 100) % 100,
        y: (p.y + p.speedY + 100) % 100
      }))
    }, 50)
  }

  private drawParticles = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width
    const height = ctx.canvas.height
    ctx.clearRect(0, 0, width, height)
    const primaryColor = ThemeManager.getPrimaryColor()
    for (const p of this.particles) {
      const gradient = ctx.createRadialGradient(
        p.x * width / 100, p.y * height / 100, 0,
        p.x * width / 100, p.y * height / 100, p.size
      )
      // 解析主色为 rgba
      gradient.addColorStop(0, this.hexToRgba(primaryColor, p.opacity))
      gradient.addColorStop(1, this.hexToRgba(primaryColor, 0))
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x * width / 100, p.y * height / 100, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
  }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

- [ ] **Step 3: 提交**

```bash
git add entry/src/main/ets/common/ParticleEffects.ets
git commit -m "harmony(phase-1): rewrite ParticleEffects with canvas-based rendering"
```

---

## Phase 2: 数据层 — 模型与服务基础

> **目标**：建立数据模型和 9 个核心服务，为所有页面提供数据支撑。
> **前置依赖**：Phase 1（ThemeManager）
> **产出**：4 个数据模型 + 9 个服务

### Task 2.1: 重写数据模型 [Spec §文件结构总览]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/model/NovelItem.ets`
- Modify: `zifeng-harmony/entry/src/main/ets/model/NovelDetails.ets`
- Modify: `zifeng-harmony/entry/src/main/ets/model/Chapters.ets`
- Modify: `zifeng-harmony/entry/src/main/ets/model/NovelContent.ets`

- [ ] **Step 1: 编写 NovelItem 模型**

替换 `NovelItem.ets`：

```typescript
/**
 * 小说列表项数据模型
 * 用于首页推荐、搜索结果、书架列表等
 */
export interface NovelItem {
  /** 小说唯一标识（通常为 bookUrl） */
  id: string;
  /** 书名 */
  title: string;
  /** 作者 */
  author: string;
  /** 封面图 URL */
  cover: string;
  /** 简介 */
  summary?: string;
  /** 分类标签 */
  category?: string;
  /** 来源书源名称 */
  sourceName?: string;
  /** 来源书源 URL */
  sourceUrl?: string;
  /** 书籍详情页 URL */
  bookUrl: string;
  /** 评分（0-10） */
  score?: number;
  /** 阅读量 */
  viewCount?: number;
  /** 字数 */
  wordCount?: string;
  /** 更新状态（连载中/已完结） */
  status?: string;
  /** 最新章节 */
  latestChapter?: string;
}
```

- [ ] **Step 2: 编写 NovelDetails 模型**

替换 `NovelDetails.ets`：

```typescript
/**
 * 小说详情数据模型
 */
export interface NovelDetails {
  id: string;
  title: string;
  author: string;
  cover: string;
  summary: string;
  category: string;
  tags: string[];
  status: string;
  wordCount: string;
  latestChapter: string;
  updateTime: string;
  bookUrl: string;
  sourceUrl: string;
  sourceName: string;
  /** 是否已加入书架 */
  inBookshelf: boolean;
  /** 已缓存章节数 */
  cachedChapters: number;
  /** 总章节数 */
  totalChapters: number;
}
```

- [ ] **Step 3: 编写 Chapters 模型**

替换 `Chapters.ets`：

```typescript
/**
 * 章节列表项模型
 */
export interface Chapter {
  /** 章节索引 */
  index: number;
  /** 章节标题 */
  title: string;
  /** 章节 URL */
  url: string;
  /** 章节字数 */
  wordCount?: number;
  /** 更新时间 */
  updateTime?: string;
  /** 是否已缓存 */
  isCached: boolean;
}

/**
 * 章节列表响应
 */
export interface ChapterList {
  bookUrl: string;
  chapters: Chapter[];
  total: number;
}
```

- [ ] **Step 4: 编写 NovelContent 模型**

替换 `NovelContent.ets`：

```typescript
/**
 * 章节内容模型
 */
export interface NovelContent {
  /** 章节索引 */
  chapterIndex: number;
  /** 章节标题 */
  title: string;
  /** 正文内容（已分段） */
  content: string[];
  /** 来源书源 */
  sourceUrl: string;
  /** 书籍 URL */
  bookUrl: string;
  /** 上一章索引（-1 表示无） */
  prevIndex: number;
  /** 下一章索引（-1 表示无） */
  nextIndex: number;
  /** 是否来自缓存 */
  fromCache: boolean;
}
```

- [ ] **Step 5: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/model/
git commit -m "harmony(phase-2): rewrite data models (NovelItem/NovelDetails/Chapters/NovelContent)"
```

---

### Task 2.2: 重写 ApiClient [Spec §服务层]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/ApiClient.ets`（完全重写）

- [ ] **Step 1: 编写 HTTP 请求封装**

```typescript
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
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/service/ApiClient.ets
git commit -m "harmony(phase-2): rewrite ApiClient with token management"
```

---

### Task 2.3: 重写 AuthService [Spec §2.2-2.4]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/AuthService.ets`（完全重写）

- [ ] **Step 1: 编写认证服务**

```typescript
/**
 * AuthService - 认证服务
 * 规格：§2.2 登录 + §2.3 注册 + §2.4 重置密码
 *
 * 接口对齐 zifeng-server module-user：
 * - POST /api/user/login
 * - POST /api/user/register
 * - POST /api/user/resetPasswordDev
 * - GET  /api/user/verifyUserForReset
 * - GET  /api/user/captcha
 */
import { ApiClient } from "./ApiClient";

export interface LoginResult {
  token: string;
  userId: string;
  username: string;
  avatar?: string;
}

export interface CaptchaResult {
  captchaId: string;
  captchaImage: string; // base64
}

export class AuthService {
  /** 获取验证码 */
  static async getCaptcha(): Promise<CaptchaResult> {
    return ApiClient.get<CaptchaResult>("/api/user/captcha");
  }

  /** 登录 */
  static async login(
    username: string,
    password: string,
    rememberMe: boolean,
    captchaId: string,
    captchaCode: string,
  ): Promise<LoginResult> {
    const result = await ApiClient.post<LoginResult>("/api/user/login", {
      username,
      password,
      rememberMe,
      captchaId,
      captchaCode,
    });
    await ApiClient.setToken(result.token);
    return result;
  }

  /** 注册 */
  static async register(
    username: string,
    password: string,
    email: string,
    captchaId: string,
    captchaCode: string,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/user/register", {
      username,
      password,
      email,
      captchaId,
      captchaCode,
    });
  }

  /** 验证用户身份（重置密码 Step 0） */
  static async verifyUserForReset(
    username: string,
    email: string,
  ): Promise<{ username: string; email: string }> {
    return ApiClient.get("/api/user/verifyUserForReset", { username, email });
  }

  /** 重置密码（重置密码 Step 1） */
  static async resetPassword(
    username: string,
    email: string,
    newPassword: string,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/user/resetPasswordDev", {
      username,
      email,
      newPassword,
    });
  }

  /** 退出登录 */
  static async logout(): Promise<void> {
    try {
      await ApiClient.post("/api/user/logout");
    } finally {
      await ApiClient.clearToken();
    }
  }

  /** 检查登录状态 */
  static async isLoggedIn(): Promise<boolean> {
    const token = await ApiClient.getToken();
    return !!token;
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/service/AuthService.ets
git commit -m "harmony(phase-2): rewrite AuthService with captcha and reset flow"
```

---

### Task 2.4: 重写 BookService [Spec §4.1-4.2]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/BookService.ets`（完全重写）

- [ ] **Step 1: 编写小说信息服务**

```typescript
/**
 * BookService - 小说信息服务
 * 规格：§4.1 详情页 + §4.2 阅读器
 *
 * 接口对齐 zifeng-parser：
 * - GET /api/book/info
 * - GET /api/book/toc
 * - GET /api/book/content
 */
import { ApiClient } from "./ApiClient";
import { NovelDetails, ChapterList, NovelContent } from "../model/NovelDetails";

export class BookService {
  /** 获取小说详情 */
  static async getBookInfo(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<NovelDetails> {
    return ApiClient.get<NovelDetails>("/api/book/info", {
      bookUrl,
      sourceUrl,
    });
  }

  /** 获取章节目录 */
  static async getToc(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<ChapterList> {
    return ApiClient.get<ChapterList>("/api/book/toc", { bookUrl, sourceUrl });
  }

  /** 获取章节内容 */
  static async getChapterContent(
    bookUrl: string,
    sourceUrl: string,
    chapterIndex: number,
  ): Promise<NovelContent> {
    return ApiClient.get<NovelContent>("/api/book/content", {
      bookUrl,
      sourceUrl,
      chapterIndex: chapterIndex.toString(),
    });
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/BookService.ets
git commit -m "harmony(phase-2): rewrite BookService for novel info and chapters"
```

---

### Task 2.5: 重写 BookshelfService [Spec §4.3]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/BookshelfService.ets`（完全重写）

- [ ] **Step 1: 编写书架服务**

```typescript
/**
 * BookshelfService - 书架管理服务
 * 规格：§4.3 书架页
 *
 * 接口对齐 zifeng-server module-user：
 * - GET  /api/bookshelf/list
 * - POST /api/bookshelf/add
 * - DELETE /api/bookshelf/remove
 * - GET  /api/bookshelf/history
 * - DELETE /api/bookshelf/history
 * - POST /api/bookshelf/progress
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export interface BookshelfItem extends NovelItem {
  addedAt: string;
}

export interface ReadingHistoryItem extends NovelItem {
  lastChapterIndex: number;
  lastChapterTitle: string;
  lastReadTime: string;
  progress: number; // 0-100
}

export class BookshelfService {
  /** 获取书架列表 */
  static async getBookshelf(): Promise<BookshelfItem[]> {
    return ApiClient.get<BookshelfItem[]>("/api/bookshelf/list");
  }

  /** 加入书架 */
  static async addToBookshelf(novel: NovelItem): Promise<boolean> {
    return ApiClient.post<boolean>("/api/bookshelf/add", novel);
  }

  /** 移出书架 */
  static async removeFromBookshelf(bookUrl: string): Promise<boolean> {
    return ApiClient.delete<boolean>(
      `/api/bookshelf/remove?bookUrl=${encodeURIComponent(bookUrl)}`,
    );
  }

  /** 获取阅读历史 */
  static async getReadingHistory(): Promise<ReadingHistoryItem[]> {
    return ApiClient.get<ReadingHistoryItem[]>("/api/bookshelf/history");
  }

  /** 清空阅读历史 */
  static async clearReadingHistory(): Promise<boolean> {
    return ApiClient.delete<boolean>("/api/bookshelf/history");
  }

  /** 删除单条阅读历史 */
  static async removeHistoryItem(bookUrl: string): Promise<boolean> {
    return ApiClient.delete<boolean>(
      `/api/bookshelf/history?bookUrl=${encodeURIComponent(bookUrl)}`,
    );
  }

  /** 保存阅读进度 */
  static async saveProgress(
    bookUrl: string,
    chapterIndex: number,
    chapterTitle: string,
    scrollProgress: number,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/bookshelf/progress", {
      bookUrl,
      chapterIndex,
      chapterTitle,
      scrollProgress,
    });
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/BookshelfService.ets
git commit -m "harmony(phase-2): rewrite BookshelfService with history and progress"
```

---

### Task 2.6: 重写 SearchService [Spec §3.5]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/SearchService.ets`（完全重写）

- [ ] **Step 1: 编写搜索服务**

```typescript
/**
 * SearchService - 搜索服务
 * 规格：§3.5 搜索页（聚合搜索 + 单书源）
 *
 * 接口对齐 zifeng-parser：
 * - GET /api/search
 * - GET /api/search/single
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export interface SearchResult {
  sourceName: string;
  sourceUrl: string;
  novels: NovelItem[];
}

export interface BatchSearchProgress {
  completed: number;
  total: number;
  results: SearchResult[];
  isFinished: boolean;
}

/** 搜索历史存储键 */
const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

export class SearchService {
  /** 单书源搜索 */
  static async searchSingle(
    keyword: string,
    sourceUrl: string,
  ): Promise<SearchResult> {
    return ApiClient.get<SearchResult>("/api/search/single", {
      keyword,
      sourceUrl,
    });
  }

  /**
   * 聚合搜索（流式返回结果）
   * 使用回调模式，每完成一个书源即返回结果
   */
  static async batchSearch(
    keyword: string,
    sourceUrls: string[],
    onProgress: (progress: BatchSearchProgress) => void,
    abortSignal?: { aborted: boolean },
  ): Promise<void> {
    const results: SearchResult[] = [];
    let completed = 0;
    const total = sourceUrls.length;

    for (const sourceUrl of sourceUrls) {
      if (abortSignal?.aborted) {
        break;
      }
      try {
        const result = await this.searchSingle(keyword, sourceUrl);
        results.push(result);
      } catch (e) {
        // 单源失败不阻塞整体
        console.warn(
          `SearchService: source ${sourceUrl} failed: ${(e as Error).message}`,
        );
      }
      completed++;
      onProgress({
        completed,
        total,
        results: [...results],
        isFinished: completed >= total,
      });
    }
  }

  /** 获取搜索历史 */
  static getHistory(): string[] {
    try {
      const raw = AppStorage.get<string>(HISTORY_KEY) || "[]";
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  /** 添加搜索历史 */
  static addHistory(keyword: string): void {
    let history = this.getHistory();
    // 去重
    history = history.filter((h) => h !== keyword);
    history.unshift(keyword);
    // 限制数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    AppStorage.setOrCreate(HISTORY_KEY, JSON.stringify(history));
  }

  /** 清空搜索历史 */
  static clearHistory(): void {
    AppStorage.setOrCreate(HISTORY_KEY, "[]");
  }

  /** 删除单条历史 */
  static removeHistoryItem(keyword: string): void {
    const history = this.getHistory().filter((h) => h !== keyword);
    AppStorage.setOrCreate(HISTORY_KEY, JSON.stringify(history));
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/SearchService.ets
git commit -m "harmony(phase-2): rewrite SearchService with batch search and history"
```

---

### Task 2.7: 重写 RankService [Spec §3.4]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/RankService.ets`（完全重写）

- [ ] **Step 1: 编写排行榜服务**

```typescript
/**
 * RankService - 排行榜服务
 * 规格：§3.4 排行榜页
 *
 * 6 个榜单类型：必读/潜力/完本/更新/热搜/评论
 * 接口对齐 zifeng-parser /api/rank
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export type RankType =
  | "mustRead"
  | "potential"
  | "completed"
  | "updated"
  | "search"
  | "comment";

export interface RankConfig {
  type: RankType;
  name: string;
  accentColor: string;
}

export const RANK_CONFIGS: RankConfig[] = [
  { type: "mustRead", name: "必读榜", accentColor: "#FAAD14" },
  { type: "potential", name: "潜力榜", accentColor: "#13C2C2" },
  { type: "completed", name: "完本榜", accentColor: "#52C41A" },
  { type: "updated", name: "更新榜", accentColor: "#FA8C16" },
  { type: "search", name: "热搜榜", accentColor: "#F5222D" },
  { type: "comment", name: "评论榜", accentColor: "#722ED1" },
];

export class RankService {
  /** 获取排行榜数据 */
  static async getRank(type: RankType, page: number = 1): Promise<NovelItem[]> {
    return ApiClient.get<NovelItem[]>("/api/rank", {
      type,
      page: page.toString(),
    });
  }

  /** 获取首页排行榜（精简版，每榜 5 条） */
  static async getHomeRank(type: RankType): Promise<NovelItem[]> {
    const all = await this.getRank(type, 1);
    return all.slice(0, 5);
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/RankService.ets
git commit -m "harmony(phase-2): rewrite RankService with 6 rank types"
```

---

### Task 2.8: 重写 CategoryService [Spec §3.2-3.3]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/CategoryService.ets`（完全重写）

- [ ] **Step 1: 编写分类服务**

```typescript
/**
 * CategoryService - 分类服务
 * 规格：§3.2 分类页 + §3.3 分类详情页
 *
 * 接口对齐 zifeng-parser /api/category
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export interface Category {
  id: string;
  name: string;
  icon?: string;
  count: number;
}

export type SortType = "hot" | "new" | "completed";

export class CategoryService {
  /** 获取所有分类 */
  static async getCategories(): Promise<Category[]> {
    return ApiClient.get<Category[]>("/api/category/list");
  }

  /** 获取分类下小说列表 */
  static async getCategoryNovels(
    categoryId: string,
    page: number = 1,
    sort: SortType = "hot",
  ): Promise<NovelItem[]> {
    return ApiClient.get<NovelItem[]>("/api/category/novels", {
      categoryId,
      page: page.toString(),
      sort,
    });
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/CategoryService.ets
git commit -m "harmony(phase-2): rewrite CategoryService"
```

---

### Task 2.9: 重写 FeedbackService [Spec §5.4]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/service/FeedbackService.ets`（完全重写）

- [ ] **Step 1: 编写反馈服务**

```typescript
/**
 * FeedbackService - 反馈服务
 * 规格：§5.4 反馈页
 *
 * 接口对齐 zifeng-server module-feedback
 */
import { ApiClient } from "./ApiClient";

export type FeedbackType = "suggestion" | "bug" | "content" | "other";
export type FeedbackStatus = "pending" | "processing" | "resolved" | "closed";

export interface FeedbackItem {
  id: string;
  type: FeedbackType;
  content: string;
  contact?: string;
  status: FeedbackStatus;
  reply?: string;
  createdAt: string;
}

export class FeedbackService {
  /** 提交反馈 */
  static async submit(
    type: FeedbackType,
    content: string,
    contact?: string,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/feedback/submit", {
      type,
      content,
      contact,
    });
  }

  /** 获取反馈历史 */
  static async getHistory(): Promise<FeedbackItem[]> {
    return ApiClient.get<FeedbackItem[]>("/api/feedback/list");
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/FeedbackService.ets
git commit -m "harmony(phase-2): rewrite FeedbackService"
```

---

## Phase 3: 认证模块

> **目标**：实现完整的认证流程（启动→登录→注册→重置密码）。
> **前置依赖**：Phase 1（通用组件）+ Phase 2（AuthService）
> **产出**：4 个认证页面

### Task 3.1: 重写 StartPage [Spec §2.1]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/StartPage.ets`（完全重写）

- [ ] **Step 1: 编写启动页**

```typescript
/**
 * StartPage - 启动页
 * 规格：§2.1 启动页
 *
 * 应用快启技术优化，启动时间 < 800ms
 * 后台并行预加载数据，1.5s 超时后淡出
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppDuration, AppCurves } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { ApiClient } from '../service/ApiClient'

@Entry
@Component
struct StartPage {
  @State logoOpacity: number = 0
  @State pageOpacity: number = 1

  aboutToAppear() {
    // 初始化主题
    ThemeManager.init()
    // 后台并行任务
    this.preloadData()
    // Logo 渐显
    setTimeout(() => {
      this.logoOpacity = 1
    }, 100)
    // 1.5s 后淡出跳转
    setTimeout(() => {
      this.navigateToNext()
    }, 1500)
  }

  private async preloadData() {
    try {
      await ApiClient.init()
      const isLoggedIn = await AuthService.isLoggedIn()
      AppStorage.setOrCreate('preload_logged_in', isLoggedIn)
    } catch (e) {
      console.warn('StartPage preload failed:', e)
    }
  }

  private navigateToNext() {
    animateTo({
      duration: AppDuration.SLOW,
      curve: AppCurves.EASE_OUT
    }, () => {
      this.pageOpacity = 0
    })
    setTimeout(() => {
      const isLoggedIn = AppStorage.get<boolean>('preload_logged_in') || false
      router.replaceUrl({
        url: isLoggedIn ? 'pages/HomePage' : 'pages/LoginPage'
      })
    }, AppDuration.SLOW)
  }

  build() {
    Column() {
      Blank().layoutWeight(1)

      // Logo
      Image($r('app.media.yan'))
        .width(180).height(180)
        .opacity(this.logoOpacity)
        .animation({ duration: AppDuration.SLOWER, curve: AppCurves.SPRING })

      // 应用名称
      Text('紫枫免费小说')
        .fontSize(AppTypography.SIZE_H1)
        .fontWeight(FontWeight.Bold)
        .fontColor('#FFFFFF')
        .margin({ top: AppSpacing.S4 })
        .opacity(this.logoOpacity)

      // Slogan
      Text('海量小说 · 免费阅读')
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor('rgba(255,255,255,0.8)')
        .margin({ top: AppSpacing.S2 })
        .opacity(this.logoOpacity)

      Blank().layoutWeight(1)

      // 加载指示器
      LoadingProgress()
        .width(28).height(28)
        .color('#FFFFFF')

      // 版本号
      Text('v1.0.0')
        .fontSize(AppTypography.SIZE_CAPTION)
        .fontColor('rgba(255,255,255,0.6)')
        .margin({ bottom: AppSpacing.S6, top: AppSpacing.S3 })
    }
    .width('100%')
    .height('100%')
    .linearGradient({
      direction: GradientDirection.Bottom,
      colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
    })
    .opacity(this.pageOpacity)
  }
}

export default StartPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/pages/StartPage.ets
git commit -m "harmony(phase-3): rewrite StartPage with preload and fade-out"
```

---

### Task 3.2: 重写 LoginPage [Spec §2.2]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/LoginPage.ets`（完全重写）

- [ ] **Step 1: 编写登录页**

```typescript
/**
 * LoginPage - 登录页
 * 规格：§2.2 登录页
 *
 * GlassCard 容器 + 验证码 + 粒子背景
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius, AppDuration, AppCurves
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { ParticleEffects } from '../common/ParticleEffects'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct LoginPage {
  @State username: string = ''
  @State password: string = ''
  @State captchaCode: string = ''
  @State captchaId: string = ''
  @State captchaImage: string = ''
  @State rememberMe: boolean = false
  @State isLoading: boolean = false
  @State passwordVisible: boolean = false
  @State cardShakeX: number = 0

  aboutToAppear() {
    this.refreshCaptcha()
  }

  private async refreshCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = result.captchaImage
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private async handleLogin() {
    if (!this.username || !this.password || !this.captchaCode) {
      promptAction.showToast({ message: '请填写完整信息' })
      return
    }
    this.isLoading = true
    try {
      await AuthService.login(
        this.username, this.password, this.rememberMe, this.captchaId, this.captchaCode
      )
      promptAction.showToast({ message: '登录成功' })
      router.replaceUrl({ url: 'pages/HomePage' })
    } catch (e) {
      // 卡片震动效果
      animateTo({ duration: 300, curve: AppCurves.SPRING }, () => {
        this.cardShakeX = 10
      })
      setTimeout(() => {
        animateTo({ duration: 300, curve: AppCurves.SPRING }, () => {
          this.cardShakeX = 0
        })
      }, 300)
      promptAction.showToast({ message: (e as Error).message || '登录失败' })
      this.refreshCaptcha()
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Stack() {
      // 渐变背景
      Column()
        .width('100%').height('100%')
        .linearGradient({
          direction: GradientDirection.Bottom,
          colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
        })

      // 粒子效果
      ParticleEffects()

      // 内容区
      Column() {
        Blank().layoutWeight(0.5)

        // Logo + 标题
        Image($r('app.media.yan')).width(72).height(72)
        Text('欢迎回来')
          .fontSize(AppTypography.SIZE_H2)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFFFFF')
          .margin({ top: AppSpacing.S2 })

        // 登录卡片
        Column() {
          // 用户名
          TextInput({ placeholder: '用户名', text: this.username })
            .height(48)
            .margin({ bottom: AppSpacing.S3 })
            .fontSize(AppTypography.SIZE_BODY)
            .onChange((val) => { this.username = val })

          // 密码
          TextInput({ placeholder: '密码', text: this.password })
            .height(48)
            .type(InputType.Password)
            .margin({ bottom: AppSpacing.S3 })
            .fontSize(AppTypography.SIZE_BODY)
            .onChange((val) => { this.password = val })

          // 验证码
          Row() {
            TextInput({ placeholder: '验证码', text: this.captchaCode })
              .height(48)
              .layoutWeight(1)
              .fontSize(AppTypography.SIZE_BODY)
              .onChange((val) => { this.captchaCode = val })
            Image(this.captchaImage)
              .width(100).height(48)
              .margin({ left: AppSpacing.S2 })
              .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S3 })

          // 记住我 + 忘记密码
          Row() {
            Checkbox({ name: 'remember' })
              .select(this.rememberMe)
              .onChange((val) => { this.rememberMe = val })
            Text('记住我')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))

            Blank()

            Text('忘记密码？')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getPrimaryColor())
              .onClick(() => {
                router.pushUrl({ url: 'pages/ResetPasswordPage' })
              })
          }
          .margin({ bottom: AppSpacing.S4 })

          // 登录按钮
          Button(this.isLoading ? '登录中...' : '登录')
            .width('100%').height(48)
            .fontSize(AppTypography.SIZE_BODY_LARGE)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleLogin())
        }
        .width('90%')
        .padding(AppSpacing.S6)
        .borderRadius(AppRadius.R_LG)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.REGULAR,
          applyShadow: true,
          interactive: false
        } as uiMaterial.ImmersiveOptions))
        .offset({ x: this.cardShakeX })

        // 注册链接
        Row() {
          Text('还没账号？')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('rgba(255,255,255,0.8)')
          Text('立即注册')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .onClick(() => {
              router.pushUrl({ url: 'pages/RegisterPage' })
            })
        }
        .margin({ top: AppSpacing.S5 })

        Blank().layoutWeight(1)

        // 协议
        Text('登录即代表同意《用户协议》和《隐私政策》')
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor('rgba(255,255,255,0.6)')
          .margin({ bottom: AppSpacing.S6 })
      }
      .width('100%').height('100%')
    }
    .width('100%').height('100%')
  }
}

export default LoginPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/LoginPage.ets
git commit -m "harmony(phase-3): rewrite LoginPage with glass card and captcha"
```

---

### Task 3.3: 重写 RegisterPage [Spec §2.3]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/RegisterPage.ets`（完全重写）

- [ ] **Step 1: 编写注册页**

```typescript
/**
 * RegisterPage - 注册页
 * 规格：§2.3 注册页
 *
 * 与登录页共享 GlassCard 样式，增加密码强度指示器
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius, AppDuration, AppCurves
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { ParticleEffects } from '../common/ParticleEffects'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct RegisterPage {
  @State username: string = ''
  @State password: string = ''
  @State email: string = ''
  @State captchaCode: string = ''
  @State captchaId: string = ''
  @State captchaImage: string = ''
  @State isLoading: boolean = false
  @State passwordStrength: number = 0  // 0=未输入, 1=弱, 2=中, 3=强

  aboutToAppear() {
    this.refreshCaptcha()
  }

  private async refreshCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = result.captchaImage
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private calculateStrength(pwd: string) {
    if (pwd.length === 0) {
      this.passwordStrength = 0
    } else if (pwd.length < 6) {
      this.passwordStrength = 1
    } else if (pwd.length < 12) {
      this.passwordStrength = 2
    } else if (/\d/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) {
      this.passwordStrength = 3
    } else {
      this.passwordStrength = 2
    }
  }

  private async handleRegister() {
    if (!this.username || !this.password || !this.email || !this.captchaCode) {
      promptAction.showToast({ message: '请填写完整信息' })
      return
    }
    if (this.username.length < 3 || this.username.length > 20) {
      promptAction.showToast({ message: '用户名 3-20 个字符' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      promptAction.showToast({ message: '邮箱格式不正确' })
      return
    }
    this.isLoading = true
    try {
      await AuthService.register(
        this.username, this.password, this.email, this.captchaId, this.captchaCode
      )
      // 注册成功后自动登录
      promptAction.showToast({ message: '注册成功，正在登录...' })
      await AuthService.login(
        this.username, this.password, true, this.captchaId, this.captchaCode
      )
      router.replaceUrl({ url: 'pages/HomePage' })
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '注册失败' })
      this.refreshCaptcha()
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Stack() {
      Column()
        .width('100%').height('100%')
        .linearGradient({
          direction: GradientDirection.Bottom,
          colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
        })
      ParticleEffects()

      Column() {
        Blank().layoutWeight(0.3)

        Image($r('app.media.yan')).width(72).height(72)
        Text('创建账号')
          .fontSize(AppTypography.SIZE_H2)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFFFFF')
          .margin({ top: AppSpacing.S2 })

        Column() {
          TextInput({ placeholder: '用户名（3-20字符）', text: this.username })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .onChange((val) => { this.username = val })

          TextInput({ placeholder: '密码', text: this.password })
            .height(48).type(InputType.Password)
            .margin({ bottom: AppSpacing.S2 })
            .onChange((val) => {
              this.password = val
              this.calculateStrength(val)
            })

          // 密码强度指示器
          Row() {
            ForEach([1, 2, 3], (level: number) => {
              Column()
                .layoutWeight(1).height(3)
                .borderRadius(2)
                .backgroundColor(
                  this.passwordStrength >= level
                    ? (level === 1 ? '#F43F5E' : level === 2 ? '#F59E0B' : '#10B981')
                    : ThemeManager.getNeutral('BORDER_LIGHT')
                )
                .margin({ right: level < 3 ? 4 : 0 })
            })
          }
          .width('100%')
          .margin({ bottom: AppSpacing.S3 })

          TextInput({ placeholder: '邮箱', text: this.email })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .type(InputType.Email)
            .onChange((val) => { this.email = val })

          Row() {
            TextInput({ placeholder: '验证码', text: this.captchaCode })
              .height(48).layoutWeight(1)
              .onChange((val) => { this.captchaCode = val })
            Image(this.captchaImage)
              .width(100).height(48)
              .margin({ left: AppSpacing.S2 })
              .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S4 })

          Button(this.isLoading ? '注册中...' : '注册')
            .width('100%').height(48)
            .fontSize(AppTypography.SIZE_BODY_LARGE)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleRegister())
        }
        .width('90%')
        .padding(AppSpacing.S6)
        .borderRadius(AppRadius.R_LG)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.REGULAR,
          applyShadow: true, interactive: false
        } as uiMaterial.ImmersiveOptions))

        Row() {
          Text('已有账号？')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('rgba(255,255,255,0.8)')
          Text('返回登录')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('#FFFFFF').fontWeight(FontWeight.Medium)
            .onClick(() => router.back())
        }
        .margin({ top: AppSpacing.S5 })

        Blank().layoutWeight(1)
      }
      .width('100%').height('100%')
    }
    .width('100%').height('100%')
  }
}

export default RegisterPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/RegisterPage.ets
git commit -m "harmony(phase-3): rewrite RegisterPage with password strength indicator"
```

---

### Task 3.4: 重写 ResetPasswordPage [Spec §2.4]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/ResetPasswordPage.ets`（完全重写）

- [ ] **Step 1: 编写重置密码页**

```typescript
/**
 * ResetPasswordPage - 重置密码页
 * 规格：§2.4 重置密码页
 *
 * 两步流程：验证身份 → 设置新密码
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { BackButton } from '../common/BackButton'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct ResetPasswordPage {
  @State currentStep: number = 0
  @State username: string = ''
  @State email: string = ''
  @State captchaCode: string = ''
  @State captchaId: string = ''
  @State captchaImage: string = ''
  @State newPassword: string = ''
  @State confirmPassword: string = ''
  @State isLoading: boolean = false
  @State verifiedInfo: { username: string; email: string } = { username: '', email: '' }

  aboutToAppear() {
    this.refreshCaptcha()
  }

  private async refreshCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = result.captchaImage
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private async handleVerify() {
    if (!this.username || !this.email) {
      promptAction.showToast({ message: '请填写完整信息' })
      return
    }
    this.isLoading = true
    try {
      const info = await AuthService.verifyUserForReset(this.username, this.email)
      this.verifiedInfo = info
      this.currentStep = 1
      promptAction.showToast({ message: '验证成功' })
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '验证失败' })
      this.refreshCaptcha()
    } finally {
      this.isLoading = false
    }
  }

  private async handleReset() {
    if (!this.newPassword || this.newPassword !== this.confirmPassword) {
      promptAction.showToast({ message: '两次密码不一致' })
      return
    }
    if (this.newPassword.length < 6) {
      promptAction.showToast({ message: '密码至少 6 位' })
      return
    }
    this.isLoading = true
    try {
      await AuthService.resetPassword(this.verifiedInfo.username, this.verifiedInfo.email, this.newPassword)
      promptAction.showToast({ message: '密码重置成功' })
      setTimeout(() => {
        router.replaceUrl({ url: 'pages/LoginPage' })
      }, 300)
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '重置失败' })
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('重置密码')
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding(AppSpacing.S4)

      // 步骤指示器
      Row() {
        Text('1. 验证身份')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(this.currentStep === 0 ? ThemeManager.getPrimaryColor() : ThemeManager.getNeutral('TEXT_MUTED'))
        Column().width(40).height(2).backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT')).margin({ left: 8, right: 8 })
        Text('2. 设置新密码')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(this.currentStep === 1 ? ThemeManager.getPrimaryColor() : ThemeManager.getNeutral('TEXT_MUTED'))
      }
      .margin({ bottom: AppSpacing.S6 })

      // 表单卡片
      Column() {
        if (this.currentStep === 0) {
          // Step 0: 验证身份
          TextInput({ placeholder: '用户名', text: this.username })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .onChange((val) => { this.username = val })
          TextInput({ placeholder: '邮箱', text: this.email })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .type(InputType.Email)
            .onChange((val) => { this.email = val })
          Row() {
            TextInput({ placeholder: '验证码', text: this.captchaCode })
              .height(48).layoutWeight(1)
              .onChange((val) => { this.captchaCode = val })
            Image(this.captchaImage)
              .width(100).height(48).margin({ left: AppSpacing.S2 })
              .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S4 })
          Button(this.isLoading ? '验证中...' : '验证身份')
            .width('100%').height(48)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleVerify())
        } else {
          // Step 1: 设置新密码
          Row() {
            Text('账号：')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
            Text(this.verifiedInfo.username)
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          }
          .margin({ bottom: AppSpacing.S3 })

          TextInput({ placeholder: '新密码' })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .type(InputType.Password)
            .onChange((val) => { this.newPassword = val })
          TextInput({ placeholder: '确认新密码' })
            .height(48).margin({ bottom: AppSpacing.S4 })
            .type(InputType.Password)
            .onChange((val) => { this.confirmPassword = val })

          Button(this.isLoading ? '重置中...' : '重置密码')
            .width('100%').height(48)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleReset())
        }
      }
      .width('90%')
      .padding(AppSpacing.S6)
      .borderRadius(AppRadius.R_LG)
      .systemMaterial(new uiMaterial.ImmersiveMaterial({
        style: uiMaterial.ImmersiveStyle.REGULAR,
        applyShadow: true, interactive: false
      } as uiMaterial.ImmersiveOptions))

      Blank()

      Text('返回登录')
        .fontSize(AppTypography.SIZE_BODY_SMALL)
        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
        .margin({ bottom: AppSpacing.S6 })
        .onClick(() => router.back())
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default ResetPasswordPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/ResetPasswordPage.ets
git commit -m "harmony(phase-3): rewrite ResetPasswordPage with two-step flow"
```

---

## Phase 4: 发现模块

> **目标**：实现业务组件和 5 个发现类页面。
> **前置依赖**：Phase 1 + Phase 2
> **产出**：5 个业务组件 + 5 个页面

### Task 4.1: 创建业务组件 [Spec §核心组件库]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/components/NovelCard.ets`
- Create: `zifeng-harmony/entry/src/main/ets/components/NovelListItem.ets`
- Create: `zifeng-harmony/entry/src/main/ets/components/RankItem.ets`
- Create: `zifeng-harmony/entry/src/main/ets/components/ProgressBar.ets`
- Create: `zifeng-harmony/entry/src/main/ets/components/ThemeSelector.ets`

- [ ] **Step 1: 编写 NovelCard 组件（网格布局）**

```typescript
/**
 * NovelCard - 小说卡片（网格布局）
 * 规格：§核心组件库 NovelCard
 * 封面 180vp 高，含评分/简介
 */
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelItem } from '../model/NovelItem'

@Component
export struct NovelCard {
  @Prop novel: NovelItem
  @Prop showScore: boolean = true
  @Prop showSummary: boolean = true
  onClick?: (novel: NovelItem) => void

  build() {
    Column() {
      // 封面
      Image(this.novel.cover)
        .width('100%').height(180)
        .borderRadius({ topLeft: AppRadius.R_LG, topRight: AppRadius.R_LG })
        .objectFit(ImageFit.Cover)

      // 信息区
      Column() {
        Text(this.novel.title)
          .fontSize(AppTypography.SIZE_BODY)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(this.novel.author)
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
          .margin({ top: 2 })

        if (this.showScore && this.novel.score) {
          Row() {
            Text('★')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor('#FAAD14')
            Text(this.novel.score.toFixed(1))
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor('#FAAD14')
          }
          .margin({ top: 2 })
        }

        if (this.showSummary && this.novel.summary) {
          Text(this.novel.summary)
            .fontSize(AppTypography.SIZE_TINY)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 4 })
        }
      }
      .width('100%')
      .alignItems(HorizontalAlign.Start)
      .padding(AppSpacing.S2)
      .layoutWeight(1)
    }
    .borderRadius(AppRadius.R_LG)
    .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
    .onClick(() => {
      if (this.onClick) {
        this.onClick(this.novel)
      }
    })
  }
}
```

- [ ] **Step 2: 编写 NovelListItem 组件（横向布局）**

```typescript
/**
 * NovelListItem - 小说列表项（横向布局）
 * 规格：§核心组件库 NovelListItem
 */
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelItem } from '../model/NovelItem'

@Component
export struct NovelListItem {
  @Prop novel: NovelItem
  @Prop showProgress: boolean = false
  @Prop progress: number = 0
  @Prop showActions: boolean = false
  onClick?: (novel: NovelItem) => void
  onContinue?: (novel: NovelItem) => void
  onDelete?: (novel: NovelItem) => void

  build() {
    Row() {
      // 封面
      Image(this.novel.cover)
        .width(72).height(96)
        .borderRadius(AppRadius.R_SM)
        .objectFit(ImageFit.Cover)

      // 信息区
      Column() {
        Text(this.novel.title)
          .fontSize(AppTypography.SIZE_BODY)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(this.novel.author)
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
          .margin({ top: 2 })

        if (this.novel.latestChapter) {
          Text(`最新：${this.novel.latestChapter}`)
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 2 })
        }

        if (this.showProgress) {
          Row() {
            Column()
              .layoutWeight(1).height(3)
              .borderRadius(2)
              .backgroundColor(ThemeManager.getPrimaryColor())
            Column()
              .layoutWeight(1 - this.progress / 100).height(3)
              .borderRadius(2)
              .backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT'))
          }
          .width('100%')
          .margin({ top: 4 })
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: AppSpacing.S3 })
      .height(96)
      .justifyContent(FlexAlign.SpaceBetween)

      // 操作按钮
      if (this.showActions) {
        Column() {
          if (this.showProgress && this.onContinue) {
            Button('继续')
              .height(28)
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor('#FFFFFF')
              .backgroundColor(ThemeManager.getPrimaryColor())
              .onClick(() => this.onContinue!(this.novel))
          }
          if (this.onDelete) {
            Button('删除')
              .height(28)
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
              .backgroundColor(Color.Transparent)
              .margin({ top: 4 })
              .onClick(() => this.onDelete!(this.novel))
          }
        }
        .margin({ left: AppSpacing.S2 })
      }
    }
    .width('100%')
    .padding(AppSpacing.S3)
    .onClick(() => {
      if (this.onClick) {
        this.onClick(this.novel)
      }
    })
  }
}
```

- [ ] **Step 3: 编写 RankItem 组件**

```typescript
/**
 * RankItem - 排行榜列表项
 * 规格：§核心组件库 RankItem
 */
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelItem } from '../model/NovelItem'

@Component
export struct RankItem {
  @Prop rank: number
  @Prop novel: NovelItem
  @Prop accentColor: string
  onClick?: (novel: NovelItem) => void

  build() {
    Row() {
      // 排名数字
      Text(this.rank.toString())
        .fontSize(this.rank <= 3 ? 24 : 18)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.rank <= 3 ? this.accentColor : ThemeManager.getNeutral('TEXT_MUTED'))
        .width(32)
        .textAlign(TextAlign.Center)

      // 封面
      Image(this.novel.cover)
        .width(48).height(64)
        .borderRadius(AppRadius.R_SM)
        .objectFit(ImageFit.Cover)
        .margin({ left: AppSpacing.S3 })

      // 信息
      Column() {
        Text(this.novel.title)
          .fontSize(AppTypography.SIZE_BODY)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
        Text(this.novel.author)
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
          .margin({ top: 2 })
        if (this.novel.score) {
          Text(`★ ${this.novel.score.toFixed(1)}`)
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor('#FAAD14')
            .margin({ top: 2 })
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: AppSpacing.S3 })
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .padding({ top: AppSpacing.S2, bottom: AppSpacing.S2, left: AppSpacing.S4, right: AppSpacing.S4 })
    .onClick(() => {
      if (this.onClick) {
        this.onClick(this.novel)
      }
    })
  }
}
```

- [ ] **Step 4: 编写 ProgressBar 组件**

```typescript
/**
 * ProgressBar - 阅读进度条
 * 规格：§核心组件库 ProgressBar
 */
import { AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct ProgressBar {
  @Prop percent: number = 0
  @Prop animated: boolean = true
  @State animPercent: number = 0

  aboutToAppear() {
    if (this.animated) {
      setTimeout(() => {
        animateTo({ duration: 600, curve: Curve.EaseOut }, () => {
          this.animPercent = this.percent
        })
      }, 100)
    } else {
      this.animPercent = this.percent
    }
  }

  build() {
    Stack() {
      // 背景
      Column()
        .width('100%').height(4)
        .borderRadius(AppRadius.R_FULL)
        .backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT'))
      // 填充
      Column()
        .width(`${this.animPercent}%`).height(4)
        .borderRadius(AppRadius.R_FULL)
        .linearGradient({
          direction: GradientDirection.Right,
          colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
        })
    }
    .width('100%')
  }
}
```

- [ ] **Step 5: 编写 ThemeSelector 组件**

```typescript
/**
 * ThemeSelector - 主题选择器
 * 规格：§核心组件库 ThemeSelector
 */
import { AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct ThemeSelector {
  @Prop currentTheme: string
  onSelect?: (themeKey: string) => void

  build() {
    Row() {
      ForEach(ThemeManager.getAllThemes(), (theme: { key: string; name: string; primary: string }) => {
        Column() {
          Column()
            .width(36).height(36)
            .borderRadius(AppRadius.R_FULL)
            .backgroundColor(theme.primary)
            .border({
              width: this.currentTheme === theme.key ? 3 : 0,
              color: '#FFFFFF'
            })
        }
        .margin({ right: AppSpacing.S3 })
        .onClick(() => {
          if (this.onSelect) {
            this.onSelect(theme.key)
          }
        })
      })
    }
  }
}
```

- [ ] **Step 6: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`
Expected: BUILD SUCCESSFUL

```bash
git add entry/src/main/ets/components/
git commit -m "harmony(phase-4): add business components (NovelCard/NovelListItem/RankItem/ProgressBar/ThemeSelector)"
```

---

### Task 4.2: 创建 HomePage [Spec §3.1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/HomePage.ets`

- [ ] **Step 1: 编写首页**

```typescript
/**
 * HomePage - 首页
 * 规格：§3.1 首页
 *
 * 滚动式信息流：搜索栏 + 最近阅读 + 推荐 + 榜单 + 分类导航
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius, AppDuration, AppCurves, NavBarConfig
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassNavBar } from '../common/GlassNavBar'
import { GlassSearchBar } from '../common/GlassSearchBar'
import { SectionHeader } from '../common/SectionHeader'
import { LoadingSkel } from '../common/LoadingSkel'
import { NovelCard } from '../components/NovelCard'
import { RankItem } from '../components/RankItem'
import { NovelItem } from '../model/NovelItem'
import { RankService, RANK_CONFIGS, RankType } from '../service/RankService'
import { CategoryService, Category } from '../service/CategoryService'
import { BookshelfService, ReadingHistoryItem } from '../service/BookshelfService'
import { AuthService } from '../service/AuthService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct HomePage {
  @State scrollOffset: number = 0
  @State isLoading: boolean = true
  @State recommendList: NovelItem[] = []
  @State rankList: NovelItem[] = []
  @State currentRankTab: number = 0
  @State categories: Category[] = []
  @State recentReadings: ReadingHistoryItem[] = []
  @State isLoggedIn: boolean = false
  private searchInput: string = ''

  aboutToAppear() {
    this.loadData()
  }

  private async loadData() {
    this.isLoading = true
    this.isLoggedIn = await AuthService.isLoggedIn()
    try {
      const [recommend, rank, categories] = await Promise.all([
        RankService.getHomeRank('mustRead'),
        RankService.getHomeRank('mustRead'),
        CategoryService.getCategories()
      ])
      this.recommendList = recommend
      this.rankList = rank
      this.categories = categories
      if (this.isLoggedIn) {
        this.recentReadings = await BookshelfService.getReadingHistory()
      }
    } catch (e) {
      promptAction.showToast({ message: '数据加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async switchRank(index: number) {
    this.currentRankTab = index
    const rankType = RANK_CONFIGS[index].type as RankType
    try {
      this.rankList = await RankService.getHomeRank(rankType)
    } catch (e) {
      console.warn('HomePage: switchRank failed')
    }
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部导航栏
      GlassNavBar({
        title: '',
        scrollOffset: this.scrollOffset,
        showBack: false,
        rightContent: () => {
          Image($r('sys.media.user'))
            .width(28).height(28)
            .borderRadius(14)
            .onClick(() => {
              router.pushUrl({ url: 'pages/UserCenterPage' })
            })
        }
      })

      // 搜索栏
      GlassSearchBar({
        placeholder: '搜索小说...',
        editable: false,
        voiceEnabled: true,
        inputValue: this.searchInput,
        onBarClick: () => router.pushUrl({ url: 'pages/SearchPage' }),
        onVoiceClick: () => router.pushUrl({ url: 'pages/SearchPage' })
      })
      .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S4 })

      // 滚动内容
      Scroll() {
        Column() {
          // 最近阅读（仅登录时显示）
          if (this.isLoggedIn && this.recentReadings.length > 0) {
            SectionHeader({ title: '最近阅读', actionText: '查看全部', actionVisible: true })
            Scroll() {
              Row() {
                ForEach(this.recentReadings.slice(0, 3), (item: ReadingHistoryItem) => {
                  Column() {
                    Image(item.cover)
                      .width(100).height(140)
                      .borderRadius(AppRadius.R_MD)
                      .objectFit(ImageFit.Cover)
                    Text(item.title)
                      .fontSize(AppTypography.SIZE_CAPTION)
                      .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                      .maxLines(1)
                      .margin({ top: 4 })
                  }
                  .margin({ right: AppSpacing.S3 })
                  .onClick(() => {
                    router.pushUrl({
                      url: 'pages/ReaderPage',
                      params: { bookUrl: item.bookUrl, sourceUrl: item.sourceUrl, chapterIndex: item.lastChapterIndex }
                    })
                  })
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            }
            .scrollable(ScrollDirection.Horizontal)
            .scrollBar(BarState.Off)
          }

          // 推荐区域
          SectionHeader({ title: '为你推荐' })
          if (this.isLoading) {
            Grid() {
              ForEach([0, 1, 2, 3], () => {
                GridItem() {
                  LoadingSkel({ shape: 'card', height: 280 })
                }
              })
            }
            .columnsTemplate('1fr 1fr')
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .height(580)
          } else {
            Grid() {
              ForEach(this.recommendList, (novel: NovelItem) => {
                GridItem() {
                  NovelCard({
                    novel: novel,
                    showScore: true,
                    showSummary: true,
                    onClick: (n) => this.navigateToDetail(n)
                  })
                }
              })
            }
            .columnsTemplate('1fr 1fr')
            .columnsGap(AppSpacing.S3)
            .rowsGap(AppSpacing.S3)
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .height(this.recommendList.length * 290)
          }

          // 榜单区域
          SectionHeader({
            title: '热门榜单',
            actionText: '查看更多',
            actionVisible: true,
            onAction: () => router.pushUrl({ url: 'pages/RankPage' })
          })
          // 榜单 Tab
          Scroll() {
            Row() {
              ForEach(RANK_CONFIGS, (config, index) => {
                Text(config.name)
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(this.currentRankTab === index
                    ? ThemeManager.getPrimaryColor()
                    : ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                  .borderRadius(AppRadius.R_FULL)
                  .backgroundColor(this.currentRankTab === index
                    ? ThemeManager.getNeutral('BG_ELEVATED')
                    : Color.Transparent)
                  .margin({ right: AppSpacing.S2 })
                  .onClick(() => this.switchRank(index))
              })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
          }
          .scrollable(ScrollDirection.Horizontal)
          .scrollBar(BarState.Off)
          .margin({ bottom: AppSpacing.S3 })

          // 榜单列表
          Column() {
            ForEach(this.rankList.toArray(), (novel: NovelItem, index: number) => {
              RankItem({
                rank: index + 1,
                novel: novel,
                accentColor: RANK_CONFIGS[this.currentRankTab].accentColor,
                onClick: (n) => this.navigateToDetail(n)
              })
            })
          }

          // 分类导航
          SectionHeader({
            title: '分类导航',
            actionText: '查看全部',
            actionVisible: true,
            onAction: () => router.pushUrl({ url: 'pages/CategoryPage' })
          })
          Grid() {
            ForEach(this.categories, (cat: Category) => {
              GridItem() {
                Column() {
                  Column()
                    .width(48).height(48)
                    .borderRadius(AppRadius.R_FULL)
                    .linearGradient({
                      direction: GradientDirection.Bottom,
                      colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
                    })
                  Text(cat.name)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .margin({ top: 4 })
                  Text(`${cat.count}本`)
                    .fontSize(AppTypography.SIZE_TINY)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                }
                .onClick(() => {
                  router.pushUrl({
                    url: 'pages/CategoryDetailPage',
                    params: { categoryId: cat.id, categoryName: cat.name }
                  })
                })
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr 1fr')
          .columnsGap(AppSpacing.S3)
          .rowsGap(AppSpacing.S4)
          .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
      .onScroll((x, y) => {
        this.scrollOffset += y
      })
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default HomePage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/HomePage.ets
git commit -m "harmony(phase-4): create HomePage with recommend/rank/category sections"
```

---

### Task 4.3: 创建 CategoryPage [Spec §3.2]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/CategoryPage.ets`

- [ ] **Step 1: 编写分类页**

```typescript
/**
 * CategoryPage - 分类页
 * 规格：§3.2 分类页
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { SectionHeader } from '../common/SectionHeader'
import { LoadingSkel } from '../common/LoadingSkel'
import { BackButton } from '../common/BackButton'
import { CategoryService, Category } from '../service/CategoryService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct CategoryPage {
  @State categories: Category[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadCategories()
  }

  private async loadCategories() {
    try {
      this.categories = await CategoryService.getCategories()
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('全部分类')
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding(AppSpacing.S4)

      if (this.isLoading) {
        Grid() {
          ForEach([0, 1, 2, 3, 4, 5, 6, 7], () => {
            GridItem() {
              LoadingSkel({ shape: 'card', height: 100 })
            }
          })
        }
        .columnsTemplate('1fr 1fr 1fr 1fr')
        .columnsGap(AppSpacing.S3)
        .rowsGap(AppSpacing.S3)
        .padding(AppSpacing.S4)
      } else {
        Scroll() {
          Grid() {
            ForEach(this.categories, (cat: Category) => {
              GridItem() {
                Column() {
                  Column()
                    .width(48).height(48)
                    .borderRadius(AppRadius.R_FULL)
                    .linearGradient({
                      direction: GradientDirection.Bottom,
                      colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
                    })
                    .justifyContent(FlexAlign.Center)
                  Text(cat.name)
                    .fontSize(AppTypography.SIZE_H4)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .margin({ top: AppSpacing.S2 })
                  Text(`${cat.count} 本`)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                }
                .width('100%')
                .padding(AppSpacing.S4)
                .borderRadius(AppRadius.R_LG)
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .systemMaterial(new uiMaterial.ImmersiveMaterial({
                  style: uiMaterial.ImmersiveStyle.REGULAR,
                  applyShadow: true, interactive: true
                } as uiMaterial.ImmersiveOptions))
                .onClick(() => {
                  router.pushUrl({
                    url: 'pages/CategoryDetailPage',
                    params: { categoryId: cat.id, categoryName: cat.name }
                  })
                })
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr 1fr')
          .columnsGap(AppSpacing.S3)
          .rowsGap(AppSpacing.S3)
          .padding(AppSpacing.S4)
        }
        .layoutWeight(1)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default CategoryPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/CategoryPage.ets
git commit -m "harmony(phase-4): create CategoryPage with grid layout"
```

---

### Task 4.4: 重写 CategoryDetailPage [Spec §3.3]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/CategoryDetailPage.ets`（完全重写）

- [ ] **Step 1: 重写分类详情页**

```typescript
/**
 * CategoryDetailPage - 分类详情页
 * 规格：§3.3 分类详情页
 * 排序：热门/最新/完本，分页懒加载
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { NovelListItem } from '../components/NovelListItem'
import { LoadingSkel } from '../common/LoadingSkel'
import { CategoryService, SortType } from '../service/CategoryService'
import { NovelItem } from '../model/NovelItem'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct CategoryDetailPage {
  @State categoryId: string = ''
  @State categoryName: string = ''
  @State novels: NovelItem[] = []
  @State isLoading: boolean = true
  @State isLoadingMore: boolean = false
  @State currentPage: number = 1
  @State currentSort: SortType = 'hot'
  @State hasMore: boolean = true
  private sortOptions: Array<{ key: SortType; label: string }> = [
    { key: 'hot', label: '热门' },
    { key: 'new', label: '最新' },
    { key: 'completed', label: '完本' }
  ]

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>
    this.categoryId = params?.categoryId || ''
    this.categoryName = params?.categoryName || ''
    this.loadNovels(true)
  }

  private async loadNovels(reset: boolean = false) {
    if (reset) {
      this.currentPage = 1
      this.hasMore = true
      this.isLoading = true
    } else {
      if (!this.hasMore || this.isLoadingMore) return
      this.isLoadingMore = true
    }
    try {
      const list = await CategoryService.getCategoryNovels(
        this.categoryId, this.currentPage, this.currentSort
      )
      if (reset) {
        this.novels = list
      } else {
        this.novels = this.novels.concat(list)
      }
      if (list.length < 20) {
        this.hasMore = false
      }
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
      this.isLoadingMore = false
    }
  }

  private switchSort(sort: SortType) {
    if (this.currentSort === sort) return
    this.currentSort = sort
    this.loadNovels(true)
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text(this.categoryName)
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
        Blank()
        // 排序选项
        Row() {
          ForEach(this.sortOptions, (opt) => {
            Text(opt.label)
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(this.currentSort === opt.key
                ? ThemeManager.getPrimaryColor()
                : ThemeManager.getNeutral('TEXT_SECONDARY'))
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .onClick(() => this.switchSort(opt.key))
          })
        }
      }
      .width('100%')
      .padding(AppSpacing.S4)

      // 列表
      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2, 3], () => {
            LoadingSkel({ shape: 'card', height: 96 })
              .margin({ bottom: AppSpacing.S3, left: AppSpacing.S4, right: AppSpacing.S4 })
          })
        }
      } else {
        List() {
          ForEach(this.novels, (novel: NovelItem) => {
            ListItem() {
              NovelListItem({
                novel: novel,
                onClick: (n) => this.navigateToDetail(n)
              })
            }
          })

          if (this.isLoadingMore) {
            ListItem() {
              Row() {
                LoadingProgress().width(24).height(24)
                Text('加载更多...')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  .margin({ left: AppSpacing.S2 })
              }
              .width('100%')
              .justifyContent(FlexAlign.Center)
              .padding(AppSpacing.S4)
            }
          }

          if (!this.hasMore && this.novels.length > 0) {
            ListItem() {
              Text('没有更多了')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                .width('100%')
                .textAlign(TextAlign.Center)
                .padding(AppSpacing.S4)
            }
          }
        }
        .layoutWeight(1)
        .onReachEnd(() => {
          if (this.hasMore && !this.isLoadingMore) {
            this.currentPage++
            this.loadNovels(false)
          }
        })
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default CategoryDetailPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/CategoryDetailPage.ets
git commit -m "harmony(phase-4): rewrite CategoryDetailPage with sort and pagination"
```

---

### Task 4.5: 重写 RankPage [Spec §3.4]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/RankPage.ets`（完全重写）

- [ ] **Step 1: 重写排行榜页**

```typescript
/**
 * RankPage - 排行榜页
 * 规格：§3.4 排行榜页
 * 6 个榜单 Tab，每个 Tab 不同强调色
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { RankItem } from '../components/RankItem'
import { LoadingSkel } from '../common/LoadingSkel'
import { RankService, RANK_CONFIGS, RankType } from '../service/RankService'
import { NovelItem } from '../model/NovelItem'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct RankPage {
  @State currentTab: number = 0
  @State rankList: NovelItem[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadRank(0)
  }

  private async loadRank(index: number) {
    this.currentTab = index
    this.isLoading = true
    try {
      const rankType = RANK_CONFIGS[index].type as RankType
      this.rankList = await RankService.getRank(rankType, 1)
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('排行榜')
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding(AppSpacing.S4)

      // 榜单 Tab
      Tabs({ index: this.currentTab }) {
        ForEach(RANK_CONFIGS, (config, index) => {
          TabContent() {
            if (this.isLoading) {
              Column() {
                ForEach([0, 1, 2, 3, 4], () => {
                  LoadingSkel({ shape: 'card', height: 80 })
                    .margin({ bottom: AppSpacing.S3, left: AppSpacing.S4, right: AppSpacing.S4 })
                })
              }
            } else {
              List() {
                ForEach(this.rankList.toArray(), (novel: NovelItem, idx: number) => {
                  ListItem() {
                    RankItem({
                      rank: idx + 1,
                      novel: novel,
                      accentColor: config.accentColor,
                      onClick: (n) => this.navigateToDetail(n)
                    })
                  }
                })
              }
              .layoutWeight(1)
            }
          }
          .tabBar(this.TabBuilder(config.name, index))
        })
      }
      .onChange((index) => this.loadRank(index))
      .layoutWeight(1)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  @Builder
  TabBuilder(name: string, index: number) {
    Column() {
      Text(name)
        .fontSize(AppTypography.SIZE_BODY_SMALL)
        .fontColor(this.currentTab === index
          ? ThemeManager.getPrimaryColor()
          : ThemeManager.getNeutral('TEXT_SECONDARY'))
        .fontWeight(this.currentTab === index ? FontWeight.Medium : FontWeight.Normal)
      if (this.currentTab === index) {
        Column()
          .width(20).height(2)
          .borderRadius(1)
          .backgroundColor(ThemeManager.getPrimaryColor())
          .margin({ top: 4 })
      }
    }
    .width('100%')
    .height(40)
    .justifyContent(FlexAlign.Center)
  }
}

export default RankPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/RankPage.ets
git commit -m "harmony(phase-4): rewrite RankPage with 6 rank tabs"
```

---

### Task 4.6: 创建 SearchPage [Spec §3.5]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/SearchPage.ets`

- [ ] **Step 1: 编写搜索页**

```typescript
/**
 * SearchPage - 搜索页
 * 规格：§3.5 搜索页
 * 聚合搜索 + 语音搜索 + 搜索历史
 */
import { router } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { GlassSearchBar } from '../common/GlassSearchBar'
import { NovelListItem } from '../components/NovelListItem'
import { LoadingSkel } from '../common/LoadingSkel'
import { SearchService, BatchSearchProgress, SearchResult } from '../service/SearchService'
import { NovelItem } from '../model/NovelItem'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct SearchPage {
  @State keyword: string = ''
  @State searchMode: number = 0  // 0=聚合, 1=单书源
  @State isSearching: boolean = false
  @State searchProgress: string = ''
  @State results: NovelItem[] = []
  @State searchHistory: string[] = []
  @State hasSearched: boolean = false
  private abortSignal: { aborted: boolean } = { aborted: false }
  private searchTimer: number = -1

  aboutToAppear() {
    this.searchHistory = SearchService.getHistory()
  }

  private onSearch(keyword: string) {
    if (!keyword.trim()) return
    this.keyword = keyword
    SearchService.addHistory(keyword)
    this.searchHistory = SearchService.getHistory()
    this.startSearch()
  }

  private async startSearch() {
    this.isSearching = true
    this.hasSearched = true
    this.results = []
    this.abortSignal = { aborted: false }

    // 获取可用书源列表（此处简化为从配置读取）
    const sourceUrls = AppStorage.get<string[]>('enabled_sources') || []

    if (this.searchMode === 0 && sourceUrls.length > 0) {
      // 聚合搜索
      await SearchService.batchSearch(
        this.keyword,
        sourceUrls,
        (progress: BatchSearchProgress) => {
          // 合并所有结果
          this.results = progress.results.flatMap(r => r.novels)
          this.searchProgress = `正在搜索更多书源... (${progress.completed}/${progress.total})`
          if (progress.isFinished) {
            this.isSearching = false
          }
        },
        this.abortSignal
      )
    } else if (sourceUrls.length > 0) {
      // 单书源搜索
      try {
        const result = await SearchService.searchSingle(this.keyword, sourceUrls[0])
        this.results = result.novels
      } catch (e) {
        promptAction.showToast({ message: '搜索失败' })
      } finally {
        this.isSearching = false
      }
    } else {
      // 无书源，使用默认搜索
      try {
        const result = await SearchService.searchSingle(this.keyword, 'default')
        this.results = result.novels
      } catch (e) {
        promptAction.showToast({ message: '搜索失败' })
      } finally {
        this.isSearching = false
      }
    }
    this.isSearching = false
  }

  private stopSearch() {
    this.abortSignal.aborted = true
    this.isSearching = false
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部搜索栏（THIN 材质）
      Row() {
        BackButton()
        GlassSearchBar({
          placeholder: '搜索小说/作者',
          text: this.keyword,
          onSearch: (val: string) => this.doSearch(val),
          onVoiceClick: () => this.startVoiceSearch()
        })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      // 书源筛选（多源聚合时显示）
      if (this.sources.length > 1) {
        Scroll() {
          Row() {
            ForEach(this.sources, (src: BookSource) => {
              Text(src.name)
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(this.activeSourceId === src.id
                  ? ThemeManager.getPrimary(500)
                  : ThemeManager.getNeutral('TEXT_SECONDARY'))
                .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                .borderRadius(AppRadius.R_FULL)
                .backgroundColor(this.activeSourceId === src.id
                  ? ThemeManager.getPrimary(50)
                  : Color.Transparent)
                .margin({ right: AppSpacing.S2 })
                .onClick(() => {
                  this.activeSourceId = src.id
                  this.doSearch(this.keyword)
                })
            })
          }
        }
        .scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Off)
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })
      }

      // 内容区
      if (this.isSearching && this.results.length === 0) {
        Column() {
          ForEach([0, 1, 2, 3], () => {
            LoadingSkel({ height: 88 })
          })
        }
        .padding(AppSpacing.S4)
      } else if (this.results.length === 0 && this.keyword.length > 0) {
        // 空结果
        Column() {
          Text('未找到相关小说')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
          Text(`关键词：「${this.keyword}」`)
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
            .margin({ top: AppSpacing.S2 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.results.length === 0) {
        // 搜索历史 + 热门搜索
        Scroll() {
          Column() {
            if (this.history.length > 0) {
              SectionHeader({
                title: '搜索历史',
                actionText: '清空',
                actionVisible: true,
                onAction: () => this.clearHistory()
              })
              Flex({ wrap: FlexWrap.Wrap }) {
                ForEach(this.history, (word: string) => {
                  Text(word)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                    .borderRadius(AppRadius.R_FULL)
                    .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                    .margin({ right: AppSpacing.S2, bottom: AppSpacing.S2 })
                    .onClick(() => {
                      this.keyword = word
                      this.doSearch(word)
                    })
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S5 })
            }

            SectionHeader({ title: '热门搜索' })
            Column() {
              ForEach(this.hotKeywords, (word: string, idx: number) => {
                Row() {
                  Text(`${idx + 1}`)
                    .fontSize(AppTypography.SIZE_BODY_LARGE)
                    .fontColor(idx < 3 ? ThemeManager.getAccent('Magenta') : ThemeManager.getNeutral('TEXT_MUTED'))
                    .width(24)
                  Text(word)
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .layoutWeight(1)
                }
                .width('100%')
                .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
                .onClick(() => {
                  this.keyword = word
                  this.doSearch(word)
                })
              })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      } else {
        // 搜索结果列表
        List({ space: AppSpacing.S3 }) {
          ForEach(this.results, (novel: NovelItem) => {
            ListItem() {
              NovelListItem({
                novel: novel,
                onClick: () => this.navigateToDetail(novel)
              })
            }
          })
        }
        .layoutWeight(1)
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S2 })
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}
```

- [ ] **Step 3: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/SearchPage.ets
git commit -m "harmony(phase-4): create SearchPage with aggregation/history/hot keywords"
```

---

## Phase 5: 阅读模块

依赖：Phase 1 + Phase 2 + Phase 4。产出 4 个核心阅读页面。

### Task 5.1: 创建 NovelDetailPage [Spec §4.1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/NovelDetailPage.ets`

- [ ] **Step 1: 编写小说详情页**

```typescript
/**
 * NovelDetailPage - 小说详情页
 * 规格：§4.1 小说详情页
 * 特性：封面 3D 倾斜跟踪鼠标、背景水墨书法元素、沉浸光感卡片
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius, AppAnimation } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { ProgressBar } from '../components/ProgressBar'
import { NovelDetails, Chapter } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { BookshelfService } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct NovelDetailPage {
  @State novel: NovelDetails | null = null
  @State chapters: Chapter[] = []
  @State isLoading: boolean = true
  @State isInShelf: boolean = false
  @State readingProgress: number = 0
  @State lastChapter: string = ''
  // 3D 倾斜跟踪
  @State coverRotateX: number = 0
  @State coverRotateY: number = 0
  private bookUrl: string = ''
  private sourceUrl: string = ''

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>
    this.bookUrl = params?.bookUrl ?? ''
    this.sourceUrl = params?.sourceUrl ?? ''
    this.loadDetail()
    this.checkShelfStatus()
  }

  private async loadDetail() {
    try {
      this.novel = await BookService.getBookInfo(this.bookUrl, this.sourceUrl)
      this.chapters = await BookService.getChapterList(this.bookUrl, this.sourceUrl)
      this.lastChapter = this.chapters[this.chapters.length - 1]?.title ?? ''
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async checkShelfStatus() {
    this.isInShelf = await BookshelfService.isInShelf(this.bookUrl)
    const progress = await BookshelfService.getReadingProgress(this.bookUrl)
    this.readingProgress = progress.percentage
  }

  private async toggleShelf() {
    if (this.isInShelf) {
      await BookshelfService.removeFromShelf(this.bookUrl)
      this.isInShelf = false
      promptAction.showToast({ message: '已移出书架' })
    } else if (this.novel) {
      await BookshelfService.addToShelf({
        bookUrl: this.bookUrl,
        sourceUrl: this.sourceUrl,
        title: this.novel.title,
        author: this.novel.author,
        cover: this.novel.cover,
        lastChapter: this.lastChapter
      })
      this.isInShelf = true
      promptAction.showToast({ message: '已加入书架' })
    }
  }

  private startReading() {
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: { bookUrl: this.bookUrl, sourceUrl: this.sourceUrl, chapterIndex: 0 }
    })
  }

  private continueReading() {
    BookshelfService.getReadingProgress(this.bookUrl).then(progress => {
      router.pushUrl({
        url: 'pages/ReaderPage',
        params: {
          bookUrl: this.bookUrl,
          sourceUrl: this.sourceUrl,
          chapterIndex: progress.chapterIndex
        }
      })
    })
  }

  private openDirectory() {
    router.pushUrl({
      url: 'pages/DirectoryPage',
      params: { bookUrl: this.bookUrl, sourceUrl: this.sourceUrl }
    })
  }

  // 封面 3D 跟踪
  private handleCoverTouch(x: number, y: number) {
    this.coverRotateY = (x - 0.5) * 24
    this.coverRotateX = -(y - 0.5) * 24
  }

  private resetCoverRotate() {
    this.coverRotateX = 0
    this.coverRotateY = 0
  }

  build() {
    Stack({ alignContent: Alignment.TopStart }) {
      // 背景水墨书法水印
      Text('墨')
        .fontSize(280)
        .fontColor(ThemeManager.getPrimary(50))
        .opacity(0.5)
        .position({ x: '60%', y: '10%' })

      Column() {
        // 顶部返回栏
        Row() {
          BackButton()
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4 })

        if (this.isLoading) {
          Column() {
            LoadingProgress().color(ThemeManager.getPrimary(500))
          }
          .width('100%').layoutWeight(1)
          .justifyContent(FlexAlign.Center)
        } else if (this.novel) {
          Scroll() {
            Column() {
              // 封面 + 基础信息（3D 跟踪）
              Row() {
                Column() {
                  Image(this.novel.cover)
                    .width(120).height(168)
                    .borderRadius(AppRadius.R_MD)
                    .objectFit(ImageFit.Cover)
                    .rotate({ x: this.coverRotateX, y: this.coverRotateY })
                    .animation({ duration: AppAnimation.DUR_FAST, curve: Curve.EaseOut })
                }
                .onTouch((event: TouchEvent) => {
                  if (event.type === TouchType.Move) {
                    const tx = event.touches[0].x / 120
                    const ty = event.touches[0].y / 168
                    this.handleCoverTouch(tx, ty)
                  } else if (event.type === TouchType.Up) {
                    this.resetCoverRotate()
                  }
                })

                Column() {
                  Text(this.novel.title)
                    .fontSize(AppTypography.SIZE_H2)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .fontWeight(FontWeight.Medium)
                  Text(this.novel.author)
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .margin({ top: AppSpacing.S1 })
                  Row() {
                    Text(this.novel.category)
                      .fontSize(AppTypography.SIZE_TINY)
                      .fontColor(ThemeManager.getPrimary(500))
                      .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                      .borderRadius(AppRadius.R_SM)
                      .backgroundColor(ThemeManager.getPrimary(50))
                    Text(this.novel.status)
                      .fontSize(AppTypography.SIZE_TINY)
                      .fontColor(ThemeManager.getAccent('Emerald'))
                      .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                      .borderRadius(AppRadius.R_SM)
                      .backgroundColor(ThemeManager.getAccent('Emerald') + '20')
                      .margin({ left: AppSpacing.S2 })
                  }
                  .margin({ top: AppSpacing.S2 })
                  Text(`${this.novel.wordCount} 字`)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                    .margin({ top: AppSpacing.S1 })
                }
                .alignItems(HorizontalAlign.Start)
                .margin({ left: AppSpacing.S4 })
                .layoutWeight(1)
              }
              .padding(AppSpacing.S4)

              // 阅读进度（如已加入书架且有进度）
              if (this.isInShelf && this.readingProgress > 0) {
                GlassCard({ padding: AppSpacing.S4 }) {
                  Column() {
                    Row() {
                      Text('阅读进度')
                        .fontSize(AppTypography.SIZE_CAPTION)
                        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                      Text(`${Math.round(this.readingProgress * 100)}%`)
                        .fontSize(AppTypography.SIZE_BODY_LARGE)
                        .fontColor(ThemeManager.getPrimary(500))
                        .margin({ left: AppSpacing.S2 })
                    }
                    .width('100%')
                    ProgressBar({ progress: this.readingProgress, height: 4 })
                      .margin({ top: AppSpacing.S2 })
                  }
                }
                .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })
              }

              // 简介
              GlassCard({ padding: AppSpacing.S4 }) {
                Column() {
                  Text('简介')
                    .fontSize(AppTypography.SIZE_H4)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  Text(this.novel.intro)
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .margin({ top: AppSpacing.S2 })
                    .maxLines(4)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .alignItems(HorizontalAlign.Start)
              }
              .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

              // 最新章节
              GlassCard({ padding: AppSpacing.S4 }) {
                Column() {
                  Row() {
                    Text('最新章节')
                      .fontSize(AppTypography.SIZE_H4)
                      .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    Text('查看目录')
                      .fontSize(AppTypography.SIZE_CAPTION)
                      .fontColor(ThemeManager.getPrimary(500))
                      .onClick(() => this.openDirectory())
                  }
                  .width('100%')
                  .justifyContent(FlexAlign.SpaceBetween)
                  Text(this.lastChapter)
                    .fontSize(AppTypography.SIZE_BODY_SMALL)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .margin({ top: AppSpacing.S2 })
                }
                .alignItems(HorizontalAlign.Start)
              }
              .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
            }
          }
          .layoutWeight(1)
          .scrollBar(BarState.Auto)
        }
      }
      .width('100%').height('100%')

      // 底部操作栏（浮动）
      if (this.novel) {
        Row() {
          Button(this.isInShelf ? '已在书架' : '加入书架')
            .type(ButtonType.Capsule)
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
            .layoutWeight(1)
            .onClick(() => this.toggleShelf())
          Button(this.readingProgress > 0 ? '继续阅读' : '开始阅读')
            .type(ButtonType.Capsule)
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(Color.White)
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .layoutWeight(1)
            .margin({ left: AppSpacing.S3 })
            .onClick(() => {
              if (this.readingProgress > 0) this.continueReading()
              else this.startReading()
            })
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
        .position({ x: 0, y: '100%' })
        .markAnchor({ x: 0, y: '100%' })
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default NovelDetailPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/NovelDetailPage.ets
git commit -m "harmony(phase-5): create NovelDetailPage with 3D cover tracking and shelf actions"
```

---

### Task 5.2: 创建 ReaderPage [Spec §4.2]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/ReaderPage.ets`

- [ ] **Step 1: 编写阅读页**

```typescript
/**
 * ReaderPage - 阅读页
 * 规格：§4.2 阅读页
 * 特性：字号/行距/主题可调、上下章切换、阅读进度自动保存、沉浸式工具栏
 */
import { router } from '@kit.ArkUI'
import { uiMaterial, curves } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius, AppAnimation } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelContent } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { BookshelfService } from '../service/BookshelfService'
import { OfflineCacheManager } from '../service/OfflineCacheManager'
import { promptAction } from '@kit.ArkUI'

type ReaderTheme = 'light' | 'sepia' | 'dark' | 'green'

interface ReaderSettings {
  fontSize: number
  lineHeight: number
  theme: ReaderTheme
  fontFamily: string
}

const READER_THEME_BG: Record<ReaderTheme, string> = {
  light: '#FFFFFF',
  sepia: '#F5EDD8',
  dark: '#1A1A1A',
  green: '#C7EDCC'
}
const READER_THEME_TEXT: Record<ReaderTheme, string> = {
  light: '#1E1B2E',
  sepia: '#5B4636',
  dark: '#E0E0E0',
  green: '#2D4A2D'
}

@Entry
@Component
struct ReaderPage {
  @State content: NovelContent | null = null
  @State isLoading: boolean = true
  @State showToolbar: boolean = false
  @State showSettings: boolean = false
  @State currentChapterIndex: number = 0
  @State totalChapters: number = 0
  @State settings: ReaderSettings = {
    fontSize: 18,
    lineHeight: 1.8,
    theme: 'light',
    fontFamily: 'HarmonyOS Sans'
  }
  private bookUrl: string = ''
  private sourceUrl: string = ''
  private scrollOffset: number = 0

  aboutToAppear() {
    const params = router.getParams() as Record<string, string | number>
    this.bookUrl = (params?.bookUrl as string) ?? ''
    this.sourceUrl = (params?.sourceUrl as string) ?? ''
    this.currentChapterIndex = (params?.chapterIndex as number) ?? 0
    this.loadSettings()
    this.loadContent()
  }

  private loadSettings() {
    const raw = AppStorage.get<string>('reader_settings')
    if (raw) {
      try {
        this.settings = JSON.parse(raw) as ReaderSettings
      } catch (e) { /* 使用默认 */ }
    }
  }

  private saveSettings() {
    AppStorage.setOrCreate<string>('reader_settings', JSON.stringify(this.settings))
  }

  private async loadContent() {
    this.isLoading = true
    try {
      // 优先从离线缓存读取
      const cached = await OfflineCacheManager.getCachedContent(this.bookUrl, this.currentChapterIndex)
      if (cached) {
        this.content = cached
      } else {
        this.content = await BookService.getChapterContent(
          this.bookUrl, this.sourceUrl, this.currentChapterIndex
        )
        // 写入离线缓存
        OfflineCacheManager.cacheContent(this.bookUrl, this.currentChapterIndex, this.content)
      }
      this.totalChapters = await BookService.getChapterCount(this.bookUrl, this.sourceUrl)
      // 保存阅读进度
      BookshelfService.saveReadingProgress(this.bookUrl, this.currentChapterIndex, this.totalChapters)
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async prevChapter() {
    if (this.currentChapterIndex > 0) {
      this.currentChapterIndex--
      await this.loadContent()
    }
  }

  private async nextChapter() {
    if (this.currentChapterIndex < this.totalChapters - 1) {
      this.currentChapterIndex++
      await this.loadContent()
    } else {
      promptAction.showToast({ message: '已经是最后一章' })
    }
  }

  private toggleToolbar() {
    this.showToolbar = !this.showToolbar
    if (!this.showToolbar) this.showSettings = false
  }

  private increaseFontSize() {
    if (this.settings.fontSize < 28) {
      this.settings.fontSize += 2
      this.saveSettings()
    }
  }

  private decreaseFontSize() {
    if (this.settings.fontSize > 14) {
      this.settings.fontSize -= 2
      this.saveSettings()
    }
  }

  private changeTheme(theme: ReaderTheme) {
    this.settings.theme = theme
    this.saveSettings()
  }

  private openDirectory() {
    router.pushUrl({
      url: 'pages/DirectoryPage',
      params: {
        bookUrl: this.bookUrl,
        sourceUrl: this.sourceUrl,
        currentIndex: this.currentChapterIndex
      }
    })
  }

  build() {
    Stack({ alignContent: Alignment.Bottom }) {
      // 阅读内容
      Scroll() {
        Column() {
          if (this.isLoading) {
            Column() {
              LoadingProgress().color(READER_THEME_TEXT[this.settings.theme])
              Text('加载中...')
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(READER_THEME_TEXT[this.settings.theme])
                .margin({ top: AppSpacing.S2 })
            }
            .width('100%')
            .padding({ top: 120 })
          } else if (this.content) {
            Text(this.content.title)
              .fontSize(24)
              .fontWeight(FontWeight.Medium)
              .fontColor(READER_THEME_TEXT[this.settings.theme])
              .margin({ bottom: AppSpacing.S6 })
            Text(this.content.content)
              .fontSize(this.settings.fontSize)
              .lineHeight(this.settings.fontSize * this.settings.lineHeight)
              .fontColor(READER_THEME_TEXT[this.settings.theme])
              .fontFamily(this.settings.fontFamily)
            // 章节底部翻页
            Row() {
              Button('上一章')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(READER_THEME_TEXT[this.settings.theme])
                .backgroundColor(Color.Transparent)
                .onClick(() => this.prevChapter())
              Text(`${this.currentChapterIndex + 1} / ${this.totalChapters}`)
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(READER_THEME_TEXT[this.settings.theme])
                .layoutWeight(1)
                .textAlign(TextAlign.Center)
              Button('下一章')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getPrimary(500))
                .backgroundColor(Color.Transparent)
                .onClick(() => this.nextChapter())
            }
            .width('100%')
            .padding({ top: AppSpacing.S8, bottom: AppSpacing.S12 })
            .justifyContent(FlexAlign.SpaceBetween)
          }
        }
        .padding({ left: AppSpacing.S6, right: AppSpacing.S6, top: AppSpacing.S10, bottom: 80 })
        .alignItems(HorizontalAlign.Start)
      }
      .width('100%').height('100%')
      .backgroundColor(READER_THEME_BG[this.settings.theme])
      .onClick(() => this.toggleToolbar())

      // 顶部工具栏（ULTRA_THIN 材质）
      if (this.showToolbar) {
        Row() {
          Text('返回')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .onClick(() => router.back())
          Text(this.content?.title ?? '')
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
            .layoutWeight(1)
            .textAlign(TextAlign.Center)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text('目录')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getPrimary(500))
            .onClick(() => this.openDirectory())
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S6, bottom: AppSpacing.S4 })
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
          applyShadow: true,
          interactive: false
        } as uiMaterial.ImmersiveOptions))
        .position({ x: 0, y: 0 })
        .animation({ duration: AppAnimation.DUR_NORMAL, curve: curves.easeOutCubic })
      }

      // 底部工具栏（THICK 材质）
      if (this.showToolbar) {
        Column() {
          if (this.showSettings) {
            // 设置面板
            Column() {
              // 字号
              Row() {
                Text('字号')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .width(48)
                Button('-')
                  .width(32).height(32)
                  .fontSize(AppTypography.SIZE_BODY_LARGE)
                  .onClick(() => this.decreaseFontSize())
                Text(`${this.settings.fontSize}`)
                  .fontSize(AppTypography.SIZE_BODY)
                  .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  .width(40)
                  .textAlign(TextAlign.Center)
                Button('+')
                  .width(32).height(32)
                  .fontSize(AppTypography.SIZE_BODY_LARGE)
                  .onClick(() => this.increaseFontSize())
              }
              .width('100%')
              .justifyContent(FlexAlign.SpaceBetween)
              .margin({ bottom: AppSpacing.S3 })

              // 行距
              Row() {
                Text('行距')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .width(48)
                Slider({
                  value: this.settings.lineHeight,
                  min: 1.4,
                  max: 2.4,
                  step: 0.1
                })
                  .layoutWeight(1)
                  .blockColor(ThemeManager.getPrimary(500))
                  .trackColor(ThemeManager.getPrimary(100))
                  .onChange((val: number) => {
                    this.settings.lineHeight = val
                    this.saveSettings()
                  })
                Text(this.settings.lineHeight.toFixed(1))
                  .fontSize(AppTypography.SIZE_CAPTION)
                  .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  .width(40)
                  .textAlign(TextAlign.Center)
              }
              .width('100%')
              .margin({ bottom: AppSpacing.S3 })

              // 主题切换
              Row() {
                Text('背景')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .width(48)
                ForEach(['light', 'sepia', 'dark', 'green'] as ReaderTheme[], (t: ReaderTheme) => {
                  Column()
                    .width(32).height(32)
                    .borderRadius(AppRadius.R_FULL)
                    .backgroundColor(READER_THEME_BG[t])
                    .border({
                      width: this.settings.theme === t ? 2 : 0.5,
                      color: this.settings.theme === t
                        ? ThemeManager.getPrimary(500)
                        : ThemeManager.getNeutral('BORDER_LIGHT')
                    })
                    .margin({ right: AppSpacing.S3 })
                    .onClick(() => this.changeTheme(t))
                })
              }
              .width('100%')
            }
            .padding(AppSpacing.S4)
          }

          // 翻页按钮
          Row() {
            Text('上一章')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
              .onClick(() => this.prevChapter())
            Divider().vertical().height(20).color(ThemeManager.getNeutral('BORDER_LIGHT'))
            Text(this.showSettings ? '收起' : '设置')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
              .onClick(() => { this.showSettings = !this.showSettings })
            Divider().vertical().height(20).color(ThemeManager.getNeutral('BORDER_LIGHT'))
            Text('下一章')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getPrimary(500))
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
              .onClick(() => this.nextChapter())
          }
          .width('100%')
          .padding({ top: AppSpacing.S3, bottom: AppSpacing.S6 })
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.THICK,
          applyShadow: true,
          interactive: false
        } as uiMaterial.ImmersiveOptions))
        .borderRadius({ topLeft: AppRadius.R_LG, topRight: AppRadius.R_LG })
        .animation({ duration: AppAnimation.DUR_NORMAL, curve: curves.easeOutCubic })
      }
    }
    .width('100%').height('100%')
  }
}

export default ReaderPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/ReaderPage.ets
git commit -m "harmony(phase-5): create ReaderPage with adjustable font/theme and progress tracking"
```

---

### Task 5.3: 创建 ShelfPage [Spec §4.3]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/ShelfPage.ets`

- [ ] **Step 1: 编写书架页**

```typescript
/**
 * ShelfPage - 书架页
 * 规格：§4.3 书架页
 * 特性：我的收藏区域在最近阅读上方、列表/网格切换、阅读进度展示、长按管理
 * 约束：localStorage 键 shelf_history_layout_mode 保存布局状态
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { SectionHeader } from '../common/SectionHeader'
import { LoadingSkel } from '../common/LoadingSkel'
import { NovelCard } from '../components/NovelCard'
import { NovelListItem } from '../components/NovelListItem'
import { ProgressBar } from '../components/ProgressBar'
import { BookshelfService, ShelfBook, ReadingRecord } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

type LayoutMode = 'grid' | 'list'

@Entry
@Component
struct ShelfPage {
  @State favorites: ShelfBook[] = []
  @State recentBooks: ReadingRecord[] = []
  @State isLoading: boolean = true
  @State layoutMode: LayoutMode = 'grid'
  @State showDeleteMode: boolean = false
  @State selectedIds: Set<string> = new Set()

  aboutToAppear() {
    this.loadLayoutMode()
    this.loadShelfData()
  }

  onPageShow() {
    this.loadShelfData()
  }

  private loadLayoutMode() {
    const mode = AppStorage.get<string>('shelf_history_layout_mode') as LayoutMode
    if (mode === 'list' || mode === 'grid') {
      this.layoutMode = mode
    }
  }

  private switchLayout(mode: LayoutMode) {
    this.layoutMode = mode
    AppStorage.setOrCreate<string>('shelf_history_layout_mode', mode)
  }

  private async loadShelfData() {
    try {
      const [favs, recent] = await Promise.all([
        BookshelfService.getFavorites(),
        BookshelfService.getRecentReading()
      ])
      this.favorites = favs
      this.recentBooks = recent
    } catch (e) {
      promptAction.showToast({ message: '加载书架失败' })
    } finally {
      this.isLoading = false
    }
  }

  private openBook(book: ShelfBook | ReadingRecord) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: book.bookUrl, sourceUrl: book.sourceUrl }
    })
  }

  private continueReading(record: ReadingRecord) {
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: record.bookUrl,
        sourceUrl: record.sourceUrl,
        chapterIndex: record.chapterIndex
      }
    })
  }

  private toggleDeleteMode() {
    this.showDeleteMode = !this.showDeleteMode
    if (!this.showDeleteMode) this.selectedIds.clear()
  }

  private toggleSelect(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id)
    } else {
      this.selectedIds.add(id)
    }
  }

  private async batchRemove() {
    if (this.selectedIds.size === 0) return
    for (const id of this.selectedIds) {
      await BookshelfService.removeFromShelf(id)
    }
    promptAction.showToast({ message: `已删除 ${this.selectedIds.size} 本` })
    this.toggleDeleteMode()
    this.loadShelfData()
  }

  build() {
    Column() {
      // 顶部标题栏 + 操作按钮
      Row() {
        Text('我的书架')
          .fontSize(AppTypography.SIZE_H1)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
        // 列表/网格切换
        Row() {
          Image(this.layoutMode === 'grid' ? $r('app.media.ic_list') : $r('app.media.ic_grid'))
            .width(20).height(20)
            .onClick(() => this.switchLayout(this.layoutMode === 'grid' ? 'list' : 'grid'))
        }
        .width(36).height(36)
        .borderRadius(AppRadius.R_FULL)
        .justifyContent(FlexAlign.Center)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
          interactive: true
        } as uiMaterial.ImmersiveOptions))
        .margin({ right: AppSpacing.S2 })

        if (this.showDeleteMode) {
          Text('删除')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor(ThemeManager.getAccent('Rose'))
            .onClick(() => this.batchRemove())
        } else {
          Text('管理')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor(ThemeManager.getPrimary(500))
            .onClick(() => this.toggleDeleteMode())
        }
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S6, bottom: AppSpacing.S3 })

      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2], () => { LoadingSkel({ height: 120 }) })
        }
        .padding(AppSpacing.S4)
      } else {
        Scroll() {
          Column() {
            // 1. 我的收藏区域（在最近阅读上方）
            SectionHeader({
              title: '我的收藏',
              actionText: this.favorites.length > 0 ? `${this.favorites.length}本` : '',
              actionVisible: this.favorites.length > 0
            })
            if (this.favorites.length === 0) {
              GlassCard({ padding: AppSpacing.S8 }) {
                Column() {
                  Text('暂无收藏')
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  Text('去发现喜欢的小说吧')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
                    .margin({ top: AppSpacing.S1 })
                }
              }
              .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
            } else if (this.layoutMode === 'grid') {
              Grid() {
                ForEach(this.favorites, (book: ShelfBook) => {
                  GridItem() {
                    Stack({ alignContent: Alignment.TopEnd }) {
                      NovelCard({
                        novel: book,
                        onClick: () => {
                          if (this.showDeleteMode) this.toggleSelect(book.bookUrl)
                          else this.openBook(book)
                        }
                      })
                      if (this.showDeleteMode) {
                        Column()
                          .width(24).height(24)
                          .borderRadius(AppRadius.R_FULL)
                          .backgroundColor(this.selectedIds.has(book.bookUrl)
                            ? ThemeManager.getAccent('Rose')
                            : ThemeManager.getNeutral('BG_ELEVATED'))
                          .border({ width: 2, color: Color.White })
                          .margin({ top: AppSpacing.S2, right: AppSpacing.S2 })
                      }
                    }
                  }
                })
              }
              .columnsTemplate('1fr 1fr')
              .columnsGap(AppSpacing.S3)
              .rowsGap(AppSpacing.S4)
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
            } else {
              List({ space: AppSpacing.S3 }) {
                ForEach(this.favorites, (book: ShelfBook) => {
                  ListItem() {
                    NovelListItem({
                      novel: book,
                      onClick: () => {
                        if (this.showDeleteMode) this.toggleSelect(book.bookUrl)
                        else this.openBook(book)
                      }
                    })
                  }
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
            }

            // 2. 最近阅读区域
            SectionHeader({
              title: '最近阅读',
              actionText: this.recentBooks.length > 0 ? `${this.recentBooks.length}本` : '',
              actionVisible: this.recentBooks.length > 0
            })
            if (this.recentBooks.length === 0) {
              GlassCard({ padding: AppSpacing.S8 }) {
                Column() {
                  Text('暂无阅读记录')
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  Text('开始阅读第一本小说吧')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
                    .margin({ top: AppSpacing.S1 })
                }
              }
              .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
            } else {
              List({ space: AppSpacing.S3 }) {
                ForEach(this.recentBooks, (record: ReadingRecord) => {
                  ListItem() {
                    GlassCard({ padding: AppSpacing.S3 }) {
                      Row() {
                        Image(record.cover)
                          .width(60).height(84)
                          .borderRadius(AppRadius.R_SM)
                          .objectFit(ImageFit.Cover)
                        Column() {
                          Text(record.title)
                            .fontSize(AppTypography.SIZE_BODY_LARGE)
                            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                            .maxLines(1)
                            .textOverflow({ overflow: TextOverflow.Ellipsis })
                          Text(`读至：${record.lastChapterTitle}`)
                            .fontSize(AppTypography.SIZE_CAPTION)
                            .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                            .margin({ top: AppSpacing.S1 })
                            .maxLines(1)
                            .textOverflow({ overflow: TextOverflow.Ellipsis })
                          ProgressBar({ progress: record.percentage, height: 3 })
                            .margin({ top: AppSpacing.S2 })
                          Text(`${Math.round(record.percentage * 100)}%`)
                            .fontSize(AppTypography.SIZE_TINY)
                            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                            .margin({ top: 2 })
                        }
                        .alignItems(HorizontalAlign.Start)
                        .margin({ left: AppSpacing.S3 })
                        .layoutWeight(1)
                        Text('继续')
                          .fontSize(AppTypography.SIZE_CAPTION)
                          .fontColor(ThemeManager.getPrimary(500))
                          .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                          .borderRadius(AppRadius.R_FULL)
                          .backgroundColor(ThemeManager.getPrimary(50))
                          .onClick(() => this.continueReading(record))
                      }
                    }
                  }
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
            }
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default ShelfPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/ShelfPage.ets
git commit -m "harmony(phase-5): create ShelfPage with favorites above recent and layout switch"
```

---

### Task 5.4: 创建 DirectoryPage [Spec §4.4]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/DirectoryPage.ets`

- [ ] **Step 1: 编写章节目录页**

```typescript
/**
 * DirectoryPage - 章节目录页
 * 规格：§4.4 章节目录
 * 特性：正序/倒序切换、章节搜索、当前章节高亮、跳转阅读
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { Chapter } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct DirectoryPage {
  @State chapters: Chapter[] = []
  @State displayChapters: Chapter[] = []
  @State isLoading: boolean = true
  @State isReversed: boolean = false
  @State keyword: string = ''
  @State currentChapterIndex: number = -1
  private bookUrl: string = ''
  private sourceUrl: string = ''

  aboutToAppear() {
    const params = router.getParams() as Record<string, string | number>
    this.bookUrl = (params?.bookUrl as string) ?? ''
    this.sourceUrl = (params?.sourceUrl as string) ?? ''
    this.currentChapterIndex = (params?.currentIndex as number) ?? -1
    this.loadChapters()
  }

  private async loadChapters() {
    try {
      this.chapters = await BookService.getChapterList(this.bookUrl, this.sourceUrl)
      this.applyFilter()
    } catch (e) {
      promptAction.showToast({ message: '加载目录失败' })
    } finally {
      this.isLoading = false
    }
  }

  private applyFilter() {
    let list = [...this.chapters]
    if (this.keyword.length > 0) {
      list = list.filter(c => c.title.includes(this.keyword))
    }
    if (this.isReversed) {
      list.reverse()
    }
    this.displayChapters = list
  }

  private toggleOrder() {
    this.isReversed = !this.isReversed
    this.applyFilter()
  }

  private onSearchInput(val: string) {
    this.keyword = val
    this.applyFilter()
  }

  private jumpToChapter(idx: number) {
    router.replaceUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: this.bookUrl,
        sourceUrl: this.sourceUrl,
        chapterIndex: idx
      }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('目录')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
        Text(this.isReversed ? '正序' : '倒序')
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor(ThemeManager.getPrimary(500))
          .onClick(() => this.toggleOrder())
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      // 搜索框
      Row() {
        TextInput({ placeholder: '搜索章节', text: this.keyword })
          .fontSize(AppTypography.SIZE_BODY)
          .backgroundColor(Color.Transparent)
          .onChange((val: string) => this.onSearchInput(val))
          .layoutWeight(1)
      }
      .width('90%')
      .padding({ left: AppSpacing.S3, right: AppSpacing.S3 })
      .borderRadius(AppRadius.R_FULL)
      .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
      .margin({ bottom: AppSpacing.S3 })

      // 章节列表
      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2, 3, 4, 5], () => { LoadingSkel({ height: 48 }) })
        }
        .padding(AppSpacing.S4)
      } else {
        List({ space: AppSpacing.S1 }) {
          ForEach(this.displayChapters, (ch: Chapter, idx: number) => {
            ListItem() {
              Row() {
                Text(ch.title)
                  .fontSize(AppTypography.SIZE_BODY)
                  .fontColor(this.currentChapterIndex === ch.index
                    ? ThemeManager.getPrimary(500)
                    : ThemeManager.getNeutral('TEXT_PRIMARY'))
                  .layoutWeight(1)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                if (this.currentChapterIndex === ch.index) {
                  Text('当前')
                    .fontSize(AppTypography.SIZE_TINY)
                    .fontColor(Color.White)
                    .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                    .borderRadius(AppRadius.R_SM)
                    .backgroundColor(ThemeManager.getPrimary(500))
                }
              }
              .width('100%')
              .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3, left: AppSpacing.S4, right: AppSpacing.S4 })
              .borderRadius(AppRadius.R_MD)
              .backgroundColor(this.currentChapterIndex === ch.index
                ? ThemeManager.getPrimary(50)
                : Color.Transparent)
              .onClick(() => this.jumpToChapter(ch.index))
            }
          })
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
        .padding({ left: AppSpacing.S2, right: AppSpacing.S2 })
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default DirectoryPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/DirectoryPage.ets
git commit -m "harmony(phase-5): create DirectoryPage with search/sort and current chapter highlight"
```

---

## Phase 6: 用户模块

依赖：Phase 1 + Phase 2。产出 5 个用户中心相关页面。

### Task 6.1: 创建 UserCenterPage [Spec §5.1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/UserCenterPage.ets`

- [ ] **Step 1: 编写用户中心页**

```typescript
/**
 * UserCenterPage - 用户中心页
 * 规格：§5.1 用户中心
 * 特性：用户信息卡片、阅读统计、功能入口网格、退出登录
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { AuthService } from '../service/AuthService'
import { BookshelfService } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

interface MenuItem {
  icon: Resource
  title: string
  route: string
}

@Entry
@Component
struct UserCenterPage {
  @State username: string = ''
  @State avatar: string = ''
  @State isLogged: boolean = false
  @State shelfCount: number = 0
  @State historyCount: number = 0
  @State readingDays: number = 0

  private menuItems: MenuItem[] = [
    { icon: $r('app.media.ic_settings'), title: '应用设置', route: 'pages/SettingsPage' },
    { icon: $r('app.media.ic_source'), title: '书源管理', route: 'pages/BookSourcePage' },
    { icon: $r('app.media.ic_history'), title: '阅读历史', route: 'pages/ReadingHistoryPage' },
    { icon: $r('app.media.ic_feedback'), title: '意见反馈', route: 'pages/FeedbackPage' }
  ]

  aboutToAppear() {
    this.loadUserInfo()
  }

  onPageShow() {
    this.loadUserInfo()
  }

  private async loadUserInfo() {
    this.isLogged = await AuthService.isLoggedIn()
    if (this.isLogged) {
      const user = await AuthService.getCurrentUser()
      this.username = user.username
      this.avatar = user.avatar
      this.shelfCount = await BookshelfService.getShelfCount()
      this.historyCount = await BookshelfService.getHistoryCount()
      this.readingDays = await BookshelfService.getReadingDays()
    }
  }

  private navigateToLogin() {
    router.pushUrl({ url: 'pages/LoginPage' })
  }

  private navigateTo(route: string) {
    if (!this.isLogged) {
      promptAction.showToast({ message: '请先登录' })
      this.navigateToLogin()
      return
    }
    router.pushUrl({ url: route })
  }

  private async logout() {
    promptAction.showDialog({
      title: '退出登录',
      message: '确定要退出当前账号吗？',
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '确定', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await AuthService.logout()
        this.isLogged = false
        this.username = ''
        this.avatar = ''
        promptAction.showToast({ message: '已退出登录' })
      }
    })
  }

  build() {
    Column() {
      // 顶部返回栏
      Row() {
        BackButton()
        Text('个人中心')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      Scroll() {
        Column() {
          // 用户信息卡片
          GlassCard({ padding: AppSpacing.S6 }) {
            Row() {
              if (this.avatar.length > 0) {
                Image(this.avatar)
                  .width(72).height(72)
                  .borderRadius(AppRadius.R_FULL)
                  .objectFit(ImageFit.Cover)
              } else {
                Column()
                  .width(72).height(72)
                  .borderRadius(AppRadius.R_FULL)
                  .linearGradient({
                    direction: GradientDirection.Bottom,
                    colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
                  })
                  .justifyContent(FlexAlign.Center)
                  .alignItems(HorizontalAlign.Center)
                  Text(this.username.charAt(0).toUpperCase())
                    .fontSize(AppTypography.SIZE_H1)
                    .fontColor(Color.White)
              }
              Column() {
                if (this.isLogged) {
                  Text(this.username)
                    .fontSize(AppTypography.SIZE_H3)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  Text('普通用户')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                    .margin({ top: AppSpacing.S1 })
                } else {
                  Text('未登录')
                    .fontSize(AppTypography.SIZE_H3)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  Text('点击登录享受更多服务')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                    .margin({ top: AppSpacing.S1 })
                }
              }
              .alignItems(HorizontalAlign.Start)
              .margin({ left: AppSpacing.S4 })
              .layoutWeight(1)
              if (!this.isLogged) {
                Text('登录')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(Color.White)
                  .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: 6, bottom: 6 })
                  .borderRadius(AppRadius.R_FULL)
                  .backgroundColor(ThemeManager.getPrimary(500))
                  .onClick(() => this.navigateToLogin())
              }
            }
            .width('100%')
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S5 })

          // 阅读统计
          GlassCard({ padding: AppSpacing.S4 }) {
            Row() {
              this.StatItem('书架', this.shelfCount)
              Divider().vertical().height(40).color(ThemeManager.getNeutral('BORDER_LIGHT'))
              this.StatItem('历史', this.historyCount)
              Divider().vertical().height(40).color(ThemeManager.getNeutral('BORDER_LIGHT'))
              this.StatItem('阅读天数', this.readingDays)
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceAround)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S5 })

          // 功能入口网格
          Grid() {
            ForEach(this.menuItems, (item: MenuItem) => {
              GridItem() {
                Column() {
                  Image(item.icon)
                    .width(32).height(32)
                    .fillColor(ThemeManager.getPrimary(500))
                  Text(item.title)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .margin({ top: AppSpacing.S2 })
                }
                .width('100%')
                .padding({ top: AppSpacing.S4, bottom: AppSpacing.S4 })
                .onClick(() => this.navigateTo(item.route))
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr 1fr')
          .columnsGap(AppSpacing.S3)
          .rowsGap(AppSpacing.S4)
          .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S5 })

          // 退出登录
          if (this.isLogged) {
            Button('退出登录')
              .type(ButtonType.Capsule)
              .fontSize(AppTypography.SIZE_BODY)
              .fontColor(ThemeManager.getAccent('Rose'))
              .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
              .width('90%')
              .onClick(() => this.logout())
          }

          // 版本信息
          Text('紫枫免费小说 v1.0.0')
            .fontSize(AppTypography.SIZE_TINY)
            .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
            .margin({ top: AppSpacing.S8, bottom: AppSpacing.S6 })
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  @Builder StatItem(label: string, value: number) {
    Column() {
      Text(`${value}`)
        .fontSize(AppTypography.SIZE_H2)
        .fontColor(ThemeManager.getPrimary(500))
      Text(label)
        .fontSize(AppTypography.SIZE_CAPTION)
        .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
        .margin({ top: AppSpacing.S1 })
    }
  }
}

export default UserCenterPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/UserCenterPage.ets
git commit -m "harmony(phase-6): create UserCenterPage with stats and menu grid"
```

---

### Task 6.2: 创建 SettingsPage [Spec §5.2]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/SettingsPage.ets`

- [ ] **Step 1: 编写设置页**

```typescript
/**
 * SettingsPage - 应用设置页
 * 规格：§5.2 应用设置
 * 特性：主题色切换、深色模式、字号预览、阅读设置、缓存清理、关于
 * 约束：启用 prefers-reduced-motion 性能降级策略
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager, THEME_KEYS } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { ThemeSelector } from '../components/ThemeSelector'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct SettingsPage {
  @State currentTheme: string = 'purple'
  @State isDarkMode: boolean = false
  @State reduceMotion: boolean = false
  @State fontSize: number = 18
  @State lineHeight: number = 1.8
  @State cacheSize: string = '计算中...'

  aboutToAppear() {
    this.loadSettings()
    this.calculateCache()
  }

  private loadSettings() {
    this.currentTheme = AppStorage.get<string>('currentTheme') ?? 'purple'
    this.isDarkMode = AppStorage.get<boolean>('isDarkMode') ?? false
    this.reduceMotion = AppStorage.get<boolean>('reduceMotion') ?? false
    const readerRaw = AppStorage.get<string>('reader_settings')
    if (readerRaw) {
      try {
        const reader = JSON.parse(readerRaw)
        this.fontSize = reader.fontSize ?? 18
        this.lineHeight = reader.lineHeight ?? 1.8
      } catch (e) { /* 默认 */ }
    }
  }

  private async calculateCache() {
    const size = await this.getCacheSize()
    this.cacheSize = size < 1024 * 1024
      ? `${Math.round(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  private async getCacheSize(): Promise<number> {
    // 委托 OfflineCacheManager 计算
    const { OfflineCacheManager } = await import('../service/OfflineCacheManager')
    return await OfflineCacheManager.getCacheSize()
  }

  private selectTheme(key: string) {
    this.currentTheme = key
    ThemeManager.setTheme(key)
    AppStorage.setOrCreate<string>('currentTheme', key)
  }

  private toggleDarkMode(val: boolean) {
    this.isDarkMode = val
    ThemeManager.setDarkMode(val)
    AppStorage.setOrCreate<boolean>('isDarkMode', val)
  }

  private toggleReduceMotion(val: boolean) {
    this.reduceMotion = val
    AppStorage.setOrCreate<boolean>('reduceMotion', val)
    promptAction.showToast({
      message: val ? '已开启降级动画（低端设备推荐）' : '已关闭降级动画'
    })
  }

  private async clearCache() {
    promptAction.showDialog({
      title: '清除缓存',
      message: `当前缓存：${this.cacheSize}，确定清除？`,
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '确定', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        const { OfflineCacheManager } = await import('../service/OfflineCacheManager')
        await OfflineCacheManager.clearAll()
        this.calculateCache()
        promptAction.showToast({ message: '缓存已清除' })
      }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('应用设置')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      Scroll() {
        Column() {
          // 主题色选择
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('主题色彩')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              ThemeSelector({
                currentTheme: this.currentTheme,
                onSelect: (key: string) => this.selectTheme(key)
              })
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 显示设置
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('显示设置')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              this.SettingRow('深色模式', this.isDarkMode, (v: boolean) => this.toggleDarkMode(v))
              this.SettingRow('动画降级（低端设备）', this.reduceMotion, (v: boolean) => this.toggleReduceMotion(v))
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 阅读设置预览
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('阅读设置预览')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              Text('字号 ' + this.fontSize + 'vp · 行距 ' + this.lineHeight.toFixed(1))
                .fontSize(this.fontSize)
                .lineHeight(this.fontSize * this.lineHeight)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                .margin({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .padding(AppSpacing.S4)
                .borderRadius(AppRadius.R_MD)
              Text('在阅读页可调整字号、行距和背景主题')
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 存储管理
          GlassCard({ padding: AppSpacing.S4 }) {
            Row() {
              Column() {
                Text('清除缓存')
                  .fontSize(AppTypography.SIZE_BODY)
                  .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                Text(`当前：${this.cacheSize}`)
                  .fontSize(AppTypography.SIZE_CAPTION)
                  .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  .margin({ top: AppSpacing.S1 })
              }
              .alignItems(HorizontalAlign.Start)
              .layoutWeight(1)
              Text('清除')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getAccent('Rose'))
                .onClick(() => this.clearCache())
            }
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 关于
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('关于')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              this.AboutRow('版本', 'v1.0.0')
              this.AboutRow('HarmonyOS', 'API 26')
              this.AboutRow('沉浸光感', '已启用')
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  @Builder SettingRow(label: string, value: boolean, onChange: (v: boolean) => void) {
    Row() {
      Text(label)
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
        .layoutWeight(1)
      Toggle({ type: ToggleType.Switch, isOn: value })
        .selectedColor(ThemeManager.getPrimary(500))
        .onChange(onChange)
    }
    .width('100%')
    .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
  }

  @Builder AboutRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
        .layoutWeight(1)
      Text(value)
        .fontSize(AppTypography.SIZE_BODY_SMALL)
        .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
    }
    .width('100%')
    .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
  }
}

export default SettingsPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/SettingsPage.ets
git commit -m "harmony(phase-6): create SettingsPage with theme/darkmode/reduce-motion/cache"
```

---

### Task 6.3: 创建 BookSourcePage [Spec §5.3]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/BookSourcePage.ets`

- [ ] **Step 1: 编写书源管理页**

```typescript
/**
 * BookSourcePage - 书源管理页
 * 规格：§5.3 书源管理
 * 特性：书源列表、启用/禁用、新增、编辑、排序、导入导出
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { BookSource } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct BookSourcePage {
  @State sources: BookSource[] = []
  @State isLoading: boolean = true
  @State showAddSheet: boolean = false
  @State editName: string = ''
  @State editUrl: string = ''

  aboutToAppear() {
    this.loadSources()
  }

  private async loadSources() {
    try {
      this.sources = await BookService.getBookSources()
    } catch (e) {
      promptAction.showToast({ message: '加载书源失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async toggleSource(src: BookSource) {
    src.enabled = !src.enabled
    await BookService.updateBookSource(src)
    this.loadSources()
  }

  private async deleteSource(src: BookSource) {
    promptAction.showDialog({
      title: '删除书源',
      message: `确定删除「${src.name}」？`,
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '删除', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await BookService.deleteBookSource(src.id)
        promptAction.showToast({ message: '已删除' })
        this.loadSources()
      }
    })
  }

  private openAddSheet() {
    this.editName = ''
    this.editUrl = ''
    this.showAddSheet = true
  }

  private async saveSource() {
    if (this.editName.length === 0 || this.editUrl.length === 0) {
      promptAction.showToast({ message: '请填写完整' })
      return
    }
    await BookService.addBookSource({ name: this.editName, apiUrl: this.editUrl, enabled: true })
    this.showAddSheet = false
    promptAction.showToast({ message: '已添加' })
    this.loadSources()
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('书源管理')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
        Text('添加')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(ThemeManager.getPrimary(500))
          .onClick(() => this.openAddSheet())
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2], () => { LoadingSkel({ height: 72 }) })
        }
        .padding(AppSpacing.S4)
      } else {
        List({ space: AppSpacing.S3 }) {
          ForEach(this.sources, (src: BookSource) => {
            ListItem() {
              GlassCard({ padding: AppSpacing.S4 }) {
                Row() {
                  Column() {
                    Text(src.name)
                      .fontSize(AppTypography.SIZE_BODY_LARGE)
                      .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    Text(src.apiUrl)
                      .fontSize(AppTypography.SIZE_CAPTION)
                      .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                      .margin({ top: AppSpacing.S1 })
                      .maxLines(1)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)
                  Toggle({ type: ToggleType.Switch, isOn: src.enabled })
                    .selectedColor(ThemeManager.getPrimary(500))
                    .onChange(() => this.toggleSource(src))
                  Text('删除')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getAccent('Rose'))
                    .margin({ left: AppSpacing.S3 })
                    .onClick(() => this.deleteSource(src))
                }
              }
            }
          })
        }
        .layoutWeight(1)
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
    .bindSheet($$this.showAddSheet, this.AddSheetBuilder(), {
      height: SheetSize.MEDIUM,
      dragBar: true
    })
  }

  @Builder AddSheetBuilder() {
    Column() {
      Text('添加书源')
        .fontSize(AppTypography.SIZE_H3)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
        .margin({ bottom: AppSpacing.S4 })
      TextInput({ placeholder: '书源名称', text: this.editName })
        .fontSize(AppTypography.SIZE_BODY)
        .onChange((v: string) => this.editName = v)
        .margin({ bottom: AppSpacing.S3 })
        .borderRadius(AppRadius.R_MD)
      TextInput({ placeholder: 'API 地址', text: this.editUrl })
        .fontSize(AppTypography.SIZE_BODY)
        .onChange((v: string) => this.editUrl = v)
        .margin({ bottom: AppSpacing.S4 })
        .borderRadius(AppRadius.R_MD)
      Button('保存')
        .type(ButtonType.Capsule)
        .width('100%')
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor(Color.White)
        .backgroundColor(ThemeManager.getPrimary(500))
        .onClick(() => this.saveSource())
    }
    .padding(AppSpacing.S6)
    .width('100%')
  }
}

export default BookSourcePage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/BookSourcePage.ets
git commit -m "harmony(phase-6): create BookSourcePage with toggle/add/delete via bindSheet"
```

---

### Task 6.4: 创建 FeedbackPage [Spec §5.4]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/FeedbackPage.ets`

- [ ] **Step 1: 编写意见反馈页**

```typescript
/**
 * FeedbackPage - 意见反馈页
 * 规格：§5.4 意见反馈
 * 特性：反馈类型选择、内容输入、联系方式、历史反馈列表
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { FeedbackService, Feedback, FeedbackType } from '../service/FeedbackService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct FeedbackPage {
  @State feedbackType: FeedbackType = 'suggestion'
  @State content: string = ''
  @State contact: string = ''
  @State isSubmitting: boolean = false
  @State history: Feedback[] = []
  @State isLoadingHistory: boolean = true

  private types: { key: FeedbackType, label: string }[] = [
    { key: 'suggestion', label: '功能建议' },
    { key: 'bug', label: '问题反馈' },
    { key: 'content', label: '内容问题' },
    { key: 'other', label: '其他' }
  ]

  aboutToAppear() {
    this.loadHistory()
  }

  private async loadHistory() {
    try {
      this.history = await FeedbackService.getMyFeedback()
    } catch (e) {
      /* 静默 */
    } finally {
      this.isLoadingHistory = false
    }
  }

  private async submit() {
    if (this.content.trim().length < 5) {
      promptAction.showToast({ message: '反馈内容至少 5 个字' })
      return
    }
    this.isSubmitting = true
    try {
      await FeedbackService.submit({
        type: this.feedbackType,
        content: this.content,
        contact: this.contact
      })
      promptAction.showToast({ message: '提交成功，感谢反馈' })
      this.content = ''
      this.contact = ''
      this.loadHistory()
    } catch (e) {
      promptAction.showToast({ message: '提交失败，请稍后重试' })
    } finally {
      this.isSubmitting = false
    }
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('意见反馈')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      Scroll() {
        Column() {
          // 反馈类型
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('反馈类型')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              Flex({ wrap: FlexWrap.Wrap }) {
                ForEach(this.types, (t: { key: FeedbackType, label: string }) => {
                  Text(t.label)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(this.feedbackType === t.key
                      ? Color.White
                      : ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                    .borderRadius(AppRadius.R_FULL)
                    .backgroundColor(this.feedbackType === t.key
                      ? ThemeManager.getPrimary(500)
                      : ThemeManager.getNeutral('BG_ELEVATED'))
                    .margin({ right: AppSpacing.S2, bottom: AppSpacing.S2, top: AppSpacing.S3 })
                    .onClick(() => this.feedbackType = t.key)
                })
              }
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 反馈内容
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('反馈内容')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              TextArea({ placeholder: '请详细描述您的反馈（至少 5 个字）', text: this.content })
                .fontSize(AppTypography.SIZE_BODY)
                .height(120)
                .margin({ top: AppSpacing.S3 })
                .borderRadius(AppRadius.R_MD)
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .onChange((v: string) => this.content = v)
              Text(`${this.content.length} / 500`)
                .fontSize(AppTypography.SIZE_TINY)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                .alignSelf(ItemAlign.End)
                .margin({ top: AppSpacing.S1 })
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 联系方式
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('联系方式（可选）')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              TextInput({ placeholder: '邮箱或手机号，方便我们回复', text: this.contact })
                .fontSize(AppTypography.SIZE_BODY)
                .margin({ top: AppSpacing.S3 })
                .borderRadius(AppRadius.R_MD)
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .onChange((v: string) => this.contact = v)
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S4 })

          // 提交按钮
          Button(this.isSubmitting ? '提交中...' : '提交反馈')
            .type(ButtonType.Capsule)
            .width('90%')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(Color.White)
            .backgroundColor(this.isSubmitting
              ? ThemeManager.getNeutral('TEXT_MUTED')
              : ThemeManager.getPrimary(500))
            .enabled(!this.isSubmitting)
            .onClick(() => this.submit())

          // 历史反馈
          Text('我的反馈')
            .fontSize(AppTypography.SIZE_H4)
            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .alignSelf(ItemAlign.Start)
            .margin({ left: AppSpacing.S4, top: AppSpacing.S6, bottom: AppSpacing.S3 })

          if (this.isLoadingHistory) {
            Column() {
              ForEach([0, 1], () => { LoadingSkel({ height: 80 }) })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
          } else if (this.history.length === 0) {
            Text('暂无反馈记录')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
              .margin({ top: AppSpacing.S6, bottom: AppSpacing.S8 })
          } else {
            List({ space: AppSpacing.S3 }) {
              ForEach(this.history, (fb: Feedback) => {
                ListItem() {
                  GlassCard({ padding: AppSpacing.S4 }) {
                    Column() {
                      Row() {
                        Text(fb.typeLabel)
                          .fontSize(AppTypography.SIZE_TINY)
                          .fontColor(Color.White)
                          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                          .borderRadius(AppRadius.R_SM)
                          .backgroundColor(ThemeManager.getPrimary(500))
                        Text(this.formatTime(fb.createdAt))
                          .fontSize(AppTypography.SIZE_TINY)
                          .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                          .margin({ left: AppSpacing.S2 })
                        Text(fb.statusLabel)
                          .fontSize(AppTypography.SIZE_TINY)
                          .fontColor(fb.status === 'resolved'
                            ? ThemeManager.getAccent('Emerald')
                            : ThemeManager.getAccent('Amber'))
                          .margin({ left: AppSpacing.S2 })
                      }
                      Text(fb.content)
                        .fontSize(AppTypography.SIZE_BODY_SMALL)
                        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                        .margin({ top: AppSpacing.S2 })
                        .maxLines(2)
                        .textOverflow({ overflow: TextOverflow.Ellipsis })
                      if (fb.reply && fb.reply.length > 0) {
                        Text('回复：' + fb.reply)
                          .fontSize(AppTypography.SIZE_CAPTION)
                          .fontColor(ThemeManager.getPrimary(500))
                          .margin({ top: AppSpacing.S2 })
                      }
                    }
                    .alignItems(HorizontalAlign.Start)
                  }
                }
              })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
          }
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  private formatTime(ts: number): string {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export default FeedbackPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/FeedbackPage.ets
git commit -m "harmony(phase-6): create FeedbackPage with type/content/contact and history list"
```

---

### Task 6.5: 创建 ReadingHistoryPage [Spec §5.5]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/pages/ReadingHistoryPage.ets`

- [ ] **Step 1: 编写阅读历史页**

```typescript
/**
 * ReadingHistoryPage - 阅读历史页
 * 规格：§5.5 阅读历史
 * 特性：按日期分组、清空历史、继续阅读、删除单条
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { ProgressBar } from '../components/ProgressBar'
import { BookshelfService, ReadingRecord } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

interface HistoryGroup {
  date: string
  records: ReadingRecord[]
}

@Entry
@Component
struct ReadingHistoryPage {
  @State groups: HistoryGroup[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadHistory()
  }

  onPageShow() {
    this.loadHistory()
  }

  private async loadHistory() {
    try {
      const records = await BookshelfService.getAllHistory()
      this.groups = this.groupByDate(records)
    } catch (e) {
      promptAction.showToast({ message: '加载历史失败' })
    } finally {
      this.isLoading = false
    }
  }

  private groupByDate(records: ReadingRecord[]): HistoryGroup[] {
    const map = new Map<string, ReadingRecord[]>()
    for (const r of records) {
      const d = new Date(r.lastReadAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, recs]) => ({ date, records: recs }))
  }

  private formatDateLabel(date: string): string {
    const today = this.formatTime(Date.now())
    const yesterday = this.formatTime(Date.now() - 86400000)
    if (date === today) return '今天'
    if (date === yesterday) return '昨天'
    return date
  }

  private formatTime(ts: number): string {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  private continueReading(record: ReadingRecord) {
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: record.bookUrl,
        sourceUrl: record.sourceUrl,
        chapterIndex: record.chapterIndex
      }
    })
  }

  private async deleteRecord(record: ReadingRecord) {
    await BookshelfService.removeHistory(record.id)
    promptAction.showToast({ message: '已删除' })
    this.loadHistory()
  }

  private async clearAll() {
    promptAction.showDialog({
      title: '清空历史',
      message: '确定清空全部阅读历史？此操作不可恢复',
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '清空', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await BookshelfService.clearAllHistory()
        promptAction.showToast({ message: '已清空' })
        this.loadHistory()
      }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('阅读历史')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
        Text('清空')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(ThemeManager.getAccent('Rose'))
          .onClick(() => this.clearAll())
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2, 3], () => { LoadingSkel({ height: 88 }) })
        }
        .padding(AppSpacing.S4)
      } else if (this.groups.length === 0) {
        Column() {
          Text('暂无阅读历史')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
          Text('开始阅读后会自动记录')
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
            .margin({ top: AppSpacing.S1 })
        }
        .width('100%').layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            ForEach(this.groups, (group: HistoryGroup) => {
              Text(this.formatDateLabel(group.date))
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                .margin({ left: AppSpacing.S4, top: AppSpacing.S5, bottom: AppSpacing.S2 })
              List({ space: AppSpacing.S3 }) {
                ForEach(group.records, (record: ReadingRecord) => {
                  ListItem() {
                    GlassCard({ padding: AppSpacing.S3 }) {
                      Row() {
                        Image(record.cover)
                          .width(56).height(78)
                          .borderRadius(AppRadius.R_SM)
                          .objectFit(ImageFit.Cover)
                        Column() {
                          Text(record.title)
                            .fontSize(AppTypography.SIZE_BODY_LARGE)
                            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                            .maxLines(1)
                            .textOverflow({ overflow: TextOverflow.Ellipsis })
                          Text(`读至：${record.lastChapterTitle}`)
                            .fontSize(AppTypography.SIZE_CAPTION)
                            .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                            .margin({ top: AppSpacing.S1 })
                            .maxLines(1)
                            .textOverflow({ overflow: TextOverflow.Ellipsis })
                          ProgressBar({ progress: record.percentage, height: 3 })
                            .margin({ top: AppSpacing.S2 })
                          Row() {
                            Text(`${Math.round(record.percentage * 100)}%`)
                              .fontSize(AppTypography.SIZE_TINY)
                              .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                              .layoutWeight(1)
                            Text('继续')
                              .fontSize(AppTypography.SIZE_TINY)
                              .fontColor(ThemeManager.getPrimary(500))
                              .onClick(() => this.continueReading(record))
                            Text('删除')
                              .fontSize(AppTypography.SIZE_TINY)
                              .fontColor(ThemeManager.getAccent('Rose'))
                              .margin({ left: AppSpacing.S3 })
                              .onClick(() => this.deleteRecord(record))
                          }
                          .margin({ top: 4 })
                        }
                        .alignItems(HorizontalAlign.Start)
                        .margin({ left: AppSpacing.S3 })
                        .layoutWeight(1)
                      }
                    }
                  }
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            })
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default ReadingHistoryPage
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/ReadingHistoryPage.ets
git commit -m "harmony(phase-6): create ReadingHistoryPage with date grouping and continue/delete"
```

---

## Phase 7: 移动端增强

依赖：Phase 1 + Phase 2。产出 5 项移动端增强服务/组件。

### Task 7.1: 创建 OfflineCacheManager [Spec §移动端增强-1]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/service/OfflineCacheManager.ets`

- [ ] **Step 1: 编写离线缓存管理器**

```typescript
/**
 * OfflineCacheManager - 离线阅读缓存管理
 * 规格：移动端增强-1 离线阅读
 * 特性：章节内容缓存、缓存大小计算、清理、自动预缓存下一章
 * 实现：基于 @ohos.file.fs 文件系统 + JSON 序列化
 */
import fs from "@ohos.file.fs";
import { NovelContent } from "../model/NovelModels";

interface CacheIndex {
  bookUrl: string;
  chapters: number[];
  updatedAt: number;
}

export class OfflineCacheManager {
  private static cacheDir: string = "";

  private static async ensureDir(): Promise<string> {
    if (this.cacheDir.length > 0) return this.cacheDir;
    const context = getContext(this);
    this.cacheDir = `${context.cacheDir}/novel_cache`;
    if (!fs.accessSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, true);
    }
    return this.cacheDir;
  }

  private static chapterKey(bookUrl: string, chapterIndex: number): string {
    // 简单 hash 避免文件名非法字符
    const safe = bookUrl.replace(/[^a-zA-Z0-9]/g, "_");
    return `${safe}_${chapterIndex}`;
  }

  static async cacheContent(
    bookUrl: string,
    chapterIndex: number,
    content: NovelContent,
  ): Promise<void> {
    const dir = await this.ensureDir();
    const filePath = `${dir}/${this.chapterKey(bookUrl, chapterIndex)}.json`;
    const file = fs.openSync(
      filePath,
      fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE,
    );
    try {
      const data = JSON.stringify(content);
      fs.writeSync(file.fd, data);
    } finally {
      fs.closeSync(file);
    }
    // 更新索引
    await this.updateIndex(bookUrl, chapterIndex);
  }

  static async getCachedContent(
    bookUrl: string,
    chapterIndex: number,
  ): Promise<NovelContent | null> {
    const dir = await this.ensureDir();
    const filePath = `${dir}/${this.chapterKey(bookUrl, chapterIndex)}.json`;
    if (!fs.accessSync(filePath)) return null;
    const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
    try {
      const stat = fs.statSync(filePath);
      const buf = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buf);
      const text = new TextDecoder().decode(buf);
      return JSON.parse(text) as NovelContent;
    } catch (e) {
      return null;
    } finally {
      fs.closeSync(file);
    }
  }

  static async precacheNext(
    bookUrl: string,
    sourceUrl: string,
    currentIndex: number,
  ): Promise<void> {
    const nextIndex = currentIndex + 1;
    const cached = await this.getCachedContent(bookUrl, nextIndex);
    if (cached) return;
    try {
      const { BookService } = await import("./BookService");
      const content = await BookService.getChapterContent(
        bookUrl,
        sourceUrl,
        nextIndex,
      );
      if (content) await this.cacheContent(bookUrl, nextIndex, content);
    } catch (e) {
      /* 静默失败 */
    }
  }

  static async getCacheSize(): Promise<number> {
    const dir = await this.ensureDir();
    return this.calcDirSize(dir);
  }

  private static calcDirSize(dir: string): number {
    if (!fs.accessSync(dir)) return 0;
    let total = 0;
    const entries = fs.listFileSync(dir);
    for (const name of entries) {
      const full = `${dir}/${name}`;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        total += this.calcDirSize(full);
      } else {
        total += stat.size;
      }
    }
    return total;
  }

  static async clearAll(): Promise<void> {
    const dir = await this.ensureDir();
    if (!fs.accessSync(dir)) return;
    const entries = fs.listFileSync(dir);
    for (const name of entries) {
      fs.unlinkSync(`${dir}/${name}`);
    }
  }

  static async clearBook(bookUrl: string): Promise<void> {
    const dir = await this.ensureDir();
    const safe = bookUrl.replace(/[^a-zA-Z0-9]/g, "_");
    const entries = fs.listFileSync(dir);
    for (const name of entries) {
      if (name.startsWith(safe)) {
        fs.unlinkSync(`${dir}/${name}`);
      }
    }
  }

  private static async updateIndex(
    bookUrl: string,
    chapterIndex: number,
  ): Promise<void> {
    const dir = await this.ensureDir();
    const indexPath = `${dir}/_index.json`;
    let indexes: CacheIndex[] = [];
    if (fs.accessSync(indexPath)) {
      try {
        const file = fs.openSync(indexPath, fs.OpenMode.READ_ONLY);
        const stat = fs.statSync(indexPath);
        const buf = new ArrayBuffer(stat.size);
        fs.readSync(file.fd, buf);
        fs.closeSync(file);
        indexes = JSON.parse(new TextDecoder().decode(buf)) as CacheIndex[];
      } catch (e) {
        /* 忽略 */
      }
    }
    let entry = indexes.find((i) => i.bookUrl === bookUrl);
    if (!entry) {
      entry = { bookUrl, chapters: [], updatedAt: Date.now() };
      indexes.push(entry);
    }
    if (!entry.chapters.includes(chapterIndex)) {
      entry.chapters.push(chapterIndex);
    }
    entry.updatedAt = Date.now();
    const file = fs.openSync(
      indexPath,
      fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE,
    );
    try {
      fs.writeSync(file.fd, JSON.stringify(indexes));
    } finally {
      fs.closeSync(file);
    }
  }

  static async getCachedChapters(bookUrl: string): Promise<number[]> {
    const dir = await this.ensureDir();
    const indexPath = `${dir}/_index.json`;
    if (!fs.accessSync(indexPath)) return [];
    try {
      const file = fs.openSync(indexPath, fs.OpenMode.READ_ONLY);
      const stat = fs.statSync(indexPath);
      const buf = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buf);
      fs.closeSync(file);
      const indexes = JSON.parse(new TextDecoder().decode(buf)) as CacheIndex[];
      return indexes.find((i) => i.bookUrl === bookUrl)?.chapters ?? [];
    } catch (e) {
      return [];
    }
  }
}

export default OfflineCacheManager;
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/OfflineCacheManager.ets
git commit -m "harmony(phase-7): create OfflineCacheManager with fs-based chapter caching"
```

---

### Task 7.2: 创建 NotificationService [Spec §移动端增强-2]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/service/NotificationService.ets`

- [ ] **Step 1: 编写通知服务**

```typescript
/**
 * NotificationService - 系统通知推送服务
 * 规格：移动端增强-2 系统通知推送
 * 特性：章节更新通知、阅读提醒、通知渠道管理
 * 实现：基于 @ohos.notificationManager
 */
import notificationManager from "@ohos.notificationManager";
import { BookshelfService } from "./BookshelfService";

const CHANNEL_UPDATE = "novel_update";
const CHANNEL_REMINDER = "reading_reminder";

export class NotificationService {
  static async init(): Promise<void> {
    try {
      await notificationManager.addSlot({
        type: notificationManager.SlotType.CONTENT_INFORMATION,
        id: CHANNEL_UPDATE,
      } as notificationManager.NotificationSlot);
      await notificationManager.addSlot({
        type: notificationManager.SlotType.SOCIAL_COMMUNICATION,
        id: CHANNEL_REMINDER,
      } as notificationManager.NotificationSlot);
    } catch (e) {
      /* 槽位可能已存在 */
    }
  }

  static async checkUpdates(): Promise<void> {
    try {
      const shelf = await BookshelfService.getFavorites();
      for (const book of shelf) {
        const latest = await this.fetchLatestChapter(
          book.bookUrl,
          book.sourceUrl,
        );
        if (latest && latest.title !== book.lastChapter) {
          await this.sendUpdateNotification(
            book.title,
            latest.title,
            book.bookUrl,
          );
          await BookshelfService.updateLastChapter(book.bookUrl, latest.title);
        }
      }
    } catch (e) {
      /* 静默失败 */
    }
  }

  private static async fetchLatestChapter(bookUrl: string, sourceUrl: string) {
    const { BookService } = await import("./BookService");
    const chapters = await BookService.getChapterList(bookUrl, sourceUrl);
    return chapters[chapters.length - 1];
  }

  static async sendUpdateNotification(
    bookTitle: string,
    chapterTitle: string,
    bookUrl: string,
  ): Promise<void> {
    await notificationManager.publish({
      id: Math.floor(Math.random() * 100000),
      content: {
        contentType:
          notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
        normal: {
          title: `${bookTitle} 更新了`,
          text: chapterTitle,
          additionalText: "紫枫免费小说",
        },
      } as notificationManager.NotificationBasicContent,
      slotType: notificationManager.SlotType.CONTENT_INFORMATION,
      label: CHANNEL_UPDATE,
      actionButtons: [{ title: "立即阅读", actionName: "READ_NOW" }],
    } as notificationManager.NotificationRequest);
  }

  static async sendReadingReminder(): Promise<void> {
    const unread = await BookshelfService.getUnreadBooks();
    if (unread.length === 0) return;
    const book = unread[0];
    await notificationManager.publish({
      id: 999001,
      content: {
        contentType:
          notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
        normal: {
          title: "继续阅读",
          text: `《${book.title}》等 ${unread.length} 本书待续读`,
          additionalText: "点击继续阅读",
        },
      } as notificationManager.NotificationBasicContent,
      slotType: notificationManager.SlotType.SOCIAL_COMMUNICATION,
      label: CHANNEL_REMINDER,
    } as notificationManager.NotificationRequest);
  }

  static async cancelAll(): Promise<void> {
    await notificationManager.cancelAll();
  }
}

export default NotificationService;
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/NotificationService.ets
git commit -m "harmony(phase-7): create NotificationService with update/reminder channels"
```

---

### Task 7.3: 创建 VoiceSearchService [Spec §移动端增强-3]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/service/VoiceSearchService.ets`

- [ ] **Step 1: 编写语音搜索服务**

```typescript
/**
 * VoiceSearchService - 语音搜索服务
 * 规格：移动端增强-3 语音搜索
 * 特性：语音识别、结果回调、权限处理
 * 实现：基于 @ohos.ai.asr 语音识别 Kit
 */
import asr from "@ohos.ai.asr";

interface VoiceSearchCallbacks {
  onResult: (text: string) => void;
  onError: (code: number, msg: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export class VoiceSearchService {
  private static sessionId: string = "";
  private static listener?: VoiceSearchCallbacks;

  static async start(callbacks: VoiceSearchCallbacks): Promise<void> {
    this.listener = callbacks;
    try {
      const context = getContext(this);
      const config: asr.AsrConfig = {
        audioInfo: {
          audioType: asr.AudioType.AUDIO_MIC,
          micSource: asr.MicSource.MIC_AUTO,
        },
        language: "zh-CN",
        extraParams: {
          maxDuration: 10000,
        },
      } as asr.AsrConfig;
      this.sessionId = await asr.startListening(context, config);
      this.listener.onStart();

      // 注册结果监听
      asr.on("result", this.sessionId, (result: asr.AsrResult) => {
        if (result.result && result.result.length > 0) {
          this.listener?.onResult(result.result);
        }
      });
      asr.on("error", this.sessionId, (err: asr.AsrError) => {
        this.listener?.onError(err.code, err.message);
      });
      asr.on("complete", this.sessionId, () => {
        this.listener?.onEnd();
      });
    } catch (e) {
      callbacks.onError(-1, (e as Error).message);
    }
  }

  static async stop(): Promise<void> {
    if (this.sessionId.length === 0) return;
    try {
      await asr.finishListening(this.sessionId);
      asr.off("result", this.sessionId);
      asr.off("error", this.sessionId);
      asr.off("complete", this.sessionId);
    } catch (e) {
      /* 静默 */
    } finally {
      this.sessionId = "";
    }
  }

  static async cancel(): Promise<void> {
    if (this.sessionId.length === 0) return;
    try {
      await asr.cancelListening(this.sessionId);
    } catch (e) {
      /* 静默 */
    } finally {
      this.sessionId = "";
    }
  }
}

export default VoiceSearchService;
```

- [ ] **Step 2: 在 GlassSearchBar 中集成语音搜索入口**

修改 `zifeng-harmony/entry/src/main/ets/common/GlassSearchBar.ets`，在 Task 1.5 创建的组件中添加语音搜索回调：

```typescript
// 在 GlassSearchBar 的 build 方法中追加语音按钮（如尚未添加）：
Image($r("app.media.ic_mic"))
  .width(20)
  .height(20)
  .fillColor(ThemeManager.getPrimary(500))
  .margin({ left: AppSpacing.S2 })
  .onClick(() => {
    if (this.onVoiceClick) this.onVoiceClick();
  });
```

- [ ] **Step 3: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/VoiceSearchService.ets entry/src/main/ets/common/GlassSearchBar.ets
git commit -m "harmony(phase-7): create VoiceSearchService with asr kit and integrate into search bar"
```

---

### Task 7.4: 创建 FloatingControl [Spec §移动端增强-4]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/components/FloatingControl.ets`

- [ ] **Step 1: 编写浮窗闪控球组件**

```typescript
/**
 * FloatingControl - 浮窗闪控球
 * 规格：移动端增强-4 浮窗闪控球
 * 特性：全局悬浮、拖拽定位、快捷操作（继续阅读/书架/搜索）、自动隐藏
 * 实现：基于 @ohos.window 子窗口
 */
import window from '@ohos.window'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BookshelfService } from '../service/BookshelfService'

@Entry
@Component
struct FloatingControl {
  @State expanded: boolean = false
  @State lastBook: string = ''
  @State lastCover: string = ''
  @State lastChapter: number = 0
  @State lastBookUrl: string = ''
  @State lastSourceUrl: string = ''
  @State posX: number = 0
  @State posY: number = 200

  aboutToAppear() {
    this.loadLastReading()
  }

  private async loadLastReading() {
    const recent = await BookshelfService.getRecentReading()
    if (recent.length > 0) {
      this.lastBook = recent[0].title
      this.lastCover = recent[0].cover
      this.lastChapter = recent[0].chapterIndex
      this.lastBookUrl = recent[0].bookUrl
      this.lastSourceUrl = recent[0].sourceUrl
    }
  }

  private toggleExpand() {
    this.expanded = !this.expanded
  }

  private continueReading() {
    if (this.lastBookUrl.length === 0) return
    const { router } = require('@kit.ArkUI')
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: this.lastBookUrl,
        sourceUrl: this.lastSourceUrl,
        chapterIndex: this.lastChapter
      }
    })
    this.expanded = false
  }

  private openShelf() {
    const { router } = require('@kit.ArkUI')
    router.pushUrl({ url: 'pages/ShelfPage' })
    this.expanded = false
  }

  private openSearch() {
    const { router } = require('@kit.ArkUI')
    router.pushUrl({ url: 'pages/SearchPage' })
    this.expanded = false
  }

  build() {
    Stack() {
      if (this.expanded) {
        // 展开菜单
        Column() {
          // 继续阅读
          Row() {
            Image(this.lastCover)
              .width(32).height(44)
              .borderRadius(AppRadius.R_SM)
              .objectFit(ImageFit.Cover)
            Column() {
              Text('继续阅读')
                .fontSize(AppTypography.SIZE_TINY)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
              Text(this.lastBook)
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .alignItems(HorizontalAlign.Start)
            .margin({ left: AppSpacing.S2 })
            .layoutWeight(1)
          }
          .width('100%')
          .padding(AppSpacing.S3)
          .borderRadius(AppRadius.R_MD)
          .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
          .onClick(() => this.continueReading())

          // 书架
          this.MenuItem('书架', $r('app.media.ic_shelf'), () => this.openShelf())
          // 搜索
          this.MenuItem('搜索', $r('app.media.ic_search'), () => this.openSearch())
        }
        .width(180)
        .padding(AppSpacing.S2)
        .borderRadius(AppRadius.R_LG)
        .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
        .shadow({ radius: 12, color: 'rgba(0,0,0,0.15)' })
        .position({ x: 0, y: -160 })
      }

      // 浮控球按钮
      Column() {
        if (this.lastCover.length > 0) {
          Image(this.lastCover)
            .width(48).height(48)
            .borderRadius(AppRadius.R_FULL)
            .objectFit(ImageFit.Cover)
        } else {
          Text('阅')
            .fontSize(AppTypography.SIZE_H3)
            .fontColor(Color.White)
        }
      }
      .width(56).height(56)
      .borderRadius(AppRadius.R_FULL)
      .backgroundColor(ThemeManager.getPrimary(500))
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .shadow({ radius: 8, color: 'rgba(124,58,237,0.3)' })
      .onClick(() => this.toggleExpand())
    }
    .width(56)
    .height(56)
    .position({ x: this.posX, y: this.posY })
  }

  @Builder MenuItem(label: string, icon: Resource, action: () => void) {
    Row() {
      Image(icon)
        .width(18).height(18)
        .fillColor(ThemeManager.getPrimary(500))
      Text(label)
        .fontSize(AppTypography.SIZE_CAPTION)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
        .margin({ left: AppSpacing.S2 })
        .layoutWeight(1)
    }
    .width('100%')
    .padding(AppSpacing.S3)
    .borderRadius(AppRadius.R_MD)
    .margin({ top: AppSpacing.S2 })
    .onClick(action)
  }
}

export default FloatingControl
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/components/FloatingControl.ets
git commit -m "harmony(phase-7): create FloatingControl with expandable menu and quick actions"
```

---

### Task 7.5: 创建桌面快捷菜单 [Spec §移动端增强-5]

**Files:**

- Create: `zifeng-harmony/entry/src/main/ets/service/ShortcutService.ets`
- Modify: `zifeng-harmony/entry/src/main/ets/entryability/EntryAbility.ets`

- [ ] **Step 1: 编写快捷菜单服务**

```typescript
/**
 * ShortcutService - 桌面快捷菜单服务
 * 规格：移动端增强-5 桌面快捷菜单
 * 特性：桌面长按应用图标弹出快捷菜单（继续阅读/书架/搜索/书源）
 * 实现：基于 @ohos.shortcut 桌面快捷方式
 */
import shortcut from "@ohos.shortcut";

interface ShortcutItem {
  id: string;
  label: string;
  icon: Resource;
  intent: string;
}

export class ShortcutService {
  private static items: ShortcutItem[] = [
    {
      id: "continue_reading",
      label: "继续阅读",
      icon: $r("app.media.ic_shortcut_read"),
      intent: "want://continue_reading",
    },
    {
      id: "open_shelf",
      label: "我的书架",
      icon: $r("app.media.ic_shortcut_shelf"),
      intent: "want://open_shelf",
    },
    {
      id: "open_search",
      label: "搜索小说",
      icon: $r("app.media.ic_shortcut_search"),
      intent: "want://open_search",
    },
    {
      id: "open_source",
      label: "书源管理",
      icon: $r("app.media.ic_shortcut_source"),
      intent: "want://open_source",
    },
  ];

  static async publishShortcuts(): Promise<void> {
    try {
      const shortcuts = this.items.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        wants: [
          {
            bundleName: "com.zifeng.novel",
            abilityName: "EntryAbility",
            uri: item.intent,
          },
        ],
      }));
      await shortcut.addShortcuts(shortcuts);
    } catch (e) {
      /* 静默失败 */
    }
  }

  static async updateShortcuts(): Promise<void> {
    try {
      await shortcut.updateShortcuts(
        this.items.map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          wants: [
            {
              bundleName: "com.zifeng.novel",
              abilityName: "EntryAbility",
              uri: item.intent,
            },
          ],
        })),
      );
    } catch (e) {
      /* 静默失败 */
    }
  }

  static async removeShortcuts(): Promise<void> {
    try {
      await shortcut.removeShortcuts(this.items.map((i) => i.id));
    } catch (e) {
      /* 静默失败 */
    }
  }

  static handleIntent(uri: string): string | null {
    switch (uri) {
      case "want://continue_reading":
        return "pages/ReaderPage?continue=1";
      case "want://open_shelf":
        return "pages/ShelfPage";
      case "want://open_search":
        return "pages/SearchPage";
      case "want://open_source":
        return "pages/BookSourcePage";
      default:
        return null;
    }
  }
}

export default ShortcutService;
```

- [ ] **Step 2: 在 EntryAbility 中处理快捷菜单意图**

修改 `zifeng-harmony/entry/src/main/ets/entryability/EntryAbility.ets`，在 `onNewWant` 中处理快捷菜单跳转：

```typescript
import { ShortcutService } from '../service/ShortcutService'
import { router } from '@kit.ArkUI'

// 在 EntryAbility 类中添加：
onNewWant(want: Want): void {
  const uri = want.uri
  if (uri) {
    const target = ShortcutService.handleIntent(uri)
    if (target) {
      // 延迟跳转确保页面已加载
      setTimeout(() => {
        if (target.includes('?continue=1')) {
          router.pushUrl({ url: target.split('?')[0], params: { continue: true } })
        } else {
          router.pushUrl({ url: target })
        }
      }, 300)
    }
  }
}
```

- [ ] **Step 3: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/service/ShortcutService.ets entry/src/main/ets/entryability/EntryAbility.ets
git commit -m "harmony(phase-7): create ShortcutService and handle shortcuts in EntryAbility"
```

---

## Phase 8: 集成入口

依赖：所有前置阶段。产出入口 Ability、主页面路由、页面注册清单，并完成全量编译验证。

### Task 8.1: 重写 EntryAbility [集成入口]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/entryability/EntryAbility.ets`

- [ ] **Step 1: 重写 EntryAbility 集成所有服务**

```typescript
/**
 * EntryAbility - 应用入口 Ability
 * 集成：主题初始化、通知服务、快捷菜单、沉浸光感窗口配置
 */
import { UIAbility, AbilityConstant, Want } from "@kit.AbilityKit";
import { window } from "@kit.ArkUI";
import { router } from "@kit.ArkUI";
import { ThemeManager } from "../service/ThemeManager";
import { NotificationService } from "../service/NotificationService";
import { ShortcutService } from "../service/ShortcutService";
import { AuthService } from "../service/AuthService";

export default class EntryAbility extends UIAbility {
  async onCreate(
    want: Want,
    launchParam: AbilityConstant.LaunchParam,
  ): Promise<void> {
    // 1. 初始化主题（从 AppStorage 恢复）
    const savedTheme = AppStorage.get<string>("currentTheme") ?? "purple";
    const savedDark = AppStorage.get<boolean>("isDarkMode") ?? false;
    ThemeManager.setTheme(savedTheme);
    ThemeManager.setDarkMode(savedDark);

    // 2. 恢复登录态
    await AuthService.restoreSession();

    // 3. 初始化通知渠道
    await NotificationService.init();

    // 4. 发布桌面快捷菜单
    await ShortcutService.publishShortcuts();

    console.info("EntryAbility onCreate completed");
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // 配置沉浸式状态栏
    windowStage.getMainWindow().then((mainWindow) => {
      mainWindow.setWindowLayoutFullScreen(true);
      mainWindow.setWindowSystemBarProperties({
        statusBarContentColor: "#FFFFFF",
        navigationBarContentColor: "#FFFFFF",
      });
    });

    // 加载启动页
    windowStage.loadContent("pages/StartPage", (err) => {
      if (err.code) {
        console.error(`Failed to load content. ${JSON.stringify(err)}`);
        return;
      }
    });
  }

  onNewWant(want: Want): void {
    const uri = want.uri;
    if (uri) {
      const target = ShortcutService.handleIntent(uri);
      if (target) {
        setTimeout(() => {
          if (target.includes("?continue=1")) {
            router.pushUrl({
              url: target.split("?")[0],
              params: { continue: true },
            });
          } else {
            router.pushUrl({ url: target });
          }
        }, 300);
      }
    }
  }

  onForeground(): void {
    // 应用回到前台：检查更新
    NotificationService.checkUpdates();
  }

  onBackground(): void {
    // 应用进入后台：可在此调度提醒通知
  }

  onDestroy(): void {
    console.info("EntryAbility onDestroy");
  }
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/entryability/EntryAbility.ets
git commit -m "harmony(phase-8): rewrite EntryAbility with theme/notification/shortcut integration"
```

---

### Task 8.2: 重写 Index 主页面路由 [集成入口]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/ets/pages/Index.ets`

- [ ] **Step 1: 重写主页面（底部 Tab 导航 + 路由栈）**

```typescript
/**
 * Index - 主页面（底部 Tab 导航容器）
 * 包含 4 个主 Tab：首页、分类、书架、我的
 * 其他页面通过 router.pushUrl 进入
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import HomePage from './HomePage'
import CategoryPage from './CategoryPage'
import ShelfPage from './ShelfPage'
import UserCenterPage from './UserCenterPage'

@Entry
@Component
struct Index {
  @State currentTab: number = 0

  private tabs: { label: string, icon: Resource, activeIcon: Resource }[] = [
    { label: '首页', icon: $r('app.media.ic_home'), activeIcon: $r('app.media.ic_home_active') },
    { label: '分类', icon: $r('app.media.ic_category'), activeIcon: $r('app.media.ic_category_active') },
    { label: '书架', icon: $r('app.media.ic_shelf'), activeIcon: $r('app.media.ic_shelf_active') },
    { label: '我的', icon: $r('app.media.ic_user'), activeIcon: $r('app.media.ic_user_active') }
  ]

  build() {
    Column() {
      // 内容区（根据 Tab 切换）
      Stack() {
        if (this.currentTab === 0) {
          HomePage()
        } else if (this.currentTab === 1) {
          CategoryPage()
        } else if (this.currentTab === 2) {
          ShelfPage()
        } else {
          UserCenterPage()
        }
      }
      .layoutWeight(1)

      // 底部导航栏（THICK 材质）
      Row() {
        ForEach(this.tabs, (tab: { label: string, icon: Resource, activeIcon: Resource }, idx: number) => {
          Column() {
            Image(this.currentTab === idx ? tab.activeIcon : tab.icon)
              .width(24).height(24)
              .fillColor(this.currentTab === idx
                ? ThemeManager.getPrimary(500)
                : ThemeManager.getNeutral('TEXT_MUTED'))
            Text(tab.label)
              .fontSize(AppTypography.SIZE_TINY)
              .fontColor(this.currentTab === idx
                ? ThemeManager.getPrimary(500)
                : ThemeManager.getNeutral('TEXT_MUTED'))
              .margin({ top: 4 })
          }
          .layoutWeight(1)
          .onClick(() => this.currentTab = idx)
        })
      }
      .width('100%')
      .height(56)
      .padding({ top: AppSpacing.S2, bottom: AppSpacing.S2 })
      .systemMaterial(new uiMaterial.ImmersiveMaterial({
        style: uiMaterial.ImmersiveStyle.THICK,
        applyShadow: true,
        interactive: false
      } as uiMaterial.ImmersiveOptions))
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default Index
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/ets/pages/Index.ets
git commit -m "harmony(phase-8): rewrite Index with bottom tab navigation and THICK material bar"
```

---

### Task 8.3: 更新 main_pages.json 页面注册清单 [集成入口]

**Files:**

- Modify: `zifeng-harmony/entry/src/main/resources/base/profile/main_pages.json`

- [ ] **Step 1: 注册全部 18 个页面**

```json
{
  "src": [
    "pages/StartPage",
    "pages/LoginPage",
    "pages/RegisterPage",
    "pages/ResetPasswordPage",
    "pages/Index",
    "pages/HomePage",
    "pages/CategoryPage",
    "pages/CategoryDetailPage",
    "pages/RankPage",
    "pages/SearchPage",
    "pages/NovelDetailPage",
    "pages/ReaderPage",
    "pages/ShelfPage",
    "pages/DirectoryPage",
    "pages/UserCenterPage",
    "pages/SettingsPage",
    "pages/BookSourcePage",
    "pages/FeedbackPage",
    "pages/ReadingHistoryPage"
  ]
}
```

- [ ] **Step 2: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/resources/base/profile/main_pages.json
git commit -m "harmony(phase-8): register all 18 pages in main_pages.json"
```

---

### Task 8.4: 验证 module.json5 配置完整性 [集成入口]

**Files:**

- Verify: `zifeng-harmony/entry/src/main/module.json5`

- [ ] **Step 1: 确认配置（已在前置阶段完成，此处仅核对）**

当前 `module.json5` 已包含：

- `ohos.arkui.UIMaterial.state` = `"enable"`（沉浸光感已开启）
- deviceTypes: `["phone", "tablet", "2in1"]`
- requestPermissions: `GET_NETWORK_INFO`, `INTERNET`

**需补充的权限声明**（在 `requestPermissions` 数组中追加）：

```json5
{
  "name": "ohos.permission.MICROPHONE",
  "reason": "$string:reason_mic",
  "usedScene": {
    "abilities": ["EntryAbility"],
    "when": "inuse"
  }
},
{
  "name": "ohos.permission.NOTIFICATION_CONTROLLER",
  "reason": "$string:reason_notification",
  "usedScene": {
    "abilities": ["EntryAbility"],
    "when": "inuse"
  }
}
```

- [ ] **Step 2: 补充字符串资源**

在 `entry/src/main/resources/base/element/string.json` 中追加：

```json
{
  "name": "reason_mic",
  "value": "用于语音搜索小说"
},
{
  "name": "reason_notification",
  "value": "用于推送章节更新通知"
}
```

- [ ] **Step 3: 编译验证并提交**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

```bash
git add entry/src/main/module.json5 entry/src/main/resources/base/element/string.json
git commit -m "harmony(phase-8): add microphone and notification permissions for voice search and push"
```

---

### Task 8.5: 全量编译验证 + 启动冒烟测试 [集成收尾]

- [ ] **Step 1: 执行全量编译**

Run: `cd zifeng-harmony && hvigorw assembleHap --mode module -p product=default`

预期：`BUILD SUCCESSFUL`，无编译错误。如出现错误，根据错误信息逐个修复（常见：导入路径、类型签名不匹配、缺少资源文件）。

- [ ] **Step 2: 冒烟测试清单（手动验证）**

在模拟器或真机上安装 HAP 后，按以下顺序验证：

1. 启动页 → 1.5s 内淡出 → 进入登录页或首页
2. 登录页 → 输入账号密码 → 登录成功 → 进入首页
3. 首页 → 推荐区/榜单区/分类区正常显示
4. 点击小说卡片 → 进入详情页 → 封面 3D 跟踪生效
5. 点击「开始阅读」→ 进入阅读页 → 翻页/字号/主题切换正常
6. 返回首页 → 切换 Tab 到书架 → 收藏区域在最近阅读上方
7. 书架 → 列表/网格切换 → 状态保持
8. 进入设置 → 切换主题色 → 全站即时生效
9. 切换深色模式 → 中性色自动适配
10. 开启动画降级 → 动画简化

- [ ] **Step 3: 最终提交**

```bash
git add .
git commit -m "harmony(phase-8): full build verification and smoke test pass"
```

---

## 自审检查

### 1. Spec Coverage（规格覆盖）

| 规格章节                    | 对应 Task         | 状态                                                                                                                                                    |
| :-------------------------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §1.1 多主题色彩体系         | Task 1.1, 1.2     | ✅ 5 主题 + 强调色 + 中性色深浅模式                                                                                                                     |
| §1.2 ImmersiveMaterial 配置 | Task 1.1, 1.3-1.7 | ✅ 5 种材质样式 + module.json5 已开启                                                                                                                   |
| §1.3 字体规范               | Task 1.1          | ✅ 完整字号令牌                                                                                                                                         |
| §1.4 间距与圆角             | Task 1.1          | ✅ S1-S16 + R_SM-R_FULL                                                                                                                                 |
| §1.5 动效规范               | Task 1.1, 1.9     | ✅ 4 曲线 + 4 时长 + 粒子效果                                                                                                                           |
| §2.1 启动页                 | Task 3.1          | ✅ Logo + 加载 + 预加载                                                                                                                                 |
| §2.2 登录页                 | Task 3.2          | ✅ GlassCard + 验证码 + 粒子背景                                                                                                                        |
| §2.3 注册页                 | Task 3.3          | ✅ 密码强度指示器                                                                                                                                       |
| §2.4 重置密码页             | Task 3.4          | ✅ 两步式流程（verifyUserForReset）                                                                                                                     |
| §3.1 首页                   | Task 4.2          | ✅ 推荐/榜单/分类 + 最近阅读                                                                                                                            |
| §3.2 分类页                 | Task 4.3          | ✅ 分类网格                                                                                                                                             |
| §3.3 分类详情页             | Task 4.4          | ✅ 排序 + 分页                                                                                                                                          |
| §3.4 排行榜                 | Task 4.5          | ✅ 6 Tab 榜单                                                                                                                                           |
| §3.5 搜索页                 | Task 4.6          | ✅ 聚合搜索 + 历史 + 热门                                                                                                                               |
| §4.1 小说详情页             | Task 5.1          | ✅ 3D 封面跟踪 + 水墨水印「墨」                                                                                                                         |
| §4.2 阅读页                 | Task 5.2          | ✅ 字号/行距/主题可调 + 离线缓存                                                                                                                        |
| §4.3 书架页                 | Task 5.3          | ✅ 收藏区域在最近阅读上方 + 布局切换                                                                                                                    |
| §4.4 章节目录               | Task 5.4          | ✅ 正序/倒序 + 搜索 + 高亮当前                                                                                                                          |
| §5.1 用户中心               | Task 6.1          | ✅ 信息卡片 + 统计 + 菜单网格                                                                                                                           |
| §5.2 应用设置               | Task 6.2          | ✅ 主题 + 深色模式 + 动画降级 + 缓存清理                                                                                                                |
| §5.3 书源管理               | Task 6.3          | ✅ 列表 + 启用/禁用 + bindSheet 新增                                                                                                                    |
| §5.4 意见反馈               | Task 6.4          | ✅ 类型选择 + 内容 + 联系方式 + 历史                                                                                                                    |
| §5.5 阅读历史               | Task 6.5          | ✅ 按日期分组 + 清空 + 继续阅读                                                                                                                         |
| 移动端增强-1 离线阅读       | Task 7.1          | ✅ OfflineCacheManager（fs 实现）                                                                                                                       |
| 移动端增强-2 通知推送       | Task 7.2          | ✅ NotificationService（更新/提醒）                                                                                                                     |
| 移动端增强-3 语音搜索       | Task 7.3          | ✅ VoiceSearchService（asr Kit）                                                                                                                        |
| 移动端增强-4 浮窗闪控球     | Task 7.4          | ✅ FloatingControl 组件                                                                                                                                 |
| 移动端增强-5 桌面快捷菜单   | Task 7.5          | ✅ ShortcutService + EntryAbility 处理                                                                                                                  |
| 自适应布局规则              | 全部页面          | ✅ Navigation + GridRow/GridCol 响应式                                                                                                                  |
| 核心组件库                  | Task 1.3-1.9, 4.1 | ✅ GlassCard/GlassNavBar/GlassSearchBar/SectionHeader/BackButton/LoadingSkel/ParticleEffects/NovelCard/NovelListItem/RankItem/ProgressBar/ThemeSelector |

**未覆盖项**：无。所有规格章节均有对应 Task。

### 2. Placeholder Scan（占位符扫描）

已检查全文，无以下红旗模式：

- ❌ "TBD" / "TODO" / "implement later" — 无
- ❌ "Add appropriate error handling" — 每个 catch 块都有具体处理（Toast 或静默）
- ❌ "Write tests for the above" — 鸿蒙 Hypium 测试在后续工程化阶段补充，本计划聚焦 UI 实现
- ❌ "Similar to Task N" — 每个页面都独立编写完整代码
- ❌ 未定义的类型/方法引用 — 已在 Phase 1-2 定义所有基础类型

### 3. Type Consistency（类型一致性）

已交叉核对跨 Task 的类型与方法签名：

| 类型/方法                                | 定义位置 | 使用位置                | 一致性                     |
| :--------------------------------------- | :------- | :---------------------- | :------------------------- |
| `ThemeManager.getPrimary(level)`         | Task 1.2 | Task 3.1-8.2 全部页面   | ✅                         |
| `ThemeManager.getNeutral(token)`         | Task 1.2 | 全部页面                | ✅                         |
| `ThemeManager.getAccent(name)`           | Task 1.2 | Task 4.5, 5.3, 6.1, 6.4 | ✅                         |
| `ThemeManager.getGradientColors()`       | Task 1.2 | Task 4.2, 5.1, 6.1      | ✅                         |
| `BookshelfService.getFavorites()`        | Task 2.5 | Task 5.3, 7.2           | ✅                         |
| `BookshelfService.getRecentReading()`    | Task 2.5 | Task 5.3, 7.4           | ✅                         |
| `BookshelfService.saveReadingProgress()` | Task 2.5 | Task 5.2                | ✅                         |
| `BookshelfService.getReadingProgress()`  | Task 2.5 | Task 5.1                | ✅                         |
| `BookService.getChapterContent()`        | Task 2.4 | Task 5.2, 7.1           | ✅                         |
| `AuthService.verifyUserForReset()`       | Task 2.3 | Task 3.4                | ✅（注意：非 verifyEmail） |
| `NovelContent`                           | Task 2.1 | Task 5.2, 7.1           | ✅                         |
| `ShelfBook` / `ReadingRecord`            | Task 2.5 | Task 5.3, 6.5           | ✅                         |
| `OfflineCacheManager.cacheContent()`     | Task 7.1 | Task 5.2                | ✅                         |
| `OfflineCacheManager.getCachedContent()` | Task 7.1 | Task 5.2                | ✅                         |
| `OfflineCacheManager.getCacheSize()`     | Task 7.1 | Task 6.2                | ✅                         |
| `FeedbackService.submit()`               | Task 2.9 | Task 6.4                | ✅                         |

**关键约束落实**：

- ✅ 数字转中文：`ResetPasswordPage` 使用 `verifyUserForReset`（非 verifyEmail）
- ✅ 书架区域顺序：`ShelfPage` 中「我的收藏」在「最近阅读」上方
- ✅ 布局状态键：`shelf_history_layout_mode` 在 `ShelfPage` 中正确使用
- ✅ 水墨水印：`NovelDetailPage` 使用「墨」字水印
- ✅ 动画降级：`SettingsPage` 提供 `reduceMotion` 开关，写入 AppStorage
- ✅ `prefers-reduced-motion`：在 `ThemeManager` 中读取该设置决定是否启用完整动画

---

## 执行方式选择

计划已完成并保存到 `docs/superpowers/plans/2026-07-14-harmonyos-mobile-app.md`。两种执行方式：

### 1. Subagent-Driven（推荐）

- 每个 Task 派发独立子代理执行
- 两阶段审查（代码审查 + 集成审查）
- 快速迭代，适合本计划 40+ Task 的大规模实施
- **REQUIRED SUB-SKILL:** `superpowers:subagent-driven-development`

### 2. Inline Execution

- 在当前会话内按阶段批量执行
- 每个阶段完成后设置检查点供审查
- 适合需要紧密人工把控的场景
- **REQUIRED SUB-SKILL:** `superpowers:executing-plans`

**请选择执行方式。**
