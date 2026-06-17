/**
 * 阅读历史页面
 * 适配 HarmonyOS 26.0.0：玻璃质感、渐变背景、光粒子特效
 */
import { router } from '@kit.ArkUI'
import { Novel } from '../model/NovelItem'
import { NovelListItem } from '../modules/item/NovelListItem'
import { DbUtil } from '@abner/datastore'
import { Loading } from '../common/LoadingComponent'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { LightOrbs, FloatingParticles } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

interface NovelWithReadTime {
  bookId: string;
  title: string;
  imgUrl: string;
  author: string;
  intro: string;
  type: string;
  wordNum: string;
  bookUrl: string;
  source: string;
  tocUrl: string;
}

@Entry
@Component
struct ReadingHistoryPage {
  @State historyList: Novel[] = []
  @State isLoading: boolean = true
  @State isDarkMode: boolean = false
  @State contentOpacity: number = 0
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private db: DbUtil = DbUtil.getInstance()
  private themeManager = ThemeManager.getInstance()

  aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    this.loadHistory()

    // 入场动画
    animateTo({ duration: 500, curve: Curve.FastOutSlowIn }, () => {
      this.contentOpacity = 1
    })
  }

  loadHistory() {
    this.isLoading = true

    this.db.filterRdbPredicates({
      equalTo: { 'isBookShelf': 1 }
    }).queryAllBean<NovelWithReadTime>('tb_novel', (data) => {
      if (data && data.length > 0) {
        // 转换为 Novel[] 类型
        this.historyList = data.map(item => {
          return new Novel(
            item.bookId,
            item.title,
            item.imgUrl,
            item.author,
            item.intro,
            item.type,
            item.wordNum,
            item.bookUrl,
            item.source,
            item.tocUrl
          )
        })
      } else {
        this.historyList = []
      }
      this.isLoading = false
    })
  }

  clearHistory() {
    AlertDialog.show({
      title: '确认清空',
      message: '确定要清空所有阅读历史吗？',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '确定',
        action: () => {
          this.db.filterRdbPredicates({
            equalTo: { 'isBookShelf': 1 }
          }).queryAllBean<Novel>('tb_novel', (data) => {
            if (data && data.length > 0) {
              data.forEach(item => {
                this.db.updateBean('tb_novel', {
                  'isBookShelf': 0
                }, () => {})
              })
              this.historyList = []
            }
          })
        }
      }
    })
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

      // 背景光斑
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      // 飘浮粒子
      FloatingParticles({
        count: 8,
        isDarkMode: this.isDarkMode,
        enableAnimation: true
      })

      Column() {
        Column()
          .width('100%')
          .height(this.topRectHeight)
        // 顶部导航栏（玻璃质感）
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
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)'
            })
            .onClick(() => router.back())

          Blank()

          Row() {
            Text('📜')
              .fontSize(16)
              .margin({ right: 6 })
            Text('阅读历史')
              .fontSize(17)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          }

          Blank()

          if (this.historyList.length > 0) {
            Text('清空')
              .fontSize(13)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.PRIMARY_LIGHT)
              .fontWeight(FontWeight.Medium)
              .padding({ left: 12, right: 12, top: 6, bottom: 6 })
              .borderRadius(14)
              .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(170, 59, 255, 0.1)')
              .onClick(() => this.clearHistory())
          } else {
            Column().width(56).height(28)
          }
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
        if (this.isLoading) {
          Column() {
            Loading()
            Text('加载中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: AppSpacing.MD })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .width('100%')
        } else if (this.historyList.length === 0) {
          // 空状态
          Column() {
            Stack() {
              Column()
                .width(160)
                .height(160)
                .borderRadius(80)
                .backgroundColor(this.isDarkMode ? 'rgba(170, 59, 255, 0.15)' : 'rgba(170, 59, 255, 0.1)')
                .blur(40)

              Column() {
                Text('📖')
                  .fontSize(56)
              }
              .width(120)
              .height(120)
              .borderRadius(60)
              .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.7)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .border({
                width: 1,
                color: this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)'
              })
              .shadow({
                radius: 20,
                color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(170, 59, 255, 0.2)',
                offsetY: 8
              })
              .justifyContent(FlexAlign.Center)
              .alignItems(HorizontalAlign.Center)
            }

            Text('暂无阅读历史')
              .fontSize(17)
              .fontWeight(FontWeight.Medium)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
              .margin({ top: AppSpacing.XL })

            Text('看过的书都会在这里')
              .fontSize(13)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: 6 })
              .letterSpacing(1)

            // 立即阅读按钮
            Row() {
              Row({ space: 6 }) {
                Text('去书城逛逛').fontColor('#ffffff')
                Text('→').fontColor('#ffffff')
              }
            }
            .padding({ left: 28, right: 28, top: 12, bottom: 12 })
            .borderRadius(20)
            .linearGradient({
              angle: 135,
              colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
            })
            .shadow({
              radius: 12,
              color: 'rgba(170, 59, 255, 0.3)',
              offsetY: 4
            })
            .margin({ top: AppSpacing.XXL })
            .onClick(() => {
              router.back()
            })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .width('100%')
        } else {
          // 阅读历史统计
          Row() {
            Row({ space: 8 }) {
              Text('📚')
                .fontSize(16)
              Text(`共 ${this.historyList.length} 本`)
                .fontSize(13)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
                .fontWeight(FontWeight.Medium)
            }
            .padding({ left: 14, right: 14, top: 8, bottom: 8 })
            .borderRadius(AppRadius.PILL)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.6)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'
            })
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.XS })
          .opacity(this.contentOpacity)

          List() {
            ForEach(this.historyList, (item: Novel, index: number) => {
              ListItem() {
                this.historyItem(item, index)
              }
            })
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
          .contentEndOffset(20)
          .scrollBar(BarState.Off)
          .edgeEffect(EdgeEffect.Spring)
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 历史记录项（玻璃质感）
   */
  @Builder
  historyItem(item: Novel, index: number) {
    Row() {
      // 序号圆圈
      Column() {
        Text(`${index + 1}`)
          .fontSize(12)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
      }
      .width(32)
      .height(32)
      .borderRadius(16)
      .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(170, 59, 255, 0.1)')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .margin({ right: AppSpacing.MD })

      // 封面
      Image(item.imgUrl)
        .width(60)
        .height(80)
        .borderRadius(AppRadius.SMALL)
        .objectFit(ImageFit.Cover)
        .backgroundColor(this.isDarkMode ? '#2f2f37' : '#f0f0f5')
        .margin({ right: AppSpacing.MD })
        .shadow({
          radius: 6,
          color: 'rgba(0, 0, 0, 0.1)',
          offsetY: 2
        })

      // 信息
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
            .maxLines(1)

          if (item.type) {
            Text('·')
              .fontSize(12)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            Text(item.type)
              .fontSize(12)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .maxLines(1)
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

      Text('›')
        .fontSize(18)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
        .margin({ left: AppSpacing.SM })
    }
    .width('100%')
    .padding({ left: AppSpacing.MD, right: AppSpacing.MD, top: AppSpacing.MD, bottom: AppSpacing.MD })
    .borderRadius(AppRadius.LARGE)
    .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)')
    .backgroundBlurStyle(BlurStyle.Regular, {
      adaptiveColor: AdaptiveColor.DEFAULT
    })
    .border({
      width: 1,
      color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'
    })
    .shadow({
      radius: 8,
      color: this.isDarkMode ? 'rgba(0, 0, 0, 0.2)' : 'rgba(114, 46, 209, 0.04)',
      offsetY: 2
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
