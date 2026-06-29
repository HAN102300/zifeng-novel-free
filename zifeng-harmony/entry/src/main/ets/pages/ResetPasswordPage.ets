/**
 * 紫枫免费小说鸿蒙应用 - 密码重置页面
 * 适配 HarmonyOS 26.0.0：渐变背景、玻璃质感卡片、极光粒子动画
 */
import { AuthService, ResetPasswordParams } from '../service/AuthService';
import { router } from '@kit.ArkUI';
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem';
import { LightOrbs, FloatingParticles } from '../common/ParticleEffects';

@Entry
@Component
struct ResetPasswordPage {
  @State email: string = '';
  @State code: string = '';
  @State newPassword: string = '';
  @State confirmPassword: string = '';
  @State isLoading: boolean = false;
  @State isSendingCode: boolean = false;
  @State showPassword: boolean = false;
  @State showConfirmPassword: boolean = false;
  @State countdown: number = 0;
  @State emailError: string = '';
  @State codeError: string = '';
  @State passwordError: string = '';
  @State confirmPasswordError: string = '';
  @State step: number = 1; // 1: 发送验证码, 2: 输入验证码和新密码
  @State logoScale: number = 0.8;
  @State logoOpacity: number = 0;
  @State formTranslateY: number = 50;
  @State formOpacity: number = 0;
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'

  private authService = AuthService.getInstance();
  private countdownTimer: number = -1;

  aboutToAppear() {
    animateTo({ duration: 800, curve: Curve.FastOutSlowIn }, () => {
      this.logoScale = 1
      this.logoOpacity = 1
    })
    setTimeout(() => {
      animateTo({ duration: 600, curve: Curve.EaseOut }, () => {
        this.formTranslateY = 0
        this.formOpacity = 1
      })
    }, 200)
  }

  aboutToDisappear() {
    if (this.countdownTimer !== -1) {
      clearInterval(this.countdownTimer);
    }
  }

