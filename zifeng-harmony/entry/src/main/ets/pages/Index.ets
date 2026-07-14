/**
 * Index - 主页面（底部 Tab 导航容器）
 * 包含 4 个主 Tab：首页、分类、书架、我的
 * 其他页面通过 router.pushUrl 进入
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import HomePage from './HomePage'
import CategoryPage from './CategoryPage'
import ShelfPage from './ShelfPage'
import UserCenterPage from './UserCenterPage'

@Entry
@Component
struct Index {
  @State currentTab: number = 0

  private tabs: { label: string, icon: Resource, activeIcon: Resource }[] = [
    { label: '首页', icon: $r('app.media.ic_home'), activeIcon: $r('app.media.ic_home_active') },
    { label: '分类', icon: $r('app.media.ic_category'), activeIcon: $r('app.media.ic_category_active') },
    { label: '书架', icon: $r('app.media.ic_shelf'), activeIcon: $r('app.media.ic_shelf_active') },
    { label: '我的', icon: $r('app.media.ic_user'), activeIcon: $r('app.media.ic_user_active') }
  ]

  build() {
    Column() {
      // 内容区（根据 Tab 切换）
      Stack() {
        if (this.currentTab === 0) {
          HomePage()
        } else if (this.currentTab === 1) {
          CategoryPage()
        } else if (this.currentTab === 2) {
          ShelfPage()
        } else {
          UserCenterPage()
        }
      }
      .layoutWeight(1)

      // 底部导航栏（THICK 材质）
      Row() {
        ForEach(this.tabs, (tab: { label: string, icon: Resource, activeIcon: Resource }, idx: number) => {
          Column() {
            Image(this.currentTab === idx ? tab.activeIcon : tab.icon)
              .width(24).height(24)
              .fillColor(this.currentTab === idx
                ? ThemeManager.getPrimary(500)
                : ThemeManager.getNeutral('TEXT_MUTED'))
            Text(tab.label)
              .fontSize(AppTypography.SIZE_TINY)
              .fontColor(this.currentTab === idx
                ? ThemeManager.getPrimary(500)
                : ThemeManager.getNeutral('TEXT_MUTED'))
              .margin({ top: 4 })
          }
          .layoutWeight(1)
          .onClick(() => this.currentTab = idx)
        })
      }
      .width('100%')
      .height(56)
      .padding({ top: AppSpacing.S2, bottom: AppSpacing.S2 })
      .systemMaterial(new uiMaterial.ImmersiveMaterial({
        style: uiMaterial.ImmersiveStyle.THICK,
        applyShadow: true,
        interactive: false
      } as uiMaterial.ImmersiveOptions))
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default Index
