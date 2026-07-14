/**
 * OfflineCacheManager - 离线阅读缓存管理
 * 规格：移动端增强-1 离线阅读
 * 特性：章节内容缓存、缓存大小计算、清理、自动预缓存下一章
 * 实现：基于 @ohos.file.fs 文件系统 + JSON 序列化
 */
import fs from "@ohos.file.fs";
import { util } from "@kit.ArkTS";
import { NovelContent } from "../model/NovelModels";

interface CacheIndex {
  bookUrl: string;
  chapters: number[];
  updatedAt: number;
}

export class OfflineCacheManager {
  private static cacheDir: string = "";

  private static async ensureDir(): Promise<string> {
    if (OfflineCacheManager.cacheDir.length > 0) return OfflineCacheManager.cacheDir;
    const context = getContext(OfflineCacheManager);
    OfflineCacheManager.cacheDir = `${context.cacheDir}/novel_cache`;
    if (!fs.accessSync(OfflineCacheManager.cacheDir)) {
      fs.mkdirSync(OfflineCacheManager.cacheDir, true);
    }
    return OfflineCacheManager.cacheDir;
  }

  private static chapterKey(bookUrl: string, chapterIndex: number): string {
    // 简单 hash 避免文件名非法字符
    const safe = bookUrl.replace(new RegExp("[^a-zA-Z0-9]", "g"), "_");
    return `${safe}_${chapterIndex}`;
  }

  static async cacheContent(
    bookUrl: string,
    chapterIndex: number,
    content: NovelContent,
  ): Promise<void> {
    const dir = await OfflineCacheManager.ensureDir();
    const filePath = `${dir}/${OfflineCacheManager.chapterKey(bookUrl, chapterIndex)}.json`;
    const file = fs.openSync(
      filePath,
      fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE,
    );
    try {
      const data = JSON.stringify(content);
      fs.writeSync(file.fd, data);
    } finally {
      fs.closeSync(file);
    }
    await OfflineCacheManager.updateIndex(bookUrl, chapterIndex);
  }

  static async getCachedContent(
    bookUrl: string,
    chapterIndex: number,
  ): Promise<NovelContent | null> {
    const dir = await OfflineCacheManager.ensureDir();
    const filePath = `${dir}/${OfflineCacheManager.chapterKey(bookUrl, chapterIndex)}.json`;
    if (!fs.accessSync(filePath)) return null;
    const file = fs.openSync(filePath, fs.OpenMode.READ_ONLY);
    try {
      const stat = fs.statSync(filePath);
      const buf = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buf);
      const text = util.TextDecoder.create('utf-8').decodeWithStream(new Uint8Array(buf));
      return JSON.parse(text) as NovelContent;
    } catch (e) {
      return null;
    } finally {
      fs.closeSync(file);
    }
  }

  static async precacheNext(
    bookUrl: string,
    sourceUrl: string,
    currentIndex: number,
  ): Promise<void> {
    const nextIndex = currentIndex + 1;
    const cached = await OfflineCacheManager.getCachedContent(bookUrl, nextIndex);
    if (cached) return;
    try {
      const mod = await import("./BookService");
      const BookService = mod.BookService;
      const content = await BookService.getChapterContent(
        bookUrl,
        sourceUrl,
        nextIndex,
      );
      if (content) await OfflineCacheManager.cacheContent(bookUrl, nextIndex, content);
    } catch (e) {
      /* 静默失败 */
    }
  }

  static async getCacheSize(): Promise<number> {
    const dir = await OfflineCacheManager.ensureDir();
    return OfflineCacheManager.calcDirSize(dir);
  }

  private static calcDirSize(dir: string): number {
    if (!fs.accessSync(dir)) return 0;
    let total = 0;
    const entries = fs.listFileSync(dir);
    for (const name of entries) {
      const full = `${dir}/${name}`;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        total += OfflineCacheManager.calcDirSize(full);
      } else {
        total += stat.size;
      }
    }
    return total;
  }

  static async clearAll(): Promise<void> {
    const dir = await OfflineCacheManager.ensureDir();
    if (!fs.accessSync(dir)) return;
    const entries = fs.listFileSync(dir);
    for (const name of entries) {
      fs.unlinkSync(`${dir}/${name}`);
    }
  }

  static async clearAllCache(): Promise<void> {
    return OfflineCacheManager.clearAll();
  }

  static async clearBook(bookUrl: string): Promise<void> {
    const dir = await OfflineCacheManager.ensureDir();
    const safe = bookUrl.replace(new RegExp("[^a-zA-Z0-9]", "g"), "_");
    const entries = fs.listFileSync(dir);
    for (const name of entries) {
      if (name.startsWith(safe)) {
        fs.unlinkSync(`${dir}/${name}`);
      }
    }
  }

  static async clearBookCache(bookUrl: string): Promise<void> {
    return OfflineCacheManager.clearBook(bookUrl);
  }

  private static async updateIndex(
    bookUrl: string,
    chapterIndex: number,
  ): Promise<void> {
    const dir = await OfflineCacheManager.ensureDir();
    const indexPath = `${dir}/_index.json`;
    let indexes: CacheIndex[] = [];
    if (fs.accessSync(indexPath)) {
      try {
        const file = fs.openSync(indexPath, fs.OpenMode.READ_ONLY);
        const stat = fs.statSync(indexPath);
        const buf = new ArrayBuffer(stat.size);
        fs.readSync(file.fd, buf);
        fs.closeSync(file);
        indexes = JSON.parse(util.TextDecoder.create('utf-8').decodeWithStream(new Uint8Array(buf))) as CacheIndex[];
      } catch (e) {
        /* 忽略 */
      }
    }
    let entry = indexes.find((i) => i.bookUrl === bookUrl);
    if (!entry) {
      entry = { bookUrl: bookUrl, chapters: [], updatedAt: Date.now() } as CacheIndex;
      indexes.push(entry);
    }
    if (!entry.chapters.includes(chapterIndex)) {
      entry.chapters.push(chapterIndex);
    }
    entry.updatedAt = Date.now();
    const file = fs.openSync(
      indexPath,
      fs.OpenMode.CREATE | fs.OpenMode.READ_WRITE,
    );
    try {
      fs.writeSync(file.fd, JSON.stringify(indexes));
    } finally {
      fs.closeSync(file);
    }
  }

  static async getCachedChapters(bookUrl: string): Promise<number[]> {
    const dir = await OfflineCacheManager.ensureDir();
    const indexPath = `${dir}/_index.json`;
    if (!fs.accessSync(indexPath)) return [];
    try {
      const file = fs.openSync(indexPath, fs.OpenMode.READ_ONLY);
      const stat = fs.statSync(indexPath);
      const buf = new ArrayBuffer(stat.size);
      fs.readSync(file.fd, buf);
      fs.closeSync(file);
      const indexes = JSON.parse(util.TextDecoder.create('utf-8').decodeWithStream(new Uint8Array(buf))) as CacheIndex[];
      return indexes.find((i) => i.bookUrl === bookUrl)?.chapters ?? [];
    } catch (e) {
      return [];
    }
  }
}

export default OfflineCacheManager;
