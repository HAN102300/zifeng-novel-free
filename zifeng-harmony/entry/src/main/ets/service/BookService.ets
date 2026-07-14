/**
 * BookService - 小说信息服务
 * 规格：§4.1 详情页 + §4.2 阅读器
 *
 * 接口对齐 zifeng-server ParseController：
 * - POST /api/parse/book-info
 * - POST /api/parse/toc
 * - POST /api/parse/content
 * - GET  /api/sources (书源列表)
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

export interface AddBookSourceData {
  name: string;
  apiUrl: string;
  enabled: boolean;
}

interface ParseSource {
  bookSourceUrl: string;
  bookSourceName?: string;
}

interface BookInfoBody {
  source: ParseSource;
  bookUrl: string;
}

interface TocBody {
  source: ParseSource;
  bookUrl: string;
  tocUrl?: string;
}

interface ChapterRef {
  index: number;
}

interface ContentBody {
  source: ParseSource;
  bookUrl: string;
  chapterUrl?: string;
  chapter?: ChapterRef;
}

export class BookService {
  /** 获取小说详情 */
  static async getBookInfo(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<NovelDetails> {
    const body: BookInfoBody = {
      source: { bookSourceUrl: sourceUrl },
      bookUrl: bookUrl,
    };
    return ApiClient.post<NovelDetails>("/api/parse/book-info", body);
  }

  /** 获取章节目录 */
  static async getToc(
    bookUrl: string,
    sourceUrl: string,
  ): Promise<ChapterList> {
    const body: TocBody = {
      source: { bookSourceUrl: sourceUrl },
      bookUrl: bookUrl,
    };
    return ApiClient.post<ChapterList>("/api/parse/toc", body);
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
    const chapter: ChapterRef = { index: chapterIndex };
    const body: ContentBody = {
      source: { bookSourceUrl: sourceUrl },
      bookUrl: bookUrl,
      chapterUrl: undefined,
      chapter: chapter,
    };
    return ApiClient.post<NovelContent>("/api/parse/content", body);
  }

  // ==================== 书源管理 ====================

  /** 获取书源列表 */
  static async getBookSources(): Promise<BookSource[]> {
    return ApiClient.get<BookSource[]>("/api/sources");
  }

  /** 更新书源 */
  static async updateBookSource(source: BookSource): Promise<boolean> {
    return ApiClient.put<boolean>("/api/sources", source);
  }

  /** 删除书源 */
  static async deleteBookSource(id: string): Promise<boolean> {
    return ApiClient.delete<boolean>(
      `/api/sources?id=${encodeURIComponent(id)}`,
    );
  }

  /** 添加书源 */
  static async addBookSource(data: AddBookSourceData): Promise<boolean> {
    return ApiClient.post<boolean>("/api/sources", data);
  }
}
