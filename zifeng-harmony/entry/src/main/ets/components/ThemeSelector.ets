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
