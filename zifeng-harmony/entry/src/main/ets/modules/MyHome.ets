/**
 * 紫枫免费小说鸿蒙应用 - 我的页面
 * 适配 HarmonyOS 26.0.0：玻璃质感 Hero、用户卡片、完整菜单、设置入口
 */
import { router } from '@kit.ArkUI'
import { DbUtil } from '@abner/datastore'
import { Novel } from '../model/NovelItem'
import { AuthService } from '../service/AuthService'
import { AuthManager } from '../service/AuthManager'
import { ThemeManager, ThemeType } from '../service/ThemeManager'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { GlassStatCard, GlassMenuItem } from '../common/GlassComponents'
import { LightOrbs } from '../common/ParticleEffects'

@Builder
function statItem(label: string, value: string) {
  Column() {
    Text(value)
      .fontSize(22)
      .fontWeight(FontWeight.Bold)
      .fontColor('#ffffff')
    Text(label)
      .fontSize(13)
      .fontColor('rgba(255, 255, 255, 0.8)')
      .margin({ top: 4 })
  }
}

@Component
struct myHome {
  @State shelfCount: number = 0
  @State historyCount: number = 0
  @StorageLink('isDarkMode') isDarkMode: boolean = false
  @State currentTheme: ThemeType = ThemeType.LIGHT
  @StorageLink('isLoggedIn') isLoggedIn: boolean = false
  @StorageLink('zifeng_user') currentUser: Object | null = null
  private db: DbUtil = DbUtil.getInstance()
  private authService = AuthService.getInstance()
  private authManager = AuthManager.getInstance()
  private themeManager = ThemeManager.getInstance()

