/**
 * NovelListItem - 小说列表项（横向布局）
 * 规格：§核心组件库 NovelListItem
 */
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { NovelItem } from '../model/NovelItem'

@Component
export struct NovelListItem {
  @Prop novel: NovelItem
  @Prop showProgress: boolean = false
  @Prop progress: number = 0
  @Prop showActions: boolean = false
  onClick?: (novel: NovelItem) => void
  onContinue?: (novel: NovelItem) => void
  onDelete?: (novel: NovelItem) => void

  build() {
    Row() {
      // 封面
      Image(this.novel.cover)
        .width(72).height(96)
        .borderRadius(AppRadius.R_SM)
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

        if (this.novel.latestChapter) {
          Text(`最新：${this.novel.latestChapter}`)
            .fontSize(AppTypography.SIZE_CAPTION)
            .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
            .maxLines(1)
            .textOverflow({ overflow: TextOverflow.Ellipsis })
            .margin({ top: 2 })
        }

        if (this.showProgress) {
          Row() {
            Column()
              .layoutWeight(1).height(3)
              .borderRadius(2)
              .backgroundColor(ThemeManager.getPrimaryColor())
            Column()
              .layoutWeight(1 - this.progress / 100).height(3)
              .borderRadius(2)
              .backgroundColor(ThemeManager.getNeutral('BORDER_LIGHT'))
          }
          .width('100%')
          .margin({ top: 4 })
        }
      }
      .layoutWeight(1)
      .alignItems(HorizontalAlign.Start)
      .margin({ left: AppSpacing.S3 })
      .height(96)
      .justifyContent(FlexAlign.SpaceBetween)

      // 操作按钮
      if (this.showActions) {
        Column() {
          if (this.showProgress && this.onContinue) {
            Button('继续')
              .height(28)
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor('#FFFFFF')
              .backgroundColor(ThemeManager.getPrimaryColor())
              .onClick(() => this.onContinue!(this.novel))
          }
          if (this.onDelete) {
            Button('删除')
              .height(28)
              .fontSize(AppTypography.SIZE_CAPTION)
              .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
              .backgroundColor(Color.Transparent)
              .margin({ top: 4 })
              .onClick(() => this.onDelete!(this.novel))
          }
        }
        .margin({ left: AppSpacing.S2 })
      }
    }
    .width('100%')
    .padding(AppSpacing.S3)
    .onClick(() => {
      if (this.onClick) {
        this.onClick(this.novel)
      }
    })
  }
}
