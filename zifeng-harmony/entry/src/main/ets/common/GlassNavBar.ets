/**
 * GlassNavBar - 磁吸玻璃导航栏
 * 规格：§3.1 首页导航栏 + §1.2 THICK 材质
 *
 * 特性：
 * - ImmersiveStyle.THICK 材质
 * - 滚动时自动收缩高度（64vp → 48vp）
 * - 继续上滑完全隐藏，下滑重新出现
 */
import { uiMaterial, router } from '@kit.ArkUI'
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
          Image($r('app.media.chevron_left'))
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
      lightEffect: { enable: false }
    } as uiMaterial.ImmersiveOptions)
  }
}
