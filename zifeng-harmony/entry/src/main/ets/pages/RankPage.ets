/**
 * RankPage - 排行榜页
 * 规格：§3.4 排行榜页
 * 6 个榜单 Tab，每个 Tab 不同强调色
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BackButton } from '../common/BackButton'
import { RankItem } from '../components/RankItem'
import { LoadingSkel } from '../common/LoadingSkel'
import { RankService, RANK_CONFIGS, RankType, RankConfig } from '../service/RankService'
import { NovelItem } from '../model/NovelItem'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct RankPage {
  @State currentTab: number = 0
  @State rankList: NovelItem[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadRank(0)
  }

  private async loadRank(index: number) {
    this.currentTab = index
    this.isLoading = true
    try {
      const rankType = RANK_CONFIGS[index].type as RankType
      this.rankList = await RankService.getRank(rankType, 1)
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
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
      // 顶部栏
      Row() {
        BackButton()
        Text('排行榜')
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding(AppSpacing.S4)

      // 榜单 Tab
      Tabs({ index: this.currentTab }) {
        ForEach(RANK_CONFIGS, (config: RankConfig, index: number) => {
          TabContent() {
            if (this.isLoading) {
              Column() {
                ForEach([0, 1, 2, 3, 4], () => {
                  LoadingSkel({ shape: 'card', skelHeight: 80 })
                    .margin({ bottom: AppSpacing.S3, left: AppSpacing.S4, right: AppSpacing.S4 })
                })
              }
            } else {
              List() {
                ForEach(this.rankList, (novel: NovelItem, idx: number) => {
                  ListItem() {
                    RankItem({
                      rank: idx + 1,
                      novel: novel,
                      accentColor: config.accentColor,
                       onNovelClick: (n: NovelItem): void => this.navigateToDetail(n)
                    })
                  }
                })
              }
              .layoutWeight(1)
            }
          }
          .tabBar(this.TabBuilder(config.name, index))
        })
      }
      .onChange((index) => this.loadRank(index))
      .layoutWeight(1)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  @Builder
  TabBuilder(name: string, index: number) {
    Column() {
      Text(name)
        .fontSize(AppTypography.SIZE_BODY_SMALL)
        .fontColor(this.currentTab === index
          ? ThemeManager.getPrimaryColor()
          : ThemeManager.getNeutral('TEXT_SECONDARY'))
        .fontWeight(this.currentTab === index ? FontWeight.Medium : FontWeight.Normal)
      if (this.currentTab === index) {
        Column()
          .width(20).height(2)
          .borderRadius(1)
          .backgroundColor(ThemeManager.getPrimaryColor())
          .margin({ top: 4 })
      }
    }
    .width('100%')
    .height(40)
    .justifyContent(FlexAlign.Center)
  }
}

export default RankPage
