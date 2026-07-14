/**
 * NovelDetailPage - 小说详情页
 * 规格：§4.1 小说详情页
 * 特性：封面 3D 倾斜跟踪鼠标、背景水墨书法元素、沉浸光感卡片
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius, AppAnimation } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { ProgressBar } from '../components/ProgressBar'
import { NovelDetails, Chapter } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { BookshelfService, ShelfAddData } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct NovelDetailPage {
  @State novel: NovelDetails | null = null
  @State chapters: Chapter[] = []
  @State isLoading: boolean = true
  @State isInShelf: boolean = false
  @State readingProgress: number = 0
  @State lastChapter: string = ''
  // 3D 倾斜跟踪
  @State coverRotateX: number = 0
  @State coverRotateY: number = 0
  private bookUrl: string = ''
  private sourceUrl: string = ''

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>
    this.bookUrl = params?.bookUrl ?? ''
    this.sourceUrl = params?.sourceUrl ?? ''
    this.loadDetail()
    this.checkShelfStatus()
  }

  private async loadDetail() {
    try {
      this.novel = await BookService.getBookInfo(this.bookUrl, this.sourceUrl)
      this.chapters = await BookService.getChapterList(this.bookUrl, this.sourceUrl)
      this.lastChapter = this.chapters[this.chapters.length - 1]?.title ?? ''
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async checkShelfStatus() {
    this.isInShelf = await BookshelfService.isInShelf(this.bookUrl)
    const progress = await BookshelfService.getReadingProgress(this.bookUrl)
    this.readingProgress = progress.percentage
  }

  private async toggleShelf() {
    if (this.isInShelf) {
      await BookshelfService.removeFromShelf(this.bookUrl)
      this.isInShelf = false
      promptAction.showToast({ message: '已移出书架' })
    } else if (this.novel) {
      const addData: ShelfAddData = {
        bookUrl: this.bookUrl,
        sourceUrl: this.sourceUrl,
        title: this.novel.title,
        author: this.novel.author,
        cover: this.novel.cover,
        latestChapter: this.lastChapter
      };
      await BookshelfService.addToShelf(addData)
      this.isInShelf = true
      promptAction.showToast({ message: '已加入书架' })
    }
  }

  private startReading() {
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: { bookUrl: this.bookUrl, sourceUrl: this.sourceUrl, chapterIndex: 0 }
    })
  }

  private continueReading() {
    BookshelfService.getReadingProgress(this.bookUrl).then(progress => {
      router.pushUrl({
        url: 'pages/ReaderPage',
        params: {
          bookUrl: this.bookUrl,
          sourceUrl: this.sourceUrl,
          chapterIndex: progress.chapterIndex
        }
      })
    })
  }

  private openDirectory() {
    router.pushUrl({
      url: 'pages/DirectoryPage',
      params: { bookUrl: this.bookUrl, sourceUrl: this.sourceUrl }
    })
  }

  // 封面 3D 跟踪
  private handleCoverTouch(x: number, y: number) {
    this.coverRotateY = (x - 0.5) * 24
    this.coverRotateX = -(y - 0.5) * 24
  }

  private resetCoverRotate() {
    this.coverRotateX = 0
    this.coverRotateY = 0
  }

  build() {
    Stack({ alignContent: Alignment.TopStart }) {
      // 背景水墨书法水印
      Text('墨')
        .fontSize(280)
        .fontColor(ThemeManager.getPrimary(50))
        .opacity(0.5)
        .position({ x: '60%', y: '10%' })

      Column() {
        // 顶部返回栏
        Row() {
          BackButton()
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4 })

        if (this.isLoading) {
          Column() {
            LoadingProgress().color(ThemeManager.getPrimary(500))
          }
          .width('100%').layoutWeight(1)
          .justifyContent(FlexAlign.Center)
        } else if (this.novel) {
          Scroll() {
            Column() {
              // 封面 + 基础信息（3D 跟踪）
              Row() {
                Column() {
                  Image(this.novel.cover)
                    .width(120).height(168)
                    .borderRadius(AppRadius.R_MD)
                    .objectFit(ImageFit.Cover)
                    .rotate({ x: 1, y: 0, z: 0, angle: this.coverRotateX })
                    .animation({ duration: AppAnimation.DUR_FAST, curve: Curve.EaseOut })
                }
                .onTouch((event: TouchEvent) => {
                  if (event.type === TouchType.Move) {
                    const tx = event.touches[0].x / 120
                    const ty = event.touches[0].y / 168
                    this.handleCoverTouch(tx, ty)
                  } else if (event.type === TouchType.Up) {
                    this.resetCoverRotate()
                  }
                })

                Column() {
                  Text(this.novel.title)
                    .fontSize(AppTypography.SIZE_H2)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .fontWeight(FontWeight.Medium)
                  Text(this.novel.author)
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .margin({ top: AppSpacing.S1 })
                  Row() {
                    Text(this.novel.category)
                      .fontSize(AppTypography.SIZE_TINY)
                      .fontColor(ThemeManager.getPrimary(500))
                      .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                      .borderRadius(AppRadius.R_SM)
                      .backgroundColor(ThemeManager.getPrimary(50))
                    Text(this.novel.status)
                      .fontSize(AppTypography.SIZE_TINY)
                      .fontColor(ThemeManager.getAccent('Emerald'))
                      .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                      .borderRadius(AppRadius.R_SM)
                      .backgroundColor(ThemeManager.getAccent('Emerald') + '20')
                      .margin({ left: AppSpacing.S2 })
                  }
                  .margin({ top: AppSpacing.S2 })
                  Text(`${this.novel.wordCount} 字`)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                    .margin({ top: AppSpacing.S1 })
                }
                .alignItems(HorizontalAlign.Start)
                .margin({ left: AppSpacing.S4 })
                .layoutWeight(1)
              }
              .padding(AppSpacing.S4)

              // 阅读进度（如已加入书架且有进度）
              if (this.isInShelf && this.readingProgress > 0) {
                GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S3 }) {
                  Column() {
                    Row() {
                      Text('阅读进度')
                        .fontSize(AppTypography.SIZE_CAPTION)
                        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                      Text(`${Math.round(this.readingProgress * 100)}%`)
                        .fontSize(AppTypography.SIZE_BODY_LARGE)
                        .fontColor(ThemeManager.getPrimary(500))
                        .margin({ left: AppSpacing.S2 })
                    }
                    .width('100%')
                    ProgressBar({ progress: this.readingProgress * 100, animated: true })
                      .margin({ top: AppSpacing.S2 })
                  }
                }
              }

              // 简介 (CORRECTED: summary not intro)
              GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S3 }) {
                Column() {
                  Text('简介')
                    .fontSize(AppTypography.SIZE_H4)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  Text(this.novel.summary)
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .margin({ top: AppSpacing.S2 })
                    .maxLines(4)
                    .textOverflow({ overflow: TextOverflow.Ellipsis })
                }
                .alignItems(HorizontalAlign.Start)
              }

              // 最新章节
              GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S8 }) {
                Column() {
                  Row() {
                    Text('最新章节')
                      .fontSize(AppTypography.SIZE_H4)
                      .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    Text('查看目录')
                      .fontSize(AppTypography.SIZE_CAPTION)
                      .fontColor(ThemeManager.getPrimary(500))
                      .onClick(() => this.openDirectory())
                  }
                  .width('100%')
                  .justifyContent(FlexAlign.SpaceBetween)
                  Text(this.lastChapter)
                    .fontSize(AppTypography.SIZE_BODY_SMALL)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .margin({ top: AppSpacing.S2 })
                }
                .alignItems(HorizontalAlign.Start)
              }
            }
          }
          .layoutWeight(1)
          .scrollBar(BarState.Auto)
        }
      }
      .width('100%').height('100%')

      // 底部操作栏（浮动）
      if (this.novel) {
        Row() {
          Button(this.isInShelf ? '已在书架' : '加入书架')
            .type(ButtonType.Capsule)
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
            .layoutWeight(1)
            .onClick(() => this.toggleShelf())
          Button(this.readingProgress > 0 ? '继续阅读' : '开始阅读')
            .type(ButtonType.Capsule)
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(Color.White)
            .linearGradient({
              direction: GradientDirection.Right,
              colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
            })
            .layoutWeight(1)
            .margin({ left: AppSpacing.S3 })
            .onClick(() => {
              if (this.readingProgress > 0) this.continueReading()
              else this.startReading()
            })
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
        .position({ x: 0, y: '100%' })
        .markAnchor({ x: 0, y: '100%' })
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default NovelDetailPage
