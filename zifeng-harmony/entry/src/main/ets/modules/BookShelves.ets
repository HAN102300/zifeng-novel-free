/**
 * 紫枫免费小说鸿蒙应用 - 书架页面
 * 适配 HarmonyOS 26.0.0：玻璃质感卡片、网格布局、光斑背景
 */
import { DbUtil } from '@abner/datastore'
import { Novel } from '../model/NovelItem'
import { router } from '@kit.ArkUI'
import { Loading } from '../common/LoadingComponent'
import { GlassCard, GlassEmptyState, GlassStatCard } from '../common/GlassComponents'
import { LightOrbs } from '../common/ParticleEffects'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import bookshelfService from '../service/BookshelfService'
import { AuthManager } from '../service/AuthManager'
import { ThemeManager } from '../service/ThemeManager'

/**
 * 书架书籍网格卡片
 */
@Component
struct BookShelfCard {
  @Prop novel: Novel
  @Prop isDarkMode: boolean = false
  bookOnDelete: () => void = () => {}

  @State isPressed: boolean = false

  build() {
    Stack({ alignContent: Alignment.TopEnd }) {
      // 主体玻璃卡片
      Column() {
        // 封面
        Stack({ alignContent: Alignment.BottomStart }) {
          Image(this.novel.imgUrl)
            .width('100%')
            .height(180)
            .borderRadius({ topLeft: AppRadius.MEDIUM, topRight: AppRadius.MEDIUM })
            .objectFit(ImageFit.Cover)
            .backgroundColor(this.isDarkMode ? '#2f2f37' : '#f0f0f5')

          // 渐变遮罩
          Column()
            .width('100%')
            .height(60)
            .linearGradient({
              angle: 180,
              colors: [
                ['rgba(0,0,0,0)', 0.0],
                ['rgba(0,0,0,0.6)', 1.0]
              ]
            })
            .borderRadius({ topLeft: AppRadius.MEDIUM, topRight: AppRadius.MEDIUM })
            .position({ x: 0, y: 120 })

          // 状态徽章
          if (this.novel.chaptersId) {
            Text('已加入')
              .fontSize(10)
              .fontColor('#ffffff')
              .fontWeight(FontWeight.Medium)
              .padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .borderRadius(4)
              .backgroundColor('rgba(82, 196, 26, 0.85)')
              .position({ x: 6, y: 6 })
          }
        }
        .width('100%')
        .height(180)

        // 信息
        Column() {
          Text(this.novel.title)
            .fontSize(13)
            .fontWeight(FontWeight.Medium)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%')
            .textAlign(TextAlign.Center)

          Text(this.novel.author)
            .fontSize(11)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%')
            .textAlign(TextAlign.Center)
            .margin({ top: 2 })

          if (this.novel.wordNum) {
            Text(this.novel.wordNum)
              .fontSize(10)
              .fontColor(AppColors.PRIMARY_LIGHT)
              .padding({ left: 4, right: 4, top: 1, bottom: 1 })
              .borderRadius(3)
              .backgroundColor(AppColors.PRIMARY_LIGHT + '15')
              .margin({ top: 4 })
          }
        }
        .width('100%')
        .padding({ top: 8, bottom: 8 })
        .alignItems(HorizontalAlign.Center)
      }
      .layoutWeight(1)
      .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)')
      .backgroundBlurStyle(BlurStyle.Regular, {
        adaptiveColor: AdaptiveColor.DEFAULT
      })
      .borderRadius(AppRadius.LARGE)
      .border({
        width: 1,
        color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'
      })
      .shadow({
        radius: 12,
        color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.06)',
        offsetY: 4
      })
      .onClick(() => {
        router.pushUrl({
          url: 'pages/DetailPage',
          params: this.novel
        })
      })
      .scale({ x: this.isPressed ? 0.96 : 1, y: this.isPressed ? 0.96 : 1 })
      .animation({
        duration: 150,
        curve: Curve.EaseOut
      })

      // 删除按钮
      Column() {
        Text('×')
          .fontSize(16)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
      }
      .width(22)
      .height(22)
      .borderRadius(11)
      .backgroundColor('rgba(255, 77, 79, 0.9)')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .position({ x: -6, y: -6 })
      .zIndex(2)
      .onClick(() => {
        this.bookOnDelete()
      })
    }
    .width('100%')
    .aspectRatio(0.7)
  }
}

@Component
struct bookshelves {
  @State novelList: Novel[] = []
  @State isLoading: boolean = true
  @State viewMode: 'grid' | 'list' = 'grid'
  @StorageLink('isDarkMode') isDarkMode: boolean = false
  @StorageLink('isLoggedIn') isLoggedIn: boolean = false
  private db: DbUtil = DbUtil.getInstance()
  private authManager = AuthManager.getInstance()
  private themeManager = ThemeManager.getInstance()

