/**
 * 设置页面
 * 适配 HarmonyOS 26.0.0：玻璃质感、渐变背景、光粒子特效
 */
import { router } from '@kit.ArkUI'
import { preferences } from '@kit.ArkData'
import { ThemeManager } from '../service/ThemeManager'
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem'
import { LightOrbs, FloatingParticles } from '../common/ParticleEffects'

@Entry
@Component
struct SettingsPage {
  @State fontSize: number = 18
  @State lineHeight: number = 1.5
  @State enableCloudSync: boolean = true
  @State enableNotification: boolean = true
  @State autoDownload: boolean = false
  @State isDarkMode: boolean = false
  @State contentOpacity: number = 0
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'
  private context = getContext(this)
  private themeManager = ThemeManager.getInstance()

  aboutToAppear() {
    this.loadSettings()
    this.isDarkMode = this.themeManager.isDarkMode

    // 入场动画
    animateTo({ duration: 600, curve: Curve.FastOutSlowIn }, () => {
      this.contentOpacity = 1
    })
  }

  async loadSettings() {
    try {
      const pref = await preferences.getPreferences(this.context, 'settings')
      this.fontSize = await pref.get('fontSize', 18) as number
      this.lineHeight = await pref.get('lineHeight', 1.5) as number
      this.enableCloudSync = await pref.get('enableCloudSync', true) as boolean
      this.enableNotification = await pref.get('enableNotification', true) as boolean
      this.autoDownload = await pref.get('autoDownload', false) as boolean
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  async saveSetting(key: string, value: number | boolean) {
    try {
      const pref = await preferences.getPreferences(this.context, 'settings')
      await pref.put(key, value)
      await pref.flush()
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  clearCache() {
    AlertDialog.show({
      title: '确认清除',
      message: '确定要清除所有缓存数据吗？',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '确定',
        action: async () => {
          try {
            const pref = await preferences.getPreferences(this.context, 'cache')
            await pref.clear()
            await pref.flush()
            AlertDialog.show({
              title: '提示',
              message: '缓存已清除',
              confirm: {
                value: '确定',
                action: () => {}
              }
            })
          } catch (error) {
            console.error('清除缓存失败:', error)
          }
        }
      }
    })
  }

  build() {
    Stack() {
      // 背景渐变
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

      // 背景光斑
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      // 飘浮粒子
      FloatingParticles({
        count: 8,
        isDarkMode: this.isDarkMode,
        enableAnimation: true
      })

      Column() {
        Column()
          .width('100%')
          .height(this.topRectHeight)
        Row() {
          Image($r('app.media.back'))
            .width(24)
            .height(24)
            .padding(4)
            .fillColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            .borderRadius(14)
            .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)')
            .backgroundBlurStyle(BlurStyle.Regular, {
              adaptiveColor: AdaptiveColor.DEFAULT
            })
            .border({
              width: 1,
              color: this.isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.5)'
            })
            .onClick(() => router.back())

          Blank()

          Row() {
            Text('⚙️')
              .fontSize(16)
              .margin({ right: 6 })
            Text('设置')
              .fontSize(17)
              .fontWeight(FontWeight.Bold)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
          }

          Blank()

          Column().width(32).height(32)
        }
        .width('100%')
        .height(56)
        .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
        .backgroundColor(this.isDarkMode ? 'rgba(20, 20, 30, 0.88)' : 'rgba(255, 255, 255, 0.88)')
        .backgroundBlurStyle(BlurStyle.Thick, {
          adaptiveColor: AdaptiveColor.DEFAULT
        })
        .border({
          width: { bottom: 0.5 },
          color: this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'
        })

        Scroll() {
          Column({ space: AppSpacing.MD }) {
            // 阅读设置
            SettingsCard({ icon: '📖', title: '阅读设置', isDarkMode: this.isDarkMode }) {
              Column() {
                // 字体大小
                Column() {
                  Row() {
                    Text('字体大小')
                      .fontSize(15)
                      .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                      .layoutWeight(1)

                    Text(`${this.fontSize}`)
                      .fontSize(15)
                      .fontColor(AppColors.PRIMARY_LIGHT)
                      .fontWeight(FontWeight.Medium)
                      .margin({ right: AppSpacing.SM })
                  }
                  .width('100%')
                  .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })

                  Slider({
                    value: this.fontSize,
                    min: 12,
                    max: 28,
                    step: 1
                  })
                    .blockColor(AppColors.PRIMARY_LIGHT)
                    .trackColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0')
                    .selectedColor(AppColors.PRIMARY)
                    .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
                    .onChange((value: number) => {
                      this.fontSize = Math.round(value)
                      this.saveSetting('fontSize', this.fontSize)
                    })

                  this.divider()

                  // 行间距
                  Row() {
                    Text('行间距')
                      .fontSize(15)
                      .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
                      .layoutWeight(1)

                    Text(`${this.lineHeight.toFixed(1)}`)
                      .fontSize(15)
                      .fontColor(AppColors.PRIMARY_LIGHT)
                      .fontWeight(FontWeight.Medium)
                      .margin({ right: AppSpacing.SM })
                  }
                  .width('100%')
                  .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD })

                  Slider({
                    value: this.lineHeight,
                    min: 1.0,
                    max: 2.5,
                    step: 0.1
                  })
                    .blockColor(AppColors.PRIMARY_LIGHT)
                    .trackColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0')
                    .selectedColor(AppColors.PRIMARY)
                    .padding({ left: AppSpacing.LG, right: AppSpacing.LG, bottom: AppSpacing.MD })
                    .onChange((value: number) => {
                      this.lineHeight = Math.round(value * 10) / 10
                      this.saveSetting('lineHeight', this.lineHeight)
                    })
                }
              }
            }

            // 显示设置
            SettingsCard({ icon: '🎨', title: '显示设置', isDarkMode: this.isDarkMode }) {
              this.settingItem('深色模式', this.isDarkMode, AppColors.ACCENT_MINT, async (value: boolean) => {
                this.isDarkMode = value
                await this.themeManager.toggleDarkMode()
              })
            }

            // 账号设置
            SettingsCard({ icon: '👤', title: '账号设置', isDarkMode: this.isDarkMode }) {
              this.settingItem('云端同步', this.enableCloudSync, AppColors.PRIMARY_LIGHT, (value: boolean) => {
                this.enableCloudSync = value
                this.saveSetting('enableCloudSync', value)
              })

              this.divider()

              this.settingItem('消息通知', this.enableNotification, AppColors.ACCENT_GOLD, (value: boolean) => {
                this.enableNotification = value
                this.saveSetting('enableNotification', value)
              })

              this.divider()

              this.settingItem('自动下载', this.autoDownload, AppColors.ACCENT_MINT, (value: boolean) => {
                this.autoDownload = value
                this.saveSetting('autoDownload', value)
              })
            }

            // 其他设置
            SettingsCard({ icon: '🛠', title: '其他', isDarkMode: this.isDarkMode }) {
              this.settingAction('清除缓存', '🗑', () => {
                this.clearCache()
              })

              this.divider()

              this.settingAction('关于我们', 'v1.0.0', () => {
                AlertDialog.show({
                  title: '关于紫枫免费小说',
                  message: '版本：v1.0.0\n海量书源 · 聚合搜索 · 永久免费',
                  confirm: {
                    value: '确定',
                    action: () => {}
                  }
                })
              })
            }
          }
          .width('100%')
          .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: 40 })
          .opacity(this.contentOpacity)
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 开关项
   */
  @Builder
  settingItem(label: string, value: boolean, color: string, onChange: (val: boolean) => void) {
    Row() {
      Text(label)
        .fontSize(15)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .layoutWeight(1)

      Toggle({ type: ToggleType.Switch, isOn: value })
        .selectedColor(color)
        .onChange((isOn: boolean) => {
          onChange(isOn)
        })
    }
    .width('100%')
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.MD })
  }

  /**
   * 操作项
   */
  @Builder
  settingAction(label: string, rightText: string, onClick: () => void) {
    Row() {
      Text(label)
        .fontSize(15)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .layoutWeight(1)

      if (rightText) {
        Text(rightText)
          .fontSize(13)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .margin({ right: 6 })
      }

      Text('›')
        .fontSize(18)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
    }
    .width('100%')
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.MD, bottom: AppSpacing.MD })
    .onClick(() => onClick())
  }

  /**
   * 分割线
   */
  @Builder
  divider() {
    Column()
      .width('100%')
      .height(0.5)
      .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)')
      .margin({ left: AppSpacing.LG, right: AppSpacing.LG })
  }
}

/**
 * 设置卡片组件（玻璃质感卡片）
 */
@Component
struct SettingsCard {
  icon: string = ''
  title: string = ''
  isDarkMode: boolean = false
  @BuilderParam content: () => void

  build() {
    Column() {
      Row() {
        Text(this.icon)
          .fontSize(14)
          .margin({ right: 6 })
        Text(this.title)
          .fontSize(13)
          .fontWeight(FontWeight.Medium)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .letterSpacing(1)
      }
      .width('100%')
      .padding({ left: AppSpacing.XS, bottom: AppSpacing.SM })

      Column() {
        this.content()
      }
      .width('100%')
      .borderRadius(AppRadius.LARGE)
      .backgroundColor(this.isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.65)')
      .backgroundBlurStyle(BlurStyle.Regular, {
        adaptiveColor: AdaptiveColor.DEFAULT
      })
      .border({
        width: 1,
        color: this.isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'
      })
      .shadow({
        radius: 12,
        color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(114, 46, 209, 0.06)',
        offsetY: 4
      })
    }
    .width('100%')
  }
}
