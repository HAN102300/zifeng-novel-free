/**
 * 紫枫免费小说鸿蒙应用 - 目录页面
 * 适配 HarmonyOS 26.0.0 新特性：
 * - 渐变 Hero 区
 * - 玻璃质感信息卡片
 * - 玻璃质感章节列表
 * - 背景光斑/光粒子特效
 */
import { router } from '@kit.ArkUI'
import { Chapter } from '../model/Chapters'
import { Loading } from '../common/LoadingComponent'
import { DbUtil } from '@abner/datastore'
import { Novel } from '../model/NovelItem'
import bookService from '../service/BookService'
import { ApiResponse } from '../service/ApiClient'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { LightOrbs, GlowPulse } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct DirectoryPage {
  @State chapter: Chapter[] = []
  @State novelInfo: Novel = router.getParams() as Novel
  @State isLoading: boolean = true
  @State isAscending: boolean = true
  @State isDarkMode: boolean = false
  @State heroOpacity: number = 0
  @State listOpacity: number = 0
  @State db: DbUtil = DbUtil.getInstance()
  private themeManager = ThemeManager.getInstance()

  async aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode

    // 入场动画
    animateTo({ duration: 600, curve: Curve.FastOutSlowIn }, () => {
      this.heroOpacity = 1
    })
    setTimeout(() => {
      animateTo({ duration: 500, curve: Curve.EaseOut }, () => {
        this.listOpacity = 1
      })
    }, 150)

    this.isLoading = true

    try {
      // 优先使用 BookService 获取目录
      if (this.novelInfo.source && this.novelInfo.tocUrl) {
        const tocResult: ApiResponse<Chapter[]> = await bookService.getToc(
          this.novelInfo.source,
          this.novelInfo.tocUrl,
          this.novelInfo
        )

        if (tocResult.data && tocResult.data.length > 0) {
          this.chapter = tocResult.data
        } else {
          // 降级到本地数据库
          await this.loadFromLocal()
        }
      } else {
        // 没有书源信息，直接从本地加载
        await this.loadFromLocal()
      }
    } catch (error) {
      console.error('加载目录失败:', JSON.stringify(error))
      // 降级到本地
      await this.loadFromLocal()
    } finally {
      this.isLoading = false
    }
  }

  async loadFromLocal() {
    return new Promise<void>((resolve) => {
      this.db.filterRdbPredicates({
        equalTo: {
          'novelId': this.novelInfo.bookId
        }
      }).queryAllBean<Chapter>('tb_chapters', (data) => {
        this.chapter = data
        resolve()
      })
    })
  }

  toggleOrder() {
    this.isAscending = !this.isAscending
    this.chapter = this.chapter.reverse()
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

      // 背景光斑
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      Column() {
        // 头部区域（渐变 + 玻璃质感）
        Stack() {
          // 渐变背景
          Column()
            .width('100%')
            .height(160)
            .linearGradient({
              angle: 135,
              colors: [
                [AppColors.PRIMARY_GRADIENT_START, 0.0],
                [AppColors.PRIMARY, 0.5],
                [AppColors.PRIMARY_DARK, 1.0]
              ]
            })

          // 装饰光晕（缩小尺寸，避免遮挡封面）
          GlowPulse({
            x: '75%',
            y: '20%',
            pulseSize: 80,
            color: 'rgba(212, 165, 255, 0.25)',
            intensity: 0.15
          })

          // 顶部导航栏
          Row() {
            Image($r('app.media.back'))
              .width(26)
              .height(26)
              .padding(4)
              .fillColor(Color.White)
              .borderRadius(14)
              .backgroundColor('rgba(255, 255, 255, 0.18)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .onClick(() => router.back())

            Blank()

            Text('目录')
              .fontSize(17)
              .fontWeight(FontWeight.Medium)
              .fontColor(Color.White)

            Blank()

            // 排序按钮
            Row() {
              Text(this.isAscending ? '正序' : '倒序')
                .fontSize(12)
                .fontColor(Color.White)
                .margin({ right: 4 })
              Image($r('app.media.down_up'))
                .width(18)
                .height(18)
                .fillColor(Color.White)
            }
            .padding({ left: 10, right: 10, top: 6, bottom: 6 })
            .borderRadius(14)
            .backgroundColor('rgba(255, 255, 255, 0.18)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .onClick(() => this.toggleOrder())
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: 40 })
          .position({ x: 0, y: 0 })

          // 书籍信息
          Row() {
            Stack() {
              Column()
                .width(60)
                .height(80)
                .borderRadius(6)
                .backgroundColor('rgba(0, 0, 0, 0.3)')
                .blur(16)
                .position({ x: 3, y: 4 })

              Image(this.novelInfo.imgUrl || $r('app.media.img'))
                .width(60)
                .height(80)
                .borderRadius(6)
                .objectFit(ImageFit.Cover)
                .shadow({
                  radius: 12,
                  color: 'rgba(0, 0, 0, 0.4)',
                  offsetY: 4
                })
            }
            .margin({ right: AppSpacing.MD })

            Column() {
              Text(this.novelInfo.title)
                .fontSize(17)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })

              Text(this.novelInfo.author || '未知作者')
                .fontSize(13)
                .fontColor('rgba(255, 255, 255, 0.85)')
                .margin({ top: 4 })

              Row() {
                Text('📚')
                  .fontSize(12)
                  .margin({ right: 4 })
                Text(`共 ${this.chapter.length} 章`)
                  .fontSize(12)
                  .fontColor('rgba(255, 255, 255, 0.85)')
              }
              .margin({ top: 4 })
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)
            .justifyContent(FlexAlign.Center)
          }
          .width('100%')
          .padding({ left: AppSpacing.XL, right: AppSpacing.XL, top: 80 })
          .alignItems(VerticalAlign.Center)
        }
        .width('100%')
        .height(160)
        .opacity(this.heroOpacity)

        // 目录列表区域
        if (this.isLoading) {
          Column() {
            Loading()
            Text('加载目录中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: 12 })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .width('100%')
        } else if (this.chapter.length === 0) {
          Column() {
            Text('📭')
              .fontSize(56)
              .margin({ bottom: 12 })
            Text('暂无目录数据')
              .fontSize(16)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .alignItems(HorizontalAlign.Center)
          .width('100%')
        } else {
          List() {
            ForEach(this.chapter, (item: Chapter, index: number) => {
              ListItem() {
                Row() {
                  // 章节序号
                  Column() {
                    Text(`${index + 1}`)
                      .fontSize(12)
                      .fontWeight(FontWeight.Medium)
                      .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  }
                  .width(36)
                  .height(36)
                  .borderRadius(18)
                  .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(170, 59, 255, 0.1)')
                  .justifyContent(FlexAlign.Center)
                  .alignItems(HorizontalAlign.Center)
                  .margin({ right: AppSpacing.MD })

                  Column() {
                    Text(item.chapterName)
                      .fontSize(15)
                      .fontWeight(FontWeight.Medium)
                      .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                      .maxLines(2)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })

                    if (item.updatedAt) {
                      Text(item.updatedAt)
                        .fontSize(11)
                        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                        .margin({ top: 4 })
                    }
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)

                  Text('›')
                    .fontSize(20)
                    .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                }
                .width('100%')
                .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: 14, bottom: 14 })
                .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)')
                .backgroundBlurStyle(BlurStyle.Regular, {
                  adaptiveColor: AdaptiveColor.DEFAULT
                })
                .border({
                  width: { bottom: 0.5 },
                  color: this.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)'
                })
              }
              .onClick(() => {
                router.pushUrl({
                  url: 'pages/ContentPage',
                  params: {
                    chapter: item,
                    novelInfo: this.novelInfo
                  }
                })
              })
            })
          }
          .width('100%')
          .layoutWeight(1)
          .scrollBar(BarState.Off)
          .edgeEffect(EdgeEffect.Spring)
          .backgroundColor(Color.Transparent)
          .opacity(this.listOpacity)
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
