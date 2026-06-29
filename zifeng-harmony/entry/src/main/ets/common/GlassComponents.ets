/**
 * 紫枫免费小说鸿蒙应用 - 玻璃质感组件
 * 适配 HarmonyOS 26.0.0 新特性：背景模糊（backgroundBlurStyle）
 * 已迁移至 @ComponentV2 + V2 状态装饰器
 *
 * 提供：
 * 1. 通用玻璃卡片 - 用于内容卡片
 * 2. 玻璃导航栏 - 用于底部 Tab 栏
 * 3. 玻璃顶部栏 - 用于页面顶部标题栏
 * 4. 玻璃英雄区 - 用于首页大块视觉区域
 * 5. 玻璃模态面板 - 用于弹窗等
 */

import { AppColors, GlassConfig, AppRadius, AppSpacing, AppShadow } from './DesignSystem'

/**
 * 玻璃卡片 - 通用
 * 适用于：内容区块、菜单项、设置项等
 */
@ComponentV2
export struct GlassCard {
  @Param cardPadding: number | string = AppSpacing.LG
  @Param cardBorderRadius: number | string = AppRadius.LARGE
  @Param isDarkMode: boolean = false
  @Param clickHandler: () => void = () => {}
  @BuilderParam customContent: () => void = this.defaultContent

  @Builder
  defaultContent() {}

  build() {
    Column() {
      this.customContent()
    }
    .width('100%')
    .padding(this.cardPadding)
    .borderRadius(this.cardBorderRadius)
    .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)')
    .backgroundBlurStyle(BlurStyle.Regular, {
      adaptiveColor: AdaptiveColor.DEFAULT,
      scale: 1.0
    })
    .border({
      width: 1,
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.4)'
    })
    .shadow({
      radius: 16,
      color: this.isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.08)',
      offsetY: 4
    })
    .onClick(() => {
      this.clickHandler()
    })
  }
}

/**
 * 玻璃顶部应用栏
 * 适用于：各页面顶部标题栏
 */
@ComponentV2
export struct GlassTopBar {
  @Param title: string = ''
  @Param showBack: boolean = false
  @Param isDarkMode: boolean = false
  @Param rightIcon: ResourceStr = ''
  @Param onRightClick: () => void = () => {}
  onBackClick: () => void = () => {}
  @BuilderParam rightContent: () => void = this.defaultRight

  @Builder
  defaultRight() {
    if (this.rightIcon) {
      Image(this.rightIcon)
        .width(24)
        .height(24)
        .fillColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .onClick(() => this.onRightClick())
    }
  }

  build() {
    Row() {
      if (this.showBack) {
        Image($r('app.media.back'))
          .width(24)
          .height(24)
          .fillColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          .onClick(() => {
            this.onBackClick()
          })
          .margin({ right: AppSpacing.MD })
      }
      Text(this.title)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .layoutWeight(1)
      this.rightContent()
    }
    .width('100%')
    .height(56)
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
    .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
    .backgroundBlurStyle(BlurStyle.Thick, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .border({
      width: { bottom: 0.5 },
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
    })
  }
}

/**
 * 玻璃英雄区
 * 适用于：首页大块视觉区域、欢迎区等
 */
@ComponentV2
export struct GlassHero {
  @Param isDarkMode: boolean = false
  @Param heroBorderRadius: number | string = AppRadius.XXLARGE
  @BuilderParam content: () => void = this.defaultContent

  @Builder
  defaultContent() {}

  build() {
    Stack() {
      this.content()
    }
    .width('100%')
    .borderRadius(this.heroBorderRadius)
    .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.25)')
    .backgroundBlurStyle(BlurStyle.Thin, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .border({
      width: 1,
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)'
    })
    .shadow({
      radius: 24,
      color: this.isDarkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(114, 46, 209, 0.2)',
      offsetY: 8
    })
    .clip(true)
  }
}

/**
 * 玻璃菜单项 - 用于设置/我的页面
 */
@ComponentV2
export struct GlassMenuItem {
  @Param icon: ResourceStr = ''
  @Param title: string = ''
  @Param subtitle: string = ''
  @Param rightText: string = ''
  @Param showArrow: boolean = true
  @Param isDarkMode: boolean = false
  @Param accentColor: string = AppColors.PRIMARY
  @Param itemOnClick: () => void = () => {}

  build() {
    Row() {
      if (this.icon) {
        Column() {
          Image(this.icon)
            .width(20)
            .height(20)
            .fillColor(this.accentColor)
        }
        .width(36)
        .height(36)
        .borderRadius(10)
        .backgroundColor(this.accentColor + '15')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .margin({ right: AppSpacing.MD })
      }

      Column() {
        Text(this.title)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          .width('100%')
        if (this.subtitle) {
          Text(this.subtitle)
            .fontSize(12)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .margin({ top: 2 })
            .width('100%')
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)

      if (this.rightText) {
        Text(this.rightText)
          .fontSize(13)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .margin({ right: AppSpacing.XS })
      }

      if (this.showArrow) {
        Text('›')
          .fontSize(20)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
      }
    }
    .width('100%')
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.MD })
    .alignItems(VerticalAlign.Center)
    .onClick(() => this.itemOnClick())
  }
}

