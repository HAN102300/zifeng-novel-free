/**
 * 用户信息页面
 * 展示和编辑用户个人信息，包含头像、用户名、邮箱等
 * 适配 HarmonyOS 26.0.0：玻璃质感、渐变 Hero 区、光粒子特效
 */
import { AuthService } from '../service/AuthService';
import { AuthManager, UserInfo } from '../service/AuthManager';
import { router } from '@kit.ArkUI';
import { AppColors, AppSpacing, AppRadius } from '../common/DesignSystem';
import { LightOrbs, FloatingParticles, GlowPulse } from '../common/ParticleEffects';
import { ThemeManager } from '../service/ThemeManager';

/**
 * 编辑对话框
 */
@CustomDialog
struct EditDialog {
  controller: CustomDialogController
  @State editValue: string = ''
  title: string = ''
  onConfirm: (value: string) => void = () => {}

  build() {
    Column() {
      Text(`修改${this.title}`)
        .fontSize(18)
        .fontWeight(FontWeight.Bold)
        .margin({ bottom: 20 })

      TextInput({ text: this.editValue, placeholder: `请输入${this.title}` })
        .width('100%')
        .height(44)
        .borderRadius(10)
        .onChange((value: string) => {
          this.editValue = value
        })

      Row({ space: 12 }) {
        Button('取消')
          .layoutWeight(1)
          .height(40)
          .borderRadius(20)
          .backgroundColor('#f0f0f0')
          .fontColor('#666666')
          .onClick(() => {
            this.controller.close()
          })

        Button('确定')
          .layoutWeight(1)
          .height(40)
          .borderRadius(20)
          .linearGradient({
            angle: 135,
            colors: [[AppColors.PRIMARY_LIGHT, 0.0], [AppColors.PRIMARY, 1.0]]
          })
          .fontColor('#ffffff')
          .onClick(() => {
            this.onConfirm(this.editValue)
            this.controller.close()
          })
      }
      .width('100%')
      .margin({ top: 20 })
    }
    .padding(24)
    .borderRadius(16)
    .backgroundColor('#ffffff')
  }
}

@Entry
@Component
struct UserInfoPage {
  @State userInfo: UserInfo | null = null;
  @State isLoading: boolean = true;
  @State isEditing: boolean = false;
  @State editUsername: string = '';
  @State editEmail: string = '';
  @State usernameError: string = '';
  @State emailError: string = '';
  @State isSaving: boolean = false;
  @State isDarkMode: boolean = false;
  @State contentOpacity: number = 0;
  @State heroOpacity: number = 0;
  @State heroScale: number = 0.95;
  @State avatarScale: number = 0.8;
  topRectHeight: string = AppStorage.get<number>('topRectHeight') + 'px'

  private authService = AuthService.getInstance();
  private authManager = AuthManager.getInstance();
  private themeManager = ThemeManager.getInstance();
  private editDialogController: CustomDialogController | null = null;

