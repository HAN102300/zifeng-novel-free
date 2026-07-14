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
