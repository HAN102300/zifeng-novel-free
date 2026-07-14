/**
 * NovelCard - 小说卡片（网格布局）
 * 规格：§核心组件库 NovelCard
 * 封面 180vp 高，含评分/简介
 */
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelItem } from '../model/NovelItem'

@Component
export struct NovelCard {
  @Prop novel: NovelItem
  @Prop showScore: boolean = true
  @Prop showSummary: boolean = true
  onClick?: (novel: NovelItem) => void

  build() {
    Column() {
      // 封面
      Image(this.novel.cover)
        .width('100%').height(180)
        .borderRadius({ topLeft: AppRadius.R_LG, topRight: AppRadius.R_LG })
        .objectFit(ImageFit.Cover)

      // 信息区
      Column() {
        Text(this.novel.title)
          .fontSize(AppTypography.SIZE_BODY)
          .fontWeight(FontWeight.Medium)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Text(this.novel.author)
          .fontSize(AppTypography.SIZE_CAPTION)
          .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
          .margin({ top: 2 })

        if (this.showScore && this.novel.score) {
          Row() {
            Text('★')
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor('#FAAD14')
            Text(this.novel.score.toFixed(1))
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor('#FAAD14')
          }
          .margin({ top: 2 })
        }

        if (this.showSummary && this.novel.summary) {
          Text(this.novel.summary)
            .fontSize(AppTypography.SIZE_TINY)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
            .maxLines(2)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 4 })
        }
      }
      .width('100%')
      .alignItems(HorizontalAlign.Start)
      .padding(AppSpacing.S2)
      .layoutWeight(1)
    }
    .borderRadius(AppRadius.R_LG)
    .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
    .onClick(() => {
      if (this.onClick) {
        this.onClick(this.novel)
      }
    })
  }
}
