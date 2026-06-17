/**
 * 紫枫免费小说鸿蒙应用 - 注册页面
 * 适配 HarmonyOS 26.0.0：渐变背景、玻璃质感卡片、极光粒子动画
 */
import { AuthService } from '../service/AuthService';
import { router } from '@kit.ArkUI';
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem';
import { LightOrbs } from '../common/ParticleEffects';

@Entry
@Component
struct RegisterPage {
  @State username: string = '';
  @State password: string = '';
  @State confirmPassword: string = '';
  @State email: string = '';
  @State isLoading: boolean = false;
  @State showPassword: boolean = false;
  @State showConfirmPassword: boolean = false;
  @State usernameError: string = '';
  @State passwordError: string = '';
  @State confirmPasswordError: string = '';
  @State emailError: string = '';
  @State logoScale: number = 0.8;
  @State logoOpacity: number = 0;
  @State formTranslateY: number = 50;
  @State formOpacity: number = 0;
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'

  private authService = AuthService.getInstance();

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

      Scroll() {
        Column() {
          // 顶部标题
          Column() {
            Stack() {
              Column()
                .width(100)
                .height(100)
                .borderRadius(50)
                .backgroundColor(AppColors.ACCENT_MINT)
                .opacity(0.2)
                .blur(30)

              Column() {
                Text('🌱')
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
                color: 'rgba(19, 194, 194, 0.3)',
                offsetY: 8
              })
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
            }
            .scale({ x: this.logoScale, y: this.logoScale })
            .opacity(this.logoOpacity)
            .margin({ top: this.topRectHeight })

            Text('创建账号')
              .fontSize(26)
              .fontWeight(FontWeight.Bold)
              .fontColor(AppColors.PRIMARY_DARK)
              .margin({ top: AppSpacing.LG })
              .opacity(this.logoOpacity)

            Text('加入紫枫免费小说，开启阅读之旅')
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
            this.inputField('👤', '请输入用户名', this.username, (val: string) => {
              this.username = val
              this.usernameError = ''
            }, this.usernameError, false)

            this.inputField('📧', '请输入邮箱', this.email, (val: string) => {
              this.email = val
              this.emailError = ''
            }, this.emailError, false)

            this.inputField('🔒', '请输入密码', this.password, (val: string) => {
              this.password = val
              this.passwordError = ''
            }, this.passwordError, true, () => this.showPassword, () => this.showPassword = !this.showPassword)

            this.inputField('🔐', '请再次输入密码', this.confirmPassword, (val: string) => {
              this.confirmPassword = val
              this.confirmPasswordError = ''
            }, this.confirmPasswordError, true, () => this.showConfirmPassword, () => this.showConfirmPassword = !this.showConfirmPassword)

            // 注册按钮
            Row() {
              if (this.isLoading) {
                Text('注册中...')
              } else {
                Row({ space: 6 }) {
                  Text('注 册')
                    .fontColor('#ffffff')
                  Text('→')
                    .fontColor('#ffffff')
                }
              }
            }
            .width('100%')
            .height(50)
            .borderRadius(25)
            .linearGradient(this.isLoading
              ? {
                angle: 90,
                colors: [['#cccccc', 0.0], ['#aaaaaa', 1.0]]
              }
              : {
                angle: 135,
                colors: [[AppColors.ACCENT_MINT, 0.0], ['#08979c', 1.0]]
              })
            .justifyContent(FlexAlign.Center)
            .alignItems(VerticalAlign.Center)
            .shadow({
              radius: 16,
              color: 'rgba(19, 194, 194, 0.4)',
              offsetY: 6
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleRegister())
            .margin({ top: AppSpacing.SM })

            // 已有账号
            Row({ space: 6 }) {
              Text('已有账号？')
                .fontSize(13)
                .fontColor(AppColors.TEXT_SECONDARY)
              Text('立即登录')
                .fontSize(13)
                .fontColor(AppColors.ACCENT_MINT)
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
            color: 'rgba(19, 194, 194, 0.15)',
            offsetY: 8
          })
          .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG })
          .translate({ y: this.formTranslateY })
          .opacity(this.formOpacity)

