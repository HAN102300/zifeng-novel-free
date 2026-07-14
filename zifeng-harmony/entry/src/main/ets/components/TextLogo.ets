/**
 * TextLogo - 紫枫免费小说 文字 Logo 组件
 * 用代码绘制精美的应用名称，替代图片 logo
 *
 * 支持两种尺寸：
 * - splash: 启动页大尺寸
 * - nav: 登录/注册页小尺寸
 */
import { AppTypography } from '../common/DesignSystem'

@Component
struct TextLogo {
  /** 尺寸模式：splash 大 / nav 小 */
  @Prop mode: string = 'splash'
  /** 共享过渡 ID（用于一镜到底转场） */
  @Prop sharedId: string = ''

  build() {
    Column() {
      // 上部装饰线 + 小圆点
      Row() {
        Divider()
          .strokeWidth(1)
          .color('rgba(255,255,255,0.4)')
          .layoutWeight(1)
        Circle()
          .width(6).height(6)
          .fill('#FFFFFF')
          .margin({ left: 8, right: 8 })
        Divider()
          .strokeWidth(1)
          .color('rgba(255,255,255,0.4)')
          .layoutWeight(1)
      }
      .width(this.mode === 'splash' ? 200 : 140)
      .margin({ bottom: this.mode === 'splash' ? 20 : 12 })

      // 主标题：紫枫免费小说
      Text('紫枫免费小说')
        .fontSize(this.mode === 'splash' ? 36 : 24)
        .fontWeight(FontWeight.Bold)
        .fontColor('#FFFFFF')
        .textAlign(TextAlign.Center)
        .shadow({
          radius: 12,
          color: 'rgba(0,0,0,0.15)',
          offsetX: 0,
          offsetY: 4,
        })
        .letterSpacing(this.mode === 'splash' ? 6 : 3)

      // 副标题
      Text('海量小说 · 免费阅读')
        .fontSize(this.mode === 'splash' ? AppTypography.SIZE_BODY : AppTypography.SIZE_CAPTION)
        .fontColor('rgba(255,255,255,0.85)')
        .margin({ top: this.mode === 'splash' ? 12 : 6 })
        .textAlign(TextAlign.Center)
        .letterSpacing(2)

      // 下部装饰线 + 小圆点
      Row() {
        Divider()
          .strokeWidth(1)
          .color('rgba(255,255,255,0.4)')
          .layoutWeight(1)
        Circle()
          .width(6).height(6)
          .fill('#FFFFFF')
          .margin({ left: 8, right: 8 })
        Divider()
          .strokeWidth(1)
          .color('rgba(255,255,255,0.4)')
          .layoutWeight(1)
      }
      .width(this.mode === 'splash' ? 200 : 140)
      .margin({ top: this.mode === 'splash' ? 20 : 12 })
    }
    .alignItems(HorizontalAlign.Center)
    .opacity(1)
  }
}

export default TextLogo
