/**
 * 搜索服务
 * 提供聚合搜索和单书源搜索功能
 * 单例模式
 */
import apiClient from './ApiClient';
import { Novel } from '../model/NovelItem';

/**
 * 聚合搜索结果
 */
export interface AggregatedSearchResult {
  list: Novel[];
  total: number;
}

/**
 * 聚合搜索请求参数
 */
interface AggregatedSearchParams {
  keyword: string;
  page: number;
}

/**
 * 单书源搜索请求参数
 */
interface SearchParams {
  source: string;
  keyword: string;
  page: number;
}

/**
 * 搜索服务类
 * 封装搜索相关的 API 调用
 */
class SearchService {
  private static instance: SearchService | null = null;

  constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * 聚合搜索（跨多个书源）
   * @param keyword 搜索关键词
   * @param page 页码，默认为 1
   * @returns 搜索结果，包含小说列表和总数
   */
  public async aggregatedSearch(keyword: string, page: number = 1): Promise<AggregatedSearchResult> {
    try {
      const params: AggregatedSearchParams = { keyword, page };
      const response = await apiClient.post<AggregatedSearchResult>('/parse/search/aggregated', params);
      return response.data;
    } catch (error) {
      console.error('[SearchService] aggregatedSearch failed:', JSON.stringify(error));
      return { list: [], total: 0 };
    }
  }

  /**
   * 单书源搜索
   * @param source 书源标识
   * @param keyword 搜索关键词
   * @param page 页码，默认为 1
   * @returns 搜索结果小说列表
   */
  public async searchBooks(source: string, keyword: string, page: number = 1): Promise<Novel[]> {
    try {
      const params: SearchParams = { source, keyword, page };
      const response = await apiClient.post<Novel[]>('/search', params);
      return response.data;
    } catch (error) {
      console.error('[SearchService] searchBooks failed:', JSON.stringify(error));
      return [];
    }
  }
}

// 导出单例实例（兼容现有导入方式）
export default new SearchService();
