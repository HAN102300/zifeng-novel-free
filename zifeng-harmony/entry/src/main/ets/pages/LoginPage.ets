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
import { fileIo, fileUri } from '@kit.CoreFileKit'
import { common } from '@kit.AbilityKit'
import { buffer } from '@kit.ArkTS'
import TextLogo from '../components/TextLogo'

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
  @State captchaCooldown: number = 0
  private captchaTimer: number = -1

  aboutToAppear() {
    this.loadCaptcha()
  }

  aboutToDisappear() {
    if (this.captchaTimer !== -1) {
      clearInterval(this.captchaTimer)
      this.captchaTimer = -1
    }
  }

  private async refreshCaptcha() {
    if (this.captchaCooldown > 0) {
      return
    }
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = await this.base64ToFileUri(result.image)
      this.startCooldown()
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private async loadCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = await this.base64ToFileUri(result.image)
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private async forceRefreshCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = await this.base64ToFileUri(result.image)
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private startCooldown() {
    this.captchaCooldown = 60
    if (this.captchaTimer !== -1) {
      clearInterval(this.captchaTimer)
    }
    this.captchaTimer = setInterval(() => {
      this.captchaCooldown--
      if (this.captchaCooldown <= 0) {
        clearInterval(this.captchaTimer)
        this.captchaTimer = -1
      }
    }, 1000)
  }

  private async base64ToFileUri(dataUrl: string): Promise<string> {
    try {
      if (!dataUrl || dataUrl.length < 10) {
        return ''
      }
      const base64Str = dataUrl.substring(dataUrl.indexOf(',') + 1)
      const dataBuffer = buffer.from(base64Str, 'base64')
      const context = getContext(this) as common.UIAbilityContext
      const filePath = context.filesDir + '/captcha.png'
      const file = fileIo.openSync(filePath, fileIo.OpenMode.READ_WRITE | fileIo.OpenMode.CREATE)
      fileIo.writeSync(file.fd, dataBuffer.buffer)
      fileIo.closeSync(file)
      return fileUri.getUriFromPath(filePath)
    } catch (e) {
      console.warn('captcha save file failed:', (e as Error).message)
      return ''
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
        this.username, this.password, this.rememberMe, this.captchaId, this.captchaCode.toUpperCase()
      )
      promptAction.showToast({ message: '登录成功' })
      router.replaceUrl({ url: 'pages/HomePage' })
    } catch (e) {
      animateTo({ duration: 300, curve: AppCurves.SPRING }, () => {
        this.cardShakeX = 10
      })
      setTimeout(() => {
        animateTo({ duration: 300, curve: AppCurves.SPRING }, () => {
          this.cardShakeX = 0
        })
      }, 300)
      promptAction.showToast({ message: (e as Error).message || '登录失败' })
      this.forceRefreshCaptcha()
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
        Blank().layoutWeight(0.4)

        // 文字 Logo
        TextLogo({ mode: 'nav', sharedId: 'app_logo' })
          .sharedTransition('app_logo', {
            duration: 600,
            curve: AppCurves.EASE_OUT
          })

        Text('欢迎回来')
          .fontSize(AppTypography.SIZE_H2)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFFFFF')
          .margin({ top: AppSpacing.S2, bottom: AppSpacing.S6 })

        // 登录卡片
        Column() {
          // 用户名
          TextInput({ placeholder: '请输入用户名', text: this.username })
            .height(50)
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .backgroundColor('#FFFFFF')
            .borderRadius(AppRadius.R_MD)
            .placeholderColor('rgba(0,0,0,0.35)')
            .fontColor('#1E1B2E')
            .margin({ bottom: AppSpacing.S3 })
            .fontSize(AppTypography.SIZE_BODY)
            .onChange((val) => { this.username = val })

          // 密码
          Row() {
            TextInput({ placeholder: '请输入密码', text: this.password })
              .height(50)
              .layoutWeight(1)
              .backgroundColor('#FFFFFF')
              .border({ width: 0 })
              .placeholderColor('rgba(0,0,0,0.35)')
              .fontColor('#1E1B2E')
              .fontSize(AppTypography.SIZE_BODY)
              .type(this.passwordVisible ? InputType.Normal : InputType.Password)
              .onChange((val) => { this.password = val })
            Text(this.passwordVisible ? '🙈' : '👁')
              .fontSize(18)
              .padding({ left: AppSpacing.S2 })
              .onClick(() => { this.passwordVisible = !this.passwordVisible })
          }
          .margin({ bottom: AppSpacing.S3 })

          // 验证码
          Row() {
            TextInput({ placeholder: '请输入验证码', text: this.captchaCode })
              .height(50)
              .layoutWeight(1)
              .backgroundColor('#FFFFFF')
              .borderRadius(AppRadius.R_MD)
              .placeholderColor('rgba(0,0,0,0.35)')
              .fontColor('#1E1B2E')
              .fontSize(AppTypography.SIZE_BODY)
              .onChange((val) => { this.captchaCode = val })
            Stack() {
              Image(this.captchaImage)
                .width(120).height(44)
                .borderRadius(AppRadius.R_SM)
                .objectFit(ImageFit.Cover)
                .backgroundColor('#FFFFFF')
              if (this.captchaCooldown > 0) {
                Text(this.captchaCooldown.toString())
                  .fontSize(14)
                  .fontColor('#FFFFFF')
                  .fontWeight(FontWeight.Bold)
                  .position({ x: '50%', y: '50%' })
                  .translate({ x: '-50%', y: '-50%' })
                  .backgroundColor('rgba(0,0,0,0.5)')
                  .borderRadius(AppRadius.R_SM)
                  .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              } else {
                Text('↻')
                  .fontSize(16)
                  .fontColor('rgba(0,0,0,0.4)')
                  .position({ x: '75%', y: '50%' })
                  .translate({ x: '-50%', y: '-50%' })
              }
            }
            .width(120).height(44)
            .margin({ left: AppSpacing.S2 })
            .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S4 })

          // 记住我 + 忘记密码
          Row() {
            Row() {
              Checkbox({ name: 'remember' })
                .select(this.rememberMe)
                .height(20).width(20)
                .selectedColor(ThemeManager.getPrimaryColor())
                .onChange((val) => { this.rememberMe = val })
              Text('记住我')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getPrimary(400))
                .margin({ left: 4 })
            }
            Blank()
            Text('忘记密码？')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getPrimaryColor())
              .onClick(() => {
                router.pushUrl({ url: 'pages/ResetPasswordPage' })
              })
            }
          .width('100%')
          .margin({ bottom: AppSpacing.S5 })

          // 登录按钮
          Button(this.isLoading ? '登录中...' : '登 录')
            .width('100%').height(50)
            .fontSize(AppTypography.SIZE_BODY_LARGE)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .borderRadius(AppRadius.R_MD)
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleLogin())
        }
        .width('88%')
        .padding(AppSpacing.S6)
        .borderRadius(AppRadius.R_XL)
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
            .fontColor('rgba(255,255,255,0.7)')
          Text('立即注册')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .margin({ left: 4 })
            .onClick(() => {
              router.pushUrl({ url: 'pages/RegisterPage' })
            })
        }
        .margin({ top: AppSpacing.S5 })

        Blank().layoutWeight(1)

        // 协议
        Text('登录即代表同意《用户协议》和《隐私政策》')
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor('rgba(255,255,255,0.5)')
          .margin({ bottom: AppSpacing.S6 })
      }
      .width('100%').height('100%')
    }
    .width('100%').height('100%')
  }
}

export default LoginPage
