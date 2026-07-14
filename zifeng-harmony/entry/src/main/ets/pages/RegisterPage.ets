/**
 * RegisterPage - 注册页
 * 规格：§2.3 注册页
 *
 * 与登录页共享 GlassCard 样式，增加密码强度指示器
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
import TextLogo from '../components/TextLogo'

@Entry
@Component
struct RegisterPage {
  @State username: string = ''
  @State password: string = ''
  @State email: string = ''
  @State captchaCode: string = ''
  @State captchaId: string = ''
  @State captchaImage: string = ''
  @State isLoading: boolean = false
  @State passwordStrength: number = 0  // 0=未输入, 1=弱, 2=中, 3=强

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

  private calculateStrength(pwd: string) {
    if (pwd.length === 0) {
      this.passwordStrength = 0
    } else if (pwd.length < 6) {
      this.passwordStrength = 1
    } else if (pwd.length < 12) {
      this.passwordStrength = 2
    } else if (/\d/.test(pwd) && /[^a-zA-Z0-9]/.test(pwd)) {
      this.passwordStrength = 3
    } else {
      this.passwordStrength = 2
    }
  }

  private async handleRegister() {
    if (!this.username || !this.password || !this.email || !this.captchaCode) {
      promptAction.showToast({ message: '请填写完整信息' })
      return
    }
    if (this.username.length < 3 || this.username.length > 20) {
      promptAction.showToast({ message: '用户名 3-20 个字符' })
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      promptAction.showToast({ message: '邮箱格式不正确' })
      return
    }
    this.isLoading = true
    try {
      await AuthService.register(
        this.username, this.password, this.email, this.captchaId, this.captchaCode
      )
      // 注册成功后自动登录
      promptAction.showToast({ message: '注册成功，正在登录...' })
      await AuthService.login(
        this.username, this.password, true, this.captchaId, this.captchaCode
      )
      router.replaceUrl({ url: 'pages/HomePage' })
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '注册失败' })
      this.refreshCaptcha()
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Stack() {
      Column()
        .width('100%').height('100%')
        .linearGradient({
          direction: GradientDirection.Bottom,
          colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
        })
      ParticleEffects()

      Column() {
        Blank().layoutWeight(0.3)

        TextLogo({ mode: 'nav' })
        Text('创建账号')
          .fontSize(AppTypography.SIZE_H2)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFFFFF')
          .margin({ top: AppSpacing.S2 })

        Column() {
          TextInput({ placeholder: '用户名（3-20字符）', text: this.username })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .onChange((val) => { this.username = val })

          TextInput({ placeholder: '密码', text: this.password })
            .height(48).type(InputType.Password)
            .margin({ bottom: AppSpacing.S2 })
            .onChange((val) => {
              this.password = val
              this.calculateStrength(val)
            })

          // 密码强度指示器
          Row() {
            ForEach([1, 2, 3], (level: number) => {
              Column()
                .layoutWeight(1).height(3)
                .borderRadius(2)
                .backgroundColor(
                  this.passwordStrength >= level
                    ? (level === 1 ? '#F43F5E' : level === 2 ? '#F59E0B' : '#10B981')
                    : ThemeManager.getNeutral('BORDER_LIGHT')
                )
                .margin({ right: level < 3 ? 4 : 0 })
            })
          }
          .width('100%')
          .margin({ bottom: AppSpacing.S3 })

          TextInput({ placeholder: '邮箱', text: this.email })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .type(InputType.Email)
            .onChange((val) => { this.email = val })

          Row() {
            TextInput({ placeholder: '验证码', text: this.captchaCode })
              .height(48).layoutWeight(1)
              .onChange((val) => { this.captchaCode = val })
            Image(this.captchaImage)
              .width(100).height(48)
              .margin({ left: AppSpacing.S2 })
              .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S4 })

          Button(this.isLoading ? '注册中...' : '注册')
            .width('100%').height(48)
            .fontSize(AppTypography.SIZE_BODY_LARGE)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleRegister())
        }
        .width('90%')
        .padding(AppSpacing.S6)
        .borderRadius(AppRadius.R_LG)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.REGULAR,
          applyShadow: true, interactive: false
        } as uiMaterial.ImmersiveOptions))

        Row() {
          Text('已有账号？')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('rgba(255,255,255,0.8)')
          Text('返回登录')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('#FFFFFF').fontWeight(FontWeight.Medium)
            .onClick(() => router.back())
        }
        .margin({ top: AppSpacing.S5 })

        Blank().layoutWeight(1)
      }
      .width('100%').height('100%')
    }
    .width('100%').height('100%')
  }
}

export default RegisterPage
