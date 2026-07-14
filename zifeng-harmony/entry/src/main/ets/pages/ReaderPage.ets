/**
 * ReaderPage - 阅读页
 * 规格：§4.2 阅读页
 * 特性：字号/行距/主题可调、上下章切换、阅读进度自动保存、沉浸式工具栏
 */
import { router } from '@kit.ArkUI'
import { uiMaterial, curves } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius, AppAnimation } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelContent } from '../model/NovelModels'
import { BookService } from '../service/BookService'
import { BookshelfService } from '../service/BookshelfService'
import { OfflineCacheManager } from '../service/OfflineCacheManager'
import { promptAction } from '@kit.ArkUI'

type ReaderTheme = 'light' | 'sepia' | 'dark' | 'green'

interface ReaderSettings {
  fontSize: number
  lineHeight: number
  theme: ReaderTheme
  fontFamily: string
}

const READER_THEME_BG: Record<ReaderTheme, string> = {
  light: '#FFFFFF',
  sepia: '#F5EDD8',
  dark: '#1A1A1A',
  green: '#C7EDCC'
}
const READER_THEME_TEXT: Record<ReaderTheme, string> = {
  light: '#1E1B2E',
  sepia: '#5B4636',
  dark: '#E0E0E0',
  green: '#2D4A2D'
}

@Entry
@Component
struct ReaderPage {
  @State content: NovelContent | null = null
  @State isLoading: boolean = true
  @State showToolbar: boolean = false
  @State showSettings: boolean = false
  @State currentChapterIndex: number = 0
  @State totalChapters: number = 0
  @State settings: ReaderSettings = {
    fontSize: 18,
    lineHeight: 1.8,
    theme: 'light',
    fontFamily: 'HarmonyOS Sans'
  }
  private bookUrl: string = ''
  private sourceUrl: string = ''
  private scrollOffset: number = 0

  aboutToAppear() {
    const params = router.getParams() as Record<string, string | number>
    this.bookUrl = (params?.bookUrl as string) ?? ''
    this.sourceUrl = (params?.sourceUrl as string) ?? ''
    this.currentChapterIndex = (params?.chapterIndex as number) ?? 0
    this.loadSettings()
    this.loadContent()
  }

  private loadSettings() {
    const raw = AppStorage.get<string>('reader_settings')
    if (raw) {
      try {
        this.settings = JSON.parse(raw) as ReaderSettings
      } catch (e) { /* 使用默认 */ }
    }
  }

  private saveSettings() {
    AppStorage.setOrCreate<string>('reader_settings', JSON.stringify(this.settings))
  }

