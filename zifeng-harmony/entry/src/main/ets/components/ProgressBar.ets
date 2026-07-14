/**
 * ProgressBar - 阅读进度条
 * 规格：§核心组件库 ProgressBar
 */
import { AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct ProgressBar {
  @Prop progress: number = 0
  @Prop animated: boolean = true
  @State animPercent: number = 0

  aboutToAppear() {
    if (this.animated) {
      setTimeout(() => {
        animateTo({ duration: 600, curve: Curve.EaseOut }, () => {
          this.animPercent = this.progress
        })
      }, 100)
    } else {
      this.animPercent = this.progress
    }
  }

  build() {
    Stack() {
      // 背景
      Column()
        .width('100%').height(4)
        .borderRadius(AppRadius.R_FULL)
        .backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT'))
      // 填充
      Column()
        .width(`${this.animPercent}%`).height(4)
        .borderRadius(AppRadius.R_FULL)
        .linearGradient({
          direction: GradientDirection.Right,
          colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
        })
    }
    .width('100%')
  }
}
