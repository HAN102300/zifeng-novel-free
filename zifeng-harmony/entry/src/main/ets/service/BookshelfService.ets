/**
 * BookshelfService - 书架管理服务
 * 规格：§4.3 书架页
 *
 * 接口对齐 zifeng-server：
 * - GET    /api/bookshelf        书架列表
 * - POST   /api/bookshelf        加入书架
 * - DELETE /api/bookshelf        移出书架（body: bookUrl）
 * - GET    /api/reading/history  阅读历史
 * - DELETE /api/reading/history  删除历史（body: bookUrl）
 * - POST   /api/reading/progress 保存进度
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export interface BookshelfItem extends NovelItem {
  addedAt: string;
}

export interface ReadingHistoryItem extends NovelItem {
  lastChapterIndex: number;
  lastChapterTitle: string;
  lastReadTime: string;
  progress: number; // 0-100
}

/** 别名：书架中的书籍（对齐 UI 层命名） */
export type ShelfBook = BookshelfItem;
/** 别名：阅读记录（对齐 UI 层命名） */
export type ReadingRecord = ReadingHistoryItem;

/** 阅读进度信息 */
export interface ReadingProgressInfo {
  chapterIndex: number;
  percentage: number;
}

export interface ShelfAddData {
  bookUrl: string;
  sourceUrl: string;
  title?: string;
  author?: string;
  cover?: string;
  summary?: string;
  category?: string;
  sourceName?: string;
  score?: number;
  viewCount?: number;
  wordCount?: string;
  status?: string;
  latestChapter?: string;
  id?: string;
}

interface SaveProgressBody {
  bookUrl: string;
  chapterIndex: number;
  chapterTitle: string;
  scrollProgress: number;
}

interface UpdateLastChapterBody {
  bookUrl: string;
  lastChapter: string;
}

interface DeleteBody {
  bookUrl: string;
}

export class BookshelfService {
  /** 获取书架列表 */
  static async getBookshelf(): Promise<BookshelfItem[]> {
    return ApiClient.get<BookshelfItem[]>("/api/bookshelf");
  }

  /** 获取收藏列表（别名） */
  static async getFavorites(): Promise<ShelfBook[]> {
    return BookshelfService.getBookshelf();
  }

  /** 加入书架 */
  static async addToBookshelf(novel: NovelItem): Promise<boolean> {
    return ApiClient.post<boolean>("/api/bookshelf", novel);
  }

  /** 加入书架（别名，接受部分字段） */
  static async addToShelf(novel: ShelfAddData): Promise<boolean> {
    return ApiClient.post<boolean>("/api/bookshelf", novel);
  }

  /** 移出书架 */
  static async removeFromBookshelf(bookUrl: string): Promise<boolean> {
    const body: DeleteBody = { bookUrl: bookUrl };
    return ApiClient.delete<boolean>("/api/bookshelf", body);
  }

  /** 移出书架（别名） */
  static async removeFromShelf(bookUrl: string): Promise<boolean> {
    return BookshelfService.removeFromBookshelf(bookUrl);
  }

  /** 检查是否在书架中 */
  static async isInShelf(bookUrl: string): Promise<boolean> {
    const list = await BookshelfService.getBookshelf();
    return list.some((b) => b.bookUrl === bookUrl);
  }

  /** 获取阅读历史 */
  static async getReadingHistory(): Promise<ReadingHistoryItem[]> {
    return ApiClient.get<ReadingHistoryItem[]>("/api/reading/history");
  }

  /** 获取最近阅读（别名） */
  static async getRecentReading(): Promise<ReadingRecord[]> {
    return BookshelfService.getReadingHistory();
  }

  /** 获取指定书籍的阅读进度 */
  static async getReadingProgress(bookUrl: string): Promise<ReadingProgressInfo> {
    const history = await BookshelfService.getReadingHistory();
    const item = history.find((h) => h.bookUrl === bookUrl);
    if (item) {
      const info: ReadingProgressInfo = {
        chapterIndex: item.lastChapterIndex,
        percentage: item.progress / 100,
      };
      return info;
    }
    const defaultInfo: ReadingProgressInfo = { chapterIndex: 0, percentage: 0 };
    return defaultInfo;
  }

