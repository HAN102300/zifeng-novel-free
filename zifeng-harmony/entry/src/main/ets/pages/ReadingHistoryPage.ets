/**
 * ReadingHistoryPage - 阅读历史页
 * 规格：§5.5 阅读历史
 * 特性：按日期分组、清空历史、继续阅读、删除单条
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { ProgressBar } from '../components/ProgressBar'
import { BookshelfService, ReadingRecord } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

interface HistoryGroup {
  date: string
  records: ReadingRecord[]
}

@Entry
@Component
struct ReadingHistoryPage {
  @State groups: HistoryGroup[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadHistory()
  }

  onPageShow() {
    this.loadHistory()
  }

  private async loadHistory() {
    try {
      const records = await BookshelfService.getAllHistory()
      this.groups = this.groupByDate(records)
    } catch (e) {
      promptAction.showToast({ message: '加载历史失败' })
    } finally {
      this.isLoading = false
    }
  }

  private groupByDate(records: ReadingRecord[]): HistoryGroup[] {
    const map = new Map<string, ReadingRecord[]>()
    for (const r of records) {
      const d = new Date(r.lastReadTime)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(r)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, recs]) => ({ date, records: recs }))
  }

  private formatDateLabel(date: string): string {
    const today = this.formatTime(Date.now())
    const yesterday = this.formatTime(Date.now() - 86400000)
    if (date === today) return '今天'
    if (date === yesterday) return '昨天'
    return date
  }

  private formatTime(ts: number): string {
    const d = new Date(ts)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  private continueReading(record: ReadingRecord) {
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: record.bookUrl,
        sourceUrl: record.sourceUrl,
        chapterIndex: record.lastChapterIndex
      }
    })
  }

  private async deleteRecord(record: ReadingRecord) {
    await BookshelfService.removeHistory(record.bookUrl)
    promptAction.showToast({ message: '已删除' })
    this.loadHistory()
  }

  private async clearAll() {
    promptAction.showDialog({
      title: '清空历史',
      message: '确定清空全部阅读历史？此操作不可恢复',
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '清空', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await BookshelfService.clearAllHistory()
        promptAction.showToast({ message: '已清空' })
        this.loadHistory()
      }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('阅读历史')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
        Text('清空')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(ThemeManager.getAccent('Rose'))
          .onClick(() => this.clearAll())
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2, 3], () => { LoadingSkel({ height: 88 }) })
        }
        .padding(AppSpacing.S4)
      } else if (this.groups.length === 0) {
        Column() {
          Text('暂无阅读历史')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
          Text('开始阅读后会自动记录')
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
            .margin({ top: AppSpacing.S1 })
        }
        .width('100%').layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else {
        Scroll() {
          Column() {
            ForEach(this.groups, (group: HistoryGroup) => {
              Text(this.formatDateLabel(group.date))
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                .margin({ left: AppSpacing.S4, top: AppSpacing.S5, bottom: AppSpacing.S2 })
              List({ space: AppSpacing.S3 }) {
                ForEach(group.records, (record: ReadingRecord) => {
                  ListItem() {
                    GlassCard({ padding: AppSpacing.S3 }) {
                      Row() {
                        Image(record.cover)
                          .width(56).height(78)
                          .borderRadius(AppRadius.R_SM)
                          .objectFit(ImageFit.Cover)
                        Column() {
                          Text(record.title)
                            .fontSize(AppTypography.SIZE_BODY_LARGE)
                            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                            .maxLines(1)
                            .textOverflow({ overflow: TextOverflow.Ellipsis })
                          Text(`读至：${record.lastChapterTitle}`)
                            .fontSize(AppTypography.SIZE_CAPTION)
                            .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                            .margin({ top: AppSpacing.S1 })
                            .maxLines(1)
                            .textOverflow({ overflow: TextOverflow.Ellipsis })
                          ProgressBar({ progress: record.progress })
                            .margin({ top: AppSpacing.S2 })
                          Row() {
                            Text(`${Math.round(record.progress)}%`)
                              .fontSize(AppTypography.SIZE_TINY)
                              .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                              .layoutWeight(1)
                            Text('继续')
                              .fontSize(AppTypography.SIZE_TINY)
                              .fontColor(ThemeManager.getPrimary(500))
                              .onClick(() => this.continueReading(record))
                            Text('删除')
                              .fontSize(AppTypography.SIZE_TINY)
                              .fontColor(ThemeManager.getAccent('Rose'))
                              .margin({ left: AppSpacing.S3 })
                              .onClick(() => this.deleteRecord(record))
                          }
                          .margin({ top: 4 })
                        }
                        .alignItems(HorizontalAlign.Start)
                        .margin({ left: AppSpacing.S3 })
                        .layoutWeight(1)
                      }
                    }
                  }
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            })
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default ReadingHistoryPage