  build() {
    Stack() {
      // 背景渐变
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          angle: 180,
          colors: [
            ['#f7f0ff', 0.0],
            ['#faf5ff', 0.5],
            ['#ffffff', 1.0]
          ]
        })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])

      // 光斑装饰
      LightOrbs({
        count: 2,
        isDarkMode: false
      })

      // 飘浮粒子（减少数量）
      FloatingParticles({
        count: 6,
        isDarkMode: false,
        enableAnimation: true
      })

      Scroll() {
        Column() {
          // 返回按钮
          Row() {
            Image($r('app.media.back'))
              .width(24)
              .height(24)
              .padding(4)
              .fillColor(AppColors.PRIMARY)
              .borderRadius(14)
              .backgroundColor('rgba(255, 255, 255, 0.6)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .border({
                width: 1,
                color: 'rgba(255, 255, 255, 0.5)'
              })
              .onClick(() => {
                router.back();
              })
            Blank()
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: this.topRectHeight })
          .opacity(this.logoOpacity)

          // 顶部标题
          Column() {
            Stack() {
              Column()
                .width(100)
                .height(100)
                .borderRadius(50)
                .backgroundColor(AppColors.PRIMARY)
                .opacity(0.2)
                .blur(30)

              Column() {
                Text('🔑')
                  .fontSize(40)
              }
              .width(80)
              .height(80)
              .borderRadius(40)
              .backgroundColor('rgba(255, 255, 255, 0.95)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .shadow({
                radius: 20,
                color: 'rgba(170, 59, 255, 0.3)',
                offsetY: 8
              })
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
            }
            .scale({ x: this.logoScale, y: this.logoScale })
            .opacity(this.logoOpacity)
            .margin({ top: 20 })

            Text('重置密码')
              .fontSize(26)
              .fontWeight(FontWeight.Bold)
              .fontColor(AppColors.PRIMARY_DARK)
              .margin({ top: AppSpacing.LG })
              .opacity(this.logoOpacity)

            Text(this.step === 1 ? '请输入您的注册邮箱' : '请输入验证码和新密码')
              .fontSize(13)
              .fontColor(AppColors.TEXT_SECONDARY)
              .margin({ top: 6 })
              .letterSpacing(1)
              .opacity(this.logoOpacity)
          }
          .width('100%')
          .alignItems(HorizontalAlign.Center)

          // 表单区域（玻璃质感）
          Column({ space: AppSpacing.MD }) {
            // 步骤指示器
            Row() {
              Row() {
                Text('1')
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(Color.White)
              }
              .width(28)
              .height(28)
              .borderRadius(14)
              .backgroundColor(this.step >= 1 ? AppColors.PRIMARY : '#e0e0e0')
              .justifyContent(FlexAlign.Center)
              .alignItems(VerticalAlign.Center)

              Column()
                .layoutWeight(1)
                .height(2)
                .borderRadius(1)
                .backgroundColor(this.step >= 2 ? AppColors.PRIMARY : '#e0e0e0')

              Row() {
                Text('2')
                  .fontSize(13)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(Color.White)
              }
              .width(28)
              .height(28)
              .borderRadius(14)
              .backgroundColor(this.step >= 2 ? AppColors.PRIMARY : '#e0e0e0')
              .justifyContent(FlexAlign.Center)
              .alignItems(VerticalAlign.Center)
            }
            .width('100%')
            .margin({ bottom: AppSpacing.MD })

            // 邮箱输入框
            Column() {
              Row() {
                Text('📧')
                  .fontSize(18)
                  .margin({ right: AppSpacing.SM })

                TextInput({
                  placeholder: '请输入注册邮箱',
                  text: this.email
                })
                  .type(InputType.Email)
                  .layoutWeight(1)
                  .backgroundColor(Color.Transparent)
                  .fontSize(15)
                  .placeholderColor(AppColors.TEXT_TERTIARY)
                  .fontColor(AppColors.TEXT_PRIMARY)
                  .enabled(this.step === 1)
                  .onChange((value: string) => {
                    this.email = value;
                    this.emailError = '';
                  })
              }
              .width('100%')
              .height(50)
              .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
              .borderRadius(14)
              .backgroundColor('rgba(255, 255, 255, 0.5)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .border({
                width: 1,
                color: this.emailError ? AppColors.DANGER + '60' : 'rgba(170, 59, 255, 0.2)'
              })

              if (this.emailError) {
                Row() {
                  Text('⚠')
                    .fontSize(12)
                    .fontColor(AppColors.DANGER)
                    .margin({ right: 4 })
                  Text(this.emailError)
                    .fontSize(12)
                    .fontColor(AppColors.DANGER)
                }
                .width('100%')
                .margin({ top: 4, left: 4 })
              }
            }
            .width('100%')

            if (this.step === 2) {
              // 验证码输入框
              Row() {
                Row() {
                  Text('🔢')
                    .fontSize(18)
                    .margin({ right: AppSpacing.SM })

                  TextInput({
                    placeholder: '请输入验证码',
                    text: this.code
                  })
                    .type(InputType.Number)
                    .maxLength(6)
                    .layoutWeight(1)
                    .backgroundColor(Color.Transparent)
                    .fontSize(15)
                    .placeholderColor(AppColors.TEXT_TERTIARY)
                    .fontColor(AppColors.TEXT_PRIMARY)
                    .onChange((value: string) => {
                      this.code = value;
                      this.codeError = '';
                    })
                }
                .layoutWeight(1)
                .height(50)
                .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
                .borderRadius(14)
                .backgroundColor('rgba(255, 255, 255, 0.5)')
                .backgroundBlurStyle(BlurStyle.Regular, {
                  adaptiveColor: AdaptiveColor.DEFAULT
                })
                .border({
                  width: 1,
                  color: this.codeError ? AppColors.DANGER + '60' : 'rgba(170, 59, 255, 0.2)'
                })

                Button(this.isSendingCode ? '发送中' : (this.countdown > 0 ? `${this.countdown}s` : '重新发送'))
                  .layoutWeight(0)
                  .height(50)
                  .fontSize(13)
                  .fontColor(Color.White)
                  .backgroundColor(this.isSendingCode || this.countdown > 0 ? '#cccccc' : AppColors.PRIMARY)
                  .borderRadius(14)
                  .margin({ left: AppSpacing.SM })
                  .enabled(!this.isSendingCode && this.countdown === 0)
                  .onClick(() => {
                    this.handleSendCode();
                  })
              }
              .width('100%')

              if (this.codeError) {
                Row() {
                  Text('⚠')
                    .fontSize(12)
                    .fontColor(AppColors.DANGER)
                    .margin({ right: 4 })
                  Text(this.codeError)
                    .fontSize(12)
                    .fontColor(AppColors.DANGER)
                }
                .width('100%')
                .margin({ top: -8, left: 4 })
              }

              // 新密码输入框
              this.passwordInput(
                '🔒',
                '请输入新密码',
                this.newPassword,
                (val: string) => {
                  this.newPassword = val
                  this.passwordError = ''
                },
                this.passwordError,
                () => this.showPassword,
                () => this.showPassword = !this.showPassword
              )

              // 确认密码输入框
              this.passwordInput(
                '🔐',
                '请再次输入新密码',
                this.confirmPassword,
                (val: string) => {
                  this.confirmPassword = val
                  this.confirmPasswordError = ''
                },
                this.confirmPasswordError,
                () => this.showConfirmPassword,
                () => this.showConfirmPassword = !this.showConfirmPassword
              )
            }

            // 主按钮
            Row() {
              if (this.isLoading || this.isSendingCode) {
                Text(this.step === 1 ? '发送中...' : '重置中...')
              } else {
                Row({ space: 6 }) {
                  Text(this.step === 1 ? '发送验证码' : '重置密码')
                    .fontColor('#ffffff')
                  Text('→')
                    .fontColor('#ffffff')
                }
              }
            }
            .width('100%')
            .height(50)
            .borderRadius(25)
            .linearGradient((this.isLoading || this.isSendingCode)
              ? {
                angle: 90,
                colors: [['#cccccc', 0.0], ['#aaaaaa', 1.0]]
              }
              : {
                angle: 135,
                colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
              })
            .justifyContent(FlexAlign.Center)
            .alignItems(VerticalAlign.Center)
            .shadow({
              radius: 16,
              color: (this.isLoading || this.isSendingCode) ? 'rgba(0,0,0,0.1)' : 'rgba(170, 59, 255, 0.4)',
              offsetY: 6
            })
            .enabled(!this.isLoading && !this.isSendingCode)
            .onClick(() => {
              if (this.step === 1) {
                this.handleSendCode();
              } else {
                this.handleResetPassword();
              }
            })
            .margin({ top: AppSpacing.SM })

            // 返回登录链接
            Row({ space: 6 }) {
              Text('想起密码了？')
                .fontSize(13)
                .fontColor(AppColors.TEXT_SECONDARY)
              Text('立即登录')
                .fontSize(13)
                .fontColor(AppColors.PRIMARY_LIGHT)
                .fontWeight(FontWeight.Medium)
                .onClick(() => {
                  router.back();
                })
            }
            .width('100%')
            .justifyContent(FlexAlign.Center)
            .margin({ top: AppSpacing.SM })
          }
          .width('100%')
          .padding({ left: AppSpacing.XXL, right: AppSpacing.XXL, top: AppSpacing.XXL, bottom: AppSpacing.XXL })
          .backgroundColor('rgba(255, 255, 255, 0.65)')
          .backgroundBlurStyle(BlurStyle.Regular, {
            adaptiveColor: AdaptiveColor.DEFAULT
          })
          .borderRadius(AppRadius.XXLARGE)
          .border({
            width: 1,
            color: 'rgba(255, 255, 255, 0.5)'
          })
          .shadow({
            radius: 24,
            color: 'rgba(170, 59, 255, 0.15)',
            offsetY: 8
          })
          .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG })
          .translate({ y: this.formTranslateY })
          .opacity(this.formOpacity)
        }
        .width('100%')
        .padding({ bottom: 50 })
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 密码输入框构建器（玻璃质感）
   */
  @Builder
  passwordInput(icon: string, placeholder: string, value: string, onChange: (val: string) => void, error: string,
    getShowState?: () => boolean, toggleShow?: () => void) {
    Column() {
      Row() {
        Text(icon)
          .fontSize(18)
          .margin({ right: AppSpacing.SM })

        TextInput({
          placeholder: placeholder,
          text: value
        })
          .type((getShowState && getShowState()) ? InputType.Normal : InputType.Password)
          .maxLength(20)
          .layoutWeight(1)
          .backgroundColor(Color.Transparent)
          .fontSize(15)
          .placeholderColor(AppColors.TEXT_TERTIARY)
          .fontColor(AppColors.TEXT_PRIMARY)
          .onChange((val: string) => {
            onChange(val)
          })

        if (getShowState && toggleShow) {
          Text((getShowState && getShowState()) ? '🙈' : '👁')
            .fontSize(16)
            .padding(4)
            .onClick(() => {
              toggleShow()
            })
        }
      }
      .width('100%')
      .height(50)
      .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
      .borderRadius(14)
      .backgroundColor('rgba(255, 255, 255, 0.5)')
      .backgroundBlurStyle(BlurStyle.Regular, {
        adaptiveColor: AdaptiveColor.DEFAULT
      })
      .border({
        width: 1,
        color: error ? AppColors.DANGER + '60' : 'rgba(170, 59, 255, 0.2)'
      })

      if (error) {
        Row() {
          Text('⚠')
            .fontSize(12)
            .fontColor(AppColors.DANGER)
            .margin({ right: 4 })
          Text(error)
            .fontSize(12)
            .fontColor(AppColors.DANGER)
        }
        .width('100%')
        .margin({ top: 4, left: 4 })
      }
    }
    .width('100%')
  }

  /**
   * 发送验证码
   */
  private async handleSendCode(): Promise<void> {
    // 验证邮箱
    if (!this.validateEmail()) {
      return;
    }

    this.isSendingCode = true;

    try {
      const result = await this.authService.sendResetCode(this.email);

      if (result.success) {
        // 发送成功，进入第二步
        this.step = 2;
        this.startCountdown();

        AlertDialog.show({
          title: '发送成功',
          message: '验证码已发送到您的邮箱，请查收',
          primaryButton: {
            value: '确定',
            action: () => {}
          }
        });
      } else {
        // 发送失败，显示错误信息
        AlertDialog.show({
          title: '发送失败',
          message: result.message || '验证码发送失败，请稍后重试',
          primaryButton: {
            value: '确定',
            action: () => {}
          }
        });
      }
    } catch (error) {
      AlertDialog.show({
        title: '错误',
        message: '发送验证码过程中出现错误，请稍后重试',
        primaryButton: {
          value: '确定',
          action: () => {}
        }
      });
    } finally {
      this.isSendingCode = false;
    }
  }

  /**
   * 重置密码
   */
  private async handleResetPassword(): Promise<void> {
    // 表单验证
    if (!this.validateResetForm()) {
      return;
    }

    this.isLoading = true;

    try {
      const result = await this.authService.resetPassword({
        email: this.email,
        code: this.code,
        newPassword: this.newPassword
      });

      if (result.success) {
        // 重置成功，显示成功提示并返回登录页
        AlertDialog.show({
          title: '重置成功',
          message: '您的密码已成功重置，请使用新密码登录',
          primaryButton: {
            value: '确定',
            action: () => {
              router.back();
            }
          }
        });
      } else {
        // 重置失败，显示错误信息
        AlertDialog.show({
          title: '重置失败',
          message: result.message || '密码重置失败，请稍后重试',
          primaryButton: {
            value: '确定',
            action: () => {}
          }
        });
      }
    } catch (error) {
      AlertDialog.show({
        title: '错误',
        message: '重置密码过程中出现错误，请稍后重试',
        primaryButton: {
          value: '确定',
          action: () => {}
        }
      });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 开始倒计时
   */
  private startCountdown(): void {
    this.countdown = 60;
    this.countdownTimer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = -1;
      }
    }, 1000);
  }

  /**
   * 验证邮箱
   * @returns 验证是否通过
   */
  private validateEmail(): boolean {
    if (!this.email.trim()) {
      this.emailError = '请输入邮箱';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = '请输入有效的邮箱地址';
      return false;
    }

    return true;
  }

  /**
   * 验证重置密码表单
   * @returns 验证是否通过
   */
  private validateResetForm(): boolean {
    let isValid = true;

    // 验证验证码
    if (!this.code.trim()) {
      this.codeError = '请输入验证码';
      isValid = false;
    } else if (this.code.length !== 6) {
      this.codeError = '验证码为 6 位数字';
      isValid = false;
    }

    // 验证新密码
    if (!this.newPassword) {
      this.passwordError = '请输入新密码';
      isValid = false;
    } else if (this.newPassword.length < 6) {
      this.passwordError = '密码至少 6 个字符';
      isValid = false;
    } else if (this.newPassword.length > 20) {
      this.passwordError = '密码不能超过 20 个字符';
      isValid = false;
    }

    // 验证确认密码
    if (!this.confirmPassword) {
      this.confirmPasswordError = '请再次输入新密码';
      isValid = false;
    } else if (this.confirmPassword !== this.newPassword) {
      this.confirmPasswordError = '两次输入的密码不一致';
      isValid = false;
    }

    return isValid;
  }
}
