/**
 * 紫枫免费小说鸿蒙应用 - 分类详情页面
 * 适配 HarmonyOS 26.0.0 新特性：
 * - 玻璃质感顶部栏
 * - 玻璃质感列表卡片
 * - 背景光斑/光粒子特效
 */
import { router } from '@kit.ArkUI'
import { Novel, INovel } from '../model/NovelItem'
import { NovelListItem } from '../modules/item/NovelListItem'
import categoryService from '../service/CategoryService'
import { Loading } from '../common/LoadingComponent'
import { AppColors, AppSpacing } from '../common/DesignSystem'
import { LightOrbs, FloatingParticles } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct CategoryDetailPage {
  @State categoryId: string = ''
  @State categoryName: string = ''
  @State channel: string = 'male'
  @State novelList: Novel[] = []
  @State isLoading: boolean = true
  @State currentPage: number = 1
  @State hasMore: boolean = true
  @State isDarkMode: boolean = false
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private themeManager = ThemeManager.getInstance()

  aboutToAppear() {
    const params = router.getParams() as Record<string, string>
    if (params) {
      this.categoryId = params['categoryId'] || ''
      this.categoryName = params['categoryName'] || ''
      this.channel = params['channel'] || 'male'
    }
    this.isDarkMode = this.themeManager.isDarkMode
    this.loadCategoryDetail()
  }

  async loadCategoryDetail() {
    this.isLoading = true
    this.currentPage = 1
    this.hasMore = true

    try {
      const result = await categoryService.getCategoryDetail(this.channel, this.categoryId, this.currentPage)
      if (result.success && result.data) {
        this.novelList = (result.data.list || []).map((item: INovel) => new Novel(
          String(item.bookId), item.title, item.imgUrl, item.author,
          item.intro, item.type, item.wordNum
        ))
        this.hasMore = this.novelList.length >= 20
      } else {
        this.novelList = []
      }
    } catch (error) {
      console.error('加载分类详情失败:', error)
      this.novelList = []
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
      const result = await categoryService.getCategoryDetail(this.channel, this.categoryId, this.currentPage)
      if (result.success && result.data) {
        const newList: Novel[] = (result.data.list || []).map((item: INovel) => new Novel(
          String(item.bookId), item.title, item.imgUrl, item.author,
          item.intro, item.type, item.wordNum
        ))
        this.novelList = [...this.novelList, ...newList]
        this.hasMore = newList.length >= 20
      }
    } catch (error) {
      console.error('加载更多失败:', error)
      this.currentPage--
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Stack() {
      // 背景渐变
      Column()
        .width('100%')
        .height('100%')
        .linearGradient({
          angle: 180,
          colors: this.isDarkMode
            ? [['#1a1a1f', 0.0], ['#25252b', 1.0]]
            : [['#fafbff', 0.0], ['#f0f0f5', 1.0]]
        })
        .expandSafeArea([SafeAreaType.SYSTEM], [SafeAreaEdge.TOP])

      // 背景光斑与粒子
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      FloatingParticles({
        count: 8,
        isDarkMode: this.isDarkMode,
        enableAnimation: true
      })

      Column() {
        Column()
          .width('100%')
          .height(this.topRectHeight)
        Row() {
          Image($r('app.media.back'))
            .width(24)
            .height(24)
            .padding(4)
            .fillColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            .borderRadius(14)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .onClick(() => router.back())

          Blank()

          Row() {
            Text('🗂️')
              .fontSize(16)
              .margin({ right: 6 })
            Text(this.categoryName || '分类详情')
              .fontSize(17)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          }

          Blank()

          Column().width(32).height(32)
        }
        .width('100%')
        .height(56)
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
        .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { bottom: 0.5 },
          color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
        })

        // 内容区域
        if (this.isLoading && this.novelList.length === 0) {
          Column() {
            Loading()
            Text('加载中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: 12 })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .width('100%')
        } else if (this.novelList.length === 0) {
          Column() {
            Text('📭')
              .fontSize(56)
              .margin({ bottom: 12 })
            Text('暂无该分类小说')
              .fontSize(16)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .width('100%')
        } else {
          List() {
            ForEach(this.novelList, (item: Novel) => {
              ListItem() {
                NovelListItem({ novel: item })
                  .padding({ left: AppSpacing.MD, right: AppSpacing.MD, top: 6, bottom: 6 })
                  .onClick(() => {
                    router.pushUrl({
                      url: 'pages/DetailPage',
                      params: item
                    })
                  })
              }
            })

            if (this.isLoading) {
              ListItem() {
                Loading()
                  .width('100%')
                  .padding({ top: 16, bottom: 16 })
              }
            } else if (this.hasMore) {
              ListItem() {
                Text('加载更多')
                  .fontSize(14)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 16, bottom: 16 })
                  .onClick(() => this.loadMore())
              }
            } else if (this.novelList.length > 0) {
              ListItem() {
                Text('没有更多了')
                  .fontSize(14)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .width('100%')
                  .textAlign(TextAlign.Center)
                  .padding({ top: 16, bottom: 16 })
              }
            }
          }
          .width('100%')
          .layoutWeight(1)
          .scrollBar(BarState.Off)
          .edgeEffect(EdgeEffect.Spring)
          .backgroundColor(Color.Transparent)
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
