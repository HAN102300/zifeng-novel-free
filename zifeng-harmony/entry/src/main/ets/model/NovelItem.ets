/**
 * 小说列表项数据模型
 * 用于首页推荐、搜索结果、书架列表等
 */
export interface NovelItem {
  /** 小说唯一标识（通常为 bookUrl） */
  id: string;
  /** 书名 */
  title: string;
  /** 作者 */
  author: string;
  /** 封面图 URL */
  cover: string;
  /** 简介 */
  summary?: string;
  /** 分类标签 */
  category?: string;
  /** 来源书源名称 */
  sourceName?: string;
  /** 来源书源 URL */
  sourceUrl?: string;
  /** 书籍详情页 URL */
  bookUrl: string;
  /** 评分（0-10） */
  score?: number;
  /** 阅读量 */
  viewCount?: number;
  /** 字数 */
  wordCount?: string;
  /** 更新状态（连载中/已完结） */
  status?: string;
  /** 最新章节 */
  latestChapter?: string;
}
