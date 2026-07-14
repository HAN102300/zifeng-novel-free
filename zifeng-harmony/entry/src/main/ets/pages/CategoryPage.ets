/**
 * CategoryPage - 分类页
 * 规格：§3.2 分类页
 */
import { router } from '@kit.ArkUI'
import { uiMaterial } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { SectionHeader } from '../common/SectionHeader'
import { LoadingSkel } from '../common/LoadingSkel'
import { BackButton } from '../common/BackButton'
import { CategoryService, Category } from '../service/CategoryService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct CategoryPage {
  @State categories: Category[] = []
  @State isLoading: boolean = true

  aboutToAppear() {
    this.loadCategories()
  }

  private async loadCategories() {
    try {
      this.categories = await CategoryService.getCategories()
    } catch (e) {
      promptAction.showToast({ message: '加载失败' })
    } finally {
      this.isLoading = false
    }
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('全部分类')
          .fontSize(AppTypography.SIZE_H3)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding(AppSpacing.S4)

      if (this.isLoading) {
        Grid() {
          ForEach([0, 1, 2, 3, 4, 5, 6, 7], () => {
            GridItem() {
              LoadingSkel({ shape: 'card', height: 100 })
            }
          })
        }
        .columnsTemplate('1fr 1fr 1fr 1fr')
        .columnsGap(AppSpacing.S3)
        .rowsGap(AppSpacing.S3)
        .padding(AppSpacing.S4)
      } else {
        Scroll() {
          Grid() {
            ForEach(this.categories, (cat: Category) => {
              GridItem() {
                Column() {
                  Column()
                    .width(48).height(48)
                    .borderRadius(AppRadius.R_FULL)
                    .linearGradient({
                      direction: GradientDirection.Bottom,
                      colors: ThemeManager.getGradientColors().map(c => c as [ResourceColor, number])
                    })
                    .justifyContent(FlexAlign.Center)
                  Text(cat.name)
                    .fontSize(AppTypography.SIZE_H4)
                    .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    .margin({ top: AppSpacing.S2 })
                  Text(`${cat.count} 本`)
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                }
                .width('100%')
                .padding(AppSpacing.S4)
                .borderRadius(AppRadius.R_LG)
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .systemMaterial(new uiMaterial.ImmersiveMaterial({
                  style: uiMaterial.ImmersiveStyle.REGULAR,
                  applyShadow: true, interactive: true
                } as uiMaterial.ImmersiveOptions))
                .onClick(() => {
                  router.pushUrl({
                    url: 'pages/CategoryDetailPage',
                    params: { categoryId: cat.id, categoryName: cat.name }
                  })
                })
              }
            })
          }
          .columnsTemplate('1fr 1fr 1fr 1fr')
          .columnsGap(AppSpacing.S3)
          .rowsGap(AppSpacing.S3)
          .padding(AppSpacing.S4)
        }
        .layoutWeight(1)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }
}

export default CategoryPage
