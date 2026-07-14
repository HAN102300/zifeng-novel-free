/**
 * SearchPage - 搜索页
 * 规格：§3.5 搜索页
 * 聚合搜索 + 语音搜索 + 搜索历史
 */
import { router } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { GlassSearchBar } from '../common/GlassSearchBar'
import { SectionHeader } from '../common/SectionHeader'
import { NovelListItem } from '../components/NovelListItem'
import { LoadingSkel } from '../common/LoadingSkel'
import { SearchService, BatchSearchProgress, SearchResult, AbortSignal } from '../service/SearchService'
import { NovelItem } from '../model/NovelItem'
import { promptAction } from '@kit.ArkUI'

// Minimal book source type (full type comes from BookService in Phase 5)
interface BookSource { id: string; name: string; enabled: boolean; }

@Entry
@Component
struct SearchPage {
  @State keyword: string = ''
  @State searchMode: number = 0  // 0=聚合, 1=单书源
  @State isSearching: boolean = false
  @State searchProgress: string = ''
  @State results: NovelItem[] = []
  @State history: string[] = []
  @State hotKeywords: string[] = ['斗破苍穹', '凡人修仙传', '诡秘之主', '雪中悍刀行', '大明王朝']
  @State sources: BookSource[] = []
  @State activeSourceId: string = ''
  @State hasSearched: boolean = false
  private abortSignal: AbortSignal = { aborted: false }
  private searchTimer: number = -1

  aboutToAppear() {
    this.history = SearchService.getHistory()
    this.sources = AppStorage.get<BookSource[]>('book_sources') || []
  }

  private doSearch(val: string) {
    if (!val.trim()) return
    this.keyword = val
    SearchService.addHistory(val)
    this.history = SearchService.getHistory()
    this.startSearch()
  }

  private clearHistory() {
    SearchService.clearHistory()
    this.history = []
  }

  private startVoiceSearch() {
    // Voice search service comes in Phase 7; for now navigate to search with prompt
    promptAction.showToast({ message: '语音搜索即将上线' })
  }

  private async startSearch() {
    this.isSearching = true
    this.hasSearched = true
    this.results = []
    this.abortSignal = { aborted: false } as AbortSignal

    const sourceUrls = this.sources.filter(s => s.enabled).map(s => s.id)

    if (this.searchMode === 0 && sourceUrls.length > 0) {
      // 聚合搜索
      await SearchService.batchSearch(
        this.keyword,
        sourceUrls,
        (progress: BatchSearchProgress) => {
          this.results = progress.results.flatMap(r => r.novels)
          this.searchProgress = `正在搜索更多书源... (${progress.completed}/${progress.total})`
          if (progress.isFinished) {
            this.isSearching = false
          }
        },
        this.abortSignal
      )
    } else if (sourceUrls.length > 0) {
      // 单书源搜索
      try {
        const result = await SearchService.searchSingle(this.keyword, sourceUrls[0])
        this.results = result.novels
      } catch (e) {
        promptAction.showToast({ message: '搜索失败' })
      } finally {
        this.isSearching = false
      }
    } else {
      // 无书源，使用默认搜索
      try {
        const result = await SearchService.searchSingle(this.keyword, 'default')
        this.results = result.novels
      } catch (e) {
        promptAction.showToast({ message: '搜索失败' })
      } finally {
        this.isSearching = false
      }
    }
    this.isSearching = false
  }

  private stopSearch() {
    this.abortSignal.aborted = true
    this.isSearching = false
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部搜索栏（THIN 材质）
      Row() {
        BackButton()
        GlassSearchBar({
          placeholder: '搜索小说/作者',
          editable: true,
          voiceEnabled: true,
          inputValue: this.keyword,
          onSearch: (val: string): void => this.doSearch(val),
          onInputChange: (val: string): void => { this.keyword = val },
          onVoiceClick: (): void => this.startVoiceSearch()
        })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      // 书源筛选（多源聚合时显示）
      if (this.sources.length > 1) {
        Scroll() {
          Row() {
            ForEach(this.sources, (src: BookSource) => {
              Text(src.name)
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(this.activeSourceId === src.id
                  ? ThemeManager.getPrimary(500)
                  : ThemeManager.getNeutral('TEXT_SECONDARY'))
                .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                .borderRadius(AppRadius.R_FULL)
                .backgroundColor(this.activeSourceId === src.id
                  ? ThemeManager.getPrimary(50)
                  : Color.Transparent)
                .margin({ right: AppSpacing.S2 })
                .onClick(() => {
                  this.activeSourceId = src.id
                  this.doSearch(this.keyword)
                })
            })
          }
        }
        .scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Off)
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S3 })
      }

      // 内容区
      if (this.isSearching && this.results.length === 0) {
        Column() {
          ForEach([0, 1, 2, 3], () => {
            LoadingSkel({ skelHeight: 88 })
          })
        }
        .padding(AppSpacing.S4)
      } else if (this.results.length === 0 && this.keyword.length > 0) {
        // 空结果
        Column() {
          Text('未找到相关小说')
            .fontSize(AppTypography.SIZE_BODY)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
          Text(`关键词：「${this.keyword}」`)
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
            .margin({ top: AppSpacing.S2 })
        }
        .width('100%')
        .layoutWeight(1)
        .justifyContent(FlexAlign.Center)
      } else if (this.results.length === 0) {
        // 搜索历史 + 热门搜索
        Scroll() {
          Column() {
            if (this.history.length > 0) {
              SectionHeader({
                title: '搜索历史',
                actionText: '清空',
                actionVisible: true,
                onAction: (): void => this.clearHistory()
              })
              Flex({ wrap: FlexWrap.Wrap }) {
                ForEach(this.history, (word: string) => {
                  Text(word)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
                    .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                    .borderRadius(AppRadius.R_FULL)
                    .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                    .margin({ right: AppSpacing.S2, bottom: AppSpacing.S2 })
                    .onClick(() => {
                      this.keyword = word
                      this.doSearch(word)
                    })
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S5 })
            }

            SectionHeader({ title: '热门搜索' })
            Column() {
              ForEach(this.hotKeywords, (word: string, idx: number) => {
                Row() {
                  Text(`${idx + 1}`)
                    .fontSize(AppTypography.SIZE_BODY_LARGE)
                    .fontColor(idx < 3 ? ThemeManager.getAccent('Magenta') : ThemeManager.getNeutral('TEXT_MUTED'))
                    .width(24)
                  Text(word)
                    .fontSize(AppTypography.SIZE_BODY)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .layoutWeight(1)
                }
                .width('100%')
                .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
                .onClick(() => {
                  this.keyword = word
                  this.doSearch(word)
                })
              })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
          }
        }
        .layoutWeight(1)
        .scrollBar(BarState.Auto)
      } else {
        // 搜索结果列表
        List({ space: AppSpacing.S3 }) {
          ForEach(this.results, (novel: NovelItem) => {
            ListItem() {
              NovelListItem({
                novel: novel,
                 onNovelClick: (n: NovelItem): void => this.navigateToDetail(n)
              })
            }
          })
        }
        .layoutWeight(1)
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S2 })
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default SearchPage
