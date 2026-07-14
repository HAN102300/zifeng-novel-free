/**
 * CategoryDetailPage - 分类详情页
 * 规格：§3.3 分类详情页
 * 排序：热门/最新/完本，分页懒加载
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { NovelListItem } from '../components/NovelListItem'
import { LoadingSkel } from '../common/LoadingSkel'
import { CategoryService, SortType } from '../service/CategoryService'
import { NovelItem } from '../model/NovelItem'
import { promptAction } from '@kit.ArkUI'

interface SortOption {
  key: SortType
  label: string
}

@Entry
@Component
struct CategoryDetailPage {
  @State categoryId: string = ''
  @State categoryName: string = ''
  @State novels: NovelItem[] = []
  @State isLoading: boolean = true
  @State isLoadingMore: boolean = false
  @State currentPage: number = 1
  @State currentSort: SortType = 'hot'
  @State hasMore: boolean = true
  private sortOptions: SortOption[] = [
    { key: 'hot', label: '热门' },
    { key: 'new', label: '最新' },
    { key: 'completed', label: '完本' }
  ]

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>
    this.categoryId = params?.categoryId || ''
    this.categoryName = params?.categoryName || ''
    this.loadNovels(true)
  }

  private async loadNovels(reset: boolean = false) {
    if (reset) {
      this.currentPage = 1
      this.hasMore = true
      this.isLoading = true
    } else {
      if (!this.hasMore || this.isLoadingMore) return
      this.isLoadingMore = true
    }
    try {
      const list = await CategoryService.getCategoryNovels(
        this.categoryId, this.currentPage, this.currentSort
      )
      if (reset) {
        this.novels = list
      } else {
        this.novels = this.novels.concat(list)
      }
      if (list.length < 20) {
        this.hasMore = false
      }
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
      this.isLoadingMore = false
    }
  }

  private switchSort(sort: SortType) {
    if (this.currentSort === sort) return
    this.currentSort = sort
    this.loadNovels(true)
  }

  private navigateToDetail(novel: NovelItem) {
    router.pushUrl({
      url: 'pages/NovelDetailPage',
      params: { bookUrl: novel.bookUrl, sourceUrl: novel.sourceUrl }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text(this.categoryName)
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
        Blank()
        // 排序选项
        Row() {
          ForEach(this.sortOptions, (opt: SortOption) => {
            Text(opt.label)
              .fontSize(AppTypography.SIZE_BODY_SMALL)
              .fontColor(this.currentSort === opt.key
                ? ThemeManager.getPrimaryColor()
                : ThemeManager.getNeutral('TEXT_SECONDARY'))
              .padding({ left: 8, right: 8, top: 4, bottom: 4 })
              .onClick(() => this.switchSort(opt.key))
          })
        }
      }
      .width('100%')
      .padding(AppSpacing.S4)

      // 列表
      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2, 3], () => {
            LoadingSkel({ shape: 'card', skelHeight: 96 })
              .margin({ bottom: AppSpacing.S3, left: AppSpacing.S4, right: AppSpacing.S4 })
          })
        }
      } else {
        List() {
          ForEach(this.novels, (novel: NovelItem) => {
            ListItem() {
              NovelListItem({
                novel: novel,
                 onNovelClick: (n: NovelItem): void => this.navigateToDetail(n)
              })
            }
          })

          if (this.isLoadingMore) {
            ListItem() {
              Row() {
                LoadingProgress().width(24).height(24)
                Text('加载更多...')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  .margin({ left: AppSpacing.S2 })
              }
              .width('100%')
              .justifyContent(FlexAlign.Center)
              .padding(AppSpacing.S4)
            }
          }

          if (!this.hasMore && this.novels.length > 0) {
            ListItem() {
              Text('没有更多了')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                .width('100%')
                .textAlign(TextAlign.Center)
                .padding(AppSpacing.S4)
            }
          }
        }
        .layoutWeight(1)
        .onReachEnd(() => {
          if (this.hasMore && !this.isLoadingMore) {
            this.currentPage++
            this.loadNovels(false)
          }
        })
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default CategoryDetailPage
