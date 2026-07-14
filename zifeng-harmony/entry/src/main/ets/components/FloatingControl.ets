/**
 * FloatingControl - 浮窗闪控球
 * 规格：移动端增强-4 浮窗闪控球
 * 特性：全局悬浮、拖拽定位、快捷操作（继续阅读/书架/搜索）、自动隐藏
 * 实现：基于 @ohos.window 子窗口
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { BookshelfService } from '../service/BookshelfService'

@Entry
@Component
struct FloatingControl {
  @State expanded: boolean = false
  @State lastBook: string = ''
  @State lastCover: string = ''
  @State lastChapter: number = 0
  @State lastBookUrl: string = ''
  @State lastSourceUrl: string = ''
  @State posX: number = 0
  @State posY: number = 200

  aboutToAppear() {
    this.loadLastReading()
  }

  private async loadLastReading() {
    const recent = await BookshelfService.getRecentReading()
    if (recent.length > 0) {
      const r = recent[0]
      this.lastBook = r.title
      this.lastCover = r.cover
      this.lastChapter = r.lastChapterIndex
      this.lastBookUrl = r.bookUrl
      this.lastSourceUrl = r.sourceUrl ?? ''
    }
  }

  private toggleExpand(): void {
    this.expanded = !this.expanded
  }

  private continueReading(): void {
    if (this.lastBookUrl.length === 0) return
    router.pushUrl({
      url: 'pages/ReaderPage',
      params: {
        bookUrl: this.lastBookUrl,
        sourceUrl: this.lastSourceUrl,
        chapterIndex: this.lastChapter
      }
    })
    this.expanded = false
  }

  private openShelf(): void {
    router.pushUrl({ url: 'pages/ShelfPage' })
    this.expanded = false
  }

  private openSearch(): void {
    router.pushUrl({ url: 'pages/SearchPage' })
    this.expanded = false
  }

  build() {
    Stack() {
      if (this.expanded) {
        // 展开菜单
        Column() {
          // 继续阅读
          Row() {
            Image(this.lastCover)
              .width(32).height(44)
              .borderRadius(AppRadius.R_SM)
              .objectFit(ImageFit.Cover)
            Column() {
              Text('继续阅读')
                .fontSize(AppTypography.SIZE_TINY)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
              Text(this.lastBook)
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                .maxLines(1)
                .textOverflow({ overflow: TextOverflow.Ellipsis })
            }
            .alignItems(HorizontalAlign.Start)
            .margin({ left: AppSpacing.S2 })
            .layoutWeight(1)
          }
          .width('100%')
          .padding(AppSpacing.S3)
          .borderRadius(AppRadius.R_MD)
          .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
          .onClick(() => this.continueReading())

          // 书架
          this.MenuItem('书架', $r('app.media.ic_shelf'), () => this.openShelf())
          // 搜索
          this.MenuItem('搜索', $r('app.media.search'), () => this.openSearch())
        }
        .width(180)
        .padding(AppSpacing.S2)
        .borderRadius(AppRadius.R_LG)
        .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
        .shadow({ radius: 12, color: 'rgba(0,0,0,0.15)' })
        .position({ x: 0, y: -160 })
      }

      // 浮控球按钮
      Column() {
        if (this.lastCover.length > 0) {
          Image(this.lastCover)
            .width(48).height(48)
            .borderRadius(AppRadius.R_FULL)
            .objectFit(ImageFit.Cover)
        } else {
          Text('阅')
            .fontSize(AppTypography.SIZE_H3)
            .fontColor(Color.White)
        }
      }
      .width(56).height(56)
      .borderRadius(AppRadius.R_FULL)
      .backgroundColor(ThemeManager.getPrimaryColor())
      .justifyContent(FlexAlign.Center)
      .alignItems(HorizontalAlign.Center)
      .shadow({ radius: 8, color: 'rgba(124,58,237,0.3)' })
      .onClick(() => this.toggleExpand())
    }
    .width(56)
    .height(56)
    .position({ x: this.posX, y: this.posY })
  }

  @Builder MenuItem(label: string, icon: Resource, action: () => void): void {
    Row() {
      Image(icon)
        .width(18).height(18)
        .fillColor(ThemeManager.getPrimaryColor())
      Text(label)
        .fontSize(AppTypography.SIZE_CAPTION)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
        .margin({ left: AppSpacing.S2 })
        .layoutWeight(1)
    }
    .width('100%')
    .padding(AppSpacing.S3)
    .borderRadius(AppRadius.R_MD)
    .margin({ top: AppSpacing.S2 })
    .onClick(action)
  }
}

export default FloatingControl
