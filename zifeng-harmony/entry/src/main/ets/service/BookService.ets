/**
 * BookService - 小说信息服务
 * 规格：§4.1 详情页 + §4.2 阅读器
 *
 * 接口对齐 zifeng-parser：
 * - GET /api/book/info
 * - GET /api/book/toc
 * - GET /api/book/content
 */
import { ApiClient } from "./ApiClient";
import { NovelDetails } from "../model/NovelDetails";
import { Chapter, ChapterList } from "../model/Chapters";
import { NovelContent } from "../model/NovelContent";

/** 书源信息 */
export interface BookSource {
  id: string;
  name: string;
  apiUrl: string;
  enabled: boolean;
  sort?: number;
}

export class BookService {
  /** 获取小说详情 */
  static async getBookInfo(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<NovelDetails> {
    return ApiClient.get<NovelDetails>("/api/book/info", {
      bookUrl,
      sourceUrl,
    });
  }

  /** 获取章节目录 */
  static async getToc(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<ChapterList> {
    return ApiClient.get<ChapterList>("/api/book/toc", { bookUrl, sourceUrl });
  }

  /** 获取章节列表（便捷方法，返回 Chapter[]） */
  static async getChapterList(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<Chapter[]> {
    const toc = await BookService.getToc(bookUrl, sourceUrl);
    return toc.chapters;
  }

  /** 获取章节总数 */
  static async getChapterCount(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<number> {
    const toc = await BookService.getToc(bookUrl, sourceUrl);
    return toc.total;
  }

  /** 获取章节内容 */
  static async getChapterContent(
    bookUrl: string,
    sourceUrl: string,
    chapterIndex: number,
  ): Promise<NovelContent> {
    return ApiClient.get<NovelContent>("/api/book/content", {
      bookUrl,
      sourceUrl,
      chapterIndex: chapterIndex.toString(),
    });
  }

  // ==================== 书源管理 ====================

  /** 获取书源列表 */
  static async getBookSources(): Promise<BookSource[]> {
    return ApiClient.get<BookSource[]>("/api/book/sources");
  }

  /** 更新书源 */
  static async updateBookSource(source: BookSource): Promise<boolean> {
    return ApiClient.post<boolean>("/api/book/sources/update", source);
  }

  /** 删除书源 */
  static async deleteBookSource(id: string): Promise<boolean> {
    return ApiClient.delete<boolean>(
      `/api/book/sources/delete?id=${encodeURIComponent(id)}`,
    );
  }

  /** 添加书源 */
  static async addBookSource(data: {
    name: string;
    apiUrl: string;
    enabled: boolean;
  }): Promise<boolean> {
    return ApiClient.post<boolean>("/api/book/sources/add", data);
  }
}
