/**
 * DirectoryPage - 章节目录页
 * 规格：§4.4 章节目录
 * 特性：正序/倒序切换、章节搜索、当前章节高亮、跳转阅读
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { Chapter } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct DirectoryPage {
  @State chapters: Chapter[] = []
  @State displayChapters: Chapter[] = []
  @State isLoading: boolean = true
  @State isReversed: boolean = false
  @State keyword: string = ''
  @State currentChapterIndex: number = -1
  private bookUrl: string = ''
  private sourceUrl: string = ''

  aboutToAppear() {
    const params = router.getParams() as Record<string, string | number>
    this.bookUrl = (params?.bookUrl as string) ?? ''
    this.sourceUrl = (params?.sourceUrl as string) ?? ''
    this.currentChapterIndex = (params?.currentIndex as number) ?? -1
    this.loadChapters()
  }

  private async loadChapters() {
    try {
      this.chapters = await BookService.getChapterList(this.bookUrl, this.sourceUrl)
      this.applyFilter()
    } catch (e) {
      promptAction.showToast({ message: '加载目录失败' })
    } finally {
      this.isLoading = false
    }
  }

  private applyFilter() {
    let list = [...this.chapters]
    if (this.keyword.length > 0) {
      list = list.filter(c => c.title.includes(this.keyword))
    }
    if (this.isReversed) {
      list.reverse()
    }
    this.displayChapters = list
  }

  private toggleOrder() {
    this.isReversed = !this.isReversed
    this.applyFilter()
  }

  private onSearchInput(val: string) {
    this.keyword = val
    this.applyFilter()
  }

  private jumpToChapter(idx: number) {
    router.replaceUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: this.bookUrl,
        sourceUrl: this.sourceUrl,
        chapterIndex: idx
      }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('目录')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
        Text(this.isReversed ? '正序' : '倒序')
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor(ThemeManager.getPrimary(500))
          .onClick(() => this.toggleOrder())
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      // 搜索框
      Row() {
        TextInput({ placeholder: '搜索章节', text: this.keyword })
          .fontSize(AppTypography.SIZE_BODY)
          .backgroundColor(Color.Transparent)
          .onChange((val: string) => this.onSearchInput(val))
          .layoutWeight(1)
      }
      .width('90%')
      .padding({ left: AppSpacing.S3, right: AppSpacing.S3 })
      .borderRadius(AppRadius.R_FULL)
      .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
      .margin({ bottom: AppSpacing.S3 })

      // 章节列表
      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2, 3, 4, 5], () => { LoadingSkel({ skelHeight: 48 }) })
        }
        .padding(AppSpacing.S4)
      } else {
        List({ space: AppSpacing.S1 }) {
          ForEach(this.displayChapters, (ch: Chapter, idx: number) => {
            ListItem() {
              Row() {
                Text(ch.title)
                  .fontSize(AppTypography.SIZE_BODY)
                  .fontColor(this.currentChapterIndex === ch.index
                    ? ThemeManager.getPrimary(500)
                    : ThemeManager.getNeutral('TEXT_PRIMARY'))
                  .layoutWeight(1)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                if (this.currentChapterIndex === ch.index) {
                  Text('当前')
                    .fontSize(AppTypography.SIZE_TINY)
                    .fontColor(Color.White)
                    .padding({ left: 6, right: 6, top: 2, bottom: 2 })
                    .borderRadius(AppRadius.R_SM)
                    .backgroundColor(ThemeManager.getPrimary(500))
                }
              }
              .width('100%')
              .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3, left: AppSpacing.S4, right: AppSpacing.S4 })
              .borderRadius(AppRadius.R_MD)
              .backgroundColor(this.currentChapterIndex === ch.index
                ? ThemeManager.getPrimary(50)
                : Color.Transparent)
              .onClick(() => this.jumpToChapter(ch.index))
            }
          })
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
        .padding({ left: AppSpacing.S2, right: AppSpacing.S2 })
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default DirectoryPage