  async aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    this.currentTheme = this.themeManager.currentTheme
    this.db.filterRdbPredicates({
      equalTo: { 'isBookShelf': 1 }
    }).queryAllBean<Novel>('tb_novel', (data) => {
      this.shelfCount = data ? data.length : 0
    })
    this.db.filterRdbPredicates({
      equalTo: { 'isBookShelf': 1 }
    }).queryAllBean<Novel>('tb_novel', (data) => {
      this.historyCount = data ? data.length : 0
    })
  }

  async toggleTheme() {
    await this.themeManager.toggleDarkMode()
    this.isDarkMode = this.themeManager.isDarkMode
    this.currentTheme = this.themeManager.currentTheme
  }

  getThemeLabel(): string {
    switch (this.currentTheme) {
      case ThemeType.DARK: return '深色'
      case ThemeType.LIGHT: return '浅色'
      case ThemeType.SYSTEM: return '跟随系统'
      default: return '浅色'
    }
  }

  build() {
    Stack() {
      // 背景层
      Column()
        .width('100%')
        .height('100%')
        .backgroundColor(this.isDarkMode ? '#1a1a1f' : '#f7f8fc')

      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      // 主内容
      Scroll() {
        Column() {
          // 用户信息 Hero 区
          this.userHero()

          // 统计数据卡片组
          Row({ space: AppSpacing.MD }) {
            GlassStatCard({
              label: '书架',
              value: this.shelfCount.toString(),
              icon: '📚',
              accentColor: AppColors.PRIMARY,
              isDarkMode: this.isDarkMode
            })
            GlassStatCard({
              label: '历史',
              value: this.historyCount.toString(),
              icon: '📖',
              accentColor: AppColors.ACCENT_MINT,
              isDarkMode: this.isDarkMode
            })
            GlassStatCard({
              label: '书签',
              value: '0',
              icon: '🔖',
              accentColor: AppColors.ACCENT_ORANGE,
              isDarkMode: this.isDarkMode
            })
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })

          // 快捷功能区
          Column() {
            // 我的服务
            Text('我的服务')
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
              .width('100%')
              .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG, bottom: AppSpacing.SM })

            // 快捷服务网格
            Grid() {
              this.quickServiceItem('🏆', '排行榜', () => {
                router.pushUrl({ url: 'pages/RankPage' })
              })
              this.quickServiceItem('📜', '阅读历史', () => {
                router.pushUrl({ url: 'pages/ReadingHistoryPage' })
              })
              this.quickServiceItem('💬', '意见反馈', () => {
                router.pushUrl({ url: 'pages/FeedbackPage' })
              })
              this.quickServiceItem('⚙️', '偏好设置', () => {
                router.pushUrl({ url: 'pages/SettingsPage' })
              })
            }
            .columnsTemplate('1fr 1fr 1fr 1fr')
            .rowsTemplate('1fr')
            .rowsGap(AppSpacing.MD)
            .width('100%')
            .height(90)
            .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
          }
          .width('100%')
          .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)')
          .backgroundBlurStyle(BlurStyle.Regular, {
            adaptiveColor: AdaptiveColor.DEFAULT
          })
          .borderRadius(AppRadius.LARGE)
          .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })
          .border({
            width: 1,
            color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'
          })
          .padding({ top: AppSpacing.MD, bottom: AppSpacing.MD })

          // 通用功能区
          Column() {
            Text('通用')
              .fontSize(15)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
              .width('100%')
              .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG, bottom: AppSpacing.SM })

            Column() {
              if (this.isLoggedIn) {
                GlassMenuItem({
                  icon: '👤',
                  title: '个人信息',
                  subtitle: '查看和编辑个人资料',
                  accentColor: AppColors.PRIMARY,
                  isDarkMode: this.isDarkMode,
                  itemOnClick: () => {
                    router.pushUrl({ url: 'pages/UserInfoPage' })
                  }
                })
                this.divider()
              }
              GlassMenuItem({
                icon: '🌙',
                title: '深色模式',
                subtitle: '当前：' + this.getThemeLabel(),
                accentColor: AppColors.ACCENT_PURPLE,
                isDarkMode: this.isDarkMode,
                showArrow: false,
                itemOnClick: (): void => { this.toggleTheme(); }
              })
              this.divider()
              GlassMenuItem({
                icon: '📦',
                title: '清理缓存',
                subtitle: '释放本地存储空间',
                accentColor: AppColors.ACCENT_MINT,
                isDarkMode: this.isDarkMode,
                itemOnClick: () => {
                  AlertDialog.show({ message: '缓存清理功能开发中' })
                }
              })
              this.divider()
              GlassMenuItem({
                icon: 'ℹ️',
                title: '关于紫枫',
                subtitle: 'v1.0.0 · 紫枫免费小说',
                accentColor: AppColors.ACCENT_ORANGE,
                isDarkMode: this.isDarkMode,
                showArrow: false,
                itemOnClick: () => {
                  AlertDialog.show({
                    title: '关于',
                    message: '紫枫免费小说 v1.0.0\n海量书源 · 聚合搜索 · 永久免费',
                    confirm: { value: '我知道了', action: () => {} }
                  })
                }
              })
            }
            .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.65)' : 'rgba(255, 255, 255, 0.65)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .borderRadius(AppRadius.LARGE)
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.5)'
            })
            .margin({ left: AppSpacing.LG, right: AppSpacing.LG })
          }
          .width('100%')

          // 退出登录按钮
          if (this.isLoggedIn) {
            Row() {
              Text('退出登录')
                .fontSize(15)
                .fontWeight(FontWeight.Medium)
                .fontColor(AppColors.DANGER)
                .textAlign(TextAlign.Center)
                .layoutWeight(1)
            }
            .width('100%')
            .height(48)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 77, 79, 0.15)' : 'rgba(255, 77, 79, 0.08)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .borderRadius(AppRadius.LARGE)
            .border({
              width: 1,
              color: AppColors.DANGER + '40'
            })
            .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.LG })
            .onClick(() => this.handleLogout())
          }

          // 底部留白
          Column()
            .width('100%')
            .height(120)
        }
        .width('100%')
      }
      .layoutWeight(1)
      .scrollBar(BarState.Off)
      .edgeEffect(EdgeEffect.Spring)
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 用户信息 Hero 区
   */
  @Builder
  userHero() {
    Stack() {
      // 渐变背景
      Column()
        .width('100%')
        .height(220)
        .linearGradient({
          angle: 135,
          colors: [
            ['#aa3bff', 0.0],
            ['#722ed1', 0.5],
            ['#531dab', 1.0]
          ]
        })
        .borderRadius({
          bottomLeft: AppRadius.XXLARGE,
          bottomRight: AppRadius.XXLARGE
        })

      // 用户信息
      Column() {
        if (this.isLoggedIn && this.currentUser) {
          // 已登录
          Row() {
            this.avatar()
            Column() {
              Text((this.currentUser as Record<string, Object>)['username'] as string || '紫枫用户')
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor('#ffffff')
              Text((this.currentUser as Record<string, Object>)['email'] as string || '登录享受更多服务')
                .fontSize(12)
                .fontColor('rgba(255, 255, 255, 0.8)')
                .margin({ top: 4 })
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .alignItems(HorizontalAlign.Start)
            .layoutWeight(1)
            .margin({ left: AppSpacing.LG })

            Text('›')
              .fontSize(28)
              .fontColor('rgba(255, 255, 255, 0.6)')
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
          .onClick(() => {
            router.pushUrl({ url: 'pages/UserInfoPage' })
          })
        } else {
          // 未登录
          Row() {
            this.avatar()
            Column() {
              Text('点击登录')
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor('#ffffff')
              Text('登录享受更多服务')
                .fontSize(12)
                .fontColor('rgba(255, 255, 255, 0.85)')
                .margin({ top: 4 })
            }
            .alignItems(HorizontalAlign.Start)
            .layoutWeight(1)
            .margin({ left: AppSpacing.LG })

            Text('›')
              .fontSize(28)
              .fontColor('rgba(255, 255, 255, 0.6)')
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
          .onClick(() => {
            router.pushUrl({ url: 'pages/LoginPage' })
          })
        }

        // 底部信息
        Row({ space: 30 }) {
          statItem('书架', this.shelfCount.toString())
          Column()
            .width(1)
            .height(30)
            .backgroundColor('rgba(255, 255, 255, 0.2)')
          statItem('历史', this.historyCount.toString())
          Column()
            .width(1)
            .height(30)
            .backgroundColor('rgba(255, 255, 255, 0.2)')
          statItem('书签', '0')
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .margin({ top: AppSpacing.XL })
      }
      .width('100%')
      .padding({ top: 50, left: 0, right: 0 })
    }
    .width('100%')
    .height(220)
  }

  /**
   * 头像组件
   */
  @Builder
  avatar() {
    Stack() {
      // 头像本体
      Column() {
        Text(this.isLoggedIn ? '🌟' : '👤')
          .fontSize(36)
      }
      .width(72)
      .height(72)
      .borderRadius(36)
      .backgroundColor('rgba(255, 255, 255, 0.95)')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
    }
    .width(80)
    .height(80)
  }

  /**
   * 快捷服务项
   */
  @Builder
  quickServiceItem(icon: string, label: string, onClick: () => void) {
    GridItem() {
      Column() {
        Column() {
          Text(icon)
            .fontSize(24)
        }
        .width(48)
        .height(48)
        .borderRadius(14)
        .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(170, 59, 255, 0.08)')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)

        Text(label)
          .fontSize(12)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
          .margin({ top: 6 })
      }
      .width('100%')
      .height('100%')
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .onClick(() => onClick())
    }
  }

  /**
   * 分隔线
   */
  @Builder
  divider() {
    Row()
      .width('100%')
      .height(0.5)
      .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)')
      .margin({ left: AppSpacing.LG, right: AppSpacing.LG })
  }

  /**
   * 处理退出登录
   */
  async handleLogout() {
    AlertDialog.show({
      title: '确认退出',
      message: '确定要退出登录吗？',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '确定',
        action: async () => {
          await this.authService.logout()
        }
      }
    })
  }
}

export { myHome }
