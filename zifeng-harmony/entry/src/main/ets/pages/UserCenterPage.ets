/**
 * UserCenterPage - 用户中心页
 * 规格：§5.1 用户中心
 * 特性：用户信息卡片、阅读统计、功能入口网格、退出登录
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { AuthService } from '../service/AuthService'
import { BookshelfService } from '../service/BookshelfService'
import { promptAction } from '@kit.ArkUI'

interface MenuItem {
  icon: Resource
  title: string
  route: string
}

@Entry
@Component
struct UserCenterPage {
  @State username: string = ''
  @State avatar: string = ''
  @State isLogged: boolean = false
  @State shelfCount: number = 0
  @State historyCount: number = 0
  @State readingDays: number = 0

  private menuItems: MenuItem[] = [
    { icon: $r('app.media.ic_settings'), title: '应用设置', route: 'pages/SettingsPage' },
    { icon: $r('app.media.ic_source'), title: '书源管理', route: 'pages/BookSourcePage' },
    { icon: $r('app.media.ic_history'), title: '阅读历史', route: 'pages/ReadingHistoryPage' },
    { icon: $r('app.media.ic_feedback'), title: '意见反馈', route: 'pages/FeedbackPage' }
  ]

  aboutToAppear() {
    this.loadUserInfo()
  }

  onPageShow() {
    this.loadUserInfo()
  }

  private async loadUserInfo() {
    this.isLogged = await AuthService.isLoggedIn()
    if (this.isLogged) {
      const user = await AuthService.getCurrentUser()
      this.username = user.username
      this.avatar = user.avatar
      this.shelfCount = await BookshelfService.getShelfCount()
      this.historyCount = await BookshelfService.getHistoryCount()
      this.readingDays = await BookshelfService.getReadingDays()
    }
  }

  private navigateToLogin() {
    router.pushUrl({ url: 'pages/LoginPage' })
  }

  private navigateTo(route: string) {
    if (!this.isLogged) {
      promptAction.showToast({ message: '请先登录' })
      this.navigateToLogin()
      return
    }
    router.pushUrl({ url: route })
  }

  private async logout() {
    promptAction.showDialog({
      title: '退出登录',
      message: '确定要退出当前账号吗？',
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '确定', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await AuthService.logout()
        this.isLogged = false
        this.username = ''
        this.avatar = ''
        promptAction.showToast({ message: '已退出登录' })
      }
    })
  }

  build() {
    Column() {
      // 顶部返回栏
      Row() {
        BackButton()
        Text('个人中心')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      Scroll() {
        Column() {
          // 用户信息卡片
          GlassCard({ cardPadding: AppSpacing.S6, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S5 }) {
            Row() {
              if (this.avatar.length > 0) {
                Image(this.avatar)
                  .width(72).height(72)
                  .borderRadius(AppRadius.R_FULL)
                  .objectFit(ImageFit.Cover)
              } else {
                Column()
                  .width(72).height(72)
                  .borderRadius(AppRadius.R_FULL)
                  .linearGradient({
                    direction: GradientDirection.Bottom,
                    colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
                  })
                  .justifyContent(FlexAlign.Center)
                  .alignItems(HorizontalAlign.Center)
                Text(this.username.charAt(0).toUpperCase())
                  .fontSize(AppTypography.SIZE_H1)
                  .fontColor(Color.White)
              }
              Column() {
                if (this.isLogged) {
                  Text(this.username)
                    .fontSize(AppTypography.SIZE_H3)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  Text('普通用户')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                    .margin({ top: AppSpacing.S1 })
                } else {
                  Text('未登录')
                    .fontSize(AppTypography.SIZE_H3)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                  Text('点击登录享受更多服务')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                    .margin({ top: AppSpacing.S1 })
                }
              }
              .alignItems(HorizontalAlign.Start)
              .margin({ left: AppSpacing.S4 })
              .layoutWeight(1)
              if (!this.isLogged) {
                Text('登录')
                  .fontSize(AppTypography.SIZE_BODY_SMALL)
                  .fontColor(Color.White)
                  .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: 6, bottom: 6 })
                  .borderRadius(AppRadius.R_FULL)
                  .backgroundColor(ThemeManager.getPrimary(500))
                  .onClick(() => this.navigateToLogin())
              }
            }
            .width('100%')
          }

          // 阅读统计
          GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S5 }) {
            Row() {
              this.StatItem('书架', this.shelfCount)
              Divider().vertical(true).height(40).color(ThemeManager.getNeutral('BORDER_LIGHT'))
              this.StatItem('历史', this.historyCount)
              Divider().vertical(true).height(40).color(ThemeManager.getNeutral('BORDER_LIGHT'))
              this.StatItem('阅读天数', this.readingDays)
            }
            .width('100%')
            .justifyContent(FlexAlign.SpaceAround)
          }

          // 功能入口网格
          Grid() {
            ForEach(this.menuItems, (item: MenuItem) => {
              GridItem() {
                Column() {
                  Image(item.icon)
                    .width(32).height(32)
                    .fillColor(ThemeManager.getPrimary(500))
                  Text(item.title)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .margin({ top: AppSpacing.S2 })
                }
                .width('100%')
                .padding({ top: AppSpacing.S4, bottom: AppSpacing.S4 })
                .onClick(() => this.navigateTo(item.route))
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr 1fr')
          .columnsGap(AppSpacing.S3)
          .rowsGap(AppSpacing.S4)
          .padding({ left: AppSpacing.S4, right: AppSpacing.S4, bottom: AppSpacing.S5 })

          // 退出登录
          if (this.isLogged) {
            Button('退出登录')
              .type(ButtonType.Capsule)
              .fontSize(AppTypography.SIZE_BODY)
              .fontColor(ThemeManager.getAccent('Rose'))
              .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
              .width('90%')
              .onClick(() => this.logout())
          }

          // 版本信息
          Text('紫枫免费小说 v1.0.0')
            .fontSize(AppTypography.SIZE_TINY)
            .fontColor(ThemeManager.getNeutral('TEXT_FAINT'))
            .margin({ top: AppSpacing.S8, bottom: AppSpacing.S6 })
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  @Builder StatItem(label: string, value: number) {
    Column() {
      Text(`${value}`)
        .fontSize(AppTypography.SIZE_H2)
        .fontColor(ThemeManager.getPrimary(500))
      Text(label)
        .fontSize(AppTypography.SIZE_CAPTION)
        .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
        .margin({ top: AppSpacing.S1 })
    }
  }
}

export default UserCenterPage
