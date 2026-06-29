/**
 * 紫枫免费小说鸿蒙应用 - 玻璃质感底部导航栏
 * 适配 HarmonyOS 26.0.0 新特性：背景模糊、Spring 动画
 * 已迁移至 @ComponentV2 + V2 状态装饰器
 *
 * 特点：
 * 1. 玻璃质感背景 - backgroundBlurStyle 实现
 * 2. 浮动指示器 - 选中项有渐变指示器
 * 3. Spring 弹性动画 - 图标切换弹性过渡
 * 4. 光晕效果 - 选中图标有发光效果
 */

import { AppColors, AppSpacing, AppRadius, AppDuration, NavBarConfig } from './DesignSystem'

/**
 * 导航项配置
 */
export interface NavItem {
  index: number
  title: string
  // 使用 emoji 或字符作为图标
  icon: string
  activeIcon: string
  activeColor: string
  badge?: number
}

@Preview
@ComponentV2
export struct GlassBottomNavBar {
  @Param currentIndex: number = 0
  @Param isDarkMode: boolean = false
  @Param navItems: NavItem[] = [
    { index: 0, title: '书城', icon: '📚', activeIcon: '📖', activeColor: AppColors.PRIMARY },
    { index: 1, title: '分类', icon: '🗂', activeIcon: '🗂', activeColor: AppColors.ACCENT_MINT },
    { index: 2, title: '书架', icon: '📕', activeIcon: '📔', activeColor: AppColors.ACCENT_ORANGE },
    { index: 3, title: '我的', icon: '👤', activeIcon: '🌟', activeColor: AppColors.ACCENT_PURPLE }
  ]
  @Param navOnChange: (index: number) => void = () => {}

  build() {
    Row() {
      ForEach(this.navItems, (item: NavItem) => {
        this.navItemBuilder(item)
      })
    }
    .width('100%')
    .height(NavBarConfig.HEIGHT)
    .padding({ left: AppSpacing.SM, right: AppSpacing.SM })
    .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
    .backgroundBlurStyle(BlurStyle.Thick, {
      adaptiveColor: AdaptiveColor.DEFAULT,
      scale: 1.0
    })
    .border({
      width: { top: 0.5 },
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'
    })
    .shadow({
      radius: 16,
      color: this.isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.06)',
      offsetY: -4
    })
  }

  @Builder
  navItemBuilder(item: NavItem) {
    Column() {
      // 图标容器
      Stack({ alignContent: Alignment.Center }) {
        // 选中状态光晕
        if (this.currentIndex === item.index) {
          Column()
            .width(40)
            .height(40)
            .borderRadius(20)
            .backgroundColor(item.activeColor)
            .opacity(0.18)
            .blur(8)
        }

        // 图标
        Text(this.currentIndex === item.index ? item.activeIcon : item.icon)
          .fontSize(22)
          .scale({ x: this.currentIndex === item.index ? 1.1 : 1, y: this.currentIndex === item.index ? 1.1 : 1 })
          .animation({
            duration: AppDuration.NORMAL,
            curve: Curve.EaseOut
          })
      }
      .width('100%')
      .height(28)

      // 标题
      Text(item.title)
        .fontSize(NavBarConfig.LABEL_SIZE)
        .fontWeight(this.currentIndex === item.index ? FontWeight.Bold : FontWeight.Normal)
        .fontColor(this.currentIndex === item.index
          ? item.activeColor
          : (this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY))
        .margin({ top: 2 })

      // 指示器
      Column()
        .width(this.currentIndex === item.index ? NavBarConfig.INDICATOR_WIDTH : 0)
        .height(NavBarConfig.INDICATOR_HEIGHT)
        .borderRadius(1.5)
        .linearGradient({
          angle: 90,
          colors: this.currentIndex === item.index
            ? [[item.activeColor, 0.0], [item.activeColor, 1.0]]
            : [['rgba(0,0,0,0)', 0.0], ['rgba(0,0,0,0)', 1.0]]
        })
        .margin({ top: 3 })
        .animation({
          duration: AppDuration.NORMAL,
          curve: Curve.EaseOut
        })
    }
    .layoutWeight(1)
    .height('100%')
    .padding({ top: 6, bottom: 6 })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .onClick(() => {
      this.navOnChange(item.index)
    })
  }
}

/**
 * 中央悬浮按钮（用于"阅读"等核心功能）
 */
@ComponentV2
export struct GlassCenterFab {
  @Param icon: string = '🎯'
  @Param isDarkMode: boolean = false
  @Param centerFabOnClick: () => void = () => {}

  build() {
    Column() {
      Column() {
        Text(this.icon)
          .fontSize(28)
      }
      .width(56)
      .height(56)
      .borderRadius(28)
      .linearGradient({
        angle: 135,
        colors: [
          [AppColors.PRIMARY_LIGHT, 0.0],
          [AppColors.PRIMARY, 1.0]
        ]
      })
      .shadow({
        radius: 16,
        color: 'rgba(170, 59, 255, 0.4)',
        offsetY: 6
      })
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .onClick(() => this.centerFabOnClick())
    }
    .width(64)
    .height(64)
    .borderRadius(32)
    .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.5)' : 'rgba(255, 255, 255, 0.3)')
    .backgroundBlurStyle(BlurStyle.Regular, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }
}