  async aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    await this.loadBookshelf()
  }

  async loadBookshelf() {
    this.isLoading = true

    if (this.isLoggedIn) {
      // 已登录，从云端加载
      try {
        const result = await bookshelfService.getBookshelf()
        if (result.success) {
          this.novelList = result.data
        }
      } catch (error) {
        console.error('加载云端书架失败:', JSON.stringify(error))
        // 降级到本地
        this.loadLocalBookshelf()
      }
    } else {
      // 未登录，从本地加载
      this.loadLocalBookshelf()
    }

    this.isLoading = false
  }

  loadLocalBookshelf() {
    this.db.filterRdbPredicates({
      equalTo: {
        'isBookShelf': 1
      }
    }).queryAllBean<Novel>('tb_novel', (data) => {
      if (data && data.length > 0) {
        this.novelList = data
      } else {
        this.novelList = []
      }
    })
  }

  async deleteNovel(item: Novel) {
    AlertDialog.show({
      title: '确认删除',
      message: `确定要从书架移除《${item.title}》吗？`,
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '确定',
        action: async () => {
          if (this.isLoggedIn && item.bookUrl) {
            // 从云端删除
            const result = await bookshelfService.removeFromBookshelf(item.bookUrl)
            if (result.success) {
              await this.loadBookshelf()
            }
          } else {
            // 从本地删除
            this.db.filterRdbPredicates({
              equalTo: { 'bookId': item.bookId }
            })
            this.db.deleteBean('tb_novel', () => {
              this.loadLocalBookshelf()
            })
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

      // 背景光斑
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      // 内容
      Column() {
        // 顶部统计卡片（玻璃质感）
        if (!this.isLoading && this.novelList.length > 0) {
          Row({ space: AppSpacing.MD }) {
            GlassStatCard({
              label: '书籍总数',
              value: this.novelList.length.toString(),
              icon: '📚',
              accentColor: AppColors.PRIMARY,
              isDarkMode: this.isDarkMode
            })
            GlassStatCard({
              label: '累计字数',
              value: this.calculateTotalWords(),
              icon: '📝',
              accentColor: AppColors.ACCENT_MINT,
              isDarkMode: this.isDarkMode
            })
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })
        }

        // 标题栏
        Row() {
          Text('我的书架')
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)

          if (!this.isLoading && this.novelList.length > 0) {
            Text(`${this.novelList.length} 本`)
              .fontSize(13)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .padding({ left: 8, right: 8, top: 2, bottom: 2 })
              .borderRadius(8)
              .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
              .margin({ left: 8 })
          }

          Blank()

          // 视图模式切换
          if (!this.isLoading && this.novelList.length > 0) {
            Row({ space: 4 }) {
              Text(this.viewMode === 'grid' ? '▦' : '≡')
                .fontSize(16)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                .width(32)
                .height(32)
                .borderRadius(8)
                .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
                .textAlign(TextAlign.Center)
                .onClick(() => {
                  this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid'
                })
            }
          }
        }
        .width('100%')
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG, bottom: AppSpacing.MD })

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
        } else if (this.novelList.length === 0) {
          GlassEmptyState({
            icon: '📚',
            title: this.isLoggedIn ? '书架空空如也' : '未登录，仅显示本地书架',
            subtitle: this.isLoggedIn ? '去书城添加喜欢的书籍吧' : '',
            actionText: this.isLoggedIn ? '去书城逛逛' : '去登录',
            isDarkMode: this.isDarkMode,
            emptyOnAction: () => {
              if (this.isLoggedIn) {
                router.pushUrl({ url: 'pages/Index' })
              } else {
                router.pushUrl({ url: 'pages/LoginPage' })
              }
            }
          })
        } else if (this.viewMode === 'grid') {
          // 网格视图
          Grid() {
            ForEach(this.novelList, (item: Novel) => {
              GridItem() {
                BookShelfCard({
                  novel: item,
                  isDarkMode: this.isDarkMode,
                  bookOnDelete: (): void => { this.deleteNovel(item); }
                })
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr')
          .columnsGap(AppSpacing.MD)
          .rowsGap(AppSpacing.MD)
          .width('100%')
          .layoutWeight(1)
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, bottom: 100 })
        } else {
          // 列表视图
          List() {
            ForEach(this.novelList, (item: Novel) => {
              ListItem() {
                this.bookListRow(item)
              }
            })
          }
          .width('100%')
          .layoutWeight(1)
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, bottom: 100 })
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 列表行
   */
  @Builder
  bookListRow(item: Novel) {
    Row() {
      // 封面
      Image(item.imgUrl)
        .width(64)
        .height(88)
        .borderRadius(AppRadius.SMALL)
        .objectFit(ImageFit.Cover)
        .backgroundColor(this.isDarkMode ? '#2f2f37' : '#f0f0f5')
        .margin({ right: AppSpacing.MD })

      // 信息
      Column() {
        Text(item.title)
          .fontSize(15)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
          .width('100%')

        Text(item.author)
          .fontSize(12)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
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

      // 删除按钮
      Text('删除')
        .fontSize(12)
        .fontColor(AppColors.DANGER)
        .padding({ left: 10, right: 10, top: 4, bottom: 4 })
        .borderRadius(6)
        .backgroundColor(AppColors.DANGER + '15')
        .onClick(() => this.deleteNovel(item))
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

  /**
   * 计算总字数
   */
  calculateTotalWords(): string {
    let total = 0
    for (const novel of this.novelList) {
      const match = novel.wordNum?.match(/(\d+(?:\.\d+)?)/)
      if (match) {
        const num = parseFloat(match[1])
        if (novel.wordNum?.includes('万')) {
          total += num * 10000
        } else if (novel.wordNum?.includes('亿')) {
          total += num * 100000000
        } else {
          total += num
        }
      }
    }
    if (total > 100000000) {
      return (total / 100000000).toFixed(1) + '亿'
    } else if (total > 10000) {
      return (total / 10000).toFixed(1) + '万'
    }
    return total.toString()
  }
}

export { bookshelves }
