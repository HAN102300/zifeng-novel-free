/**
 * ShortcutService - 桌面快捷菜单服务
 * 规格：移动端增强-5 桌面快捷菜单
 * 特性：桌面长按应用图标弹出快捷菜单（继续阅读/书架/搜索/书源）
 * 实现：基于 @ohos.shortcut 桌面快捷方式
 */
import shortcut from "@ohos.shortcut";

interface ShortcutItem {
  id: string;
  label: string;
  icon: Resource;
  intent: string;
}

export class ShortcutService {
  private static items: ShortcutItem[] = [
    {
      id: "continue_reading",
      label: "继续阅读",
      icon: $r("app.media.ic_shortcut_read"),
      intent: "want://continue_reading",
    },
    {
      id: "open_shelf",
      label: "我的书架",
      icon: $r("app.media.ic_shortcut_shelf"),
      intent: "want://open_shelf",
    },
    {
      id: "open_search",
      label: "搜索小说",
      icon: $r("app.media.ic_shortcut_search"),
      intent: "want://open_search",
    },
    {
      id: "open_source",
      label: "书源管理",
      icon: $r("app.media.ic_shortcut_source"),
      intent: "want://open_source",
    },
  ];

  static async publishShortcuts(): Promise<void> {
    try {
      const shortcuts = this.items.map((item) => ({
        id: item.id,
        label: item.label,
        icon: item.icon,
        wants: [
          {
            bundleName: "com.zifeng.novel",
            abilityName: "EntryAbility",
            uri: item.intent,
          },
        ],
      }));
      await shortcut.addShortcuts(shortcuts);
    } catch (e) {
      /* 静默失败 */
    }
  }

  static async updateShortcuts(): Promise<void> {
    try {
      await shortcut.updateShortcuts(
        this.items.map((item) => ({
          id: item.id,
          label: item.label,
          icon: item.icon,
          wants: [
            {
              bundleName: "com.zifeng.novel",
              abilityName: "EntryAbility",
              uri: item.intent,
            },
          ],
        })),
      );
    } catch (e) {
      /* 静默失败 */
    }
  }

  static async removeShortcuts(): Promise<void> {
    try {
      await shortcut.removeShortcuts(this.items.map((i) => i.id));
    } catch (e) {
      /* 静默失败 */
    }
  }

  static handleIntent(uri: string): string | null {
    switch (uri) {
      case "want://continue_reading":
        return "pages/ReaderPage?continue=1";
      case "want://open_shelf":
        return "pages/ShelfPage";
      case "want://open_search":
        return "pages/SearchPage";
      case "want://open_source":
        return "pages/BookSourcePage";
      default:
        return null;
    }
  }
}

export default ShortcutService;
