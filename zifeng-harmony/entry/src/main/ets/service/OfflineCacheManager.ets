/**
 * OfflineCacheManager - 离线缓存管理（占位实现）
 * 规格：§移动端增强 离线阅读
 *
 * 注：此为 Phase 5 的占位实现，Phase 7 将基于 @ohos.file.fs 完整实现
 */
import { NovelContent } from '../model/NovelContent'

export class OfflineCacheManager {
  /** 获取缓存的章节内容 */
  static async getCachedContent(
    _bookUrl: string,
    _chapterIndex: number,
  ): Promise<NovelContent | null> {
    // Phase 7 将实现基于文件系统的缓存
    return null
  }

  /** 缓存章节内容 */
  static async cacheContent(
    _bookUrl: string,
    _chapterIndex: number,
    _content: NovelContent,
  ): Promise<void> {
    // Phase 7 将实现基于文件系统的缓存
  }

  /** 清除指定书籍的缓存 */
  static async clearBookCache(_bookUrl: string): Promise<void> {
    // Phase 7 将实现
  }

  /** 清除所有缓存 */
  static async clearAllCache(): Promise<void> {
    // Phase 7 将实现
  }

  /** 获取缓存大小（字节） */
  static async getCacheSize(): Promise<number> {
    return 0
  }
}
