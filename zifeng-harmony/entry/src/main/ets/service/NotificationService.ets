/**
 * NotificationService - 系统通知推送服务
 * 规格：移动端增强-2 系统通知推送
 * 特性：章节更新通知、阅读提醒、通知渠道管理
 * 实现：基于 @kit.NotificationKit
 */
import { notificationManager } from '@kit.NotificationKit';
import { BookshelfService } from './BookshelfService';
import { Chapter } from '../model/Chapters';

const CHANNEL_UPDATE = 'novel_update';
const CHANNEL_REMINDER = 'reading_reminder';

export class NotificationService {
  static async init(): Promise<void> {
    try {
      await notificationManager.addSlot(notificationManager.SlotType.CONTENT_INFORMATION);
      await notificationManager.addSlot(notificationManager.SlotType.SOCIAL_COMMUNICATION);
    } catch (e) {
      /* 槽位可能已存在 */
    }
  }

  static async checkUpdates(): Promise<void> {
    try {
      const shelf = await BookshelfService.getFavorites();
      for (const book of shelf) {
        const latest = await NotificationService.fetchLatestChapter(
          book.bookUrl,
          book.sourceUrl ?? '',
        );
        if (latest && latest.title !== book.latestChapter) {
          await NotificationService.sendUpdateNotification(
            book.title,
            latest.title,
            book.bookUrl,
          );
          await BookshelfService.updateLastChapter(book.bookUrl, latest.title);
        }
      }
    } catch (e) {
      /* 静默失败 */
    }
  }

  private static async fetchLatestChapter(bookUrl: string, sourceUrl: string): Promise<Chapter | undefined> {
    const mod = await import('./BookService');
    const BookService = mod.BookService;
    const chapters = await BookService.getChapterList(bookUrl, sourceUrl);
    return chapters[chapters.length - 1];
  }

  static async sendUpdateNotification(
    bookTitle: string,
    chapterTitle: string,
    bookUrl: string,
  ): Promise<void> {
    const request: notificationManager.NotificationRequest = {
      id: Math.floor(Math.random() * 100000),
      notificationSlotType: notificationManager.SlotType.CONTENT_INFORMATION,
      label: CHANNEL_UPDATE,
      content: {
        notificationContentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
        normal: {
          title: `${bookTitle} 更新了`,
          text: chapterTitle,
          additionalText: '紫枫免费小说',
        },
      } as notificationManager.NotificationContent,
    };
    await notificationManager.publish(request);
  }

  static async sendReadingReminder(): Promise<void> {
    const unread = await BookshelfService.getUnreadBooks();
    if (unread.length === 0) return;
    const book = unread[0];
    const request: notificationManager.NotificationRequest = {
      id: 999001,
      notificationSlotType: notificationManager.SlotType.SOCIAL_COMMUNICATION,
      label: CHANNEL_REMINDER,
      content: {
        notificationContentType: notificationManager.ContentType.NOTIFICATION_CONTENT_BASIC_TEXT,
        normal: {
          title: '继续阅读',
          text: `《${book.title}》等 ${unread.length} 本书待续读`,
          additionalText: '点击继续阅读',
        },
      } as notificationManager.NotificationContent,
    };
    await notificationManager.publish(request);
  }

  static async cancelAll(): Promise<void> {
    await notificationManager.cancelAll();
  }
}

export default NotificationService;
