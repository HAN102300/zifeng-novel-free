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
  @Prop cardPadding: number = AppSpacing.S4
  /** 圆角 */
  @Prop cardBorderRadius: number = AppRadius.R_LG
  /** 自定义材质色（覆盖主题默认，空字符串表示不设置） */
  @Prop customMaterialColor: ResourceColor = ''
  /** 是否禁用交互形变 */
  @Prop disableInteractive: boolean = false
  /** 外边距 - 左 */
  @Prop cardMarginLeft: number = 0
  /** 外边距 - 右 */
  @Prop cardMarginRight: number = 0
  /** 外边距 - 下 */
  @Prop cardMarginBottom: number = 0
  /** 外边距 - 上 */
  @Prop cardMarginTop: number = 0
  /** 子内容构建器 */
  @BuilderParam content: () => void = this.defaultContent

  @Builder
  defaultContent() {
    Blank()
  }

  build() {
    Column() {
      this.content()
    }
    .width('100%')
    .padding(this.cardPadding)
    .borderRadius(this.cardBorderRadius)
    .margin({ left: this.cardMarginLeft, right: this.cardMarginRight, bottom: this.cardMarginBottom, top: this.cardMarginTop })
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
