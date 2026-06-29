/**
 * 紫枫免费小说鸿蒙应用 - 主页面
 * 集成 HarmonyOS 26.0.0 新特性：
 * - 玻璃质感底部导航栏
 * - 背景光斑特效
 * - 平滑过渡动画
 */
import { recommend } from '../modules/Recommend'
import { category } from '../modules/Category'
import { bookshelves } from '../modules/BookShelves'
import { myHome } from '../modules/MyHome'
import { common } from '@kit.AbilityKit'
import { window } from '@kit.ArkUI'
import { DbTableFieldType, DbUtil } from '@abner/datastore'
import { GlassBottomNavBar, NavItem } from '../common/GlassNavBar'
import { LightOrbs } from '../common/ParticleEffects'
import { AppColors } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

@Entry
@Component
struct Index {
  @State selectIndex: number = 0
  @State db: DbUtil = DbUtil.getInstance()
  @StorageLink('isDarkMode') isDarkMode: boolean = false
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  bottomRectHeight: string = AppStorage.get<number>('bottomRectHeight') + 'px'
  private context = getContext(this) as common.UIAbilityContext
  private themeManager = ThemeManager.getInstance()

  // 导航栏配置 - 与网站风格保持一致
  private navItems: NavItem[] = [
    { index: 0, title: '书城', icon: '📚', activeIcon: '📖', activeColor: AppColors.PRIMARY_LIGHT },
    { index: 1, title: '分类', icon: '🗂', activeIcon: '🗂️', activeColor: AppColors.ACCENT_MINT },
    { index: 2, title: '书架', icon: '📕', activeIcon: '📔', activeColor: AppColors.ACCENT_ORANGE },
    { index: 3, title: '我的', icon: '👤', activeIcon: '🌟', activeColor: AppColors.ACCENT_PURPLE }
  ]

  aboutToAppear(): void {
    window.getLastWindow(this.context).then((windowClass) => {
      windowClass.setWindowSystemBarEnable(['status', 'navigation'])
    })
    this.initDatabase()
  }

  initDatabase() {
    this.db.isDbTableExist('tb_novel', (isSuccess: boolean) => {
      if (isSuccess) {
        console.log('数据表tb_novel已经创建了')
        return
      }
      this.db.createTable('tb_novel', {
        'id': { type: DbTableFieldType.INTEGER, isPrimaryKey: true, isAutoIncrement: true },
        'bookId': { type: DbTableFieldType.VARCHAR, length: 10 },
        'title': { type: DbTableFieldType.VARCHAR, length: 24 },
        'author': { type: DbTableFieldType.VARCHAR, length: 12 },
        'imgUrl': { type: DbTableFieldType.VARCHAR, length: 300 },
        'wordNum': { type: DbTableFieldType.VARCHAR, length: 8 },
        'decTime': { type: DbTableFieldType.VARCHAR, length: 8 },
        'chapterNumber': { type: DbTableFieldType.VARCHAR, length: 8 },
        'isBookShelf': { type: DbTableFieldType.INT },
        'chaptersId': { type: DbTableFieldType.INTEGER },
        'intro': { type: DbTableFieldType.VARCHAR, length: 300 }
      })
    })
    this.db.isDbTableExist('tb_chapters', (isSuccess: boolean) => {
      if (isSuccess) {
        console.log('数据表tb_chapters已经创建了')
        return
      }
      this.db.createTable('tb_chapters', {
        'id': { type: DbTableFieldType.INTEGER, isPrimaryKey: true, isAutoIncrement: true },
        'path': { type: DbTableFieldType.VARCHAR, length: 84 },
        'novelId': { type: DbTableFieldType.VARCHAR, length: 10 },
        'chapterName': { type: DbTableFieldType.VARCHAR, length: 20 },
        'chapterNumber': { type: DbTableFieldType.INT },
        'wordNum': { type: DbTableFieldType.INT },
        'updatedAt': { type: DbTableFieldType.CHAR, length: 16 },
        'chapterId': { type: DbTableFieldType.VARCHAR, length: 10 }
      })
    })
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

      // 背景装饰光斑
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      // ========== 主内容区 ==========
      Column() {
        // 顶部状态栏占位
        Column()
          .width('100%')
          .height(this.topRectHeight)

        // 主内容
        Stack() {
          // 推荐页面
          if (this.selectIndex === 0) {
            recommend()
              .width('100%')
              .height('100%')
          }

          // 分类页面
          if (this.selectIndex === 1) {
            category()
              .width('100%')
              .height('100%')
          }

          // 书架页面
          if (this.selectIndex === 2) {
            bookshelves()
              .width('100%')
              .height('100%')
          }

          // 我的页面
          if (this.selectIndex === 3) {
            myHome()
              .width('100%')
              .height('100%')
          }
        }
        .layoutWeight(1)

        // ========== 底部导航栏（玻璃质感）==========
        GlassBottomNavBar({
          currentIndex: this.selectIndex,
          isDarkMode: this.isDarkMode,
          navItems: this.navItems,
          navOnChange: (index: number) => {
            this.selectIndex = index
          }
        })

        // 底部安全区
        Column()
          .width('100%')
          .height(this.bottomRectHeight)
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }
}
