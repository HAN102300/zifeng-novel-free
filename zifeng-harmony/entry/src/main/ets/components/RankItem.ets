/**
 * RankItem - 排行榜列表项
 * 规格：§核心组件库 RankItem
 */
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelItem } from '../model/NovelItem'

@Component
export struct RankItem {
  @Prop rank: number
  @Prop novel: NovelItem
  @Prop accentColor: string
  onClick?: (novel: NovelItem) => void

  build() {
    Row() {
      // 排名数字
      Text(this.rank.toString())
        .fontSize(this.rank <= 3 ? 24 : 18)
        .fontWeight(FontWeight.Bold)
        .fontColor(this.rank <= 3 ? this.accentColor : ThemeManager.getNeutral('TEXT_MUTED'))
        .width(32)
        .textAlign(TextAlign.Center)

      // 封面
      Image(this.novel.cover)
        .width(48).height(64)
        .borderRadius(AppRadius.R_SM)
        .objectFit(ImageFit.Cover)
        .margin({ left: AppSpacing.S3 })

      // 信息
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
        if (this.novel.score) {
          Text(`★ ${this.novel.score.toFixed(1)}`)
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor('#FAAD14')
            .margin({ top: 2 })
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: AppSpacing.S3 })
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .padding({ top: AppSpacing.S2, bottom: AppSpacing.S2, left: AppSpacing.S4, right: AppSpacing.S4 })
    .onClick(() => {
      if (this.onClick) {
        this.onClick(this.novel)
      }
    })
  }
}
