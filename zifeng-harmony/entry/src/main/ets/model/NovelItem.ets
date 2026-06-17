/**
 * 小说数据模型
 * 仅保留数据接口和 Novel 类定义
 * 旧 API 方法（getNovelRec、getNovelMale）已迁移至 RankService
 */

export interface INovel {
  type: string
  bookId: string | number
  title: string
  imgUrl: string
  author: string
  intro: string
  wordNum: string
}

export class Novel implements INovel {
  bookId: string
  title: string
  imgUrl: string
  author: string
  intro: string
  type: string
  wordNum: string
  // 书架相关字段
  bookUrl: string
  source: string
  tocUrl: string
  chaptersId?: string

  constructor(
    bookId: string,
    title: string,
    imgUrl: string,
    author: string,
    intro: string,
    type: string,
    wordNum: string,
    bookUrl: string = '',
    source: string = '',
    tocUrl: string = '',
    chaptersId: string = ''
  ) {
    this.bookId = bookId
    this.title = title
    this.imgUrl = imgUrl
    this.author = author
    this.intro = intro
    this.type = type
    this.wordNum = wordNum
    this.bookUrl = bookUrl
    this.source = source
    this.tocUrl = tocUrl
    this.chaptersId = chaptersId
  }
}
