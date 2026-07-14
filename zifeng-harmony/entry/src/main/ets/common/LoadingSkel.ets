/**
 * LoadingSkel - 骨架屏组件
 * 规格：§3.1 加载状态骨架屏
 *
 * 支持三种形状：card（卡片）、text（文本行）、circle（圆形头像）
 * 灰色脉冲动画
 */
import { AppRadius } from './DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Component
export struct LoadingSkel {
  @Prop shape: string = 'text'  // 'card' | 'text' | 'circle'
  @Prop width: number | string = '100%'
  @Prop height: number = 16

  build() {
    Column()
      .width(this.width)
      .height(this.height)
      .borderRadius(this.getRadius())
      .backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT'))
      .animation({
        duration: 1200,
        iterations: -1,
        curve: Curve.EaseInOut
      })
      .onAppear(() => {
        // 脉冲效果通过 opacity 动画实现
        animateTo({
          duration: 1200,
          iterations: -1,
          curve: Curve.EaseInOut
        }, () => {})
      })
  }

  private getRadius(): number {
    switch (this.shape) {
      case 'card': return AppRadius.R_LG
      case 'circle': return 999
      default: return AppRadius.R_SM
    }
  }
}
