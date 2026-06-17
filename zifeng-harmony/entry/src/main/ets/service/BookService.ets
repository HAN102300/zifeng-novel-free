/**
 * 书籍服务
 * 提供书籍信息、章节目录、章节内容等 API 调用
 * 单例模式 + 内存缓存（5 分钟 TTL）
 */
import apiClient, { ApiResponse } from './ApiClient';
import { Novel } from '../model/NovelItem';
import { Chapter } from '../model/Chapters';

/**
 * 章节内容响应数据
 */
export interface ChapterContentData {
  content: string;
  chapterName: string;
}

/**
 * 获取书籍信息请求参数
 */
interface BookInfoParams {
  source: string;
  bookUrl: string;
  book?: Novel;
}

/**
 * 获取章节目录请求参数
 */
interface TocParams {
  source: string;
  tocUrl: string;
  book?: Novel;
}

/**
 * 获取章节内容请求参数
 */
interface ContentParams {
  source: string;
  chapterUrl: string;
  book?: Novel;
  chapter?: Chapter;
}

/**
 * 缓存条目
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * 缓存 TTL：5 分钟
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 书籍服务类
 * 封装与书籍相关的 API 请求，提供内存缓存
 */
class BookService {
  private static instance: BookService | null = null;
  private bookInfoCache: Map<string, CacheEntry<Novel>> = new Map();
  private tocCache: Map<string, CacheEntry<Chapter[]>> = new Map();
  private contentCache: Map<string, CacheEntry<ChapterContentData>> = new Map();

  constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): BookService {
    if (!BookService.instance) {
      BookService.instance = new BookService();
    }
    return BookService.instance;
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid<T>(cache: Map<string, CacheEntry<T>>, key: string): boolean {
    const entry = cache.get(key);
    if (!entry) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
  }

  /**
   * 获取书籍详细信息
   */
  public async getBookInfo(source: string, bookUrl: string, bookData?: Novel): Promise<ApiResponse<Novel>> {
    const cacheKey = `bookInfo:${source}:${bookUrl}`;
    if (this.isCacheValid(this.bookInfoCache, cacheKey)) {
      return { success: true, message: 'cache', data: this.bookInfoCache.get(cacheKey)!.data };
    }

    try {
      const params: BookInfoParams = {
        source,
        bookUrl,
        book: bookData
      };
      const response = await apiClient.post<Novel>('/parse/book-info/unified', params);
      if (response.success && response.data) {
        this.bookInfoCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
      return response;
    } catch (error) {
      console.error('BookService.getBookInfo error:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取章节目录
   */
  public async getToc(source: string, tocUrl: string, book?: Novel): Promise<ApiResponse<Chapter[]>> {
    const cacheKey = `toc:${source}:${tocUrl}`;
    if (this.isCacheValid(this.tocCache, cacheKey)) {
      return { success: true, message: 'cache', data: this.tocCache.get(cacheKey)!.data };
    }

    try {
      const params: TocParams = {
        source,
        tocUrl,
        book
      };
      const response = await apiClient.post<Chapter[]>('/parse/toc/unified', params);
      if (response.success && response.data) {
        this.tocCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
      return response;
    } catch (error) {
      console.error('BookService.getToc error:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 获取章节内容
   */
  public async getContent(
    source: string,
    chapterUrl: string,
    book?: Novel,
    chapter?: Chapter
  ): Promise<ApiResponse<ChapterContentData>> {
    const cacheKey = `content:${source}:${chapterUrl}`;
    if (this.isCacheValid(this.contentCache, cacheKey)) {
      return { success: true, message: 'cache', data: this.contentCache.get(cacheKey)!.data };
    }

    try {
      const params: ContentParams = {
        source,
        chapterUrl,
        book,
        chapter
      };
      const response = await apiClient.post<ChapterContentData>('/parse/content/unified', params);
      if (response.success && response.data) {
        this.contentCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }
      return response;
    } catch (error) {
      console.error('BookService.getContent error:', error);
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * 清除所有缓存
   */
  public clearCache(): void {
    this.bookInfoCache.clear();
    this.tocCache.clear();
    this.contentCache.clear();
  }
}

// 导出单例实例（兼容现有导入方式）
export default new BookService();