  aboutToAppear() {
    this.isDarkMode = this.themeManager.isDarkMode;
    this.loadUserInfo();

    // 入场动画
    animateTo({ duration: 700, curve: Curve.FastOutSlowIn }, () => {
      this.heroOpacity = 1
      this.heroScale = 1
      this.avatarScale = 1
    })
    setTimeout(() => {
      animateTo({ duration: 500, curve: Curve.EaseOut }, () => {
        this.contentOpacity = 1
      })
    }, 200)
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

      // 背景光斑与粒子
      LightOrbs({
        count: 2,
        isDarkMode: this.isDarkMode
      })

      FloatingParticles({
        count: 8,
        isDarkMode: this.isDarkMode,
        enableAnimation: true
      })

      Column() {
        Column()
          .width('100%')
          .height(this.topRectHeight)

        if (this.isLoading) {
          // 加载中
          Column() {
            LoadingProgress()
              .width(48)
              .height(48)
              .color(AppColors.PRIMARY_LIGHT)

            Text('加载中...')
              .fontSize(14)
              .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
              .margin({ top: AppSpacing.MD })
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.Center)
        } else if (this.userInfo) {
          // 顶部导航栏（玻璃质感）
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
              .onClick(() => {
                router.back();
              })

            Blank()

            Row() {
              Text('👤')
                .fontSize(16)
                .margin({ right: 6 })
              Text('个人信息')
                .fontSize(17)
                .fontWeight(FontWeight.Bold)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
            }

            Blank()

            if (this.userInfo) {
              Text(this.isEditing ? '保存' : '编辑')
                .fontSize(14)
                .fontColor(AppColors.PRIMARY_LIGHT)
                .fontWeight(FontWeight.Medium)
                .padding({ left: 12, right: 12, top: 6, bottom: 6 })
                .borderRadius(14)
                .backgroundColor(this.isDarkMode ? 'rgba(170, 59, 255, 0.15)' : 'rgba(170, 59, 255, 0.1)')
                .onClick(() => {
                  if (this.isEditing) {
                    this.handleSave();
                  } else {
                    this.startEditing();
                  }
                })
            } else {
              Column().width(56).height(28)
            }
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

          // Hero 区（渐变背景）
          Stack() {
            Column()
              .width('100%')
              .height(200)
              .linearGradient({
                angle: 135,
                colors: [
                  [AppColors.PRIMARY_GRADIENT_START, 0.0],
                  [AppColors.PRIMARY, 0.5],
                  [AppColors.PRIMARY_DARK, 1.0]
                ]
              })

            GlowPulse({
              x: '75%',
              y: '30%',
              pulseSize: 100,
              color: 'rgba(212, 165, 255, 0.3)',
              intensity: 0.2
            })

            // 头像与基础信息
            Column() {
              Stack({ alignContent: Alignment.BottomEnd }) {
                // 头像外发光
                Column()
                  .width(110)
                  .height(110)
                  .borderRadius(55)
                  .backgroundColor('rgba(255, 255, 255, 0.3)')
                  .blur(20)
                  .position({ x: -5, y: -5 })

                Image(this.userInfo.avatar || $r('app.media.me'))
                  .width(90)
                  .height(90)
                  .borderRadius(45)
                  .objectFit(ImageFit.Cover)
                  .border({
                    width: 3,
                    color: '#ffffff'
                  })
                  .shadow({
                    radius: 12,
                    color: 'rgba(0, 0, 0, 0.3)',
                    offsetY: 4
                  })

                // 编辑头像按钮
                if (this.isEditing) {
                  Column() {
                    Text('📷')
                      .fontSize(14)
                  }
                  .width(28)
                  .height(28)
                  .borderRadius(14)
                  .backgroundColor(AppColors.PRIMARY_LIGHT)
                  .justifyContent(FlexAlign.Center)
                  .alignItems(HorizontalAlign.Center)
                  .border({
                    width: 2,
                    color: '#ffffff'
                  })
                }
              }
              .scale({ x: this.avatarScale, y: this.avatarScale })

              Text(this.userInfo.username)
                .fontSize(20)
                .fontWeight(FontWeight.Bold)
                .fontColor('#ffffff')
                .margin({ top: AppSpacing.MD })
                .shadow({
                  radius: 4,
                  color: 'rgba(0, 0, 0, 0.2)',
                  offsetY: 1
                })

              Row({ space: 6 }) {
                Text('✉')
                  .fontSize(11)
                  .fontColor('rgba(255, 255, 255, 0.85)')
                Text(this.userInfo.email)
                  .fontSize(13)
                  .fontColor('rgba(255, 255, 255, 0.85)')
              }
              .margin({ top: 4 })
            }
            .width('100%')
            .alignItems(HorizontalAlign.Center)
            .justifyContent(FlexAlign.Center)
            .padding({ top: AppSpacing.XXXL, bottom: AppSpacing.LG })
          }
          .width('100%')
          .height(200)
          .opacity(this.heroOpacity)
          .scale({ x: this.heroScale, y: this.heroScale })

          // 信息卡片
          Scroll() {
            Column() {
              // 信息列表（玻璃质感）
              Column() {
                // 用户名
                this.infoRow('👨‍💻', '用户名', this.isEditing ? this.editUsername : this.userInfo.username, () => {
                  if (this.isEditing) {
                    this.showEditDialog('用户名', this.editUsername, (value: string) => {
                      this.editUsername = value;
                    });
                  }
                })

                this.divider()

                // 邮箱
                this.infoRow('✉️', '邮箱', this.isEditing ? this.editEmail : this.userInfo.email, () => {
                  if (this.isEditing) {
                    this.showEditDialog('邮箱', this.editEmail, (value: string) => {
                      this.editEmail = value;
                    });
                  }
                })

                this.divider()

                // 用户ID（不可编辑）
                this.infoRow('🆔', '用户ID', this.userInfo.id, () => {})
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
                radius: 16,
                color: this.isDarkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(114, 46, 209, 0.06)',
                offsetY: 4
              })
              .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: -40 })

              // 退出登录按钮（玻璃质感）
              Row() {
                Text('退出登录')
                  .fontSize(15)
                  .fontColor(AppColors.DANGER)
                  .fontWeight(FontWeight.Medium)
              }
              .width('100%')
              .height(50)
              .borderRadius(25)
              .backgroundColor(this.isDarkMode ? 'rgba(255, 77, 79, 0.12)' : 'rgba(255, 77, 79, 0.08)')
              .backgroundBlurStyle(BlurStyle.Regular, {
                adaptiveColor: AdaptiveColor.DEFAULT
              })
              .border({
                width: 1,
                color: this.isDarkMode ? 'rgba(255, 77, 79, 0.3)' : 'rgba(255, 77, 79, 0.2)'
              })
              .justifyContent(FlexAlign.Center)
              .alignItems(VerticalAlign.Center)
              .margin({ left: AppSpacing.LG, right: AppSpacing.LG, top: AppSpacing.XXL, bottom: AppSpacing.XXXXL })
              .onClick(() => {
                this.handleLogout();
              })

              // 底部信息
              Text('紫枫免费小说 v1.0.0')
                .fontSize(11)
                .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
                .width('100%')
                .textAlign(TextAlign.Center)
                .margin({ bottom: 40 })
            }
            .width('100%')
            .padding({ bottom: 20 })
            .opacity(this.contentOpacity)
          }
          .layoutWeight(1)
          .scrollBar(BarState.Off)
        }
      }
      .width('100%')
      .height('100%')
    }
    .width('100%')
    .height('100%')
  }

  /**
   * 信息行组件
   */
  @Builder
  infoRow(icon: string, label: string, value: string, onClick: () => void) {
    Row() {
      Text(icon)
        .fontSize(16)
        .margin({ right: AppSpacing.SM })

      Text(label)
        .fontSize(15)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_SECONDARY : AppColors.TEXT_SECONDARY)
        .width(70)

      Blank()

      Text(value)
        .fontSize(15)
        .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_PRIMARY : AppColors.TEXT_PRIMARY)
        .maxLines(1)
        .textOverflow({ overflow: TextOverflow.Ellipsis })
        .layoutWeight(1)
        .textAlign(TextAlign.End)

      if (this.isEditing && label !== '用户ID') {
        Text('›')
          .fontSize(18)
          .fontColor(this.isDarkMode ? AppColors.DARK_TEXT_TERTIARY : AppColors.TEXT_TERTIARY)
          .margin({ left: 6 })
      }
    }
    .width('100%')
    .height(56)
    .padding({ left: AppSpacing.LG, right: AppSpacing.LG })
    .onClick(onClick)
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
      .margin({ left: AppSpacing.LG + 26, right: AppSpacing.LG })
  }

  /**
   * 加载用户信息
   */
  private async loadUserInfo(): Promise<void> {
    this.isLoading = true;

    try {
      // 先从本地缓存获取
      const cachedInfo = await this.authManager.getUserInfo();
      if (cachedInfo) {
        this.userInfo = cachedInfo;
        this.editUsername = cachedInfo.username;
        this.editEmail = cachedInfo.email;
      }

      // 从服务器获取最新信息
      const result = await this.authService.getUserInfo();
      if (result.success && result.data) {
        this.userInfo = result.data;
        this.editUsername = result.data.username;
        this.editEmail = result.data.email;
      }
    } catch (error) {
      AlertDialog.show({
        title: '错误',
        message: '获取用户信息失败',
        primaryButton: {
          value: '确定',
          action: () => {}
        }
      });
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 开始编辑
   */
  private startEditing(): void {
    this.isEditing = true;
    this.editUsername = this.userInfo?.username || '';
    this.editEmail = this.userInfo?.email || '';
  }

  /**
   * 保存修改
   */
  private async handleSave(): Promise<void> {
    // 验证表单
    if (!this.validateEditForm()) {
      return;
    }

    this.isSaving = true;

    try {
      // TODO: 调用 API 更新用户信息
      // 暂时只更新本地缓存
      if (this.userInfo) {
        this.userInfo.username = this.editUsername;
        this.userInfo.email = this.editEmail;
        await this.authManager.saveUserInfo(this.userInfo);
      }

      this.isEditing = false;

      AlertDialog.show({
        title: '保存成功',
        message: '个人信息已更新',
        primaryButton: {
          value: '确定',
          action: () => {}
        }
      });
    } catch (error) {
      AlertDialog.show({
        title: '保存失败',
        message: '请稍后重试',
        primaryButton: {
          value: '确定',
          action: () => {}
        }
      });
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * 验证编辑表单
   */
  private validateEditForm(): boolean {
    let isValid = true;

    // 验证用户名
    if (!this.editUsername.trim()) {
      this.usernameError = '用户名不能为空';
      isValid = false;
    } else if (this.editUsername.length < 3) {
      this.usernameError = '用户名至少 3 个字符';
      isValid = false;
    }

    // 验证邮箱
    if (!this.editEmail.trim()) {
      this.emailError = '邮箱不能为空';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.editEmail)) {
        this.emailError = '请输入有效的邮箱地址';
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * 显示编辑对话框
   */
  private showEditDialog(title: string, currentValue: string, onConfirm: (value: string) => void): void {
    this.editDialogController = new CustomDialogController({
      builder: EditDialog({
        title: title,
        editValue: currentValue,
        onConfirm: onConfirm
      }),
      autoCancel: true,
      alignment: DialogAlignment.Center,
      customStyle: true
    })
    this.editDialogController.open()
  }

  /**
   * 退出登录
   */
  private async handleLogout(): Promise<void> {
    AlertDialog.show({
      title: '确认退出',
      message: '确定要退出登录吗？',
      primaryButton: {
        value: '取消',
        action: () => {}
      },
      secondaryButton: {
        value: '确定',
        action: async () => {
          await this.authService.logout();
          router.replaceUrl({ url: 'pages/LoginPage' });
        }
      }
    });
  }
}
