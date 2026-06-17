/**
 * 紫枫免费小说鸿蒙应用 - 阅读内容页面
 * 适配 HarmonyOS 26.0.0 新特性：
 * - 玻璃质感顶部/底部工具栏
 * - 沉浸式阅读体验
 */
import { Chapter } from '../model/Chapters'
import { Novel } from '../model/NovelItem'
import { router } from '@kit.ArkUI'
import { decryptAesCbc } from '../utils/CryptoJS'
import { calculateForLine } from '../utils/splitContent'
import { Loading } from '../common/LoadingComponent'
import bookService, { ChapterContentData } from '../service/BookService'
import { ApiResponse } from '../service/ApiClient'
import { AppColors, AppSpacing } from '../common/DesignSystem'
import axios, { AxiosResponse } from '@ohos/axios'

@Entry
@Component
struct ContentPage {
  @State chapter: Chapter = (router.getParams() as Record<string, Object>)['chapter'] as Chapter
  @State novelInfo: Novel = (router.getParams() as Record<string, Object>)['novelInfo'] as Novel
  @State path: string = ''
  @State chapterTitle: string = ''
  private swiperController: SwiperController = new SwiperController()
  @State content: string[] = []
  @State currentPage: number = 0
  @State isLoading: boolean = true
  @State showToolbar: boolean = false
  @State fontSize: number = 18
  @State lineHeight: number = 32
  @State bgColorIndex: number = 0
  @State chapterList: Chapter[] = []
  @State currentChapterIndex: number = -1
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'

  // 多种阅读背景色
  private bgColors: string[] = [
    '#f5e9d3', // 羊皮纸
    '#e8e8e8', // 浅灰
    '#d8e9d2', // 护眼绿
    '#2a2a2a', // 夜间
    '#1a1a2e'  // 深空
  ]

  async aboutToAppear() {
    // 从 AppStorage 恢复阅读设置
    const savedFontSize = AppStorage.get<number>('reading_fontSize')
    const savedLineHeight = AppStorage.get<number>('reading_lineHeight')
    if (savedFontSize) {
      this.fontSize = savedFontSize
    }
    if (savedLineHeight) {
      this.lineHeight = savedLineHeight
    }

    // 加载章节列表
    await this.loadChapterList()

    if (this.chapter && this.chapter.path) {
      await this.loadChapterContent(this.chapter)
    }
    this.isLoading = false
  }

  async loadChapterList() {
    try {
      if (this.novelInfo && this.novelInfo.source && this.novelInfo.tocUrl) {
        const tocResult: ApiResponse<Chapter[]> = await bookService.getToc(
          this.novelInfo.source,
          this.novelInfo.tocUrl,
          this.novelInfo
        )
        if (tocResult.data && tocResult.data.length > 0) {
          this.chapterList = tocResult.data
          // 查找当前章节在列表中的索引
          this.currentChapterIndex = this.chapterList.findIndex(
            (ch: Chapter) => ch.path === this.chapter.path || ch.chapterName === this.chapter.chapterName
          )
        }
      } else if (this.novelInfo && this.novelInfo.bookId) {
        // 降级：从本地数据库加载
        // 注意：此处需要 DbUtil 实例，暂不实现降级逻辑
        console.warn('无法获取章节列表：缺少书源信息')
      }
    } catch (err) {
      console.error('load chapter list error', JSON.stringify(err as Error))
    }
  }

