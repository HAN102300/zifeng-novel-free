/**
 * 章节数据模型
 * 仅保留 Chapter 接口定义
 * 旧 ChapterList 类和 getNovelChapter 方法已迁移至 BookService.getToc
 */

export interface Chapter {
  path: string
  novelId: string
  chapterName: string
  chapterNumber: number
  wordNum: number
  updatedAt: string
  chapterId: string
}
