/**
 * 紫枫免费小说鸿蒙应用 - 首页（书城）模块
 * 风格与紫枫免费小说网站首页保持一致
 * 包含多个分区榜单：必读榜、潜力榜、完本榜、更新榜、热搜榜、评论榜
 */
import { router } from '@kit.ArkUI'
import { Novel } from '../model/NovelItem'
import { RankService, RankType } from '../service/RankService'
import { ThemeManager } from '../service/ThemeManager'
import { AppColors } from '../common/DesignSystem'

/**
 * 分区配置
 */
interface SectionConfig {
  key: RankType
  title: string
  subtitle: string
  icon: string  // emoji 图标
  color: string // 主题色
  bgColor: string
  rank: number  // 前 N 名
}

const SECTIONS: SectionConfig[] = [
  { key: 'mustRead', title: '必读榜', subtitle: '编辑推荐', icon: '🏆', color: '#aa3bff', bgColor: '#f4e9ff', rank: 6 },
  { key: 'potential', title: '潜力榜', subtitle: '明日之星', icon: '🚀', color: '#13c2c2', bgColor: '#e6fffb', rank: 4 },
  { key: 'completed', title: '完本榜', subtitle: '经典完结', icon: '✅', color: '#52c41a', bgColor: '#f6ffed', rank: 4 },
  { key: 'updated', title: '更新榜', subtitle: '每日更新', icon: '⏰', color: '#fa8c16', bgColor: '#fff7e6', rank: 4 },
  { key: 'search', title: '热搜榜', subtitle: '热门搜索', icon: '🔥', color: '#f5222d', bgColor: '#fff1f0', rank: 4 },
  { key: 'comment', title: '评论榜', subtitle: '最多讨论', icon: '💬', color: '#722ed1', bgColor: '#f9f0ff', rank: 4 }
]

@Component
struct NovelCover {
  @Prop novel: Novel
  @Prop rank: number
  @Prop sectionColor: string
  @Prop isDarkMode: boolean

  build() {
    Stack() {
      // 封面图片
      Image(this.novel.imgUrl)
        .width('100%')
        .height(150)
        .borderRadius(8)
        .objectFit(ImageFit.Cover)
        .backgroundColor(this.isDarkMode ? '#2a2a2a' : '#f0f0f0')
        .onError(() => {
          // 图片加载失败时显示占位符
        })

      // 排名角标
      if (this.rank >= 1) {
        Row() {
          Text(this.rank.toString())
            .fontSize(10)
            .fontWeight(FontWeight.Bold)
            .fontColor('#ffffff')
        }
        .width(22)
        .height(22)
        .borderRadius(4)
        .backgroundColor(this.sectionColor)
        .justifyContent(FlexAlign.Center)
        .alignItems(VerticalAlign.Center)
        .position({ x: 4, y: 4 })
      }

      // 渐变遮罩（底部）
      Column()
        .width('100%')
        .height(50)
        .linearGradient({
          direction: GradientDirection.Bottom,
          colors: [
            ['rgba(0,0,0,0)', 0.0],
            ['rgba(0,0,0,0.6)', 1.0]
          ]
        })
        .borderRadius(8)
        .position({ x: 0, y: 100 })

      // 文字信息
      Column() {
        Text(this.novel.title)
          .fontSize(12)
          .fontWeight(FontWeight.Medium)
          .fontColor('#ffffff')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .textAlign(TextAlign.Center)
        Text(this.novel.author)
          .fontSize(10)
          .fontColor('rgba(255,255,255,0.8)')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .textAlign(TextAlign.Center)
          .margin({ top: 2 })
      }
      .width('100%')
      .padding({ left: 6, right: 6, bottom: 6 })
      .position({ x: 0, y: 116 })
    }
    .width('100%')
    .height(150)
  }
}

@Component
struct NovelListRow {
  @Prop novel: Novel
  @Prop rank: number
  @Prop sectionColor: string
  @Prop isDarkMode: boolean