  async loadChapterContent(chapter: Chapter) {
    this.isLoading = true
    this.chapterTitle = chapter.chapterName

    try {
      let text: string = ''

      // 优先使用新服务获取内容
      if (this.novelInfo && this.novelInfo.source && chapter.path) {
        const contentResult: ApiResponse<ChapterContentData> = await bookService.getContent(
          this.novelInfo.source,
          chapter.path,
          this.novelInfo,
          chapter
        )

        if (contentResult.data && contentResult.data.content) {
          text = contentResult.data.content
        }
      }

      // 降级：直接通过 path URL 获取内容
      if (!text) {
        this.path = decryptAesCbc(chapter.path)
        if (this.path) {
          try {
            const res: AxiosResponse = await axios.get(this.path)
            const resData = res.data as Record<string, string>
            text = resData['content'] ?? ''
          } catch (fallbackErr) {
            console.error('降级获取内容失败:', JSON.stringify(fallbackErr))
          }
        }
      }

      this.content = calculateForLine(text, 500)
      this.currentPage = 0
    } catch (err) {
      console.error('load content error', JSON.stringify(err as Error))
      AlertDialog.show({
        title: '加载失败',
        message: '章节内容加载失败，请稍后重试',
        confirm: {
          value: '确定',
          action: () => router.back()
        }
      })
    }
    this.isLoading = false
  }

  goToPrevChapter() {
    if (this.currentChapterIndex > 0) {
      this.currentChapterIndex--
      this.chapter = this.chapterList[this.currentChapterIndex]
      this.loadChapterContent(this.chapter)
    }
  }

  goToNextChapter() {
    if (this.currentChapterIndex < this.chapterList.length - 1) {
      this.currentChapterIndex++
      this.chapter = this.chapterList[this.currentChapterIndex]
      this.loadChapterContent(this.chapter)
    }
  }

  build() {
    Stack() {
      // 阅读背景
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor(this.bgColors[this.bgColorIndex])
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])

      Column() {
        if (this.isLoading) {
          Loading()
        } else {
          Swiper(this.swiperController) {
            ForEach(this.content, (item: string, index: number) => {
              Text(item)
                .fontSize(this.fontSize)
                .fontColor(this.bgColorIndex >= 3 ? '#cccccc' : '#333333')
                .lineHeight(this.lineHeight)
                .letterSpacing(1)
                .width('100%')
                .align(Alignment.TopStart)
                .padding({ left: 20, right: 20, top: this.topRectHeight, bottom: 60 })
            })
          }
          .indicator(false)
          .loop(false)
          .height('100%')
          .width('100%')
          .onChange((index: number) => {
            this.currentPage = index
          })
        }
      }
      .width('100%')
      .height('100%')

