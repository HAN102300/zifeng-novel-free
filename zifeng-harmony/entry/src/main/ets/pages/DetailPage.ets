/**
 * 紫枫免费小说鸿蒙应用 - 详情页面
 * 适配 HarmonyOS 26.0.0 新特性：
 * - 渐变 Hero 区
 * - 玻璃质感信息卡片
 * - 玻璃质感目录预览
 * - 玻璃质感底部操作栏
 * - 背景光斑/光粒子特效
 */
import { DbUtil } from '@abner/datastore'
import { router } from '@kit.ArkUI'
import { Chapter } from '../model/Chapters'
import { LastChapter, BookDetails } from '../model/NovelDetails'
import { Novel } from '../model/NovelItem'
import { Loading } from '../common/LoadingComponent'
import { ToastUtil } from '@yunkss/eftool'
import bookService from '../service/BookService'
import { ApiResponse } from '../service/ApiClient'
import bookshelfService from '../service/BookshelfService'
import { AuthManager } from '../service/AuthManager'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { LightOrbs, GlowPulse, FloatingParticles } from '../common/ParticleEffects'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct DetailPage {
  @State novelInfo: Novel = router.getParams() as Novel
  @State lastChapter: string = ''
  @State decTime: string = ''
  @State chapterNum: number = 0
  @State chapter: Chapter[] = []
  @State db: DbUtil = DbUtil.getInstance()
  @State isInShelf: boolean = false
  @State isLoading: boolean = true
  @StorageLink('isLoggedIn') isLoggedIn: boolean = false
  @State isDarkMode: boolean = false
  @State heroScale: number = 0.92
  @State heroOpacity: number = 0
  @State contentOpacity: number = 0
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private authManager = AuthManager.getInstance()
  private themeManager = ThemeManager.getInstance()

  async aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    this.isLoading = true

    // 入场动画
    animateTo({ duration: 600, curve: Curve.FastOutSlowIn }, () => {
      this.heroScale = 1
      this.heroOpacity = 1
    })
    setTimeout(() => {
      animateTo({ duration: 500, curve: Curve.EaseOut }, () => {
        this.contentOpacity = 1
      })
    }, 200)

    try {
      // 检查是否在书架中
      if (this.isLoggedIn && this.novelInfo.bookUrl) {
        const checkResult = await bookshelfService.checkBookInShelf(this.novelInfo.bookUrl)
        this.isInShelf = checkResult.success && checkResult.data
      } else {
        // 本地检查
        this.db.filterRdbPredicates({
          equalTo: { 'bookId': this.novelInfo.bookId, 'isBookShelf': 1 }
        }).queryAllBean<Novel>('tb_novel', (data) => {
          this.isInShelf = data && data.length > 0
        })
      }

      // 获取书籍详情和目录
      if (this.novelInfo.source && this.novelInfo.bookUrl) {
        // 使用新服务获取详情
        const bookInfoResult: ApiResponse<Novel> = await bookService.getBookInfo(
          this.novelInfo.source,
          this.novelInfo.bookUrl,
          this.novelInfo
        )

        if (bookInfoResult.data) {
          const src = this.novelInfo
          const data = bookInfoResult.data
          this.novelInfo = new Novel(
            data.bookId || src.bookId,
            data.title || src.title,
            data.imgUrl || src.imgUrl,
            data.author || src.author,
            data.intro || src.intro,
            data.type || src.type,
            data.wordNum || src.wordNum,
            data.bookUrl || src.bookUrl,
            data.source || src.source,
            data.tocUrl || src.tocUrl
          )
        }

        // 获取目录
        if (this.novelInfo.tocUrl) {
          const tocResult: ApiResponse<Chapter[]> = await bookService.getToc(
            this.novelInfo.source,
            this.novelInfo.tocUrl,
            this.novelInfo
          )

          if (tocResult.data && tocResult.data.length > 0) {
            this.chapter = tocResult.data
            this.chapterNum = tocResult.data.length
            this.lastChapter = tocResult.data[tocResult.data.length - 1].chapterName
          }
        }
      } else {
        // 降级：仅显示本地数据
        this.lastChapter = '未知'
        this.decTime = ''
        this.chapterNum = 0

        // 保存到本地数据库
        this.db.filterRdbPredicates({
          equalTo: { 'novelId': this.novelInfo.bookId }
        }).queryAllBean<Chapter>('tb_chapters', async (data) => {
          if (data.length > 0) {
            this.chapter = data
            this.chapterNum = data.length
            this.lastChapter = data[data.length - 1].chapterName
          }
        })
      }
    } catch (error) {
      console.error('加载书籍详情失败:', JSON.stringify(error))
    } finally {
      this.isLoading = false
    }
  }

  async addToShelf() {
    if (this.isInShelf) return
    if (this.isLoggedIn && this.novelInfo.bookUrl) {
      // 添加到云端书架
      const result = await bookshelfService.addToBookshelf(this.novelInfo)
      if (result.success) {
        this.isInShelf = true
        ToastUtil.showToast('已加入书架', { duration: 1500 })
      } else {
        ToastUtil.showToast(result.message || '添加失败', { duration: 1500 })
      }
    } else {
      // 添加到本地书架
      this.db.filterRdbPredicates({
        equalTo: { 'bookId': this.novelInfo.bookId }
      }).queryAllBean<Novel>('tb_novel', (data) => {
        if (data && data.length > 0) {
          this.db.updateBean('tb_novel', {
            'isBookShelf': 1,
            'chapterNumber': this.chapterNum.toString(),
            'decTime': this.decTime
          }, () => {
            this.isInShelf = true
            ToastUtil.showToast('已加入书架', { duration: 1500 })
          })
        } else {
          this.db.insertBean('tb_novel', {
            'bookId': this.novelInfo.bookId,
            'title': this.novelInfo.title,
            'author': this.novelInfo.author,
            'imgUrl': this.novelInfo.imgUrl,
            'wordNum': this.novelInfo.wordNum,
            'decTime': this.decTime,
            'chapterNumber': this.chapterNum.toString(),
            'isBookShelf': 1,
            'intro': this.novelInfo.intro,
            'bookUrl': this.novelInfo.bookUrl,
            'source': this.novelInfo.source,
            'tocUrl': this.novelInfo.tocUrl
          })
          this.isInShelf = true
          ToastUtil.showToast('已加入书架', { duration: 1500 })
        }
      })
    }
  }

  build() {
    Stack() {
      // ========== 背景层 ==========
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
        count: 6,
        isDarkMode: this.isDarkMode,
        enableAnimation: true
      })

      // ========== 主内容 ==========
      Column() {
        // ============ Hero 渐变区 ============
        Stack() {
          // 渐变背景层
          Column()
            .width('100%')
            .height(280)
            .linearGradient({
              angle: 135,
              colors: [
                [AppColors.PRIMARY_GRADIENT_START, 0.0],
                [AppColors.PRIMARY, 0.5],
                [AppColors.PRIMARY_DARK, 1.0]
              ]
            })
            .blur(0)

          // 装饰光晕（缩小尺寸，避免遮挡封面）
          GlowPulse({
            x: '75%',
            y: '20%',
            pulseSize: 100,
            color: 'rgba(212, 165, 255, 0.3)',
            intensity: 0.2
          })

          GlowPulse({
            x: '15%',
            y: '80%',
            pulseSize: 80,
            color: 'rgba(19, 194, 194, 0.2)',
            intensity: 0.15
          })

          // 顶部导航栏（玻璃质感）
          Row() {
            Image($r('app.media.back'))
              .width(26)
              .height(26)
              .fillColor(Color.White)
              .padding(4)
              .borderRadius(14)
              .backgroundColor('rgba(255, 255, 255, 0.18)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .onClick(() => {
                router.back()
              })
            Blank()
            Text('小说详情')
              .fontSize(17)
              .fontWeight(FontWeight.Medium)
              .fontColor(Color.White)
            Blank()
            // 透明占位，保持标题居中
            Column().width(34).height(34)
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: this.topRectHeight })
          .position({ x: 0, y: 0 })

          // 书籍信息
          Row() {
            Stack() {
              // 封面阴影
              Column()
                .width(110)
                .height(150)
                .borderRadius(AppRadius.MEDIUM)
                .backgroundColor('rgba(0, 0, 0, 0.3)')
                .blur(20)
                .position({ x: 4, y: 6 })

              Image(this.novelInfo.imgUrl.length === 0 ? $r('app.media.img') : this.novelInfo.imgUrl)
                .width(110)
                .height(150)
                .borderRadius(AppRadius.MEDIUM)
                .objectFit(ImageFit.Cover)
                .shadow({
                  radius: 16,
                  color: 'rgba(0, 0, 0, 0.4)',
                  offsetY: 6
                })
            }
            .margin({ right: AppSpacing.LG })

            Column() {
              Text(this.novelInfo.title)
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
                .maxLines(2)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
                .margin({ bottom: 8 })

              Row() {
                Text('✍️')
                  .fontSize(12)
                  .margin({ right: 4 })
                Text(this.novelInfo.author)
                  .fontSize(13)
                  .fontColor('rgba(255, 255, 255, 0.9)')
              }
              .margin({ bottom: 6 })

              if (this.novelInfo.wordNum) {
                Row() {
                  Text('📖')
                    .fontSize(12)
                    .margin({ right: 4 })
                  Text(this.novelInfo.wordNum)
                    .fontSize(12)
                    .fontColor('rgba(255, 255, 255, 0.85)')
                }
                .margin({ bottom: 6 })
              }

              if (this.decTime) {
                Row() {
                  Text('🕐')
                    .fontSize(12)
                    .margin({ right: 4 })
                  Text(this.decTime)
                    .fontSize(12)
                    .fontColor('rgba(255, 255, 255, 0.85)')
                }
              }

              // 类型标签
              if (this.novelInfo.type) {
                Text(this.novelInfo.type)
                  .fontSize(11)
                  .fontColor(Color.White)
                  .padding({ left: 8, right: 8, top: 3, bottom: 3 })
                  .borderRadius(10)
                  .backgroundColor('rgba(255, 255, 255, 0.22)')
                  .border({
                    width: 0.5,
                    color: 'rgba(255, 255, 255, 0.4)'
                  })
                  .margin({ top: 8 })
              }
            }
            .layoutWeight(1)
            .alignItems(HorizontalAlign.Start)
            .justifyContent(FlexAlign.Center)
          }
          .width('100%')
          .padding({ left: AppSpacing.XL, right: AppSpacing.XL, top: this.topRectHeight })
          .alignItems(VerticalAlign.Center)
        }
        .width('100%')
        .height(280)
        .scale({ x: this.heroScale, y: this.heroScale })
        .opacity(this.heroOpacity)

        // ============ 中部内容区（玻璃质感）============
        Scroll() {
          Column() {
            // 简介玻璃卡
            Column() {
              Row() {
                Column()
                  .width(3)
                  .height(16)
                  .borderRadius(1.5)
                  .linearGradient({
                    angle: 180,
                    colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
                  })
                  .margin({ right: 8 })
                Text('简介')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
              }
              .width('100%')

              Text(this.novelInfo.intro || '暂无简介')
                .fontSize(13)
                .lineHeight(22)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
                .margin({ top: 10 })
            }
            .width('100%')
            .padding(AppSpacing.LG)
            .borderRadius(AppRadius.LARGE)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.65)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'
            })
            .shadow({
              radius: 16,
              color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(114, 46, 209, 0.1)',
              offsetY: 4
            })
            .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG })

            // 目录玻璃卡
            Row() {
              Column() {
                Column()
                  .width(3)
                  .height(16)
                  .borderRadius(1.5)
                  .linearGradient({
                    angle: 180,
                    colors: [[AppColors.ACCENT_MINT, 0.0], ['#08979c', 1.0]]
                  })
                  .margin({ right: 8 })
                Text('目录')
                  .fontSize(16)
                  .fontWeight(FontWeight.Bold)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
              }

              Blank()

              if (this.chapter.length === 0) {
                Loading({ message: '章节加载中...' })
              } else {
                Text(this.lastChapter || '')
                  .fontSize(12)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .maxLines(1)
                  .textOverflow({ overflow: TextOverflow.Ellipsis })
                  .layoutWeight(1)
                  .textAlign(TextAlign.End)
                  .margin({ right: 8 })
                Text(`共 ${this.chapterNum} 章`)
                  .fontSize(12)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                  .padding({ left: 8, right: 8, top: 2, bottom: 2 })
                  .borderRadius(8)
                  .backgroundColor(AppColors.ACCENT_MINT + '20')
                  .margin({ right: 6 })
                Text('›')
                  .fontSize(20)
                  .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              }
            }
            .width('100%')
            .padding(AppSpacing.LG)
            .borderRadius(AppRadius.LARGE)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.65)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'
            })
            .shadow({
              radius: 16,
              color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(114, 46, 209, 0.1)',
              offsetY: 4
            })
            .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })
            .onClick(() => {
              router.pushUrl({
                url: 'pages/DirectoryPage',
                params: this.novelInfo
              })
            })
          }
          .width('100%')
          .padding({ bottom: 120 })
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
        .opacity(this.contentOpacity)
      }
      .width('100%')
      .height('100%')

      // ============ 底部操作栏（玻璃质感）============
      Column() {
        Row() {
          // 加入书架按钮
          Row() {
            Text(this.isInShelf ? '✓' : '📚')
              .fontSize(18)
              .margin({ right: 6 })
            Text(this.isInShelf ? '已在书架' : '加入书架')
              .fontSize(15)
              .fontWeight(FontWeight.Medium)
              .fontColor(this.isInShelf ? '#13c2c2' : (this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY))
          }
          .layoutWeight(1)
          .height(50)
          .borderRadius(25)
          .backgroundColor(this.isInShelf
            ? 'rgba(82, 196, 26, 0.15)'
            : (this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)'))
          .backgroundBlurStyle(BlurStyle.Regular, {
            adaptiveColor: AdaptiveColor.DEFAULT
          })
          .border({
            width: 1,
            color: this.isInShelf
              ? 'rgba(82, 196, 26, 0.4)'
              : (this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.6)')
          })
          .justifyContent(FlexAlign.Center)
          .alignItems(VerticalAlign.Center)
          .onClick(() => {
            if (!this.isInShelf) {
              this.addToShelf()
            }
          })

          // 开始阅读按钮（带渐变 + 发光）
          Stack() {
            // 发光效果
            Column()
              .width('100%')
              .height('100%')
              .borderRadius(25)
              .linearGradient({
                angle: 135,
                colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
              })
              .blur(12)
              .opacity(0.6)

            Row() {
              Text('开始阅读')
                .fontSize(15)
                .fontWeight(FontWeight.Bold)
                .fontColor(Color.White)
              Text(' →')
                .fontSize(16)
                .fontColor(Color.White)
            }
            .width('100%')
            .height('100%')
            .borderRadius(25)
            .linearGradient({
              angle: 135,
              colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
            })
            .justifyContent(FlexAlign.Center)
            .alignItems(VerticalAlign.Center)
            .shadow({
              radius: 16,
              color: 'rgba(170, 59, 255, 0.4)',
              offsetY: 6
            })
          }
          .layoutWeight(1)
          .height(50)
          .margin({ left: AppSpacing.MD })
          .onClick(() => {
            const targetChapter = this.chapter[0]
            if (targetChapter) {
              router.pushUrl({
                url: 'pages/ContentPage',
                params: {
                  chapter: targetChapter,
                  novelInfo: this.novelInfo
                }
              })
            }
          })
        }
        .width('100%')
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.LG })
        .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { top: 0.5 },
          color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        })
      }
      .width('100%')
      .position({ x: 0, y: '88%' })
    }
    .width('100%')
    .height('100%')
  }
}
