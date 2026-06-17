import { AbilityConstant, UIAbility, Want, Configuration } from '@kit.AbilityKit';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { window } from '@kit.ArkUI';
import { BusinessError } from '@kit.BasicServicesKit';
import { DbTableFieldType, DbTableModel, DbUtil} from '@abner/datastore'
import { relationalStore } from '@kit.ArkData';
import { AuthManager } from '../service/AuthManager';
import { ThemeManager } from '../service/ThemeManager';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onCreate');
    AuthManager.getInstance().init(this.context);
    ThemeManager.getInstance().init(this.context);
  }

  onDestroy(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    // Main window is created, set main page for this ability
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    //初始化关系型数据库实例,并且创建数据库
    let storeConfig:relationalStore.StoreConfig = {
      name: 'Novel.db',
      securityLevel: relationalStore.SecurityLevel.S1,
      customDir: 'zifeng/DataBase'
    }
    DbUtil.getInstance().init(this.context,storeConfig)


    windowStage.loadContent('pages/StartPage', (err) => {
      if (err.code) {
        hilog.error(0x0000, 'testTag', 'Failed to load the content. Cause: %{public}s', JSON.stringify(err) ?? '');
        return;
      }
      hilog.info(0x0000, 'testTag', 'Succeeded in loading the content.');

      let windowClass: window.Window = windowStage.getMainWindowSync(); // 获取应用主窗口
      // 1. 设置窗口全屏
      windowClass.setWindowLayoutFullScreen(true)
      // 2. 设置状态栏和导航条隐藏
      windowClass.setSpecificSystemBarEnabled('status', false)
      windowClass.setSpecificSystemBarEnabled('navigation',false)
        .then(() => {
          console.info('Succeeded in setting the status bar to be invisible.');
        })
        .catch((err: BusinessError) => {
          console.error(`Failed to set the status bar to be invisible. Code is ${err.code}, message is ${err.message}`);
        });

      // 3. 获取布局避让遮挡的区域
      let type = window.AvoidAreaType.TYPE_NAVIGATION_INDICATOR; // 以导航条避让为例
      let avoidArea = windowClass.getWindowAvoidArea(type);
      let bottomRectHeight = avoidArea.bottomRect.height; // 获取到导航条区域的高度
      AppStorage.setOrCreate('bottomRectHeight', bottomRectHeight);
      let type1 = window.AvoidAreaType.TYPE_SYSTEM
      let avoidArea1 = windowClass.getWindowAvoidArea(type1);
      let topRectHeight = avoidArea1.topRect.height
      AppStorage.setOrCreate('topRectHeight',topRectHeight)
    });
  }

  onWindowStageDestroy(): void {
    // Main window is destroyed, release UI related resources
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
  }

  onConfigurationUpdate(newConfig: Configuration): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onConfigurationUpdate');
    ThemeManager.getInstance().onConfigurationUpdate(newConfig);
  }

  onForeground(): void {
    // Ability has brought to foreground
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onForeground');
  }

  onBackground(): void {
    // Ability has back to background
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onBackground');
  }
}
