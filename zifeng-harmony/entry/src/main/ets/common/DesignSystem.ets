/**
 * 紫枫免费小说鸿蒙应用 - 统一设计系统
 * 适配 HarmonyOS 26.0.0 新特性：玻璃质感、光粒子、布局组件
 *
 * 设计风格：与紫枫免费小说网站保持一致的紫罗兰色系
 * 主色：紫罗兰 (#722ed1 / #aa3bff)
 * 强调色：薄荷绿 (#13c2c2)
 */

import { curves } from '@kit.ArkUI'

/**
 * 应用主色调 - 与网站风格保持一致
 */
export class AppColors {
  // ============ 主色调（紫罗兰系）============
  static readonly PRIMARY = '#722ed1'
  static readonly PRIMARY_LIGHT = '#aa3bff'
  static readonly PRIMARY_DARK = '#531dab'
  static readonly PRIMARY_PALE = '#f4e9ff'
  static readonly PRIMARY_GRADIENT_START = '#aa3bff'
  static readonly PRIMARY_GRADIENT_END = '#722ed1'

  // ============ 辅助色 ============
  static readonly ACCENT_MINT = '#13c2c2'         // 薄荷绿 - 潜力榜
  static readonly ACCENT_GREEN = '#52c41a'        // 翠绿 - 完本榜
  static readonly ACCENT_ORANGE = '#fa8c16'       // 橙黄 - 更新榜
  static readonly ACCENT_RED = '#f5222d'          // 朱红 - 热搜榜
  static readonly ACCENT_PURPLE = '#722ed1'       // 深紫 - 评论榜
  static readonly ACCENT_GOLD = '#faad14'         // 金色 - 必读榜

  // ============ 功能色 ============
  static readonly SUCCESS = '#52c41a'
  static readonly WARNING = '#faad14'
  static readonly DANGER = '#ff4d4f'
  static readonly INFO = '#1890ff'

  // ============ 中性色 - 浅色模式 ============
  static readonly TEXT_PRIMARY = '#1f1f1f'
  static readonly TEXT_SECONDARY = '#595959'
  static readonly TEXT_TERTIARY = '#8c8c8c'
  static readonly TEXT_DISABLED = '#bfbfbf'
  static readonly TEXT_INVERSE = '#ffffff'

  static readonly BG_PRIMARY = '#ffffff'
  static readonly BG_SECONDARY = '#f5f7fa'
  static readonly BG_TERTIARY = '#f0f0f5'
  static readonly BG_PAGE = '#f7f8fc'

  static readonly BORDER_LIGHT = '#e8e8e8'
  static readonly BORDER_MEDIUM = '#d9d9d9'
  static readonly BORDER_DARK = '#bfbfbf'

  // ============ 中性色 - 深色模式 ============
  static readonly DARK_TEXT_PRIMARY = '#f5f5f5'
  static readonly DARK_TEXT_SECONDARY = '#d9d9d9'
  static readonly DARK_TEXT_TERTIARY = '#8c8c8c'
  static readonly DARK_TEXT_DISABLED = '#666666'
  static readonly DARK_TEXT_INVERSE = '#1a1a1a'
  static readonly DARK_BG_PRIMARY = '#1a1a1f'
  static readonly DARK_BG_SECONDARY = '#25252b'
  static readonly DARK_BG_TERTIARY = '#2f2f37'
  static readonly DARK_BORDER = '#3a3a44'

  // ============ 深色模式文字色别名（API 26 适配）============
  static readonly TEXT_PRIMARY_DARK = '#f5f5f5'
  static readonly TEXT_SECONDARY_DARK = '#d9d9d9'
  static readonly TEXT_TERTIARY_DARK = '#8c8c8c'
  static readonly TEXT_DISABLED_DARK = '#666666'
  static readonly TEXT_INVERSE_DARK = '#1a1a1a'

  // ============ 玻璃质感颜色（HarmonyOS 26.0.0）============
  static readonly GLASS_BG_LIGHT = 'rgba(255, 255, 255, 0.65)'
  static readonly GLASS_BG_DARK = 'rgba(20, 20, 30, 0.65)'
  static readonly GLASS_BORDER_LIGHT = 'rgba(255, 255, 255, 0.4)'
  static readonly GLASS_BORDER_DARK = 'rgba(255, 255, 255, 0.15)'
  static readonly GLASS_HIGHLIGHT = 'rgba(255, 255, 255, 0.3)'
  static readonly GLASS_SHADOW = 'rgba(0, 0, 0, 0.08)'

