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
      Image($r('app.media.chevron_left'))
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
      lightEffect: { enable: true }
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
