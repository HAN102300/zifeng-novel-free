/**
 * 分类服务
 * 提供小说分类相关的数据获取功能
 */
import apiClient, { ApiResponse } from './ApiClient';
import { Novel, INovel } from '../model/NovelItem';

/**
 * 分类信息接口
 */
export interface Category {
  id: string;
  name: string;
  icon?: string;
  channel: string;
}

/**
 * 分类详情响应数据
 */
interface CategoryDetailData {
  list: INovel[];
  total: number;
}

interface CategoryListResult {
  success: boolean;
  data: Category[];
}

interface CategoryDetailResult {
  success: boolean;
  data: CategoryDetailData;
}

/**
 * 分类服务类
 * 负责与分类相关的 API 交互
 */
class CategoryService {
  private static instance: CategoryService;

  private constructor() {}

  /**
   * 获取 CategoryService 单例实例
   */
  public static getInstance(): CategoryService {
    if (!CategoryService.instance) {
      CategoryService.instance = new CategoryService();
    }
    return CategoryService.instance;
  }

  /**
   * 获取分类列表
   * @param channel 频道：'male' 男生 | 'female' 女生
   * @returns 分类列表数据
   */
  public async getCategories(channel: string): Promise<CategoryListResult> {
    try {
      // 调用后端 /api/categories/{channel} 接口
      const response = await apiClient.get<Category[]>(`/categories/${channel}`);

      return {
        success: true,
        data: response.data || []
      } as CategoryListResult;
    } catch (error) {
      console.error('获取分类列表失败:', error);
      return {
        success: false,
        data: []
      } as CategoryListResult;
    }
  }

  /**
   * 获取分类下的小说列表
   * @param channel 频道：'male' 男生 | 'female' 女生
   * @param categoryId 分类 ID
   * @param page 页码，默认为 1
   * @returns 分类详情数据，包含小说列表和总数
   */
  public async getCategoryDetail(
    channel: string,
    categoryId: string,
    page: number = 1
  ): Promise<CategoryDetailResult> {
    try {
      // 调用后端 /api/categories/{channel}/{categoryId} 接口
      const response = await apiClient.get<CategoryDetailData>(`/categories/${channel}/${categoryId}`, {
        params: {
          page: page
        }
      });

      return {
        success: true,
        data: response.data || { list: [], total: 0 }
      } as CategoryDetailResult;
    } catch (error) {
      console.error('获取分类详情失败:', error);
      return {
        success: false,
        data: { list: [], total: 0 }
      } as CategoryDetailResult;
    }
  }
}

// 导出单例实例
export default CategoryService.getInstance();
