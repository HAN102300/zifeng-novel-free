/**
 * BookshelfService - 书架管理服务
 * 规格：§4.3 书架页
 *
 * 接口对齐 zifeng-server module-user：
 * - GET  /api/bookshelf/list
 * - POST /api/bookshelf/add
 * - DELETE /api/bookshelf/remove
 * - GET  /api/bookshelf/history
 * - DELETE /api/bookshelf/history
 * - POST /api/bookshelf/progress
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

export class BookshelfService {
  /** 获取书架列表 */
  static async getBookshelf(): Promise<BookshelfItem[]> {
    return ApiClient.get<BookshelfItem[]>("/api/bookshelf/list");
  }

  /** 加入书架 */
  static async addToBookshelf(novel: NovelItem): Promise<boolean> {
    return ApiClient.post<boolean>("/api/bookshelf/add", novel);
  }

  /** 移出书架 */
  static async removeFromBookshelf(bookUrl: string): Promise<boolean> {
    return ApiClient.delete<boolean>(
      `/api/bookshelf/remove?bookUrl=${encodeURIComponent(bookUrl)}`,
    );
  }

  /** 获取阅读历史 */
  static async getReadingHistory(): Promise<ReadingHistoryItem[]> {
    return ApiClient.get<ReadingHistoryItem[]>("/api/bookshelf/history");
  }

  /** 清空阅读历史 */
  static async clearReadingHistory(): Promise<boolean> {
    return ApiClient.delete<boolean>("/api/bookshelf/history");
  }

  /** 删除单条阅读历史 */
  static async removeHistoryItem(bookUrl: string): Promise<boolean> {
    return ApiClient.delete<boolean>(
      `/api/bookshelf/history?bookUrl=${encodeURIComponent(bookUrl)}`,
    );
  }

  /** 保存阅读进度 */
  static async saveProgress(
    bookUrl: string,
    chapterIndex: number,
    chapterTitle: string,
    scrollProgress: number,
  ): Promise<boolean> {
    return ApiClient.post<boolean>("/api/bookshelf/progress", {
      bookUrl,
      chapterIndex,
      chapterTitle,
      scrollProgress,
    });
  }
}
