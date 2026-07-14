/**
 * HomePage - 首页
 * 规格：§3.1 首页
 *
 * 滚动式信息流：搜索栏 + 最近阅读 + 推荐 + 榜单 + 分类导航
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import {
  AppTypography, AppSpacing, AppRadius, AppDuration, AppCurves, NavBarConfig
} from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassNavBar } from '../common/GlassNavBar'
import { GlassSearchBar } from '../common/GlassSearchBar'
import { SectionHeader } from '../common/SectionHeader'
import { LoadingSkel } from '../common/LoadingSkel'
import { NovelCard } from '../components/NovelCard'
import { RankItem } from '../components/RankItem'
import { NovelItem } from '../model/NovelItem'
import { RankService, RANK_CONFIGS, RankType, RankConfig } from '../service/RankService'
import { CategoryService, Category } from '../service/CategoryService'
import { BookshelfService, ReadingHistoryItem } from '../service/BookshelfService'
import { AuthService } from '../service/AuthService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct HomePage {
  @State scrollOffset: number = 0
  @State isLoading: boolean = true
  @State recommendList: NovelItem[] = []
  @State rankList: NovelItem[] = []
  @State currentRankTab: number = 0
  @State categories: Category[] = []
  @State recentReadings: ReadingHistoryItem[] = []
  @State isLoggedIn: boolean = false
  private searchInput: string = ''

  aboutToAppear() {
    this.loadData()
  }

  private async loadData() {
    this.isLoading = true
    this.isLoggedIn = await AuthService.isLoggedIn()
    try {
      const all = await Promise.all([
        RankService.getHomeRank('mustRead'),
        RankService.getHomeRank('mustRead'),
        CategoryService.getCategories()
      ])
      this.recommendList = all[0]
      this.rankList = all[1]
      this.categories = all[2]
      if (this.isLoggedIn) {
        this.recentReadings = await BookshelfService.getReadingHistory()
      }
    } catch (e) {
      promptAction.showToast({ message: '数据加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async switchRank(index: number) {
    this.currentRankTab = index
    const rankType = RANK_CONFIGS[index].type as RankType
    try {
      this.rankList = await RankService.getHomeRank(rankType)
    } catch (e) {
      console.warn('HomePage: switchRank failed')
    }
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部导航栏
      GlassNavBar({
        title: '',
        scrollOffset: this.scrollOffset,
        showBack: false,
        rightContent: () => {
          Image($r('app.media.user'))
            .width(28).height(28)
            .borderRadius(14)
            .onClick(() => {
              router.pushUrl({ url: 'pages/UserCenterPage' })
            })
        }
      })

      // 搜索栏
      GlassSearchBar({
        placeholder: '搜索小说...',
        editable: false,
        voiceEnabled: true,
        inputValue: this.searchInput,
        onBarClick: () => router.pushUrl({ url: 'pages/SearchPage' }),
        onVoiceClick: () => router.pushUrl({ url: 'pages/SearchPage' })
      })
      .margin({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S4 })

      // 滚动内容
      Scroll() {
        Column() {
          // 最近阅读（仅登录时显示）
          if (this.isLoggedIn && this.recentReadings.length > 0) {
            SectionHeader({ title: '最近阅读', actionText: '查看全部', actionVisible: true })
            Scroll() {
              Row() {
                ForEach(this.recentReadings.slice(0, 3), (item: ReadingHistoryItem) => {
                  Column() {
                    Image(item.cover)
                      .width(100).height(140)
                      .borderRadius(AppRadius.R_MD)
                      .objectFit(ImageFit.Cover)
                    Text(item.title)
                      .fontSize(AppTypography.SIZE_CAPTION)
                      .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                      .maxLines(1)
                      .margin({ top: 4 })
                  }
                  .margin({ right: AppSpacing.S3 })
                  .onClick(() => {
                    router.pushUrl({
                      url: 'pages/ReaderPage',
                      params: { bookUrl: item.bookUrl, sourceUrl: item.sourceUrl, chapterIndex: item.lastChapterIndex }
                    })
                  })
                })
              }
              .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            }
            .scrollable(ScrollDirection.Horizontal)
            .scrollBar(BarState.Off)
          }

          // 推荐区域
          SectionHeader({ title: '为你推荐' })
          if (this.isLoading) {
            Grid() {
              ForEach([0, 1, 2, 3], () => {
                GridItem() {
                  LoadingSkel({ shape: 'card', skelHeight: 280 })
                }
              })
            }
            .columnsTemplate('1fr 1fr')
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .height(580)
          } else {
            Grid() {
              ForEach(this.recommendList, (novel: NovelItem) => {
                GridItem() {
                  NovelCard({
                    novel: novel,
                    showScore: true,
                    showSummary: true,
                     onNovelClick: (n: NovelItem): void => this.navigateToDetail(n)
                  })
                }
              })
            }
            .columnsTemplate('1fr 1fr')
            .columnsGap(AppSpacing.S3)
            .rowsGap(AppSpacing.S3)
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
            .height(this.recommendList.length * 290)
          }

          // 榜单区域
          SectionHeader({
            title: '热门榜单',
            actionText: '查看更多',
            actionVisible: true,
            onAction: () => router.pushUrl({ url: 'pages/RankPage' })
          })
          // 榜单 Tab
          Scroll() {
            Row() {
              ForEach(RANK_CONFIGS, (config: RankConfig, index: number) => {
                Text(config.name)
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(this.currentRankTab === index
                    ? ThemeManager.getPrimaryColor()
                    : ThemeManager.getNeutral('TEXT_SECONDARY'))
                  .padding({ left: AppSpacing.S3, right: AppSpacing.S3, top: 6, bottom: 6 })
                  .borderRadius(AppRadius.R_FULL)
                  .backgroundColor(this.currentRankTab === index
                    ? ThemeManager.getNeutral('BG_ELEVATED')
                    : Color.Transparent)
                  .margin({ right: AppSpacing.S2 })
                  .onClick(() => this.switchRank(index))
              })
            }
            .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
          }
          .scrollable(ScrollDirection.Horizontal)
          .scrollBar(BarState.Off)
          .margin({ bottom: AppSpacing.S3 })

          // 榜单列表
          Column() {
            ForEach(this.rankList, (novel: NovelItem, index: number) => {
              RankItem({
                rank: index + 1,
                novel: novel,
                accentColor: RANK_CONFIGS[this.currentRankTab].accentColor,
                onNovelClick: (n: NovelItem): void => this.navigateToDetail(n)
              })
            })
          }

          // 分类导航
          SectionHeader({
            title: '分类导航',
            actionText: '查看全部',
            actionVisible: true,
            onAction: () => router.pushUrl({ url: 'pages/CategoryPage' })
          })
          Grid() {
            ForEach(this.categories, (cat: Category) => {
              GridItem() {
                Column() {
                  Column()
                    .width(48).height(48)
                    .borderRadius(AppRadius.R_FULL)
                    .linearGradient({
                      direction: GradientDirection.Bottom,
                      colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
                    })
                  Text(cat.name)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .margin({ top: 4 })
                  Text(`${cat.count}本`)
                    .fontSize(AppTypography.SIZE_TINY)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                }
                .onClick(() => {
                  router.pushUrl({
                    url: 'pages/CategoryDetailPage',
                    params: { categoryId: cat.id, categoryName: cat.name }
                  })
                })
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr 1fr')
          .columnsGap(AppSpacing.S3)
          .rowsGap(AppSpacing.S4)
          .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S8 })
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
      .onScroll((x, y) => {
        this.scrollOffset += y
      })
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default HomePage