      // 底部页码（玻璃质感）
      if (!this.isLoading && this.content.length > 0) {
        Row() {
          Text(`${this.currentPage + 1}`)
            .fontSize(13)
            .fontColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.6)')
            .fontWeight(FontWeight.Bold)
          Text(' / ')
            .fontSize(13)
            .fontColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)')
          Text(`${this.content.length}`)
            .fontSize(13)
            .fontColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.4)')
        }
        .padding({ left: 12, right: 12, top: 6, bottom: 6 })
        .borderRadius(14)
        .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.6)')
        .backgroundBlurStyle(BlurStyle.Regular, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: 0.5,
          color: this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)'
        })
        .position({ bottom: 30 })
        .align(Alignment.Center)
        .opacity(this.showToolbar ? 0.5 : 0.8)
      }

      // 顶部工具栏（玻璃质感）
      if (this.showToolbar) {
        Column() {
          Row() {
            Image($r('app.media.back'))
              .width(24)
              .height(24)
              .padding(4)
              .fillColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
              .borderRadius(14)
              .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .onClick(() => router.back())

            Blank()

            Column() {
              Text(this.chapterTitle || '正文')
                .fontSize(15)
                .fontWeight(FontWeight.Medium)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
              if (this.novelInfo && this.novelInfo.title) {
                Text(this.novelInfo.title)
                  .fontSize(11)
                  .fontColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)')
                  .margin({ top: 2 })
              }
            }
            .alignItems(HorizontalAlign.Center)
            .layoutWeight(1)

            Blank()

            // 字体大小按钮
            Row() {
              Text('A-')
                .fontSize(13)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
                .padding(4)
                .onClick(() => {
                  if (this.fontSize > 12) {
                    this.fontSize -= 2
                    this.lineHeight = Math.max(20, this.lineHeight - 2)
                    AppStorage.setOrCreate('reading_fontSize', this.fontSize)
                    AppStorage.setOrCreate('reading_lineHeight', this.lineHeight)
                  }
                })
              Text('A+')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
                .padding(4)
                .onClick(() => {
                  if (this.fontSize < 32) {
                    this.fontSize += 2
                    this.lineHeight = Math.min(50, this.lineHeight + 2)
                    AppStorage.setOrCreate('reading_fontSize', this.fontSize)
                    AppStorage.setOrCreate('reading_lineHeight', this.lineHeight)
                  }
                })
            }
          }
          .width('100%')
          .padding({ left: 12, right: 12, top: this.topRectHeight, bottom: 12 })
        }
        .width('100%')
        .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { bottom: 0.5 },
          color: this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        })
        .position({ x: 0, y: 0 })
        .animation({ duration: 250, curve: Curve.EaseInOut })
      }

      // 底部工具栏（玻璃质感）
      if (this.showToolbar) {
        Column() {
          // 进度条
          Row() {
            Text(`${this.currentPage + 1}`)
              .fontSize(12)
              .fontColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)')

            Slider({
              value: this.currentPage + 1,
              min: 1,
              max: this.content.length || 1,
              step: 1
            })
              .layoutWeight(1)
              .blockColor(this.bgColorIndex >= 3 ? AppColors.PRIMARY_LIGHT : AppColors.PRIMARY)
              .trackColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)')
              .selectedColor(AppColors.PRIMARY_LIGHT)
              .margin({ left: 8, right: 8 })
              .onChange((value: number) => {
                this.swiperController.changeIndex(Math.round(value) - 1, false)
              })

            Text(`${this.content.length}`)
              .fontSize(12)
              .fontColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)')
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })

          // 操作按钮
          Row() {
            // 上一章
            Row() {
              Text('‹')
                .fontSize(20)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
                .margin({ right: 4 })
              Text('上一章')
                .fontSize(13)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
            }
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .borderRadius(16)
            .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .layoutWeight(1)
            .justifyContent(FlexAlign.Center)
            .onClick(() => {
              this.goToPrevChapter()
            })

            // 目录
            Row() {
              Text('☰')
                .fontSize(18)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
                .margin({ right: 4 })
              Text('目录')
                .fontSize(13)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
            }
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .borderRadius(16)
            .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .layoutWeight(1)
            .justifyContent(FlexAlign.Center)
            .margin({ left: 8 })
            .onClick(() => {
              router.pushUrl({
                url: 'pages/DirectoryPage',
                params: this.novelInfo
              })
            })

            // 主题切换
            Row() {
              Text('🎨')
                .fontSize(16)
                .margin({ right: 4 })
              Text('主题')
                .fontSize(13)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
            }
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .borderRadius(16)
            .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .layoutWeight(1)
            .justifyContent(FlexAlign.Center)
            .margin({ left: 8 })
            .onClick(() => {
              this.bgColorIndex = (this.bgColorIndex + 1) % this.bgColors.length
            })

            // 下一章
            Row() {
              Text('下一章')
                .fontSize(13)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
              Text('›')
                .fontSize(20)
                .fontColor(this.bgColorIndex >= 3 ? '#ffffff' : '#333333')
                .margin({ left: 4 })
            }
            .padding({ left: 12, right: 12, top: 8, bottom: 8 })
            .borderRadius(16)
            .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .layoutWeight(1)
            .justifyContent(FlexAlign.Center)
            .margin({ left: 8 })
            .onClick(() => {
              this.goToNextChapter()
            })
          }
          .width('100%')
          .padding({ left: AppSpacing.MD, right: AppSpacing.MD, top: AppSpacing.SM, bottom: AppSpacing.LG })
        }
        .width('100%')
        .backgroundColor(this.bgColorIndex >= 3 ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { top: 0.5 },
          color: this.bgColorIndex >= 3 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        })
        .position({ x: 0, y: '83%' })
        .animation({ duration: 250, curve: Curve.EaseInOut })
      }
    }
    .width('100%')
    .height('100%')
    .onClick(() => {
      animateTo({ duration: 250, curve: Curve.EaseInOut }, () => {
        this.showToolbar = !this.showToolbar
      })
    })
  }
}