/**
 * 玻璃浮动按钮（FAB）
 * 适用于：右下角浮动操作按钮
 */
@ComponentV2
export struct GlassFab {
  @Param icon: ResourceStr = ''
  @Param fabSize: number = 56
  @Param isDarkMode: boolean = false
  @Param fabOnClick: () => void = () => {}

  build() {
    Column() {
      if (this.icon) {
        Image(this.icon)
          .width(24)
          .height(24)
          .fillColor('#ffffff')
      } else {
        Text('+')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
      }
    }
    .width(this.fabSize)
    .height(this.fabSize)
    .borderRadius(this.fabSize / 2)
    .linearGradient({
      angle: 135,
      colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
    })
    .shadow({
      radius: 20,
      color: 'rgba(170, 59, 255, 0.5)',
      offsetY: 8
    })
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .onClick(() => this.fabOnClick())
  }
}

/**
 * 玻璃搜索框
 * 适用于：顶部搜索区域
 */
@ComponentV2
export struct GlassSearchBar {
  @Param placeholder: string = '搜索小说、作者...'
  @Param isDarkMode: boolean = false
  @Param value: string = ''
  @Param searchOnSubmit: (value: string) => void = () => {}
  @Param searchOnChange: (value: string) => void = () => {}

  build() {
    Row() {
      Text('🔍')
        .fontSize(16)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
        .margin({ right: AppSpacing.SM })

      TextInput({ placeholder: this.placeholder, text: this.value })
        .layoutWeight(1)
        .backgroundColor(Color.Transparent)
        .fontSize(14)
        .placeholderColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .onChange((value: string) => {
          this.searchOnChange(value)
        })
        .onSubmit(() => {
          this.searchOnSubmit(this.value)
        })
    }
    .width('100%')
    .height(40)
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
    .borderRadius(20)
    .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)')
    .backgroundBlurStyle(BlurStyle.Regular, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .border({
      width: 1,
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'
    })
  }
}

/**
 * 玻璃统计卡片
 * 适用于：数据展示区域
 */
@ComponentV2
export struct GlassStatCard {
  @Param label: string = ''
  @Param value: string = ''
  @Param icon: string = ''
  @Param accentColor: string = AppColors.PRIMARY
  @Param isDarkMode: boolean = false

  build() {
    Column() {
      Row() {
        if (this.icon) {
          Text(this.icon)
            .fontSize(18)
            .margin({ right: AppSpacing.XS })
        }
        Text(this.value)
          .fontSize(22)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
      }
      .width('100%')
      .alignItems(VerticalAlign.Center)

      Text(this.label)
        .fontSize(12)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
        .margin({ top: 4 })
        .width('100%')
    }
    .layoutWeight(1)
    .padding(AppSpacing.LG)
    .borderRadius(AppRadius.LARGE)
    .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.6)')
    .backgroundBlurStyle(BlurStyle.Regular, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .border({
      width: 1,
      color: this.accentColor + '30'
    })
    .alignItems(HorizontalAlign.Start)
  }
}

/**
 * 玻璃徽章
 * 适用于：标签、状态显示
 */
@ComponentV2
export struct GlassBadge {
  @Param text: string = ''
  @Param color: string = AppColors.PRIMARY
  @Param badgeSize: number = 11

  build() {
    Text(this.text)
      .fontSize(this.badgeSize)
      .fontColor(this.color)
      .fontWeight(FontWeight.Medium)
      .padding({ left: 6, right: 6, top: 2, bottom: 2 })
      .borderRadius(4)
      .backgroundColor(this.color + '18')
  }
}

/**
 * 玻璃空状态
 * 适用于：空数据展示
 */
@ComponentV2
export struct GlassEmptyState {
  @Param icon: string = '📭'
  @Param title: string = '暂无数据'
  @Param subtitle: string = ''
  @Param isDarkMode: boolean = false
  @Param actionText: string = ''
  @Param emptyOnAction: () => void = () => {}

  build() {
    Column() {
      Text(this.icon)
        .fontSize(56)
        .margin({ bottom: AppSpacing.LG })

      Text(this.title)
        .fontSize(16)
        .fontWeight(FontWeight.Medium)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .margin({ bottom: AppSpacing.XS })

      if (this.subtitle) {
        Text(this.subtitle)
          .fontSize(13)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .textAlign(TextAlign.Center)
          .margin({ bottom: AppSpacing.LG })
      }

      if (this.actionText) {
        Text(this.actionText)
          .fontSize(14)
          .fontColor(AppColors.PRIMARY_LIGHT)
          .fontWeight(FontWeight.Medium)
          .padding({ left: AppSpacing.XL, right: AppSpacing.XL, top: AppSpacing.SM, bottom: AppSpacing.SM })
          .borderRadius(AppRadius.PILL)
          .backgroundColor(AppColors.PRIMARY_LIGHT + '20')
          .onClick(() => this.emptyOnAction())
      }
    }
    .width('100%')
    .layoutWeight(1)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .padding(AppSpacing.XXL)
  }
}