  // ============ 渐变组合（用于 Hero 区、Tab 等）============
  static readonly GRADIENT_HERO = ['#aa3bff', '#9254de', '#722ed1', '#531dab']
  static readonly GRADIENT_MINT = ['#13c2c2', '#08979c']
  static readonly GRADIENT_SUNSET = ['#fa8c16', '#f5222d']
  static readonly GRADIENT_AURORA = ['#722ed1', '#13c2c2']
  static readonly GRADIENT_AURORA_LIGHT = ['#d4a5ff', '#87e8de']
  static readonly GRADIENT_GOLD = ['#faad14', '#fa8c16']
}

/**
 * HarmonyOS 26.0.0 玻璃主题（背景模糊样式）
 * 提供不同强度的玻璃效果
 */
export class GlassTheme {
  // 玻璃模糊样式枚举（HarmonyOS 26.0.0 官方支持）
  static readonly BLUR_THIN = BlurStyle.Thin
  static readonly BLUR_REGULAR = BlurStyle.Regular
  static readonly BLUR_THICK = BlurStyle.Thick
  static readonly BLUR_ULTRA_THICK = BlurStyle.BACKGROUND_ULTRA_THICK

  // 不同强度对应的配置
  static readonly CARD_LIGHT: GlassConfig = {
    backgroundColor: AppColors.GLASS_BG_LIGHT,
    backgroundBlurStyle: BlurStyle.Regular,
    borderColor: AppColors.GLASS_BORDER_LIGHT,
    borderWidth: 1,
    shadowColor: AppColors.GLASS_SHADOW,
    shadowRadius: 16,
    shadowOffsetY: 4
  }

  static readonly CARD_DARK: GlassConfig = {
    backgroundColor: AppColors.GLASS_BG_DARK,
    backgroundBlurStyle: BlurStyle.Regular,
    borderColor: AppColors.GLASS_BORDER_DARK,
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowRadius: 16,
    shadowOffsetY: 4
  }

  static readonly NAV_BAR_LIGHT: GlassConfig = {
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    backgroundBlurStyle: BlurStyle.Thick,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 0.5,
    shadowColor: 'rgba(0, 0, 0, 0.06)',
    shadowRadius: 12,
    shadowOffsetY: -2
  }

  static readonly NAV_BAR_DARK: GlassConfig = {
    backgroundColor: 'rgba(20, 20, 30, 0.88)',
    backgroundBlurStyle: BlurStyle.Thick,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 0.5,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowRadius: 12,
    shadowOffsetY: -2
  }

  static readonly HERO_LIGHT: GlassConfig = {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    backgroundBlurStyle: BlurStyle.Thin,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 1,
    shadowColor: 'rgba(114, 46, 209, 0.25)',
    shadowRadius: 24,
    shadowOffsetY: 8
  }

  static readonly HERO_DARK: GlassConfig = {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    backgroundBlurStyle: BlurStyle.Thin,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    shadowColor: 'rgba(0, 0, 0, 0.4)',
    shadowRadius: 24,
    shadowOffsetY: 8
  }
}

/**
 * 玻璃配置接口
 */
export interface GlassConfig {
  backgroundColor: string | ResourceColor
  backgroundBlurStyle: BlurStyle
  borderColor?: string | ResourceColor
  borderWidth?: number | string
  shadowColor?: string | ResourceColor
  shadowRadius?: number | string
  shadowOffsetY?: number | string
}

/**
 * 字体规范
 */
export class AppTypography {
  // 字体大小
  static readonly SIZE_DISPLAY = 32
  static readonly SIZE_H1 = 28
  static readonly SIZE_H2 = 24
  static readonly SIZE_H3 = 20
  static readonly SIZE_H4 = 18
  static readonly SIZE_BODY_LARGE = 16
  static readonly SIZE_BODY = 14
  static readonly SIZE_BODY_SMALL = 13
  static readonly SIZE_CAPTION = 12
  static readonly SIZE_TINY = 10

  // 字重
  static readonly WEIGHT_LIGHT = FontWeight.Lighter
  static readonly WEIGHT_REGULAR = FontWeight.Normal
  static readonly WEIGHT_MEDIUM = FontWeight.Medium
  static readonly WEIGHT_SEMIBOLD = FontWeight.Bolder
  static readonly WEIGHT_BOLD = FontWeight.Bold

