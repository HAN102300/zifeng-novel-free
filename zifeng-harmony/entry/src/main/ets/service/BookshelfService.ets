/**
 * 书架服务
 * 提供云端书架的增删查功能
 */
import apiClient from './ApiClient';
import { Novel } from '../model/NovelItem';

interface BookshelfListResult {
  success: boolean;
  data: Novel[];
}

interface BookshelfOpResult {
  success: boolean;
  message: string;
}

interface BookshelfCheckResult {
  success: boolean;
  data: boolean;
}

/**
 * 添加书籍到书架请求参数
 * 字段名与后端 BookshelfRequest 一致
 */
interface AddToBookshelfParams {
  bookUrl: string;
  bookName: string;
  author: string;
  coverUrl: string;
  summary: string;
  lastChapter: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
}

/**
 * 删除书籍请求参数
 */
interface RemoveFromBookshelfParams {
  bookUrl: string;
}

/**
 * 书架服务类
 * 负责与后端 API 交互，管理用户的云端书架
 */
class BookshelfService {
  private static instance: BookshelfService;

  private constructor() {}

  /**
   * 获取 BookshelfService 单例实例
   */
  public static getInstance(): BookshelfService {
    if (!BookshelfService.instance) {
      BookshelfService.instance = new BookshelfService();
    }
    return BookshelfService.instance;
  }

  /**
   * 获取云端书架列表
   * @returns 包含书架书籍列表的响应
   */
  public async getBookshelf(): Promise<BookshelfListResult> {
    try {
      const response = await apiClient.get<Novel[]>('/bookshelf');
      return {
        success: true,
        data: response.data || []
      } as BookshelfListResult;
    } catch (error) {
      console.error('获取书架列表失败:', error);
      return {
        success: false,
        data: []
      } as BookshelfListResult;
    }
  }

  /**
   * 添加书籍到书架
   * @param bookData 书籍信息
   * @returns 操作结果
   */
  public async addToBookshelf(bookData: Novel): Promise<BookshelfOpResult> {
    try {
      const requestData: AddToBookshelfParams = {
        bookUrl: bookData.bookUrl,
        bookName: bookData.title,
        author: bookData.author,
        coverUrl: bookData.imgUrl,
        summary: bookData.intro,
        lastChapter: '',
        sourceUrl: bookData.tocUrl,
        sourceName: bookData.source,
        category: bookData.type || ''
      };

      await apiClient.post<void>('/bookshelf', requestData);
      return {
        success: true,
        message: '添加成功'
      } as BookshelfOpResult;
    } catch (error) {
      console.error('添加到书架失败:', error);
      return {
        success: false,
        message: '添加失败'
      } as BookshelfOpResult;
    }
  }

  /**
   * 从书架删除书籍
   * @param bookUrl 书籍 URL
   * @returns 操作结果
   */
  public async removeFromBookshelf(bookUrl: string): Promise<BookshelfOpResult> {
    try {
      const params: RemoveFromBookshelfParams = { bookUrl };
      await apiClient.delete<void>('/bookshelf', {
        data: params
      });
      return {
        success: true,
        message: '删除成功'
      } as BookshelfOpResult;
    } catch (error) {
      console.error('从书架删除失败:', error);
      return {
        success: false,
        message: '删除失败'
      } as BookshelfOpResult;
    }
  }

  /**
   * 检查书籍是否在书架中
   * @param bookUrl 书籍 URL
   * @returns 检查结果
   */
  public async checkBookInShelf(bookUrl: string): Promise<BookshelfCheckResult> {
    try {
      const response = await apiClient.get<boolean>('/bookshelf/check', {
        params: { bookUrl }
      });
      return {
        success: true,
        data: response.data
      } as BookshelfCheckResult;
    } catch (error) {
      console.error('检查书架状态失败:', error);
      return {
        success: false,
        data: false
      } as BookshelfCheckResult;
    }
  }
}

// 导出单例实例
export default BookshelfService.getInstance();
