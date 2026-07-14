/**
 * StartPage - 启动页
 * 规格：§2.1 启动页
 *
 * 应用快启技术优化，启动时间 < 800ms
 * 后台并行预加载数据，1.5s 超时后淡出
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppDuration, AppCurves } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { ApiClient } from '../service/ApiClient'

@Entry
@Component
struct StartPage {
  @State logoOpacity: number = 0
  @State pageOpacity: number = 1

  aboutToAppear() {
    // 初始化主题
    ThemeManager.init()
    // 后台并行任务
    this.preloadData()
    // Logo 渐显
    setTimeout(() => {
      this.logoOpacity = 1
    }, 100)
    // 1.5s 后淡出跳转
    setTimeout(() => {
      this.navigateToNext()
    }, 1500)
  }

  private async preloadData() {
    try {
      await ApiClient.init()
      const isLoggedIn = await AuthService.isLoggedIn()
      AppStorage.setOrCreate('preload_logged_in', isLoggedIn)
    } catch (e) {
      console.warn('StartPage preload failed:', e)
    }
  }

  private navigateToNext() {
    animateTo({
      duration: AppDuration.SLOW,
      curve: AppCurves.EASE_OUT
    }, () => {
      this.pageOpacity = 0
    })
    setTimeout(() => {
      const isLoggedIn = AppStorage.get<boolean>('preload_logged_in') || false
      router.replaceUrl({
        url: isLoggedIn ? 'pages/HomePage' : 'pages/LoginPage'
      })
    }, AppDuration.SLOW)
  }

  build() {
    Column() {
      Blank().layoutWeight(1)

      // Logo
      Image($r('app.media.yan'))
        .width(180).height(180)
        .opacity(this.logoOpacity)
        .animation({ duration: AppDuration.SLOWER, curve: AppCurves.SPRING })

      // 应用名称
      Text('紫枫免费小说')
        .fontSize(AppTypography.SIZE_H1)
        .fontWeight(FontWeight.Bold)
        .fontColor('#FFFFFF')
        .margin({ top: AppSpacing.S4 })
        .opacity(this.logoOpacity)

      // Slogan
      Text('海量小说 · 免费阅读')
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor('rgba(255,255,255,0.8)')
        .margin({ top: AppSpacing.S2 })
        .opacity(this.logoOpacity)

      Blank().layoutWeight(1)

      // 加载指示器
      LoadingProgress()
        .width(28).height(28)
        .color('#FFFFFF')

      // 版本号
      Text('v1.0.0')
        .fontSize(AppTypography.SIZE_CAPTION)
        .fontColor('rgba(255,255,255,0.6)')
        .margin({ bottom: AppSpacing.S6, top: AppSpacing.S3 })
    }
    .width('100%')
    .height('100%')
    .linearGradient({
      direction: GradientDirection.Bottom,
      colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
    })
    .opacity(this.pageOpacity)
  }
}

export default StartPage
