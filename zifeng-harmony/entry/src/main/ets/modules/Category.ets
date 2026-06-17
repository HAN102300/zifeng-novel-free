/**
 * 紫枫免费小说鸿蒙应用 - 分类页面
 * 适配 HarmonyOS 26.0.0：玻璃质感卡片、光斑背景、特色分类图标
 */
import { router } from '@kit.ArkUI'
import { Category, default as categoryService } from '../service/CategoryService'
import { Loading } from '../common/LoadingComponent'
import { LightOrbs } from '../common/ParticleEffects'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'

interface CategoryInfo {
  name: string
  icon: string  // emoji 作为分类图标
  color: string
  categoryId: string
  channel: string
  count?: number
  description?: string
}

// 分类预设配置 - 包含更丰富的分类信息
interface CategoryPresets {
  male: CategoryInfo[]
  female: CategoryInfo[]
}

const CATEGORY_PRESETS: CategoryPresets = {
  male: ([
    { name: '玄幻奇幻', icon: '🐉', color: '#722ed1', categoryId: 'lejRej', channel: 'male', description: '东方玄幻 西幻 异世大陆' },
    { name: '武侠仙侠', icon: '⚔️', color: '#13c2c2', categoryId: 'lejRej2', channel: 'male', description: '传统武侠 修真 仙侠' },
    { name: '都市言情', icon: '🏙️', color: '#eb2f96', categoryId: 'lejRej3', channel: 'male', description: '都市生活 职场 商战' },
    { name: '历史军事', icon: '🏯', color: '#fa8c16', categoryId: 'lejRej4', channel: 'male', description: '历史穿越 军事 架空' },
    { name: '游戏竞技', icon: '🎮', color: '#52c41a', categoryId: 'lejRej5', channel: 'male', description: '电子竞技 游戏异界' },
    { name: '科幻未来', icon: '🚀', color: '#1890ff', categoryId: 'lejRej6', channel: 'male', description: '星际战争 时空穿梭' },
    { name: '悬疑灵异', icon: '🔮', color: '#722ed1', categoryId: 'lejRej7', channel: 'male', description: '推理破案 灵异事件' },
    { name: '搞笑轻松', icon: '😄', color: '#faad14', categoryId: 'lejRej8', channel: 'male', description: '轻松日常 爆笑喜剧' }
  ] as CategoryInfo[]),
  female: ([
    { name: '古代言情', icon: '👘', color: '#eb2f96', categoryId: 'leiRej', channel: 'female', description: '穿越 宫斗 宅斗' },
    { name: '现代言情', icon: '💕', color: '#ff85c0', categoryId: 'leiRej2', channel: 'female', description: '都市 婚恋 总裁' },
    { name: '玄幻言情', icon: '✨', color: '#9254de', categoryId: 'leiRej3', channel: 'female', description: '女强 玄幻 异世' },
    { name: '校园青春', icon: '🎒', color: '#52c41a', categoryId: 'leiRej4', channel: 'female', description: '青春 校园 纯爱' },
    { name: '悬疑推理', icon: '🔍', color: '#fa541c', categoryId: 'leiRej5', channel: 'female', description: '推理 悬疑 探案' },
    { name: '科幻未来', icon: '🌌', color: '#1890ff', categoryId: 'leiRej6', channel: 'female', description: '未来 星际 末世' },
    { name: '武侠仙侠', icon: '🗡️', color: '#13c2c2', categoryId: 'leiRej7', channel: 'female', description: '仙侠 修真 江湖' },
    { name: '同人衍生', icon: '🎭', color: '#fa8c16', categoryId: 'leiRej8', channel: 'female', description: '同人 衍生 综漫' }
  ] as CategoryInfo[])
}

@Component
struct CategoryCard {
  @Prop info: CategoryInfo
  @Prop isDarkMode: boolean = false
  @State isPressed: boolean = false

  build() {
    Stack() {
      // 渐变背景层
      Column()
        .width('100%')
        .height('100%')
        .borderRadius(AppRadius.LARGE)
        .linearGradient({
          angle: 135,
          colors: [
            [this.info.color, 0.0],
            [this.info.color + 'CC', 1.0]
          ]
        })

      Column() {
        // 图标
        Column() {
          Text(this.info.icon)
            .fontSize(32)
        }
        .width(56)
        .height(56)
        .borderRadius(28)
        .backgroundColor('rgba(255, 255, 255, 0.2)')
        .justifyContent(FlexAlign.Center)
        .alignItems(HorizontalAlign.Center)
        .margin({ bottom: AppSpacing.SM })

        // 名称
        Text(this.info.name)
          .fontSize(15)
          .fontWeight(FontWeight.Bold)
          .fontColor('#ffffff')
          .textAlign(TextAlign.Center)
          .width('100%')

        // 描述
        if (this.info.description) {
          Text(this.info.description)
            .fontSize(10)
            .fontColor('rgba(255, 255, 255, 0.8)')
            .textAlign(TextAlign.Center)
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .width('100%')
            .margin({ top: 2 })
        }
      }
      .width('100%')
      .height('100%')
      .padding(AppSpacing.MD)
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
    }
    .width('100%')
    .height(120)
    .borderRadius(AppRadius.LARGE)
    .shadow({
      radius: 12,
      color: this.info.color + '40',
      offsetY: 4
    })
    .scale({ x: this.isPressed ? 0.95 : 1, y: this.isPressed ? 0.95 : 1 })
    .animation({
      duration: 150,
      curve: Curve.EaseOut
    })
    .onClick(() => {
      router.pushUrl({
        url: 'pages/CategoryDetailPage',
        params: {
          categoryId: this.info.categoryId,
          categoryName: this.info.name,
          channel: this.info.channel
        }
      })
    })
  }
}

