/**
 * SettingsPage - 应用设置页
 * 规格：§5.2 应用设置
 * 特性：主题色切换、深色模式、字号预览、阅读设置、缓存清理、关于
 * 约束：启用 prefers-reduced-motion 性能降级策略
 */
import { router } from '@kit.ArkUI'
import { AppTypography, AppSpacing, AppRadius } from '../common/DesignSystem'
import { ThemeManager } from '../service/ThemeManager'
import { GlassCard } from '../common/GlassCard'
import { BackButton } from '../common/BackButton'
import { ThemeSelector } from '../components/ThemeSelector'
import { OfflineCacheManager } from '../service/OfflineCacheManager'
import { promptAction } from '@kit.ArkUI'

@Entry
@Component
struct SettingsPage {
  @State currentTheme: string = 'purple'
  @State isDarkMode: boolean = false
  @State reduceMotion: boolean = false
  @State fontSize: number = 18
  @State lineHeight: number = 1.8
  @State cacheSize: string = '计算中...'

  aboutToAppear() {
    this.loadSettings()
    this.calculateCache()
  }

  private loadSettings() {
    this.currentTheme = AppStorage.get<string>('currentTheme') ?? 'purple'
    this.isDarkMode = AppStorage.get<boolean>('isDarkMode') ?? false
    this.reduceMotion = AppStorage.get<boolean>('reduceMotion') ?? false
    const readerRaw = AppStorage.get<string>('reader_settings')
    if (readerRaw) {
      try {
        const reader = JSON.parse(readerRaw) as Record<string, number>
        this.fontSize = reader['fontSize'] ?? 18
        this.lineHeight = reader['lineHeight'] ?? 1.8
      } catch (e) { /* 默认 */ }
    }
  }

  private async calculateCache() {
    const size = await OfflineCacheManager.getCacheSize()
    this.cacheSize = size < 1024 * 1024
      ? `${Math.round(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  private selectTheme(key: string) {
    this.currentTheme = key
    ThemeManager.setTheme(key)
    AppStorage.setOrCreate<string>('currentTheme', key)
  }

  private toggleDarkMode(val: boolean) {
    this.isDarkMode = val
    ThemeManager.setDarkMode(val)
    AppStorage.setOrCreate<boolean>('isDarkMode', val)
  }

  private toggleReduceMotion(val: boolean) {
    this.reduceMotion = val
    AppStorage.setOrCreate<boolean>('reduceMotion', val)
    promptAction.showToast({
      message: val ? '已开启降级动画（低端设备推荐）' : '已关闭降级动画'
    })
  }

  private async clearCache() {
    promptAction.showDialog({
      title: '清除缓存',
      message: `当前缓存：${this.cacheSize}，确定清除？`,
      buttons: [
        { text: '取消', color: ThemeManager.getNeutral('TEXT_SECONDARY') },
        { text: '确定', color: ThemeManager.getAccent('Rose') }
      ]
    }).then(async (res) => {
      if (res.index === 1) {
        await OfflineCacheManager.clearAll()
        this.calculateCache()
        promptAction.showToast({ message: '缓存已清除' })
      }
    })
  }

  build() {
    Column() {
      // 顶部栏
      Row() {
        BackButton()
        Text('应用设置')
          .fontSize(AppTypography.SIZE_H2)
          .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
          .layoutWeight(1)
          .margin({ left: AppSpacing.S2 })
      }
      .width('100%')
      .padding({ left: AppSpacing.S4, right: AppSpacing.S4, top: AppSpacing.S4, bottom: AppSpacing.S3 })

      Scroll() {
        Column() {
          // 主题色选择
          GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S3 }) {
            Column() {
              Text('主题色彩')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              ThemeSelector({
                currentTheme: this.currentTheme,
                onSelect: (key: string): void => this.selectTheme(key)
              })
            }
            .alignItems(HorizontalAlign.Start)
          }

          // 显示设置
          GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S3 }) {
            Column() {
              Text('显示设置')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              this.SettingRow('深色模式', this.isDarkMode, (v: boolean): void => this.toggleDarkMode(v))
              this.SettingRow('动画降级（低端设备）', this.reduceMotion, (v: boolean): void => this.toggleReduceMotion(v))
            }
            .alignItems(HorizontalAlign.Start)
          }

          // 阅读设置预览
          GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S3 }) {
            Column() {
              Text('阅读设置预览')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              Text('字号 ' + this.fontSize + 'vp · 行距 ' + this.lineHeight.toFixed(1))
                .fontSize(this.fontSize)
                .lineHeight(this.fontSize * this.lineHeight)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                .margin({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
                .backgroundColor(ThemeManager.getNeutral('BG_ELEVATED'))
                .padding(AppSpacing.S4)
                .borderRadius(AppRadius.R_MD)
              Text('在阅读页可调整字号、行距和背景主题')
                .fontSize(AppTypography.SIZE_CAPTION)
                .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
            }
            .alignItems(HorizontalAlign.Start)
          }

          // 存储管理
          GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S3 }) {
            Row() {
              Column() {
                Text('清除缓存')
                  .fontSize(AppTypography.SIZE_BODY)
                  .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
                Text(`当前：${this.cacheSize}`)
                  .fontSize(AppTypography.SIZE_CAPTION)
                  .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
                  .margin({ top: AppSpacing.S1 })
              }
              .alignItems(HorizontalAlign.Start)
              .layoutWeight(1)
              Text('清除')
                .fontSize(AppTypography.SIZE_BODY_SMALL)
                .fontColor(ThemeManager.getAccent('Rose'))
                .onClick(() => this.clearCache())
            }
          }

          // 关于
          GlassCard({ cardPadding: AppSpacing.S4, cardMarginLeft: AppSpacing.S4, cardMarginRight: AppSpacing.S4, cardMarginBottom: AppSpacing.S8 }) {
            Column() {
              Text('关于')
                .fontSize(AppTypography.SIZE_H4)
                .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
              this.AboutRow('版本', 'v1.0.0')
              this.AboutRow('HarmonyOS', 'API 26')
              this.AboutRow('沉浸光感', '已启用')
            }
            .alignItems(HorizontalAlign.Start)
          }
        }
      }
      .layoutWeight(1)
      .scrollBar(BarState.Auto)
    }
    .width('100%').height('100%')
    .backgroundColor(ThemeManager.getNeutral('BG_BASE'))
  }

  @Builder SettingRow(label: string, value: boolean, onChange: (v: boolean) => void) {
    Row() {
      Text(label)
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor(ThemeManager.getNeutral('TEXT_PRIMARY'))
        .layoutWeight(1)
      Toggle({ type: ToggleType.Switch, isOn: value })
        .selectedColor(ThemeManager.getPrimary(500))
        .onChange(onChange)
    }
    .width('100%')
    .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
  }

  @Builder AboutRow(label: string, value: string) {
    Row() {
      Text(label)
        .fontSize(AppTypography.SIZE_BODY)
        .fontColor(ThemeManager.getNeutral('TEXT_SECONDARY'))
        .layoutWeight(1)
      Text(value)
        .fontSize(AppTypography.SIZE_BODY_SMALL)
        .fontColor(ThemeManager.getNeutral('TEXT_MUTED'))
    }
    .width('100%')
    .padding({ top: AppSpacing.S3, bottom: AppSpacing.S3 })
  }
}

export default SettingsPage
