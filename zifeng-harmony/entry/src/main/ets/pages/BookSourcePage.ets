/**
 * BookSourcePage - 书源管理页
 * 规格：§5.3 书源管理
 * 特性：书源列表、启用/禁用、新增、编辑、排序、导入导出
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { LoadingSkel } from '../common/LoadingSkel'
import { BookService, BookSource } from '../service/BookService'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct BookSourcePage {
  @State sources: BookSource[] = []
  @State isLoading: boolean = true
  @State showAddSheet: boolean = false
  @State editName: string = ''
  @State editUrl: string = ''

  aboutToAppear() {
    this.loadSources()
  }

  private async loadSources() {
    try {
      this.sources = await BookService.getBookSources()
    } catch (e) {
      promptAction.showToast({ message: '加载书源失败' })
    } finally {
      this.isLoading = false
    }
  }

  private async toggleSource(src: BookSource) {
    src.enabled = !src.enabled
    await BookService.updateBookSource(src)
    this.loadSources()
  }

  private async deleteSource(src: BookSource) {
    promptAction.showDialog({
      title: '删除书源',
      message: `确定删除「${src.name}」？`,
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '删除', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await BookService.deleteBookSource(src.id)
        promptAction.showToast({ message: '已删除' })
        this.loadSources()
      }
    })
  }

  private openAddSheet() {
    this.editName = ''
    this.editUrl = ''
    this.showAddSheet = true
  }

  private async saveSource() {
    if (this.editName.length === 0 || this.editUrl.length === 0) {
      promptAction.showToast({ message: '请填写完整' })
      return
    }
    await BookService.addBookSource({ name: this.editName, apiUrl: this.editUrl, enabled: true })
    this.showAddSheet = false
    promptAction.showToast({ message: '已添加' })
    this.loadSources()
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('书源管理')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
        Text('添加')
          .fontSize(AppTypography.SIZE_BODY_SMALL)
          .fontColor(ThemeManager.getPrimary(500))
          .onClick(() => this.openAddSheet())
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      if (this.isLoading) {
        Column() {
          ForEach([0, 1, 2], () => { LoadingSkel({ height: 72 }) })
        }
        .padding(AppSpacing.S4)
      } else {
        List({ space: AppSpacing.S3 }) {
          ForEach(this.sources, (src: BookSource) => {
            ListItem() {
              GlassCard({ padding: AppSpacing.S4 }) {
                Row() {
                  Column() {
                    Text(src.name)
                      .fontSize(AppTypography.SIZE_BODY_LARGE)
                      .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                    Text(src.apiUrl)
                      .fontSize(AppTypography.SIZE_CAPTION)
                      .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                      .margin({ top: AppSpacing.S1 })
                      .maxLines(1)
                      .textOverflow({ overflow: TextOverflow.Ellipsis })
                  }
                  .alignItems(HorizontalAlign.Start)
                  .layoutWeight(1)
                  Toggle({ type: ToggleType.Switch, isOn: src.enabled })
                    .selectedColor(ThemeManager.getPrimary(500))
                    .onChange(() => this.toggleSource(src))
                  Text('删除')
                    .fontSize(AppTypography.SIZE_CAPTION)
                    .fontColor(ThemeManager.getAccent('Rose'))
                    .margin({ left: AppSpacing.S3 })
                    .onClick(() => this.deleteSource(src))
                }
              }
            }
          })
        }
        .layoutWeight(1)
        .padding({ left: AppSpacing.S4, right: AppSpacing.S4 })
        .scrollBar(BarState.Auto)
      }
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
    .bindSheet($$this.showAddSheet, this.AddSheetBuilder(), {
      height: SheetSize.MEDIUM,
      dragBar: true
    })
  }

  @Builder AddSheetBuilder() {
    Column() {
      Text('添加书源')
        .fontSize(AppTypography.SIZE_H3)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
        .margin({ bottom: AppSpacing.S4 })
      TextInput({ placeholder: '书源名称', text: this.editName })
        .fontSize(AppTypography.SIZE_BODY)
        .onChange((v: string) => this.editName = v)
        .margin({ bottom: AppSpacing.S3 })
        .borderRadius(AppRadius.R_MD)
      TextInput({ placeholder: 'API 地址', text: this.editUrl })
        .fontSize(AppTypography.SIZE_BODY)
        .onChange((v: string) => this.editUrl = v)
        .margin({ bottom: AppSpacing.S4 })
        .borderRadius(AppRadius.R_MD)
      Button('保存')
        .type(ButtonType.Capsule)
        .width('100%')
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor(Color.White)
        .backgroundColor(ThemeManager.getPrimary(500))
        .onClick(() => this.saveSource())
    }
    .padding(AppSpacing.S6)
    .width('100%')
  }
}

export default BookSourcePage
