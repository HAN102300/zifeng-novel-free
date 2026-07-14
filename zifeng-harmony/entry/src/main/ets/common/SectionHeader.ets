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