  // 行高
  static readonly LINE_HEIGHT_TIGHT = 1.2
  static readonly LINE_HEIGHT_NORMAL = 1.5
  static readonly LINE_HEIGHT_LOOSE = 1.8
}

/**
 * 间距规范
 */
export class AppSpacing {
  static readonly XXXXS = 2
  static readonly XXXS = 4
  static readonly XXS = 6
  static readonly XS = 8
  static readonly SM = 10
  static readonly MD = 12
  static readonly LG = 16
  static readonly XL = 20
  static readonly XXL = 24
  static readonly XXXL = 32
  static readonly XXXXL = 40
}

/**
 * 圆角规范
 */
export class AppRadius {
  static readonly NONE = 0
  static readonly SMALL = 6
  static readonly MEDIUM = 10
  static readonly LARGE = 14
  static readonly XLARGE = 18
  static readonly XXLARGE = 24
  static readonly PILL = 999
}

/**
 * 阴影配置接口
 */
export interface ShadowConfig {
  radius: number
  color: string
  offsetX: number
  offsetY: number
}

/**
 * 阴影规范
 */
export class AppShadow {
  static readonly SMALL: ShadowConfig = {
    radius: 4,
    color: '#1a000000',
    offsetX: 0,
    offsetY: 2
  }

  static readonly MEDIUM: ShadowConfig = {
    radius: 8,
    color: '#1a000000',
    offsetX: 0,
    offsetY: 4
  }

  static readonly LARGE: ShadowConfig = {
    radius: 16,
    color: '#1a000000',
    offsetX: 0,
    offsetY: 8
  }

  static readonly GLOW_PRIMARY: ShadowConfig = {
    radius: 24,
    color: '#40aa3bff',
    offsetX: 0,
    offsetY: 8
  }
}

/**
 * 动画曲线 - HarmonyOS 26.0.0 推荐曲线
 */
export class AppCurves {
  static readonly SPRING = curves.springMotion(0.6, 0.8)
  static readonly SMOOTH = curves.interpolatingSpring(0.5, 0.5, 0.6, 0.7)
  static readonly EASE_IN_OUT = Curve.EaseInOut
  static readonly EASE_OUT = Curve.EaseOut
  static readonly EASE_IN = Curve.EaseIn
  static readonly FAST_OUT_SLOW_IN = Curve.FastOutSlowIn
  static readonly STANDARD = Curve.EaseInOut
}

/**
 * 动画时长
 */
export class AppDuration {
  static readonly INSTANT = 100
  static readonly FAST = 200
  static readonly NORMAL = 300
  static readonly SLOW = 500
  static readonly SLOWER = 800
  static readonly SLOWEST = 1200
}

/**
 * 底部导航栏配置
 */
export class NavBarConfig {
  static readonly HEIGHT = 56
  static readonly INDICATOR_HEIGHT = 3
  static readonly INDICATOR_WIDTH = 24
  static readonly ICON_SIZE = 24
  static readonly LABEL_SIZE = 11
  static readonly BOTTOM_PADDING = 8
}

/**
 * 粒子颜色配置
 */
export class ParticleColors {
  // 不同主题下的粒子颜色
  static readonly LIGHT_THEME = [
    'rgba(170, 59, 255, 0.6)',   // 主紫色
    'rgba(146, 84, 222, 0.5)',   // 浅紫
    'rgba(82, 196, 26, 0.5)',    // 绿色
    'rgba(250, 173, 20, 0.5)',   // 金色
    'rgba(255, 255, 255, 0.7)'   // 白色
  ]

  static readonly DARK_THEME = [
    'rgba(170, 59, 255, 0.8)',
    'rgba(146, 84, 222, 0.7)',
    'rgba(19, 194, 194, 0.6)',
    'rgba(250, 173, 20, 0.5)',
    'rgba(212, 165, 255, 0.5)'
  ]
}

/**
 * API 26 系统材料模糊样式常量
 * 用于 Navigation、Tab 等系统组件的材料效果
 */
export class SystemMaterialStyle {
  // 系统模糊样式（API 26 新增）
  static readonly NAVIGATION_BAR = BlurStyle.Thick
  static readonly TAB_BAR = BlurStyle.Thick
  static readonly CARD = BlurStyle.Regular
  static readonly DIALOG = BlurStyle.Thick
  static readonly TOOLTIP = BlurStyle.Regular

  // 系统自适应颜色配置
  static readonly ADAPTIVE_COLOR = AdaptiveColor.DEFAULT
}
