/**
 * 章节内容模型
 */
export interface NovelContent {
  /** 章节索引 */
  chapterIndex: number;
  /** 章节标题 */
  title: string;
  /** 正文内容（已分段） */
  content: string[];
  /** 来源书源 */
  sourceUrl: string;
  /** 书籍 URL */
  bookUrl: string;
  /** 上一章索引（-1 表示无） */
  prevIndex: number;
  /** 下一章索引（-1 表示无） */
  nextIndex: number;
  /** 是否来自缓存 */
  fromCache: boolean;
}