  /** 清空阅读历史 */
  static async clearReadingHistory(): Promise<boolean> {
    return ApiClient.delete<boolean>("/api/reading/history");
  }

  /** 清空阅读历史（别名） */
  static async clearAllHistory(): Promise<boolean> {
    return BookshelfService.clearReadingHistory();
  }

  /** 删除单条阅读历史 */
  static async removeHistoryItem(bookUrl: string): Promise<boolean> {
    const body: DeleteBody = { bookUrl: bookUrl };
    return ApiClient.delete<boolean>("/api/reading/history", body);
  }

  /** 删除单条阅读历史（别名） */
  static async removeHistory(bookUrl: string): Promise<boolean> {
    return BookshelfService.removeHistoryItem(bookUrl);
  }

  /** 保存阅读进度 */
  static async saveProgress(
    bookUrl: string,
    chapterIndex: number,
    chapterTitle: string,
    scrollProgress: number,
  ): Promise<boolean> {
    const body: SaveProgressBody = {
      bookUrl: bookUrl,
      chapterIndex: chapterIndex,
      chapterTitle: chapterTitle,
      scrollProgress: scrollProgress,
    };
    return ApiClient.post<boolean>("/api/reading/progress", body);
  }

  /** 保存阅读进度（便捷方法） */
  static async saveReadingProgress(
    bookUrl: string,
    chapterIndex: number,
    totalChapters: number,
  ): Promise<boolean> {
    const percentage = totalChapters > 0 ? (chapterIndex + 1) / totalChapters : 0;
    return BookshelfService.saveProgress(
      bookUrl,
      chapterIndex,
      `第${chapterIndex + 1}章`,
      percentage,
    );
  }

  /** 获取书架数量 */
  static async getShelfCount(): Promise<number> {
    const list = await BookshelfService.getBookshelf();
    return list.length;
  }

  /** 获取历史数量 */
  static async getHistoryCount(): Promise<number> {
    const history = await BookshelfService.getReadingHistory();
    return history.length;
  }

  /** 获取全部阅读历史（别名） */
  static async getAllHistory(): Promise<ReadingRecord[]> {
    return BookshelfService.getReadingHistory();
  }

  /** 获取阅读天数（去重日期） */
  static async getReadingDays(): Promise<number> {
    const history = await BookshelfService.getReadingHistory();
    const days = new Set<string>();
    for (const h of history) {
      if (h.lastReadTime) {
        days.add(h.lastReadTime.slice(0, 10));
      }
    }
    return days.size;
  }

  /** 更新书架书籍的最新章节字段 */
  static async updateLastChapter(
    bookUrl: string,
    lastChapter: string,
  ): Promise<boolean> {
    try {
      const body: UpdateLastChapterBody = {
        bookUrl: bookUrl,
        lastChapter: lastChapter,
      };
      return await ApiClient.post<boolean>("/api/bookshelf/updateLastChapter", body);
    } catch (e) {
      /* 服务端不支持时静默失败，保留本地标记 */
      return false;
    }
  }

  /** 获取书架中未读/待续读的书籍（基于阅读历史比对） */
  static async getUnreadBooks(): Promise<BookshelfItem[]> {
    const shelf = await BookshelfService.getBookshelf();
    const history = await BookshelfService.getReadingHistory();
    const readUrls = new Set(history.map((h) => h.bookUrl));
    const unread = shelf.filter((b) => !readUrls.has(b.bookUrl));
    if (unread.length > 0) return unread;
    /* 若全部已在历史中，则取最近阅读的第一本作为「待续读」 */
    if (history.length > 0) {
      const first = history[0];
      return shelf.filter((b) => b.bookUrl === first.bookUrl);
    }
    return shelf;
  }
}
