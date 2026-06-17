import { Novel } from '../../model/NovelItem'

@ComponentV2
struct NovelListItem {
  @Param novel: Novel = new Novel('', '', '', '', '', '', '')
  itemOnClick: () => void = () => {}

  build() {
    Row() {
      Image(this.novel.imgUrl)
        .width(90)
        .height(126)
        .borderRadius(6)
        .objectFit(ImageFit.Cover)
        .backgroundColor('#f0f0f0')
      Column({ space: 6 }) {
        Text(this.novel.title)
          .fontSize(17)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333333')
          .maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis })

        Row() {
          Text(this.novel.author)
            .fontSize(13)
            .fontColor('#999999')
          Blank()
          Text(this.novel.wordNum)
            .fontSize(12)
            .fontColor('#b174ea')
        }

        Text(this.novel.intro)
          .fontColor('#888888')
          .fontSize(14)
          .lineHeight(20)
          .maxLines(2)
          .textOverflow({ overflow: TextOverflow.Ellipsis })
      }
      .alignItems(HorizontalAlign.Start)
      .layoutWeight(1)
      .padding({ left: 14 })
      .height(126)
      .justifyContent(FlexAlign.Center)
    }
    .width('100%')
    .padding({ left: 14, right: 14, top: 8, bottom: 8 })
    .alignItems(VerticalAlign.Center)
    .onClick(() => this.itemOnClick())
  }
}

export { NovelListItem }
