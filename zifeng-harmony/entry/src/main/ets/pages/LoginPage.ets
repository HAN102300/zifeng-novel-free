/**
 * 紫枫免费小说鸿蒙应用 - 登录页面
 * 适配 HarmonyOS 26.0.0：渐变背景、玻璃质感卡片、极光粒子动画
 */
import { AuthService } from '../service/AuthService';
import { router } from '@kit.ArkUI';
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem';
import { LightOrbs } from '../common/ParticleEffects';

@Entry
@Component
struct LoginPage {
  @State username: string = '';
  @State password: string = '';
  @State rememberMe: boolean = false;
  @State isLoading: boolean = false;
  @State showPassword: boolean = false;
  @State usernameError: string = '';
  @State passwordError: string = '';
  @State logoScale: number = 0.8;
  @State logoOpacity: number = 0;
  @State formTranslateY: number = 50;
  @State formOpacity: number = 0;
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'

  private authService = AuthService.getInstance();

  aboutToAppear() {
    // 入场动画
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

      // 光斑装饰（移除 AuroraBackground 避免过度叠加）
      LightOrbs({
        count: 2,
        isDarkMode: false
      })

      // 内容
      Scroll() {
        Column() {
          // Logo 区域
          Column() {
            // Logo 容器
            Stack() {
              // 外层光晕
              Column()
                .width(120)
                .height(120)
                .borderRadius(60)
                .backgroundColor(AppColors.PRIMARY_LIGHT)
                .opacity(0.2)
                .blur(30)

              // Logo 本体
              Column() {
                Stack() {
                  Column()
                    .width(56)
                    .height(72)
                    .backgroundColor('#ffffff')
                    .borderRadius(6)

                  Column()
                    .width(2)
                    .height(72)
                    .backgroundColor(AppColors.PRIMARY)
                    .position({ x: 27, y: 0 })

                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 5, y: 18 })
                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 5, y: 28 })
                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 5, y: 38 })
                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 5, y: 48 })

                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 31, y: 18 })
                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 31, y: 28 })
                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 31, y: 38 })
                  Column().width(20).height(2).backgroundColor(AppColors.PRIMARY).position({ x: 31, y: 48 })
                }
              }
              .width(96)
              .height(96)
              .borderRadius(48)
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
            .margin({ top: this.topRectHeight })

            Text('紫枫免费小说')
              .fontSize(28)
              .fontWeight(FontWeight.Bold)
              .fontColor(AppColors.PRIMARY_DARK)
              .margin({ top: AppSpacing.LG })
              .opacity(this.logoOpacity)

            Text('海量书源 · 聚合搜索 · 永久免费')
              .fontSize(13)
              .fontColor(AppColors.TEXT_SECONDARY)
              .margin({ top: 6 })
              .letterSpacing(1)
              .opacity(this.logoOpacity)
          }
          .width('100%')
          .alignItems(HorizontalAlign.Center)

          // 表单区域（玻璃质感）
          Column({ space: AppSpacing.LG }) {
            // 用户名输入
            this.inputField('👤', '请输入用户名', this.username, (val: string) => {
              this.username = val
              this.usernameError = ''
            }, this.usernameError, false)

            // 密码输入
            this.inputField('🔒', '请输入密码', this.password, (val: string) => {
              this.password = val
              this.passwordError = ''
            }, this.passwordError, true)

            // 记住登录
            Row() {
              Row({ space: 8 }) {
                Stack() {
                  Column()
                    .width(20)
                    .height(20)
                    .borderRadius(4)
                    .backgroundColor(this.rememberMe ? AppColors.PRIMARY_LIGHT : 'rgba(0, 0, 0, 0.05)')
                    .border({
                      width: 1,
                      color: this.rememberMe ? AppColors.PRIMARY_LIGHT : 'rgba(0, 0, 0, 0.15)'
                    })

                  if (this.rememberMe) {
                    Text('✓')
                      .fontSize(12)
                      .fontColor('#ffffff')
                      .fontWeight(FontWeight.Bold)
                  }
                }
                .width(20)
                .height(20)
                .onClick(() => {
                  this.rememberMe = !this.rememberMe
                })

                Text('记住登录状态')
                  .fontSize(14)
                  .fontColor(AppColors.TEXT_SECONDARY)
              }

              Blank()

              Text('忘记密码？')
                .fontSize(13)
                .fontColor(AppColors.PRIMARY_LIGHT)
                .onClick(() => {
                  router.pushUrl({ url: 'pages/ResetPasswordPage' });
                })
            }
            .width('100%')

            // 登录按钮
            Row() {
              if (this.isLoading) {
                Text('登录中...')
              } else {
                Row({ space: 6 }) {
                  Text('登 录')
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
                colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
              })
            .justifyContent(FlexAlign.Center)
            .alignItems(VerticalAlign.Center)
            .shadow({
              radius: 16,
              color: 'rgba(170, 59, 255, 0.4)',
              offsetY: 6
            })
            .enabled(!this.isLoading)
            .onClick(() => this.handleLogin())

            // 立即注册
            Row({ space: 6 }) {
              Text('还没有账号？')
                .fontSize(13)
                .fontColor(AppColors.TEXT_SECONDARY)
              Text('立即注册')
                .fontSize(13)
                .fontColor(AppColors.PRIMARY_LIGHT)
                .fontWeight(FontWeight.Medium)
                .onClick(() => {
                  router.pushUrl({ url: 'pages/RegisterPage' });
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
          .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.XL })
          .translate({ y: this.formTranslateY })
          .opacity(this.formOpacity)

          // 底部协议
          Row() {
            Text('登录即代表同意')
              .fontSize(11)
              .fontColor(AppColors.TEXT_TERTIARY)
            Text('《用户协议》')
              .fontSize(11)
              .fontColor(AppColors.PRIMARY_LIGHT)
              .onClick(() => {
                AlertDialog.show({ message: '用户协议内容待补充' })
              })
            Text('和')
              .fontSize(11)
              .fontColor(AppColors.TEXT_TERTIARY)
            Text('《隐私政策》')
              .fontSize(11)
              .fontColor(AppColors.PRIMARY_LIGHT)
              .onClick(() => {
                AlertDialog.show({ message: '隐私政策内容待补充' })
              })
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
  inputField(icon: string, placeholder: string, value: string, onChange: (val: string) => void, error: string, isPassword: boolean) {
    Column() {
      Stack() {
        // 玻璃质感输入框
        Row() {
          Text(icon)
            .fontSize(18)
            .margin({ right: AppSpacing.SM })

          TextInput({
            placeholder: placeholder,
            text: value
          })
            .type(isPassword ? (this.showPassword ? InputType.Normal : InputType.Password) : InputType.Normal)
            .maxLength(20)
            .layoutWeight(1)
            .backgroundColor(Color.Transparent)
            .fontSize(15)
            .placeholderColor(AppColors.TEXT_TERTIARY)
            .fontColor(AppColors.TEXT_PRIMARY)
            .onChange((val: string) => {
              onChange(val)
            })

          if (isPassword) {
            Text(this.showPassword ? '🙈' : '👁')
              .fontSize(16)
              .padding(4)
              .onClick(() => {
                this.showPassword = !this.showPassword
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
      }
      .width('100%')

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
   * 处理登录逻辑
   */
  private async handleLogin(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;

    try {
      const result = await this.authService.login(
        this.username,
        this.password,
        this.rememberMe
      );

      if (result.success) {
        AppStorage.set('isLoggedIn', true);
        AppStorage.set('currentUser', result.data);

        AlertDialog.show({
          title: '登录成功',
          message: '欢迎回来！',
          primaryButton: {
            value: '确定',
            action: () => {
              router.replaceUrl({ url: 'pages/Index' });
            }
          }
        });
      } else {
        AlertDialog.show({
          title: '登录失败',
          message: result.message || '用户名或密码错误',
          primaryButton: {
            value: '确定',
            action: () => {}
          }
        });
      }
    } catch (error) {
      AlertDialog.show({
        title: '错误',
        message: '登录过程中出现错误，请稍后重试',
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
   */
  private validateForm(): boolean {
    let isValid = true;

    if (!this.username.trim()) {
      this.usernameError = '请输入用户名';
      isValid = false;
    } else if (this.username.length < 3) {
      this.usernameError = '用户名至少 3 个字符';
      isValid = false;
    }

    if (!this.password) {
      this.passwordError = '请输入密码';
      isValid = false;
    } else if (this.password.length < 6) {
      this.passwordError = '密码至少 6 个字符';
      isValid = false;
    }

    return isValid;
  }
}