@Component
struct category {
  @State categories: CategoryInfo[] = []
  @State isLoading: boolean = true
  @State currentChannel: string = 'male'
  @StorageLink('isDarkMode') isDarkMode: boolean = false
  private themeManager = ThemeManager.getInstance()

  async aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode
    await this.loadCategories()
  }

  async loadCategories() {
    this.isLoading = true
    try {
      const result = await categoryService.getCategories(this.currentChannel)
      if (result.success && result.data.length > 0) {
        // 合并预设信息
        const presets = this.currentChannel === 'male' ? CATEGORY_PRESETS.male : CATEGORY_PRESETS.female
        this.categories = result.data.map((cat: Category) => {
          const preset = presets.find(p => p.categoryId === cat.id)
          return {
            name: cat.name,
            icon: preset?.icon || '📖',
            color: preset?.color || '#722ed1',
            categoryId: cat.id,
            channel: cat.channel,
            description: preset?.description
          } as CategoryInfo
        })
      } else {
        this.loadDefaultCategories()
      }
    } catch (error) {
      console.error('加载分类失败:', error)
      this.loadDefaultCategories()
    } finally {
      this.isLoading = false
    }
  }

  loadDefaultCategories() {
    this.categories = this.currentChannel === 'male' ? CATEGORY_PRESETS.male : CATEGORY_PRESETS.female
  }

  switchChannel(channel: string) {
    if (this.currentChannel !== channel) {
      this.currentChannel = channel
      this.loadCategories()
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

      Column() {
        // 顶部欢迎区（玻璃质感 Hero）
        Column() {
          Text('小说分类')
            .fontSize(24)
            .fontWeight(FontWeight.Bold)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            .width('100%')

          Text('探索你喜欢的类型')
            .fontSize(13)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
            .margin({ top: 4 })
            .width('100%')

          // 频道切换
          Row({ space: AppSpacing.SM }) {
            this.channelTab('男生', 'male', '♂')
            this.channelTab('女生', 'female', '♀')
          }
          .width('100%')
          .margin({ top: AppSpacing.MD })
          .justifyContent(FlexAlign.Start)
        }
        .width('100%')
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.MD })
        .linearGradient({
          angle: 135,
          colors: this.isDarkMode
            ? [['rgba(170, 59, 255, 0.15)', 0.0], ['rgba(19, 194, 194, 0.1)', 1.0]]
            : [['rgba(170, 59, 255, 0.1)', 0.0], ['rgba(19, 194, 194, 0.05)', 1.0]]
        })
        .borderRadius({
          bottomLeft: AppRadius.XXLARGE,
          bottomRight: AppRadius.XXLARGE
        })

        if (this.isLoading) {
          Column() {
            Loading()
            Text('加载分类中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: AppSpacing.MD })
          }
          .layoutWeight(1)
          .justifyContent(FlexAlign.Center)
          .width('100%')
        } else {
          Scroll() {
            Column() {
              // 特色分类推荐
              this.featuredSection()

              // 全部分类
              Text('全部分类')
                .fontSize(16)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                .width('100%')
                .margin({ top: AppSpacing.LG, bottom: AppSpacing.MD })

              Grid() {
                ForEach(this.categories, (item: CategoryInfo) => {
                  GridItem() {
                    CategoryCard({
                      info: item,
                      isDarkMode: this.isDarkMode
                    })
                  }
                })
              }
              .columnsTemplate('1fr 1fr')
              .columnsGap(AppSpacing.MD)
              .rowsGap(AppSpacing.MD)
              .width('100%')
              .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: 0, bottom: 100 })

              // 底部留白
              Column().width('100%').height(20)
            }
            .width('100%')
            .padding({ top: AppSpacing.MD })
          }
          .layoutWeight(1)
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 频道切换 Tab
   */
  @Builder
  channelTab(label: string, channel: string, icon: string) {
    Row({ space: 4 }) {
      Text(icon)
        .fontSize(12)
        .fontColor(this.currentChannel === channel ? '#ffffff' : (this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY))

      Text(label)
        .fontSize(13)
        .fontColor(this.currentChannel === channel ? '#ffffff' : (this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY))
        .fontWeight(this.currentChannel === channel ? FontWeight.Bold : FontWeight.Normal)
    }
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: 8, bottom: 8 })
    .borderRadius(AppRadius.PILL)
    .linearGradient(this.currentChannel === channel
      ? {
        angle: 135,
        colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
      }
      : {
        angle: 135,
        colors: this.isDarkMode
          ? [['rgba(255, 255, 255, 0.08)', 0.0], ['rgba(255, 255, 255, 0.08)', 1.0]]
          : [['rgba(0, 0, 0, 0.05)', 0.0], ['rgba(0, 0, 0, 0.05)', 1.0]]
      })
    .onClick(() => this.switchChannel(channel))
  }

  /**
   * 特色分类区域
   */
  @Builder
  featuredSection() {
    Column() {
      Row() {
        Text('🔥 热门标签')
          .fontSize(14)
          .fontWeight(FontWeight.Bold)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        Blank()
        Text('更多 ›')
          .fontSize(12)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
      }
      .width('100%')
      .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.SM })

      Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start, alignItems: ItemAlign.Center }) {
        ForEach(['穿越', '重生', '系统', '无敌', '甜宠', '爽文', '单女主', '慢热', '无限流', '无限', '搞笑', '热血'], (tag: string) => {
          Text(tag)
            .fontSize(12)
            .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
            .padding({ left: 12, right: 12, top: 6, bottom: 6 })
            .borderRadius(AppRadius.PILL)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(170, 59, 255, 0.08)')
            .margin({ right: AppSpacing.XS, bottom: AppSpacing.XS })
        })
      }
      .width('100%')
      .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
    }
    .width('100%')
  }
}

export { category }
