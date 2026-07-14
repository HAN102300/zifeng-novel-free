/**
 * EntryAbility - 应用入口 Ability
 * 集成：主题初始化、认证恢复、通知服务、快捷菜单、沉浸式窗口配置
 */
import { AbilityConstant, UIAbility, Want, Configuration } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';
import { router } from '@kit.ArkUI';
import { BusinessError } from '@kit.BasicServicesKit';
import { DbTableFieldType, DbUtil } from '@abner/datastore'
import { relationalStore } from '@kit.ArkData';
import { AuthManager } from '../service/AuthManager';
import { ThemeManager } from '../service/ThemeManager';
import { NotificationService } from '../service/NotificationService';
import { ShortcutService } from '../service/ShortcutService';

export default class EntryAbility extends UIAbility {
  async onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): Promise<void> {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onCreate');

    // 1. 初始化主题（从 AppStorage 恢复用户偏好）
    ThemeManager.init();

    // 2. 初始化认证管理器（恢复登录态）
    await AuthManager.getInstance().init(this.context);

    // 3. 初始化通知渠道
    await NotificationService.init();

    // 4. 发布桌面快捷菜单
    await ShortcutService.publishShortcuts();

    hilog.info(0x0000, 'testTag', '%{public}s', 'EntryAbility onCreate completed');
  }

  onDestroy(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    // 初始化关系型数据库实例
    let storeConfig: relationalStore.StoreConfig = {
      name: 'Novel.db',
      securityLevel: relationalStore.SecurityLevel.S1,
      customDir: 'zifeng/DataBase'
    }
    DbUtil.getInstance().init(this.context, storeConfig)

    windowStage.loadContent('pages/StartPage', (err) => {
      if (err.code) {
        hilog.error(0x0000, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err) ?? '');
        return;
      }
      hilog.info(0x0000, 'testTag', '%{public}s', 'Succeeded in loading the content.');

      let windowClass: window.Window = windowStage.getMainWindowSync();
      // 设置窗口全屏
      windowClass.setWindowLayoutFullScreen(true)
      // 设置状态栏和导航条隐藏
      windowClass.setSpecificSystemBarEnabled('status', false)
      windowClass.setSpecificSystemBarEnabled('navigation', false)
        .then(() => {
          console.info('Succeeded in setting the status bar to be invisible.');
        })
        .catch((err: BusinessError) => {
          console.error(`Failed to set the status bar to be invisible. Code is ${err.code}, message is ${err.message}`);
        });

      // 获取布局避让遮挡的区域
      let type = window.AvoidAreaType.TYPE_NAVIGATION_INDICATOR;
      let avoidArea = windowClass.getWindowAvoidArea(type);
      let bottomRectHeight = avoidArea.bottomRect.height;
      AppStorage.setOrCreate('bottomRectHeight', bottomRectHeight);
      let type1 = window.AvoidAreaType.TYPE_SYSTEM
      let avoidArea1 = windowClass.getWindowAvoidArea(type1);
      let topRectHeight = avoidArea1.topRect.height
      AppStorage.setOrCreate('topRectHeight', topRectHeight)
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
  }

  onConfigurationUpdate(newConfig: Configuration): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onConfigurationUpdate');
  }

  onNewWant(want: Want): void {
    const uri = want.uri;
    if (uri) {
      const target = ShortcutService.handleIntent(uri);
      if (target) {
        setTimeout(() => {
          if (target.includes('?continue=1')) {
            router.pushUrl({
              url: target.split('?')[0],
              params: { continue: true }
            });
          } else {
            router.pushUrl({ url: target });
          }
        }, 300);
      }
    }
  }

  onForeground(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onForeground');
    // 应用回到前台：检查更新
    NotificationService.checkUpdates();
  }

  onBackground(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onBackground');
  }
}
