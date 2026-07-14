/**
 * CategoryService - 分类服务
 * 规格：§3.2 分类页 + §3.3 分类详情页
 *
 * 接口对齐 zifeng-parser /api/category
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export interface Category {
  id: string;
  name: string;
  icon?: string;
  count: number;
}

export type SortType = "hot" | "new" | "completed";

interface CategoryNovelsParams {
  categoryId: string;
  page: string;
  sort: SortType;
}

export class CategoryService {
  /** 获取所有分类 */
  static async getCategories(): Promise<Category[]> {
    return ApiClient.get<Category[]>("/api/category/list");
  }

  /** 获取分类下小说列表 */
  static async getCategoryNovels(
    categoryId: string,
    page: number = 1,
    sort: SortType = "hot",
  ): Promise<NovelItem[]> {
    const params: CategoryNovelsParams = {
      categoryId: categoryId,
      page: page.toString(),
      sort: sort,
    };
    return ApiClient.get<NovelItem[]>("/api/category/novels", params);
  }
}
