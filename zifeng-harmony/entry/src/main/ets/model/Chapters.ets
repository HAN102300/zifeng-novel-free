/**
 * 章节列表项模型
 */
export interface Chapter {
  /** 章节索引 */
  index: number;
  /** 章节标题 */
  title: string;
  /** 章节 URL */
  url: string;
  /** 章节字数 */
  wordCount?: number;
  /** 更新时间 */
  updateTime?: string;
  /** 是否已缓存 */
  isCached: boolean;
}

/**
 * 章节列表响应
 */
export interface ChapterList {
  bookUrl: string;
  chapters: Chapter[];
  total: number;
}
