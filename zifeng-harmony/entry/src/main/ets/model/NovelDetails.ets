/**
 * 小说详情数据模型
 * 仅保留数据接口定义
 * 旧 NovelDetail 类和 getNovelDetail 方法已迁移至 BookService.getBookInfo
 */

export interface LastChapter {
  chapterId: string
  chapterName: string
  chapterNumber: number
  decTime: string
}

export interface BookDetails {
  novelId: string
  lastChapter: LastChapter
}
