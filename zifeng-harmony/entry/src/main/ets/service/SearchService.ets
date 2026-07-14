/**
 * SearchService - 搜索服务
 * 规格：§3.5 搜索页（聚合搜索 + 单书源）
 *
 * 接口对齐 zifeng-server ParseController：
 * - POST /api/parse/search
 */
import { ApiClient } from "./ApiClient";
import { NovelItem } from "../model/NovelItem";

export interface SearchResult {
  sourceName: string;
  sourceUrl: string;
  novels: NovelItem[];
}

export interface BatchSearchProgress {
  completed: number;
  total: number;
  results: SearchResult[];
  isFinished: boolean;
}

export interface AbortSignal {
  aborted: boolean;
}

interface SearchSource {
  bookSourceUrl: string;
}

interface SearchBody {
  source: SearchSource;
  keyword: string;
  page?: number;
}

/** 搜索历史存储键 */
const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

export class SearchService {
  /** 单书源搜索 */
  static async searchSingle(
    keyword: string,
    sourceUrl: string,
  ): Promise<SearchResult> {
    const source: SearchSource = { bookSourceUrl: sourceUrl };
    const body: SearchBody = {
      source: source,
      keyword: keyword,
      page: 1,
    };
    return ApiClient.post<SearchResult>("/api/parse/search", body);
  }

  /**
   * 聚合搜索（流式返回结果）
   * 使用回调模式，每完成一个书源即返回结果
   */
  static async batchSearch(
    keyword: string,
    sourceUrls: string[],
    onProgress: (progress: BatchSearchProgress) => void,
    abortSignal?: AbortSignal,
  ): Promise<void> {
    const results: SearchResult[] = [];
    let completed = 0;
    const total = sourceUrls.length;

    for (const sourceUrl of sourceUrls) {
      if (abortSignal?.aborted) {
        break;
      }
      try {
        const result = await SearchService.searchSingle(keyword, sourceUrl);
        results.push(result);
      } catch (e) {
        // 单源失败不阻塞整体
        console.warn(
          `SearchService: source ${sourceUrl} failed: ${(e as Error).message}`,
        );
      }
      completed++;
      onProgress({
        completed: completed,
        total: total,
        results: [...results],
        isFinished: completed >= total,
      });
    }
  }

  /** 获取搜索历史 */
  static getHistory(): string[] {
    try {
      const raw = AppStorage.get<string>(HISTORY_KEY) || "[]";
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  /** 添加搜索历史 */
  static addHistory(keyword: string): void {
    let history = SearchService.getHistory();
    // 去重
    history = history.filter((h) => h !== keyword);
    history.unshift(keyword);
    // 限制数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    AppStorage.setOrCreate(HISTORY_KEY, JSON.stringify(history));
  }

  /** 清空搜索历史 */
  static clearHistory(): void {
    AppStorage.setOrCreate(HISTORY_KEY, "[]");
  }

  /** 删除单条历史 */
  static removeHistoryItem(keyword: string): void {
    const history = SearchService.getHistory().filter((h) => h !== keyword);
    AppStorage.setOrCreate(HISTORY_KEY, JSON.stringify(history));
  }
}
