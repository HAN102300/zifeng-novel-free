/**
 * LoginPage - 登录页
 * 规格：§2.2 登录页
 *
 * GlassCard 容器 + 验证码 + 粒子背景
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius, AppDuration, AppCurves
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService } from '../service/AuthService'
import { ParticleEffects } from '../common/ParticleEffects'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct LoginPage {
  @State username: string = ''
  @State password: string = ''
  @State captchaCode: string = ''
  @State captchaId: string = ''
  @State captchaImage: string = ''
  @State rememberMe: boolean = false
  @State isLoading: boolean = false
  @State passwordVisible: boolean = false
  @State cardShakeX: number = 0

  aboutToAppear() {
    this.refreshCaptcha()
  }

  private async refreshCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = result.captchaImage
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private async handleLogin() {
    if (!this.username || !this.password || !this.captchaCode) {
      promptAction.showToast({ message: '请填写完整信息' })
      return
    }
    this.isLoading = true
    try {
      await AuthService.login(
        this.username, this.password, this.rememberMe, this.captchaId, this.captchaCode
      )
      promptAction.showToast({ message: '登录成功' })
      router.replaceUrl({ url: 'pages/HomePage' })
    } catch (e) {
      // 卡片震动效果
      animateTo({ duration: 300, curve: AppCurves.SPRING }, () => {
        this.cardShakeX = 10
      })
      setTimeout(() => {
        animateTo({ duration: 300, curve: AppCurves.SPRING }, () => {
          this.cardShakeX = 0
        })
      }, 300)
      promptAction.showToast({ message: (e as Error).message || '登录失败' })
      this.refreshCaptcha()
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Stack() {
      // 渐变背景
      Column()
        .width('100%').height('100%')
        .linearGradient({
          direction: GradientDirection.Bottom,
          colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
        })

      // 粒子效果
      ParticleEffects()

      // 内容区
      Column() {
        Blank().layoutWeight(0.5)

        // Logo + 标题
        Image($r('app.media.yan')).width(72).height(72)
        Text('欢迎回来')
          .fontSize(AppTypography.SIZE_H2)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFFFFF')
          .margin({ top: AppSpacing.S2 })

        // 登录卡片
        Column() {
          // 用户名
          TextInput({ placeholder: '用户名', text: this.username })
            .height(48)
            .margin({ bottom: AppSpacing.S3 })
            .fontSize(AppTypography.SIZE_BODY)
            .onChange((val) => { this.username = val })

          // 密码
          TextInput({ placeholder: '密码', text: this.password })
            .height(48)
            .type(InputType.Password)
            .margin({ bottom: AppSpacing.S3 })
            .fontSize(AppTypography.SIZE_BODY)
            .onChange((val) => { this.password = val })

          // 验证码
          Row() {
            TextInput({ placeholder: '验证码', text: this.captchaCode })
              .height(48)
              .layoutWeight(1)
              .fontSize(AppTypography.SIZE_BODY)
              .onChange((val) => { this.captchaCode = val })
            Image(this.captchaImage)
              .width(100).height(48)
              .margin({ left: AppSpacing.S2 })
              .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S3 })

          // 记住我 + 忘记密码
          Row() {
            Checkbox({ name: 'remember' })
              .select(this.rememberMe)
              .onChange((val) => { this.rememberMe = val })
            Text('记住我')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))

            Blank()

            Text('忘记密码？')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getPrimaryColor())
              .onClick(() => {
                router.pushUrl({ url: 'pages/ResetPasswordPage' })
              })
          }
          .margin({ bottom: AppSpacing.S4 })

          // 登录按钮
          Button(this.isLoading ? '登录中...' : '登录')
            .width('100%').height(48)
            .fontSize(AppTypography.SIZE_BODY_LARGE)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleLogin())
        }
        .width('90%')
        .padding(AppSpacing.S6)
        .borderRadius(AppRadius.R_LG)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.REGULAR,
          applyShadow: true,
          interactive: false
        } as uiMaterial.ImmersiveOptions))
        .offset({ x: this.cardShakeX })

        // 注册链接
        Row() {
          Text('还没账号？')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('rgba(255,255,255,0.8)')
          Text('立即注册')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .onClick(() => {
              router.pushUrl({ url: 'pages/RegisterPage' })
            })
        }
        .margin({ top: AppSpacing.S5 })

        Blank().layoutWeight(1)

        // 协议
        Text('登录即代表同意《用户协议》和《隐私政策》')
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor('rgba(255,255,255,0.6)')
          .margin({ bottom: AppSpacing.S6 })
      }
      .width('100%').height('100%')
    }
    .width('100%').height('100%')
  }
}

export default LoginPage
