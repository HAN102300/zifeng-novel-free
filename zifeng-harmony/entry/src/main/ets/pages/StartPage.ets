/**
 * StartPage - 启动页
 * 规格：§2.1 启动页
 *
 * 应用快启技术优化，启动时间 < 800ms
 * 后台并行预加载数据，1.5s 后丝滑过渡到下一页
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppDuration, AppCurves } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { ApiClient } from '../service/ApiClient'
import TextLogo from '../components/TextLogo'

@Entry
@Component
struct StartPage {
  @State logoOpacity: number = 0
  @State logoScale: number = 0.8
  @State pageOpacity: number = 1

  aboutToAppear() {
    // 初始化主题
    ThemeManager.init()
    // 后台并行任务
    this.preloadData()
    // Logo 渐显 + 弹性缩放
    setTimeout(() => {
      this.logoOpacity = 1
      this.logoScale = 1
    }, 100)
    // 1.8s 后丝滑过渡跳转
    setTimeout(() => {
      this.navigateToNext()
    }, 1800)
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
    // 先缩小渐隐 logo
    animateTo({
      duration: AppDuration.NORMAL,
      curve: AppCurves.EASE_IN_OUT
    }, () => {
      this.logoOpacity = 0
      this.logoScale = 0.9
    })
    // 同时页面淡出
    setTimeout(() => {
      animateTo({
        duration: AppDuration.SLOW,
        curve: AppCurves.EASE_OUT
      }, () => {
        this.pageOpacity = 0
      })
    }, 100)
    // 跳转
    setTimeout(() => {
      const isLoggedIn = AppStorage.get<boolean>('preload_logged_in') || false
      router.replaceUrl({
        url: isLoggedIn ? 'pages/HomePage' : 'pages/LoginPage'
      })
    }, AppDuration.SLOW + 100)
  }

  build() {
    Column() {
      Blank().layoutWeight(1)

      // 文字 Logo（带共享过渡 ID，实现一镜到底）
      TextLogo({ mode: 'splash', sharedId: 'app_logo' })
        .opacity(this.logoOpacity)
        .scale({ x: this.logoScale, y: this.logoScale })
        .animation({ duration: AppDuration.SLOWER, curve: AppCurves.SPRING })
        .sharedTransition('app_logo', {
          duration: 600,
          curve: AppCurves.EASE_OUT
        })

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