  build() {
    Row() {
      // 排名
      Row() {
        Text(this.rank.toString())
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.rank <= 3 ? this.sectionColor : (this.rank <= 6 ? '#fa8c16' : (this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)))
      }
      .width(36)
      .height(36)
      .borderRadius(18)
      .backgroundColor(this.rank <= 3 ? this.sectionColor + '15' : 'rgba(0,0,0,0.03)')
      .justifyContent(FlexAlign.Center)
      .alignItems(VerticalAlign.Center)
      .margin({ right: 12 })

      // 封面
      Image(this.novel.imgUrl)
        .width(56)
        .height(78)
        .borderRadius(6)
        .objectFit(ImageFit.Cover)
        .backgroundColor(this.isDarkMode ? '#2a2a2a' : '#f0f0f0')
        .margin({ right: 12 })

      // 信息
      Column() {
        Text(this.novel.title)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')

        Row({ space: 8 }) {
          Text(this.novel.author)
            .fontSize(12)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .maxLines(1)
            .layoutWeight(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
          if (this.novel.wordNum) {
            Text(this.novel.wordNum)
              .fontSize(11)
              .fontColor(this.sectionColor)
              .backgroundColor(this.sectionColor + '15')
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .borderRadius(4)
          }
        }
        .width('100%')
        .margin({ top: 4 })

        Text(this.novel.intro)
          .fontSize(12)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .lineHeight(18)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')
          .margin({ top: 6 })
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .padding({ left: 16, right: 16, top: 8, bottom: 8 })
    .alignItems(VerticalAlign.Center)
    .onClick(() => {
      router.pushUrl({
        url: 'pages/DetailPage',
        params: this.novel
      })
    })
  }
}

@Component
struct SectionBlock {
  @Prop section: SectionConfig
  @Prop novels: Novel[]
  @Prop isLoading: boolean
  @Prop isDarkMode: boolean

  build() {
    Column() {
      // 区域标题栏 - 与网站风格一致
      Row() {
        // 左侧图标 + 标题
        Row({ space: 8 }) {
          Text(this.section.icon)
            .fontSize(20)
          Column() {
            Text(this.section.title)
              .fontSize(18)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            Text(this.section.subtitle)
              .fontSize(11)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: 2 })
          }
          .alignItems(HorizontalAlign.Start)
        }

        Blank()

        // 查看更多
        Row({ space: 4 }) {
          Text('查看更多')
            .fontSize(12)
            .fontColor(this.section.color)
          Text('→')
            .fontSize(14)
            .fontColor(this.section.color)
        }
        .padding({ left: 10, right: 10, top: 6, bottom: 6 })
        .borderRadius(14)
        .backgroundColor(this.section.color + '15')
        .onClick(() => {
          router.pushUrl({
            url: 'pages/RankPage',
            params: { type: this.section.key, title: this.section.title }
          })
        })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16, bottom: 12 })
      .alignItems(VerticalAlign.Center)

      // 内容区域
      if (this.isLoading && this.novels.length === 0) {
        Column() {
          Text('加载中...')
            .fontSize(14)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
        }
        .width('100%')
        .height(150)
        .justifyContent(FlexAlign.Center)
      } else if (this.novels.length === 0) {
        Column() {
          Text('暂无数据')
            .fontSize(14)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
        }
        .width('100%')
        .height(150)
        .justifyContent(FlexAlign.Center)
      } else {
        // 根据 rank 数量决定是网格还是列表
        if (this.section.rank <= 6) {
          // 网格布局
          Grid() {
            ForEach(this.novels.slice(0, this.section.rank), (item: Novel, index: number) => {
              GridItem() {
                NovelCover({
                  novel: item,
                  rank: index + 1,
                  sectionColor: this.section.color,
                  isDarkMode: this.isDarkMode
                })
                .onClick(() => {
                  router.pushUrl({
                    url: 'pages/DetailPage',
                    params: item
                  })
                })
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr')
          .columnsGap(12)
          .rowsGap(0)
          .width('100%')
          .padding({ left: 16, right: 16, bottom: 16 })
          .height(316)
        } else {
          // 列表布局
          Column() {
            ForEach(this.novels.slice(0, 6), (item: Novel, index: number) => {
              NovelListRow({
                novel: item,
                rank: index + 1,
                sectionColor: this.section.color,
                isDarkMode: this.isDarkMode
              })
              if (index < 5) {
                Divider()
                  .color('rgba(0,0,0,0.05)')
                  .margin({ left: 64 })
              }
            })
          }
          .width('100%')
        }
      }
    }
    .width('100%')
    .backgroundColor(this.isDarkMode ? '#1a1a1a' : '#ffffff')
    .borderRadius(16)
    .margin({ top: 12 })
  }
}

@Component
struct recommend {
  @State mustReadNovels: Novel[] = []
  @State potentialNovels: Novel[] = []
  @State completedNovels: Novel[] = []
  @State updatedNovels: Novel[] = []
  @State searchNovels: Novel[] = []
  @State commentNovels: Novel[] = []
  @State isLoading: boolean = true
  @State searchKeyword: string = ''
  @StorageLink('isDarkMode') isDarkMode: boolean = false
  private rankService = RankService.getInstance()
  private themeManager = ThemeManager.getInstance()

  async aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    await this.loadAllData()
  }

  async loadAllData() {
    this.isLoading = true
    try {
      // 并行加载所有榜单
      const results = await Promise.all([
        this.rankService.getRankData('mustRead', 1),
        this.rankService.getRankData('potential', 1),
        this.rankService.getRankData('completed', 1),
        this.rankService.getRankData('updated', 1),
        this.rankService.getRankData('search', 1),
        this.rankService.getRankData('comment', 1)
      ])

      if (results[0].success) this.mustReadNovels = results[0].data
      if (results[1].success) this.potentialNovels = results[1].data
      if (results[2].success) this.completedNovels = results[2].data
      if (results[3].success) this.updatedNovels = results[3].data
      if (results[4].success) this.searchNovels = results[4].data
      if (results[5].success) this.commentNovels = results[5].data
    } catch (error) {
      console.error('加载首页数据失败:', JSON.stringify(error))
    } finally {
      this.isLoading = false
    }
  }

  getNovelsByKey(key: string): Novel[] {
    switch (key) {
      case 'mustRead': return this.mustReadNovels
      case 'potential': return this.potentialNovels
      case 'completed': return this.completedNovels
      case 'updated': return this.updatedNovels
      case 'search': return this.searchNovels
      case 'comment': return this.commentNovels
      default: return []
    }
  }

  async handleSearch(value: string) {
    if (value.trim().length > 0) {
      router.pushUrl({
        url: 'pages/SearchResultPage',
        params: { keyword: value.trim() }
      })
    }
  }

  build() {
    Column() {
      // 顶部搜索栏 - 与网站一致的毛玻璃风格
      Row() {
        Row() {
          Text('🔍')
            .fontSize(16)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .margin({ right: 8 })

          TextInput({ placeholder: '搜索小说、作者...', text: this.searchKeyword })
            .layoutWeight(1)
            .backgroundColor(Color.Transparent)
            .fontSize(14)
            .placeholderColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .onChange((value: string) => {
              this.searchKeyword = value
            })
            .onSubmit(() => {
              this.handleSearch(this.searchKeyword)
            })
        }
        .layoutWeight(1)
        .height(40)
        .backgroundColor(this.isDarkMode ? 'rgba(255,255,255,0.1)' : '#f5f5f5')
        .borderRadius(20)
        .padding({ left: 14, right: 14 })
        .alignItems(VerticalAlign.Center)
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 12, bottom: 12 })
      .backgroundColor(this.isDarkMode ? '#1a1a1a' : '#ffffff')

      // 滚动内容
      Scroll() {
        Column({ space: 0 }) {
          // 欢迎横幅 - 与网站首页 Hero 区对应
          Column() {
            Row() {
              Column() {
                Text('📚 紫枫免费小说')
                  .fontSize(20)
                  .fontWeight(FontWeight.Bold)
                  .fontColor('#ffffff')
                Text('海量书源 · 聚合搜索 · 永久免费')
                  .fontSize(12)
                  .fontColor('rgba(255,255,255,0.85)')
                  .margin({ top: 4 })
                Text(`当前共 ${this.mustReadNovels.length + this.potentialNovels.length + this.completedNovels.length + this.updatedNovels.length + this.searchNovels.length + this.commentNovels.length} 本好书`)
                  .fontSize(11)
                  .fontColor('rgba(255,255,255,0.7)')
                  .margin({ top: 6 })
              }
              .layoutWeight(1)
              .alignItems(HorizontalAlign.Start)

              Text('🍃')
                .fontSize(48)
            }
            .width('100%')
            .padding(20)
            .alignItems(VerticalAlign.Center)
          }
          .width('92%')
          .linearGradient({
            direction: GradientDirection.Right,
            colors: [
              ['#aa3bff', 0.0],
              ['#722ed1', 1.0]
            ]
          })
          .borderRadius(16)
          .margin({ top: 8 })

          // 各分区榜单 - 网格 + 列表混合
          ForEach(SECTIONS, (section: SectionConfig) => {
            SectionBlock({
              section: section,
              novels: this.getNovelsByKey(section.key),
              isLoading: this.isLoading,
              isDarkMode: this.isDarkMode
            })
          })

          // 底部留白
          Column()
            .width('100%')
            .height(20)
        }
        .width('100%')
        .padding({ left: 12, right: 12, bottom: 20 })
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)
      .backgroundColor(this.isDarkMode ? '#0d0d0d' : '#f5f5f5')
    }
    .width('100%')
    .height('100%')
    .backgroundColor(this.isDarkMode ? '#0d0d0d' : '#f5f5f5')
  }
}

export { recommend }
