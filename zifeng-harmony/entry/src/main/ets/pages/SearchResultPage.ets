import { router } from '@kit.ArkUI'
import { preferences } from '@kit.ArkData'
import { Novel } from '../model/NovelItem'
import { NovelListItem } from '../modules/item/NovelListItem'
import searchService from '../service/SearchService'
import { AggregatedSearchResult } from '../service/SearchService'
import { Loading } from '../common/LoadingComponent'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { GlassSearchBar, GlassEmptyState } from '../common/GlassComponents'
import { LightOrbs } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct SearchResultPage {
  @State keyword: string = ''
  @State searchResults: Novel[] = []
  @State isLoading: boolean = false
  @State currentPage: number = 1
  @State hasMore: boolean = true
  @State searchHistory: string[] = []
  @State isDarkMode: boolean = false
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private themeManager = ThemeManager.getInstance()

  aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    const params = router.getParams() as Record<string, Object>
    if (params) {
      this.keyword = params['keyword'] as string || ''
      this.searchResults = params['results'] as Novel[] || []
    }
    this.loadSearchHistory()
  }

  async loadSearchHistory() {
    try {
      let history: preferences.Preferences = await preferences.getPreferences(getContext(this), 'search_history')
      const historyStr: string = await history.get('history', '[]') as string
      this.searchHistory = JSON.parse(historyStr)
    } catch (error) {
      console.error('加载搜索历史失败:', JSON.stringify(error))
    }
  }

  async saveSearchHistory(keyword: string) {
    try {
      let history: preferences.Preferences = await preferences.getPreferences(getContext(this), 'search_history')
      let historyList: string[] = this.searchHistory.filter(item => item !== keyword)
      historyList.unshift(keyword)
      if (historyList.length > 10) {
        historyList = historyList.slice(0, 10)
      }
      await history.put('history', JSON.stringify(historyList))
      await history.flush()
      this.searchHistory = historyList
    } catch (error) {
      console.error('保存搜索历史失败:', JSON.stringify(error))
    }
  }

  async handleSearch(newKeyword?: string) {
    if (newKeyword) {
      this.keyword = newKeyword
    }

    if (!this.keyword.trim()) {
      return
    }

    this.isLoading = true
    this.currentPage = 1
    this.hasMore = true

    try {
      await this.saveSearchHistory(this.keyword)
      const result: AggregatedSearchResult = await searchService.aggregatedSearch(this.keyword, this.currentPage)
      this.searchResults = result.list
      this.hasMore = result.list.length >= 20
    } catch (error) {
      console.error('搜索失败:', JSON.stringify(error))
      AlertDialog.show({
        title: '搜索失败',
        message: '请稍后重试',
        confirm: {
          value: '好的',
          action: () => {}
        }
      })
    } finally {
      this.isLoading = false
    }
  }

  async loadMore() {
    if (!this.hasMore || this.isLoading) {
      return
    }

    this.isLoading = true
    this.currentPage++

    try {
      const result: AggregatedSearchResult = await searchService.aggregatedSearch(this.keyword, this.currentPage)
      this.searchResults = this.searchResults.concat(result.list)
      this.hasMore = result.list.length >= 20
    } catch (error) {
      console.error('加载更多失败:', JSON.stringify(error))
      this.currentPage--
    } finally {
      this.isLoading = false
    }
  }

  clearHistory() {
    AlertDialog.show({
      title: '确认清空',
      message: '确定要清空搜索历史吗？',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '确定',
          action: async () => {
            try {
              let history: preferences.Preferences = await preferences.getPreferences(getContext(this), 'search_history')
              await history.put('history', '[]')
              await history.flush()
              this.searchHistory = []
            } catch (error) {
            console.error('清空搜索历史失败:', JSON.stringify(error))
          }
        }
      }
    })
  }

  build() {
    Stack() {
      // 背景层
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor(this.isDarkMode ? '#1a1a1f' : '#f7f8fc')
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])

      // 背景光斑
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      Column() {
        Column().width('100%').height(this.topRectHeight)
        Row() {
          Image($r('app.media.back'))
            .width(24)
            .height(24)
            .fillColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            .onClick(() => router.back())
            .margin({ right: AppSpacing.MD })

          GlassSearchBar({
            placeholder: '请输入书名或作者',
            isDarkMode: this.isDarkMode,
            value: this.keyword,
            searchOnChange: (value: string) => {
              this.keyword = value
            },
            searchOnSubmit: (value: string) => {
              this.handleSearch(value)
            }
          })
        }
        .width('100%')
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.MD })
        .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { bottom: 0.5 },
          color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
        })

        // 搜索历史
        if (this.searchHistory.length > 0 && this.searchResults.length === 0 && !this.isLoading) {
          this.searchHistorySection()
        }

        // 搜索结果
        if (this.searchResults.length > 0) {
          List() {
            ForEach(this.searchResults, (item: Novel) => {
              ListItem() {
                this.novelListItem(item)
              }
            })

            if (this.isLoading) {
              ListItem() {
                Loading()
              }
            } else if (this.hasMore) {
              ListItem() {
                Text('加载更多')
                  .fontSize(14)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: AppSpacing.LG, bottom: AppSpacing.LG })
                  .onClick(() => this.loadMore())
              }
            } else if (this.searchResults.length > 0) {
              ListItem() {
                Text('— 没有更多了 —')
                  .fontSize(13)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: AppSpacing.LG, bottom: AppSpacing.LG })
              }
            }
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
          .contentEndOffset(50)
        } else if (!this.isLoading && this.keyword) {
          GlassEmptyState({
            icon: '🔍',
            title: '未找到相关小说',
            subtitle: '试试其他关键词或检查拼写',
            isDarkMode: this.isDarkMode
          })
        } else if (this.isLoading) {
          Column() {
            Loading()
            Text('搜索中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: AppSpacing.MD })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .width('100%')
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 搜索历史区域
   */
  @Builder
  searchHistorySection() {
    Column() {
      Row() {
        Row({ space: 6 }) {
          Text('🕐')
            .fontSize(16)
          Text('搜索历史')
            .fontSize(15)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        }

        Blank()

        Text('清空')
          .fontSize(13)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .padding({ left: 8, right: 8, top: 4, bottom: 4 })
          .borderRadius(6)
          .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
          .onClick(() => this.clearHistory())
      }
      .width('100%')
      .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG, bottom: AppSpacing.SM })

      Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start, alignItems: ItemAlign.Center }) {
        ForEach(this.searchHistory, (item: string) => {
          Text(item)
            .fontSize(13)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
            .padding({ left: 14, right: 14, top: 8, bottom: 8 })
            .borderRadius(AppRadius.PILL)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(170, 59, 255, 0.08)')
            .margin({ right: AppSpacing.XS, bottom: AppSpacing.XS })
            .onClick(() => this.handleSearch(item))
        })
      }
      .width('100%')
      .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
    }
    .width('100%')
  }

  /**
   * 小说列表项
   */
  @Builder
  novelListItem(item: Novel) {
    Row() {
      Image(item.imgUrl)
        .width(60)
        .height(80)
        .borderRadius(AppRadius.SMALL)
        .objectFit(ImageFit.Cover)
        .backgroundColor(this.isDarkMode ? '#2f2f37' : '#f0f0f5')
        .margin({ right: AppSpacing.MD })

      Column() {
        Text(item.title)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')

        Row({ space: 6 }) {
          Text(item.author)
            .fontSize(12)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)

          if (item.wordNum) {
            Text('·')
              .fontSize(12)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            Text(item.wordNum)
              .fontSize(12)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          }
        }
        .margin({ top: 4 })
        .width('100%')

        if (item.intro) {
          Text(item.intro)
            .fontSize(11)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 4 })
            .width('100%')
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .padding(AppSpacing.MD)
    .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)')
    .backgroundBlurStyle(BlurStyle.Regular, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .borderRadius(AppRadius.LARGE)
    .border({
      width: 1,
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'
    })
    .margin({ bottom: AppSpacing.MD })
    .onClick(() => {
      router.pushUrl({
        url: 'pages/DetailPage',
        params: item
      })
    })
  }
}
