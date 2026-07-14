/**
 * ResetPasswordPage - 重置密码页
 * 规格：§2.4 重置密码页
 *
 * 两步流程：验证身份 → 设置新密码
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { AuthService, VerifyUserResult } from '../service/AuthService'
import { BackButton } from '../common/BackButton'
import { promptAction } from '@kit.ArkUI'
import { fileIo, fileUri } from '@kit.CoreFileKit'
import { common } from '@kit.AbilityKit'
import { buffer } from '@kit.ArkTS'

@Entry
@Component
struct ResetPasswordPage {
  @State currentStep: number = 0
  @State username: string = ''
  @State email: string = ''
  @State captchaCode: string = ''
  @State captchaId: string = ''
  @State captchaImage: string = ''
  @State newPassword: string = ''
  @State confirmPassword: string = ''
  @State isLoading: boolean = false
  @State verifiedInfo: VerifyUserResult = { username: '', email: '' }

  aboutToAppear() {
    this.refreshCaptcha()
  }

  private async refreshCaptcha() {
    try {
      const result = await AuthService.getCaptcha()
      this.captchaId = result.captchaId
      this.captchaImage = await this.base64ToFileUri(result.image)
    } catch (e) {
      promptAction.showToast({ message: '验证码加载失败' })
    }
  }

  private async base64ToFileUri(dataUrl: string): Promise<string> {
    try {
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

  private async handleVerify() {
    if (!this.username || !this.email) {
      promptAction.showToast({ message: '请填写完整信息' })
      return
    }
    this.isLoading = true
    try {
      const info = await AuthService.verifyUserForReset(this.username, this.email)
      this.verifiedInfo = info
      this.currentStep = 1
      promptAction.showToast({ message: '验证成功' })
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '验证失败' })
      this.refreshCaptcha()
    } finally {
      this.isLoading = false
    }
  }

  private async handleReset() {
    if (!this.newPassword || this.newPassword !== this.confirmPassword) {
      promptAction.showToast({ message: '两次密码不一致' })
      return
    }
    if (this.newPassword.length < 6) {
      promptAction.showToast({ message: '密码至少 6 位' })
      return
    }
    this.isLoading = true
    try {
      await AuthService.resetPassword(this.verifiedInfo.username, this.verifiedInfo.email, this.newPassword)
      promptAction.showToast({ message: '密码重置成功' })
      setTimeout(() => {
        router.replaceUrl({ url: 'pages/LoginPage' })
      }, 300)
    } catch (e) {
      promptAction.showToast({ message: (e as Error).message || '重置失败' })
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('重置密码')
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding(AppSpacing.S4)

      // 步骤指示器
      Row() {
        Text('1. 验证身份')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(this.currentStep === 0 ? ThemeManager.getPrimaryColor() : ThemeManager.getNeutral('TEXT_MUTED'))
        Column().width(40).height(2).backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT')).margin({ left: 8, right: 8 })
        Text('2. 设置新密码')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(this.currentStep === 1 ? ThemeManager.getPrimaryColor() : ThemeManager.getNeutral('TEXT_MUTED'))
      }
      .margin({ bottom: AppSpacing.S6 })

      // 表单卡片
      Column() {
        if (this.currentStep === 0) {
          // Step 0: 验证身份
          TextInput({ placeholder: '用户名', text: this.username })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .onChange((val) => { this.username = val })
          TextInput({ placeholder: '邮箱', text: this.email })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .type(InputType.Email)
            .onChange((val) => { this.email = val })
          Row() {
            TextInput({ placeholder: '验证码', text: this.captchaCode })
              .height(48).layoutWeight(1)
              .onChange((val) => { this.captchaCode = val })
            Image(this.captchaImage)
              .width(120).height(44)
              .borderRadius(AppRadius.R_SM)
              .objectFit(ImageFit.Cover)
              .backgroundColor('#FFFFFF')
              .margin({ left: AppSpacing.S2 })
              .onClick(() => this.refreshCaptcha())
          }
          .margin({ bottom: AppSpacing.S4 })
          Button(this.isLoading ? '验证中...' : '验证身份')
            .width('100%').height(48)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleVerify())
        } else {
          // Step 1: 设置新密码
          Row() {
            Text('账号：')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
            Text(this.verifiedInfo.username)
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          }
          .margin({ bottom: AppSpacing.S3 })

          TextInput({ placeholder: '新密码' })
            .height(48).margin({ bottom: AppSpacing.S3 })
            .type(InputType.Password)
            .onChange((val) => { this.newPassword = val })
          TextInput({ placeholder: '确认新密码' })
            .height(48).margin({ bottom: AppSpacing.S4 })
            .type(InputType.Password)
            .onChange((val) => { this.confirmPassword = val })

          Button(this.isLoading ? '重置中...' : '重置密码')
            .width('100%').height(48)
            .fontColor('#FFFFFF')
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleReset())
        }
      }
      .width('90%')
      .padding(AppSpacing.S6)
      .borderRadius(AppRadius.R_LG)
      .systemMaterial(new uiMaterial.ImmersiveMaterial({
        style: uiMaterial.ImmersiveStyle.REGULAR,
        applyShadow: true, interactive: false
      } as uiMaterial.ImmersiveOptions))

      Blank()

      Text('返回登录')
        .fontSize(AppTypography.SIZE_BODY_SMALL)
        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
        .margin({ bottom: AppSpacing.S6 })
        .onClick(() => router.back())
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default ResetPasswordPage
