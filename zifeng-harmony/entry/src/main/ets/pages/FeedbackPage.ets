/**
 * FeedbackPage - 意见反馈页
 * 规格：§5.4 意见反馈
 * 特性：反馈类型选择、内容输入、联系方式、历史反馈列表
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { FeedbackService, FeedbackWithLabels, FeedbackType } from '../service/FeedbackService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct FeedbackPage {
  @State feedbackType: FeedbackType = 'suggestion'
  @State content: string = ''
  @State contact: string = ''
  @State isSubmitting: boolean = false
  @State history: FeedbackWithLabels[] = []
  @State isLoadingHistory: boolean = true

  private types: { key: FeedbackType, label: string }[] = [
    { key: 'suggestion', label: '功能建议' },
    { key: 'bug', label: '问题反馈' },
    { key: 'content', label: '内容问题' },
    { key: 'other', label: '其他' }
  ]

  aboutToAppear() {
    this.loadHistory()
  }

  private async loadHistory() {
    try {
      this.history = await FeedbackService.getMyFeedback()
    } catch (e) {
      /* 静默 */
    } finally {
      this.isLoadingHistory = false
    }
  }

  private async submit() {
    if (this.content.trim().length < 5) {
      promptAction.showToast({ message: '反馈内容至少 5 个字' })
      return
    }
    this.isSubmitting = true
    try {
      await FeedbackService.submit({
        type: this.feedbackType,
        content: this.content,
        contact: this.contact
      })
      promptAction.showToast({ message: '提交成功，感谢反馈' })
      this.content = ''
      this.contact = ''
      this.loadHistory()
    } catch (e) {
      promptAction.showToast({ message: '提交失败，请稍后重试' })
    } finally {
      this.isSubmitting = false
    }
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('意见反馈')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      Scroll() {
        Column() {
          // 反馈类型
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('反馈类型')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              Flex({ wrap: FlexWrap.Wrap }) {
                ForEach(this.types, (t: { key: FeedbackType, label: string }) => {
                  Text(t.label)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(this.feedbackType === t.key
                      ? Color.White
                      : ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                    .borderRadius(AppRadius.R_FULL)
                    .backgroundColor(this.feedbackType === t.key
                      ? ThemeManager.getPrimary(500)
                      : ThemeManager.getNeutral('BG_ELEVATED'))
                    .margin({ right: AppSpacing.S2, bottom: AppSpacing.S2, top: AppSpacing.S3 })
                    .onClick(() => this.feedbackType = t.key)
                })
              }
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 反馈内容
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('反馈内容')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              TextArea({ placeholder: '请详细描述您的反馈（至少 5 个字）', text: this.content })
                .fontSize(AppTypography.SIZE_BODY)
                .height(120)
                .margin({ top: AppSpacing.S3 })
                .borderRadius(AppRadius.R_MD)
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .onChange((v: string) => this.content = v)
              Text(`${this.content.length} / 500`)
                .fontSize(AppTypography.SIZE_TINY)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                .alignSelf(ItemAlign.End)
                .margin({ top: AppSpacing.S1 })
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })

          // 联系方式
          GlassCard({ padding: AppSpacing.S4 }) {
            Column() {
              Text('联系方式（可选）')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              TextInput({ placeholder: '邮箱或手机号，方便我们回复', text: this.contact })
                .fontSize(AppTypography.SIZE_BODY)
                .margin({ top: AppSpacing.S3 })
                .borderRadius(AppRadius.R_MD)
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .onChange((v: string) => this.contact = v)
            }
            .alignItems(HorizontalAlign.Start)
          }
          .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S4 })

          // 提交按钮
          Button(this.isSubmitting ? '提交中...' : '提交反馈')
            .type(ButtonType.Capsule)
            .width('90%')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(Color.White)
            .backgroundColor(this.isSubmitting
              ? ThemeManager.getNeutral('TEXT_MUTED')
              : ThemeManager.getPrimary(500))
            .enabled(!this.isSubmitting)
            .onClick(() => this.submit())

          // 历史反馈
          Text('我的反馈')
            .fontSize(AppTypography.SIZE_H4)
            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .alignSelf(ItemAlign.Start)
            .margin({ left: AppSpacing.S4, top: AppSpacing.S6, bottom: AppSpacing.S3 })

          if (this.isLoadingHistory) {
            Column() {
              ForEach([0, 1], () => { LoadingSkel({ height: 80 }) })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
          } else if (this.history.length === 0) {
            Text('暂无反馈记录')
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
              .margin({ top: AppSpacing.S6, bottom: AppSpacing.S8 })
          } else {
            List({ space: AppSpacing.S3 }) {
              ForEach(this.history, (fb: FeedbackWithLabels) => {
                ListItem() {
                  GlassCard({ padding: AppSpacing.S4 }) {
                    Column() {
                      Row() {
                        Text(fb.typeLabel)
                          .fontSize(AppTypography.SIZE_TINY)
                          .fontColor(Color.White)
                          .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                          .borderRadius(AppRadius.R_SM)
                          .backgroundColor(ThemeManager.getPrimary(500))
                        Text(this.formatTime(fb.createdAt))
                          .fontSize(AppTypography.SIZE_TINY)
                          .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                          .margin({ left: AppSpacing.S2 })
                        Text(fb.statusLabel)
                          .fontSize(AppTypography.SIZE_TINY)
                          .fontColor(fb.status === 'resolved'
                            ? ThemeManager.getAccent('Emerald')
                            : ThemeManager.getAccent('Amber'))
                          .margin({ left: AppSpacing.S2 })
                      }
                      Text(fb.content)
                        .fontSize(AppTypography.SIZE_BODY_SMALL)
                        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                        .margin({ top: AppSpacing.S2 })
                        .maxLines(2)
                        .textOverflow({ overflow: TextOverflow.Ellipsis })
                      if (fb.reply && fb.reply.length > 0) {
                        Text('回复：' + fb.reply)
                          .fontSize(AppTypography.SIZE_CAPTION)
                          .fontColor(ThemeManager.getPrimary(500))
                          .margin({ top: AppSpacing.S2 })
                      }
                    }
                    .alignItems(HorizontalAlign.Start)
                  }
                }
              })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
          }
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  private formatTime(dateStr: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
}

export default FeedbackPage
