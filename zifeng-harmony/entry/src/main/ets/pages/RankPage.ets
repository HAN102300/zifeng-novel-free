/**
 * 紫枫免费小说鸿蒙应用 - 排行榜页面
 * 适配 HarmonyOS 26.0.0 新特性：
 * - 玻璃质感顶部栏
 * - 玻璃质感 Tab 切换
 * - 玻璃质感列表卡片
 * - 背景光斑/光粒子特效
 */
import { router } from '@kit.ArkUI'
import { Novel } from '../model/NovelItem'
import { RankService, RankType } from '../service/RankService'
import { NovelListItem } from '../modules/item/NovelListItem'
import { Loading } from '../common/LoadingComponent'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { LightOrbs, FloatingParticles } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

interface RankTab {
  name: string
  type: RankType
  color: string
  icon: string
}

@Entry
@Component
struct RankPage {
  @State currentTab: RankType = 'mustRead'
  @State rankData: Novel[] = []
  @State isLoading: boolean = true
  @State currentPage: number = 1
  @State hasMore: boolean = true
  @State isDarkMode: boolean = false
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private rankService = RankService.getInstance()
  private themeManager = ThemeManager.getInstance()

  private tabs: RankTab[] = [
    { name: '必读榜', type: 'mustRead', color: AppColors.ACCENT_GOLD, icon: '🏆' },
    { name: '潜力榜', type: 'potential', color: AppColors.ACCENT_MINT, icon: '🚀' },
    { name: '完本榜', type: 'completed', color: AppColors.ACCENT_GREEN, icon: '✅' },
    { name: '更新榜', type: 'updated', color: AppColors.ACCENT_ORANGE, icon: '🔥' },
    { name: '热搜榜', type: 'search', color: AppColors.ACCENT_RED, icon: '📈' },
    { name: '评论榜', type: 'comment', color: AppColors.ACCENT_PURPLE, icon: '💬' }
  ]

  aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    this.loadRankData()
  }

  async loadRankData() {
    this.isLoading = true
    this.currentPage = 1
    this.hasMore = true

    try {
      const result = await this.rankService.getRankData(this.currentTab, this.currentPage)
      if (result.success) {
        this.rankData = result.data
        this.hasMore = result.data.length >= 20
      } else {
        this.rankData = []
      }
    } catch (error) {
      console.error('加载排行榜失败:', error)
      this.rankData = []
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
      const result = await this.rankService.getRankData(this.currentTab, this.currentPage)
      if (result.success) {
        this.rankData = [...this.rankData, ...result.data]
        this.hasMore = result.data.length >= 20
      }
    } catch (error) {
      console.error('加载更多失败:', error)
      this.currentPage--
    } finally {
      this.isLoading = false
    }
  }

  switchTab(type: RankType) {
    if (this.currentTab !== type) {
      this.currentTab = type
      this.loadRankData()
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
            Text('🏆')
              .fontSize(16)
              .margin({ right: 6 })
            Text('排行榜')
              .fontSize(17)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          }

          Blank()

          // 占位
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

        // Tab 切换（玻璃质感）
        Scroll() {
          Row({ space: 10 }) {
            ForEach(this.tabs, (tab: RankTab) => {
              Row() {
                Text(tab.icon)
                  .fontSize(13)
                  .margin({ right: 4 })
                Text(tab.name)
                  .fontSize(13)
                  .fontWeight(this.currentTab === tab.type ? FontWeight.Bold : FontWeight.Normal)
                  .fontColor(this.currentTab === tab.type ? Color.White
                    : (this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY))
              }
              .padding({ left: 14, right: 14, top: 7, bottom: 7 })
              .borderRadius(16)
              .backgroundColor(this.currentTab === tab.type
                ? tab.color
                : (this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.6)'))
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .border({
                width: 1,
                color: this.currentTab === tab.type
                  ? tab.color
                  : (this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)')
              })
              .shadow(this.currentTab === tab.type
                ? {
                  radius: 8,
                  color: tab.color + '60',
                  offsetY: 3
                }
                : { radius: 0, color: Color.Transparent })
              .onClick(() => this.switchTab(tab.type))
            })
          }
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.MD })
        }
        .scrollable(ScrollDirection.Horizontal)
        .scrollBar(BarState.Off)
        .width('100%')

        // 排行榜内容
        if (this.isLoading && this.rankData.length === 0) {
          Column() {
            Loading()
            Text('加载中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: 12 })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .width('100%')
        } else if (this.rankData.length === 0) {
          Column() {
            Text('📭')
              .fontSize(56)
              .margin({ bottom: 12 })
            Text('暂无数据')
              .fontSize(16)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .width('100%')
        } else {
          List() {
            ForEach(this.rankData, (item: Novel, index: number) => {
              ListItem() {
                Row() {
                  // 排名徽章
                  Stack() {
                    if (index < 3) {
                      // 前三名特殊样式
                      Column()
                        .width(40)
                        .height(40)
                        .borderRadius(20)
                        .backgroundColor(this.getRankColor(index))
                        .opacity(0.2)
                        .blur(8)
                    }
                    Column() {
                      Text(this.getRankIcon(index))
                        .fontSize(index < 3 ? 20 : 14)
                    }
                    .width(40)
                    .height(40)
                    .borderRadius(20)
                    .backgroundColor(this.getRankColor(index))
                    .justifyContent(FlexAlign.Center)
                    .alignItems(HorizontalAlign.Center)
                    .shadow(index < 3
                      ? {
                        radius: 8,
                        color: this.getRankColor(index) + '60',
                        offsetY: 2
                      }
                      : { radius: 0, color: Color.Transparent })

                    if (index >= 3) {
                      Text(`${index + 1}`)
                        .fontSize(14)
                        .fontWeight(FontWeight.Bold)
                        .fontColor(Color.White)
                        .position({ x: 0, y: 0 })
                        .width(40)
                        .height(40)
                        .textAlign(TextAlign.Center)
                    }
                  }
                  .margin({ right: AppSpacing.MD })

                  // 小说列表项
                  NovelListItem({ novel: item })
                    .layoutWeight(1)
                    .onClick(() => {
                      router.pushUrl({
                        url: 'pages/DetailPage',
                        params: item
                      })
                    })
                }
                .width('100%')
                .padding({ left: AppSpacing.MD, right: AppSpacing.MD, top: 6, bottom: 6 })
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
            } else if (this.rankData.length > 0) {
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
          .padding({ top: AppSpacing.XS })
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 获取排名颜色
   */
  getRankColor(index: number): string {
    if (index === 0) return '#faad14' // 金
    if (index === 1) return '#bfbfbf' // 银
    if (index === 2) return '#d4880d' // 铜
    return this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
  }

  /**
   * 获取排名图标
   */
  getRankIcon(index: number): string {
    if (index === 0) return '🥇'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return ''
  }
}
