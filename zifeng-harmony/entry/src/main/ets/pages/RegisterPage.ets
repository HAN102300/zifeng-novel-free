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
import { fileIo, fileUri } from '@kit.CoreFileKit'
import { common } from '@kit.AbilityKit'
import { buffer } from '@kit.ArkTS'
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

  private strengthColor(level: number): string {
    if (this.passwordStrength >= level) {
      if (level === 1) return '#F43F5E'
      if (level === 2) return '#F59E0B'
      return '#10B981'
    }
    return ThemeManager.getNeutral('BORDER_LIGHT')
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
        this.username, this.password, this.email, this.captchaId, this.captchaCode.toUpperCase()
      )
      promptAction.showToast({ message: '注册成功，正在登录...' })
      await AuthService.login(
        this.username, this.password, true, this.captchaId, this.captchaCode
      )
      router.replaceUrl({ url: 'pages/HomePage' })
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '注册失败' })
      this.forceRefreshCaptcha()
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
        Blank().layoutWeight(0.25)

        TextLogo({ mode: 'nav' })
        Text('创建账号')
          .fontSize(AppTypography.SIZE_H2)
          .fontWeight(FontWeight.Medium)
          .fontColor('#FFFFFF')
          .margin({ top: AppSpacing.S2, bottom: AppSpacing.S6 })

        Column() {
          // 用户名
          TextInput({ placeholder: '请输入用户名（3-20字符）', text: this.username })
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
          TextInput({ placeholder: '请输入密码', text: this.password })
            .height(50)
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .backgroundColor('#FFFFFF')
            .borderRadius(AppRadius.R_MD)
            .placeholderColor('rgba(0,0,0,0.35)')
            .fontColor('#1E1B2E')
            .type(InputType.Password)
            .margin({ bottom: AppSpacing.S1 })
            .fontSize(AppTypography.SIZE_BODY)
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
                .backgroundColor(this.strengthColor(level))
                .margin({ right: level < 3 ? 4 : 0 })
            })
          }
          .width('100%')
          .margin({ bottom: AppSpacing.S3 })

          // 邮箱
          TextInput({ placeholder: '请输入邮箱', text: this.email })
            .height(50)
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .backgroundColor('#FFFFFF')
            .borderRadius(AppRadius.R_MD)
            .placeholderColor('rgba(0,0,0,0.35)')
            .fontColor('#1E1B2E')
            .type(InputType.Email)
            .margin({ bottom: AppSpacing.S3 })
            .fontSize(AppTypography.SIZE_BODY)
            .onChange((val) => { this.email = val })

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
          .margin({ bottom: AppSpacing.S5 })

          // 注册按钮
          Button(this.isLoading ? '注册中...' : '注 册')
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
            .onClick(() => this.handleRegister())
        }
        .width('88%')
        .padding(AppSpacing.S6)
        .borderRadius(AppRadius.R_XL)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.REGULAR,
          applyShadow: true, interactive: false
        } as uiMaterial.ImmersiveOptions))

        Row() {
          Text('已有账号？')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor(ThemeManager.getPrimary(400))
          Text('返回登录')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor('#FFFFFF')
            .fontWeight(FontWeight.Medium)
            .margin({ left: 4 })
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