  private async loadContent() {
    this.isLoading = true
    try {
      // 优先从离线缓存读取
      const cached = await OfflineCacheManager.getCachedContent(this.bookUrl, this.currentChapterIndex)
      if (cached) {
        this.content = cached
      } else {
        this.content = await BookService.getChapterContent(
          this.bookUrl, this.sourceUrl, this.currentChapterIndex
        )
        // 写入离线缓存
        OfflineCacheManager.cacheContent(this.bookUrl, this.currentChapterIndex, this.content)
      }
      this.totalChapters = await BookService.getChapterCount(this.bookUrl, this.sourceUrl)
      // 保存阅读进度
      BookshelfService.saveReadingProgress(this.bookUrl, this.currentChapterIndex, this.totalChapters)
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async prevChapter() {
    if (this.currentChapterIndex > 0) {
      this.currentChapterIndex--
      await this.loadContent()
    }
  }

  private async nextChapter() {
    if (this.currentChapterIndex < this.totalChapters - 1) {
      this.currentChapterIndex++
      await this.loadContent()
    } else {
      promptAction.showToast({ message: '已经是最后一章' })
    }
  }

  private toggleToolbar() {
    this.showToolbar = !this.showToolbar
    if (!this.showToolbar) this.showSettings = false
  }

  private increaseFontSize() {
    if (this.settings.fontSize < 28) {
      this.settings.fontSize += 2
      this.saveSettings()
    }
  }

  private decreaseFontSize() {
    if (this.settings.fontSize > 14) {
      this.settings.fontSize -= 2
      this.saveSettings()
    }
  }

  private changeTheme(theme: ReaderTheme) {
    this.settings.theme = theme
    this.saveSettings()
  }

  private openDirectory() {
    router.pushUrl({
      url: 'pages/DirectoryPage',
      params: {
        bookUrl: this.bookUrl,
        sourceUrl: this.sourceUrl,
        currentIndex: this.currentChapterIndex
      }
    })
  }

  build() {
    Stack({ alignContent: Alignment.Bottom }) {
      // 阅读内容
      Scroll() {
        Column() {
          if (this.isLoading) {
            Column() {
              LoadingProgress().color(READER_THEME_TEXT[this.settings.theme])
              Text('加载中...')
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(READER_THEME_TEXT[this.settings.theme])
                .margin({ top: AppSpacing.S2 })
            }
            .width('100%')
            .padding({ top: 120 })
          } else if (this.content) {
            Text(this.content.title)
              .fontSize(24)
              .fontWeight(FontWeight.Medium)
              .fontColor(READER_THEME_TEXT[this.settings.theme])
              .margin({ bottom: AppSpacing.S6 })
            // CORRECTED: content is string[], join with double newlines
            Text(this.content.content.join('\n\n'))
              .fontSize(this.settings.fontSize)
              .lineHeight(this.settings.fontSize * this.settings.lineHeight)
              .fontColor(READER_THEME_TEXT[this.settings.theme])
              .fontFamily(this.settings.fontFamily)
            // 章节底部翻页
            Row() {
              Button('上一章')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(READER_THEME_TEXT[this.settings.theme])
                .backgroundColor(Color.Transparent)
                .onClick(() => this.prevChapter())
              Text(`${this.currentChapterIndex + 1} / ${this.totalChapters}`)
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(READER_THEME_TEXT[this.settings.theme])
                .layoutWeight(1)
                .textAlign(TextAlign.Center)
              Button('下一章')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getPrimary(500))
                .backgroundColor(Color.Transparent)
                .onClick(() => this.nextChapter())
            }
            .width('100%')
            .padding({ top: AppSpacing.S8, bottom: AppSpacing.S12 })
            .justifyContent(FlexAlign.SpaceBetween)
          }
        }
        .padding({ left: AppSpacing.S6, right: AppSpacing.S6, top: AppSpacing.S10, bottom: 80 })
        .alignItems(HorizontalAlign.Start)
      }
      .width('100%').height('100%')
      .backgroundColor(READER_THEME_BG[this.settings.theme])
      .onClick(() => this.toggleToolbar())

      // 顶部工具栏（ULTRA_THIN 材质）
      if (this.showToolbar) {
        Row() {
          Text('返回')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
            .onClick(() => router.back())
          Text(this.content?.title ?? '')
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
            .layoutWeight(1)
            .textAlign(TextAlign.Center)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          Text('目录')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getPrimary(500))
            .onClick(() => this.openDirectory())
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S6, bottom: AppSpacing.S4 })
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
          applyShadow: true,
          interactive: false
        } as uiMaterial.ImmersiveOptions))
        .position({ x: 0, y: 0 })
        .animation({ duration: AppAnimation.DUR_NORMAL, curve: curves.easeOutCubic })
      }

      // 底部工具栏（THICK 材质）
      if (this.showToolbar) {
        Column() {
          if (this.showSettings) {
            // 设置面板
            Column() {
              // 字号
              Row() {
                Text('字号')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .width(48)
                Button('-')
                  .width(32).height(32)
                  .fontSize(AppTypography.SIZE_BODY_LARGE)
                  .onClick(() => this.decreaseFontSize())
                Text(`${this.settings.fontSize}`)
                  .fontSize(AppTypography.SIZE_BODY)
                  .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  .width(40)
                  .textAlign(TextAlign.Center)
                Button('+')
                  .width(32).height(32)
                  .fontSize(AppTypography.SIZE_BODY_LARGE)
                  .onClick(() => this.increaseFontSize())
              }
              .width('100%')
              .justifyContent(FlexAlign.SpaceBetween)
              .margin({ bottom: AppSpacing.S3 })

              // 行距
              Row() {
                Text('行距')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .width(48)
                Slider({
                  value: this.settings.lineHeight,
                  min: 1.4,
                  max: 2.4,
                  step: 0.1
                })
                  .layoutWeight(1)
                  .blockColor(ThemeManager.getPrimary(500))
                  .trackColor(ThemeManager.getPrimary(100))
                  .onChange((val: number) => {
                    this.settings.lineHeight = val
                    this.saveSettings()
                  })
                Text(this.settings.lineHeight.toFixed(1))
                  .fontSize(AppTypography.SIZE_CAPTION)
                  .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  .width(40)
                  .textAlign(TextAlign.Center)
              }
              .width('100%')
              .margin({ bottom: AppSpacing.S3 })

              // 主题切换
              Row() {
                Text('背景')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .width(48)
                ForEach(['light', 'sepia', 'dark', 'green'] as ReaderTheme[], (t: ReaderTheme) => {
                  Column()
                    .width(32).height(32)
                    .borderRadius(AppRadius.R_FULL)
                    .backgroundColor(READER_THEME_BG[t])
                    .border({
                      width: this.settings.theme === t ? 2 : 0.5,
                      color: this.settings.theme === t
                        ? ThemeManager.getPrimary(500)
                        : ThemeManager.getNeutral('BORDER_LIGHT')
                    })
                    .margin({ right: AppSpacing.S3 })
                    .onClick(() => this.changeTheme(t))
                })
              }
              .width('100%')
            }
            .padding(AppSpacing.S4)
          }

          // 翻页按钮
          Row() {
            Text('上一章')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
              .onClick(() => this.prevChapter())
            Divider().vertical().height(20).color(ThemeManager.getNeutral('BORDER_LIGHT'))
            Text(this.showSettings ? '收起' : '设置')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
              .onClick(() => { this.showSettings = !this.showSettings })
            Divider().vertical().height(20).color(ThemeManager.getNeutral('BORDER_LIGHT'))
            Text('下一章')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getPrimary(500))
              .layoutWeight(1)
              .textAlign(TextAlign.Center)
              .onClick(() => this.nextChapter())
          }
          .width('100%')
          .padding({ top: AppSpacing.S3, bottom: AppSpacing.S6 })
        }
        .width('100%')
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.THICK,
          applyShadow: true,
          interactive: false
        } as uiMaterial.ImmersiveOptions))
        .borderRadius({ topLeft: AppRadius.R_LG, topRight: AppRadius.R_LG })
        .animation({ duration: AppAnimation.DUR_NORMAL, curve: curves.easeOutCubic })
      }
    }
    .width('100%').height('100%')
  }
}

export default ReaderPage