          // 底部协议
          Row() {
            Text('注册即代表同意')
              .fontSize(11)
              .fontColor(AppColors.TEXT_TERTIARY)
            Text('《用户协议》')
              .fontSize(11)
              .fontColor(AppColors.PRIMARY_LIGHT)
            Text('和')
              .fontSize(11)
              .fontColor(AppColors.TEXT_TERTIARY)
            Text('《隐私政策》')
              .fontSize(11)
              .fontColor(AppColors.PRIMARY_LIGHT)
          }
          .width('100%')
          .justifyContent(FlexAlign.Center)
          .margin({ top: AppSpacing.LG, bottom: 50 })
          .opacity(this.formOpacity)
        }
        .width('100%')
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 输入框构建器
   */
  @Builder
  inputField(icon: string, placeholder: string, value: string, onChange: (val: string) => void, error: string,
    isPassword: boolean, getShowState?: () => boolean, toggleShow?: () => void) {
    Column() {
      Row() {
        Text(icon)
          .fontSize(18)
          .margin({ right: AppSpacing.SM })

        TextInput({
          placeholder: placeholder,
          text: value
        })
          .type(isPassword ? (getShowState && getShowState() ? InputType.Normal : InputType.Password) : InputType.Normal)
          .maxLength(20)
          .layoutWeight(1)
          .backgroundColor(Color.Transparent)
          .fontSize(15)
          .placeholderColor(AppColors.TEXT_TERTIARY)
          .fontColor(AppColors.TEXT_PRIMARY)
          .onChange((val: string) => {
            onChange(val)
          })

        if (isPassword && toggleShow) {
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
        color: error ? AppColors.DANGER + '60' : 'rgba(19, 194, 194, 0.2)'
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
   * 处理注册逻辑
   */
  private async handleRegister(): Promise<void> {
    // 表单验证
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    try {
      const result = await this.authService.register(
        this.username,
        this.password,
        this.email
      );

      if (result.success) {
        // 注册成功，显示成功提示并返回登录页
        AlertDialog.show({
          title: '注册成功',
          message: '您的账号已创建成功，请登录',
          primaryButton: {
            value: '确定',
            action: () => {
              router.back();
            }
          }
        });
      } else {
        // 注册失败，显示错误信息
        AlertDialog.show({
          title: '注册失败',
          message: result.message || '注册失败，请稍后重试',
          primaryButton: {
            value: '确定',
            action: () => {}
          }
        });
      }
    } catch (error) {
      AlertDialog.show({
        title: '错误',
        message: '注册过程中出现错误，请稍后重试',
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
   * 表单验证
   * @returns 验证是否通过
   */
  private validateForm(): boolean {
    let isValid = true;

    // 验证用户名
    if (!this.username.trim()) {
      this.usernameError = '请输入用户名';
      isValid = false;
    } else if (this.username.length < 3) {
      this.usernameError = '用户名至少 3 个字符';
      isValid = false;
    } else if (this.username.length > 20) {
      this.usernameError = '用户名不能超过 20 个字符';
      isValid = false;
    }

    // 验证邮箱
    if (!this.email.trim()) {
      this.emailError = '请输入邮箱';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        this.emailError = '请输入有效的邮箱地址';
        isValid = false;
      }
    }

    // 验证密码
    if (!this.password) {
      this.passwordError = '请输入密码';
      isValid = false;
    } else if (this.password.length < 6) {
      this.passwordError = '密码至少 6 个字符';
      isValid = false;
    } else if (this.password.length > 20) {
      this.passwordError = '密码不能超过 20 个字符';
      isValid = false;
    }

    // 验证确认密码
    if (!this.confirmPassword) {
      this.confirmPasswordError = '请再次输入密码';
      isValid = false;
    } else if (this.confirmPassword !== this.password) {
      this.confirmPasswordError = '两次输入的密码不一致';
      isValid = false;
    }

    return isValid;
  }
}
