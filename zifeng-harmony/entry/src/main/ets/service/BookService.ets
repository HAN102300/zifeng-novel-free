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
import { NovelDetails, ChapterList, NovelContent } from "../model/NovelDetails";

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
}
