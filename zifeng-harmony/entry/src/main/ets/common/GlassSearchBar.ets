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
  /** 输入内容（单向传递） */
  @Prop inputValue: string = ''
  /** 点击搜索回调 */
  onSearch?: (keyword: string) => void
  /** 输入内容变化回调 */
  onInputChange?: (val: string) => void
  /** 点击语音按钮回调 */
  onVoiceClick?: () => void
  /** 点击搜索栏（非编辑模式）回调 */
  onBarClick?: () => void

  build() {
    Row() {
      Image($r('app.media.search'))
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
            if (this.onInputChange) {
              this.onInputChange(val)
            }
          })
      } else {
        Text(this.placeholder)
          .layoutWeight(1)
          .fontSize(AppTypography.SIZE_BODY)
          .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
      }

      if (this.voiceEnabled) {
        Image($r('app.media.voice'))
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
      lightEffect: { enable: false }
    } as uiMaterial.ImmersiveOptions)
  }
}
