/**
 * 排行榜服务
 * 提供各类排行榜数据获取功能，包括必读榜、潜力榜、完本榜、更新榜、热搜榜、评论榜
 */
import apiClient from './ApiClient';
import { Novel } from '../model/NovelItem';

/**
 * 排行榜类型
 */
export type RankType = 'mustRead' | 'potential' | 'weekly' | 'monthly' | 'newBook' | 'complete' | 'completed' | 'updated' | 'search' | 'comment';

/**
 * 排行榜 API 返回的小说数据（后端字段）
 */
interface RankNovelData {
  novelId: string;
  novelName: string;
  cover: string;
  authorName: string;
  summary: string;
  wordNum: string;
  type?: string;
}

/**
 * 排行榜结果
 */
export interface RankResult {
  success: boolean;
  data: Novel[];
  message?: string;
}

function getRankApiUrl(rankType: RankType): string {
  switch (rankType) {
    case 'completed':
      return '/rank/complete';
    case 'updated':
      return '/rank/updated';
    case 'search':
      return '/rank/search';
    case 'comment':
      return '/rank/comment';
    default:
      return `/rank/${rankType}`;
  }
}

/**
 * 将后端小说数据转换为 Novel 模型
 */
function toNovel(item: RankNovelData): Novel {
  return new Novel(
    item.novelId,
    item.novelName,
    item.cover,
    item.authorName,
    item.summary,
    item.type ?? '',
    item.wordNum
  );
}

/**
 * 排行榜服务类
 * 封装各类排行榜的 HTTP 请求
 */
export class RankService {
  private static instance: RankService | null = null;

  private constructor() {}

  /**
   * 获取 RankService 单例实例
   */
  public static getInstance(): RankService {
    if (!RankService.instance) {
      RankService.instance = new RankService();
    }
    return RankService.instance;
  }

  /**
   * 获取排行榜数据（通用方法）
   * @param rankType 排行榜类型
   * @param page 页码，默认第 1 页
   * @returns 包含 success 状态和 Novel[] 数据的结果对象
   */
  public async getRankData(rankType: RankType, page: number = 1): Promise<RankResult> {
    try {
      const apiUrl = getRankApiUrl(rankType);
      if (!apiUrl) {
        return { success: false, data: [], message: `未知的排行榜类型: ${rankType}` };
      }

      const response = await apiClient.get<RankNovelData[]>(apiUrl, {
        params: { page },
      });

      const novelList: Novel[] = (response.data ?? []).map(toNovel);
      return { success: true, data: novelList };
    } catch (error) {
      console.error(`[RankService] 获取${rankType}排行榜失败 (page=${page}):`, JSON.stringify(error));
      return { success: false, data: [], message: '获取排行榜数据失败' };
    }
  }

  /**
   * 获取必读榜数据
   * @param page 页码，默认第 1 页
   */
  public async getMustReadRank(page: number = 1): Promise<RankResult> {
    return this.getRankData('mustRead', page);
  }

  /**
   * 获取潜力榜数据
   * @param page 页码，默认第 1 页
   */
  public async getPotentialRank(page: number = 1): Promise<RankResult> {
    return this.getRankData('potential', page);
  }

  /**
   * 获取周榜数据
   * @param page 页码，默认第 1 页
   */
  public async getWeeklyRank(page: number = 1): Promise<RankResult> {
    return this.getRankData('weekly', page);
  }

  /**
   * 获取月榜数据
   * @param page 页码，默认第 1 页
   */
  public async getMonthlyRank(page: number = 1): Promise<RankResult> {
    return this.getRankData('monthly', page);
  }

  /**
   * 获取新书榜数据
   * @param page 页码，默认第 1 页
   */
  public async getNewBookRank(page: number = 1): Promise<RankResult> {
    return this.getRankData('newBook', page);
  }

  /**
   * 获取完本榜数据
   * @param page 页码，默认第 1 页
   */
  public async getCompleteRank(page: number = 1): Promise<RankResult> {
    return this.getRankData('complete', page);
  }
}

// 导出单例实例，方便直接使用
export default RankService.getInstance();
