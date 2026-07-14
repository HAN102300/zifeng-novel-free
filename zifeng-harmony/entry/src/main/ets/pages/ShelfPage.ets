/**
 * ShelfPage - 书架页
 * 规格：§4.3 书架页
 * 特性：我的收藏区域在最近阅读上方、列表/网格切换、阅读进度展示、长按管理
 * 约束：localStorage 键 shelf_history_layout_mode 保存布局状态
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { SectionHeader } from '../common/SectionHeader'
import { LoadingSkel } from '../common/LoadingSkel'
import { NovelCard } from '../components/NovelCard'
import { NovelListItem } from '../components/NovelListItem'
import { ProgressBar } from '../components/ProgressBar'
import { NovelItem } from '../model/NovelItem'
import { BookshelfService, ShelfBook, ReadingRecord } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

type LayoutMode = 'grid' | 'list'

@Entry
@Component
struct ShelfPage {
  @State favorites: ShelfBook[] = []
  @State recentBooks: ReadingRecord[] = []
  @State isLoading: boolean = true
  @State layoutMode: LayoutMode = 'grid'
  @State showDeleteMode: boolean = false
  @State selectedIds: Set<string> = new Set()

  aboutToAppear() {
    this.loadLayoutMode()
    this.loadShelfData()
  }

  onPageShow() {
    this.loadShelfData()
  }

  private loadLayoutMode() {
    const mode = AppStorage.get<string>('shelf_history_layout_mode') as LayoutMode
    if (mode === 'list' || mode === 'grid') {
      this.layoutMode = mode
    }
  }

  private switchLayout(mode: LayoutMode) {
    this.layoutMode = mode
    AppStorage.setOrCreate<string>('shelf_history_layout_mode', mode)
  }

  private async loadShelfData() {
    try {
      const all = await Promise.all([
        BookshelfService.getFavorites(),
        BookshelfService.getRecentReading()
      ])
      this.favorites = all[0]
      this.recentBooks = all[1]
    } catch (e) {
      promptAction.showToast({ message: '加载书架失败' })
    } finally {
      this.isLoading = false
    }
  }

  private openBook(book: ShelfBook | ReadingRecord) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: book.bookUrl, sourceUrl: book.sourceUrl }
    })
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

  private toggleDeleteMode() {
    this.showDeleteMode = !this.showDeleteMode
    if (!this.showDeleteMode) this.selectedIds.clear()
  }

  private toggleSelect(id: string) {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id)
    } else {
      this.selectedIds.add(id)
    }
  }

  private async batchRemove() {
    if (this.selectedIds.size === 0) return
    for (const id of this.selectedIds) {
      await BookshelfService.removeFromShelf(id)
    }
    promptAction.showToast({ message: `已删除 ${this.selectedIds.size} 本` })
    this.toggleDeleteMode()
    this.loadShelfData()
  }

  build() {
    Column() {
      // 顶部标题栏 + 操作按钮
      Row() {
        Text('我的书架')
          .fontSize(AppTypography.SIZE_H1)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
        // 列表/网格切换
        Row() {
          Image(this.layoutMode === 'grid' ? $r('app.media.ic_list') : $r('app.media.ic_grid'))
            .width(20).height(20)
            .onClick(() => this.switchLayout(this.layoutMode === 'grid' ? 'list' : 'grid'))
        }
        .width(36).height(36)
        .borderRadius(AppRadius.R_FULL)
        .justifyContent(FlexAlign.Center)
        .systemMaterial(new uiMaterial.ImmersiveMaterial({
          style: uiMaterial.ImmersiveStyle.ULTRA_THIN,
          interactive: true
        } as uiMaterial.ImmersiveOptions))
        .margin({ right: AppSpacing.S2 })

        if (this.showDeleteMode) {
          Text('删除')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor(ThemeManager.getAccent('Rose'))
            .onClick(() => this.batchRemove())
        } else {
          Text('管理')
            .fontSize(AppTypography.SIZE_BODY_SMALL)
            .fontColor(ThemeManager.getPrimary(500))
            .onClick(() => this.toggleDeleteMode())
        }
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S6, bottom: AppSpacing.S3 })

      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2], () => { LoadingSkel({ skelHeight: 120 }) })
        }
        .padding(AppSpacing.S4)
      } else {
        Scroll() {
          Column() {
            // 1. 我的收藏区域（在最近阅读上方）
            SectionHeader({
              title: '我的收藏',
              actionText: this.favorites.length > 0 ? `${this.favorites.length}本` : '',
              actionVisible: this.favorites.length > 0
            })
            if (this.favorites.length === 0) {
              GlassCard({ cardPadding: AppSpacing.S8, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S6 }) {
                Column() {
                  Text('暂无收藏')
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  Text('去发现喜欢的小说吧')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
                    .margin({ top: AppSpacing.S1 })
                }
              }
            } else if (this.layoutMode === 'grid') {
              Grid() {
                ForEach(this.favorites, (book: ShelfBook) => {
                  GridItem() {
                    Stack({ alignContent: Alignment.TopEnd }) {
                      NovelCard({
                        novel: book,
                        onNovelClick: (n: NovelItem) => {
                          if (this.showDeleteMode) this.toggleSelect(book.bookUrl)
                          else this.openBook(book)
                        }
                      })
                      if (this.showDeleteMode) {
                        Column()
                          .width(24).height(24)
                          .borderRadius(AppRadius.R_FULL)
                          .backgroundColor(this.selectedIds.has(book.bookUrl)
                            ? ThemeManager.getAccent('Rose')
                            : ThemeManager.getNeutral('BG_ELEVATED'))
                          .border({ width: 2, color: Color.White })
                          .margin({ top: AppSpacing.S2, right: AppSpacing.S2 })
                      }
                    }
                  }
                })
              }
              .columnsTemplate('1fr 1fr')
              .columnsGap(AppSpacing.S3)
              .rowsGap(AppSpacing.S4)
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
            } else {
              List({ space: AppSpacing.S3 }) {
                ForEach(this.favorites, (book: ShelfBook) => {
                  ListItem() {
                    NovelListItem({
                      novel: book,
                      onNovelClick: (n: NovelItem) => {
                        if (this.showDeleteMode) this.toggleSelect(book.bookUrl)
                        else this.openBook(book)
                      }
                    })
                  }
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S6 })
            }

            // 2. 最近阅读区域
            SectionHeader({
              title: '最近阅读',
              actionText: this.recentBooks.length > 0 ? `${this.recentBooks.length}本` : '',
              actionVisible: this.recentBooks.length > 0
            })
            if (this.recentBooks.length === 0) {
              GlassCard({ cardPadding: AppSpacing.S8, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S8 }) {
                Column() {
                  Text('暂无阅读记录')
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  Text('开始阅读第一本小说吧')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
                    .margin({ top: AppSpacing.S1 })
                }
              }
            } else {
              List({ space: AppSpacing.S3 }) {
                ForEach(this.recentBooks, (record: ReadingRecord) => {
                  ListItem() {
                    GlassCard({ cardPadding: AppSpacing.S3 }) {
                      Row() {
                        Image(record.cover)
                          .width(60).height(84)
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
                          ProgressBar({ progress: record.progress, animated: false })
                            .margin({ top: AppSpacing.S2 })
                          Text(`${Math.round(record.progress)}%`)
                            .fontSize(AppTypography.SIZE_TINY)
                            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                            .margin({ top: 2 })
                        }
                        .alignItems(HorizontalAlign.Start)
                        .margin({ left: AppSpacing.S3 })
                        .layoutWeight(1)
                        Text('继续')
                          .fontSize(AppTypography.SIZE_CAPTION)
                          .fontColor(ThemeManager.getPrimary(500))
                          .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                          .borderRadius(AppRadius.R_FULL)
                          .backgroundColor(ThemeManager.getPrimary(50))
                          .onClick(() => this.continueReading(record))
                      }
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
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default ShelfPage
