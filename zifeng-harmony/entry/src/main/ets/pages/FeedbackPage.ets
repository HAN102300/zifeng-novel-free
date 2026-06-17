/**
 * 意见反馈页面
 * 适配 HarmonyOS 26.0.0：玻璃质感、极光背景、光粒子特效
 */
import { router } from '@kit.ArkUI'
import feedbackService, { SubmitFeedbackData } from '../service/FeedbackService'
import { Loading } from '../common/LoadingComponent'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { LightOrbs, FloatingParticles } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct FeedbackPage {
  @State title: string = ''
  @State content: string = ''
  @State contact: string = ''
  @State isSubmitting: boolean = false
  @State showSuccessDialog: boolean = false
  @State isDarkMode: boolean = false
  @State formOpacity: number = 0
  @State formTranslateY: number = 30
  @State logoOpacity: number = 0
  @State logoScale: number = 0.85
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private themeManager = ThemeManager.getInstance()

  aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode

    // 入场动画
    animateTo({ duration: 600, curve: Curve.FastOutSlowIn }, () => {
      this.logoScale = 1
      this.logoOpacity = 1
    })
    setTimeout(() => {
      animateTo({ duration: 500, curve: Curve.EaseOut }, () => {
        this.formTranslateY = 0
        this.formOpacity = 1
      })
    }, 200)
  }

  async submitFeedback() {
    if (!this.title.trim()) {
      AlertDialog.show({
        title: '提示',
        message: '请输入反馈标题',
        confirm: {
          value: '确定',
          action: () => {}
        }
      })
      return
    }

    if (!this.content.trim()) {
      AlertDialog.show({
        title: '提示',
        message: '请输入反馈内容',
        confirm: {
          value: '确定',
          action: () => {}
        }
      })
      return
    }

    this.isSubmitting = true

    try {
      const result = await feedbackService.submitFeedback({
        category: 'feedback',
        title: this.title.trim(),
        content: this.content.trim()
      } as SubmitFeedbackData)

      if (result.success) {
        this.showSuccessDialog = true
        AlertDialog.show({
          title: '提交成功',
          message: '感谢您的反馈，我们会尽快处理',
          confirm: {
            value: '确定',
            action: () => {
              this.showSuccessDialog = false
              router.back()
            }
          }
        })
      } else {
        AlertDialog.show({
          title: '提交失败',
          message: result.message || '请稍后重试',
          confirm: {
            value: '确定',
            action: () => {}
          }
        })
      }
    } catch (error) {
      console.error('提交反馈失败:', error)
      AlertDialog.show({
        title: '提交失败',
        message: '网络错误，请稍后重试',
        confirm: {
          value: '确定',
          action: () => {}
        }
      })
    } finally {
      this.isSubmitting = false
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
          colors: this.isDarkMode
            ? [['#1a1a1f', 0.0], ['#25252b', 1.0]]
            : [['#f7f0ff', 0.0], ['#faf5ff', 0.5], ['#ffffff', 1.0]]
        })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])

      // 光斑装饰（移除 AuroraBackground 避免三重特效叠加）
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      // 飘浮粒子（减少数量）
      FloatingParticles({
        count: 6,
        isDarkMode: this.isDarkMode,
        enableAnimation: true
      })

      Column() {
        Column()
          .width('100%')
          .height(this.topRectHeight)
        Row() {
          Image($r('app.media.back'))
            .width(24)
            .height(24)
            .padding(4)
            .fillColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.PRIMARY)
            .borderRadius(14)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)'
            })
            .onClick(() => router.back())
            .opacity(this.logoOpacity)

          Blank()

          Row() {
            Text('💬')
              .fontSize(16)
              .margin({ right: 6 })
            Text('意见反馈')
              .fontSize(17)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.PRIMARY_DARK)
          }
          .opacity(this.logoOpacity)

          Blank()

          Column().width(32).height(32).opacity(this.logoOpacity)
        }
        .width('100%')
        .height(56)
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
        .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { bottom: 0.5 },
          color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
        })

        Scroll() {
          Column() {
            // 顶部图标标题
            Column() {
              Stack() {
                Column()
                  .width(100)
                  .height(100)
                  .borderRadius(50)
                  .backgroundColor(AppColors.PRIMARY_LIGHT)
                  .opacity(0.2)
                  .blur(30)

                Column() {
                  Text('💌')
                    .fontSize(40)
                }
                .width(80)
                .height(80)
                .borderRadius(40)
                .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.95)')
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
              .margin({ top: AppSpacing.XXL })

              Text('您的反馈对我们很重要')
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.PRIMARY_DARK)
                .margin({ top: AppSpacing.LG })
                .opacity(this.logoOpacity)

              Text('我们会在第一时间查看并改进')
                .fontSize(13)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_SECONDARY)
                .margin({ top: 6 })
                .letterSpacing(1)
                .opacity(this.logoOpacity)
            }
            .width('100%')
            .alignItems(HorizontalAlign.Center)

            // 表单区域（玻璃质感）
            Column({ space: AppSpacing.MD }) {
              // 标题输入
              InputGroupCard({ icon: '📝', label: '反馈标题', isDarkMode: this.isDarkMode }) {
                TextInput({ text: this.title, placeholder: '请输入反馈标题' })
                  .width('100%')
                  .height(50)
                  .backgroundColor(Color.Transparent)
                  .placeholderColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                  .fontSize(15)
                  .padding({ left: 0, right: 0 })
                  .onChange((value: string) => {
                    this.title = value
                  })
              }

              // 内容输入
              InputGroupCard({ icon: '📃', label: '反馈内容', isDarkMode: this.isDarkMode, cardHeight: 160 }) {
                TextArea({ text: this.content, placeholder: '请详细描述您遇到的问题或建议...' })
                  .width('100%')
                  .height(150)
                  .backgroundColor(Color.Transparent)
                  .placeholderColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                  .fontSize(15)
                  .padding({ left: 0, right: 0, top: 0, bottom: 0 })
                  .onChange((value: string) => {
                    this.content = value
                  })
              }

              // 联系方式输入
              InputGroupCard({ icon: '📧', label: '联系方式（选填）', isDarkMode: this.isDarkMode }) {
                TextInput({ text: this.contact, placeholder: '手机号或邮箱' })
                  .width('100%')
                  .height(50)
                  .backgroundColor(Color.Transparent)
                  .placeholderColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                  .fontSize(15)
                  .padding({ left: 0, right: 0 })
                  .onChange((value: string) => {
                    this.contact = value
                  })
              }

              // 提交按钮
              Row() {
                if (this.isSubmitting) {
                  Row({ space: 6 }) {
                    Text('提交中...').fontColor('#ffffff')
                  }
                } else {
                  Row({ space: 6 }) {
                    Text('提交反馈').fontColor('#ffffff')
                    Text('→').fontColor('#ffffff')
                  }
                }
              }
              .width('100%')
              .height(50)
              .borderRadius(25)
              .linearGradient(this.isSubmitting
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
                color: this.isSubmitting ? 'rgba(0, 0, 0, 0.1)' : 'rgba(170, 59, 255, 0.4)',
                offsetY: 6
              })
              .enabled(!this.isSubmitting)
              .onClick(() => {
                this.submitFeedback()
              })
              .margin({ top: AppSpacing.MD })
            }
            .width('100%')
            .padding({ left: AppSpacing.XXL, right: AppSpacing.XXL, top: AppSpacing.XXL, bottom: AppSpacing.XXL })
            .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .borderRadius(AppRadius.XXLARGE)
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'
            })
            .shadow({
              radius: 24,
              color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(170, 59, 255, 0.15)',
              offsetY: 8
            })
            .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG, bottom: 50 })
            .translate({ y: this.formTranslateY })
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
    .width('100%')
    .height('100%')
  }

}

/**
 * 输入框组组件（玻璃质感）
 */
@Component
struct InputGroupCard {
  icon: string = ''
  label: string = ''
  cardHeight: number = 50
  isDarkMode: boolean = false
  @BuilderParam content: () => void

  build() {
    Column() {
      Row() {
        Text(this.icon)
          .fontSize(15)
          .margin({ right: 6 })
        Text(this.label)
          .fontSize(14)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
      }
      .width('100%')
      .margin({ bottom: AppSpacing.SM })

      Row() {
        this.content()
      }
      .width('100%')
      .height(this.cardHeight)
      .padding({ left: AppSpacing.MD, right: AppSpacing.MD })
      .borderRadius(AppRadius.MEDIUM)
      .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.5)')
      .backgroundBlurStyle(BlurStyle.Regular, {
        adaptiveColor: AdaptiveColor.DEFAULT
      })
      .border({
        width: 1,
        color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(170, 59, 255, 0.15)'
      })
    }
    .width('100%')
  }
}
