/**
 * 小说详情数据模型
 */
export interface NovelDetails {
  id: string;
  title: string;
  author: string;
  cover: string;
  summary: string;
  category: string;
  tags: string[];
  status: string;
  wordCount: string;
  latestChapter: string;
  updateTime: string;
  bookUrl: string;
  sourceUrl: string;
  sourceName: string;
  /** 是否已加入书架 */
  inBookshelf: boolean;
  /** 已缓存章节数 */
  cachedChapters: number;
  /** 总章节数 */
  totalChapters: number;
}
