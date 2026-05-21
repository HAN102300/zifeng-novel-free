import { searchBooksAPI } from './apiClient';
import { adaptSearchResult, computeCompleteness } from './bookAdapter';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;
const SOURCE_TIMEOUT_MS = 10000;

function isValidSourceUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\/[a-zA-Z0-9]/.test(url.trim());
}

function normalizeForDedup(name, author) {
  return (name || '').replace(/[\s\-_.,()（）\[\]【】]/g, '').toLowerCase()
    + '_' + (author || '').replace(/[\s\-_.,·]/g, '').toLowerCase();
}

function searchSingleSource(source, keyword, signal) {
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);

  return searchBooksAPI(source, keyword, 1)
    .then(result => {
      clearTimeout(timeoutId);
      if (result.success && result.results) {
        const adapted = (result.results || []).map(item => {
          const r = adaptSearchResult(item, source);
          if (r) {
            r.sourceTag = source.bookSourceName;
            r.sourceName = source.bookSourceName;
            r.sourceUrl = source.bookSourceUrl;
            r.completeness = computeCompleteness(r);
            r.availableSourceNames = [source.bookSourceName];
          }
          return r;
        }).filter(Boolean);

        return {
          source,
          success: true,
          books: adapted,
          latencyMs: result.latencyMs || 0,
          error: null,
        };
      }
      return { source, success: false, books: [], latencyMs: 0, error: result.message || result.errorType || 'parse failed' };
    })
    .catch(err => {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { source, success: false, books: [], latencyMs: SOURCE_TIMEOUT_MS, error: 'timeout' };
      }
      return { source, success: false, books: [], latencyMs: 0, error: err.message };
    });
}

function mergeBooks(allBooks) {
  const map = {};
  for (const book of allBooks) {
    const key = normalizeForDedup(book.name, book.author);
    if (map[key]) {
      const existing = map[key];
      if (!existing.coverUrl && book.coverUrl) {
        existing.coverUrl = book.coverUrl;
        existing.cover = book.coverUrl;
      }
      if ((!existing.intro || existing.intro.length < 10) && book.intro && book.intro.length > 10) {
        existing.intro = book.intro;
      }
      if (!existing.kind && book.kind) existing.kind = book.kind;
      if (!existing.lastChapter && book.lastChapter) existing.lastChapter = book.lastChapter;
      if (!existing.wordCount && book.wordCount) existing.wordCount = book.wordCount;
      if (!existing.updateTime && book.updateTime) existing.updateTime = book.updateTime;
      if (!existing.tocUrl && book.tocUrl) existing.tocUrl = book.tocUrl;
      if (!existing.chapterCount && book.chapterCount) existing.chapterCount = book.chapterCount;
      if (!existing.score && book.score) existing.score = book.score;

      if (!existing.availableSourceNames.includes(book.sourceName)) {
        existing.availableSourceNames.push(book.sourceName);
      }
      if (!existing.sourceTag.includes(book.sourceName)) {
        existing.sourceTag = existing.availableSourceNames.join(', ');
      }
      existing.completeness = computeCompleteness(existing);
    } else {
      map[key] = { ...book };
    }
  }
  return Object.values(map).sort(
    (a, b) => (b.completeness || 0) - (a.completeness || 0)
  );
}

class BatchSearchController {
  constructor(sources, keyword) {
    this.keyword = keyword;
    this.aborted = false;
    this.abortController = new AbortController();

    const validSources = sources.filter(s => isValidSourceUrl(s.bookSourceUrl));
    const invalidSources = sources.filter(s => !isValidSourceUrl(s.bookSourceUrl));

    this.invalidSourceDetails = invalidSources.map(s => ({
      sourceUrl: s.bookSourceUrl,
      sourceName: s.bookSourceName,
      success: false,
      resultCount: 0,
      latencyMs: 0,
      error: 'invalid_url',
    }));

    const batchCount = Math.ceil(validSources.length / BATCH_SIZE);
    this.batches = Array.from({ length: batchCount }, (_, i) =>
      validSources.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
    );
    this.totalBatches = this.batches.length;
    this.totalSources = sources.length;

    this.allBooks = [];
    this.allSourceDetails = [...this.invalidSourceDetails];
    this.completedBatches = 0;
    this.completedSources = invalidSources.length;
    this.totalResults = 0;
    this.succeededSources = 0;
    this.failedSources = invalidSources.length;
    this.startTime = Date.now();
    this._lastYieldTime = 0;
    this._pendingYield = false;
  }

  abort() {
    this.aborted = true;
    this.abortController.abort();
  }

  buildProgress() {
    return {
      completedBatches: this.completedBatches,
      totalBatches: this.totalBatches,
      completedSources: this.completedSources,
      totalSources: this.totalSources,
      totalResults: this.totalResults,
      succeededSources: this.succeededSources,
      failedSources: this.failedSources,
      books: [...this.allBooks],
      sourceDetails: [...this.allSourceDetails],
      finished: this.completedBatches >= this.totalBatches,
      elapsedMs: Date.now() - this.startTime,
      aborted: this.aborted,
    };
  }

  _accumulateResult(result) {
    if (result.success) {
      this.succeededSources++;
    } else {
      this.failedSources++;
    }
    if (result.books.length > 0) {
      this.allBooks.push(...result.books);
      this.totalResults += result.books.length;
    }
    this.completedSources++;
    this.allSourceDetails.push({
      sourceUrl: result.source.bookSourceUrl,
      sourceName: result.source.bookSourceName,
      success: result.success,
      resultCount: result.books.length,
      latencyMs: result.latencyMs,
      error: result.error,
    });
  }

  async *execute() {
    for (let i = 0; i < this.batches.length; i++) {
      if (this.aborted) break;

      const batch = this.batches[i];
      const promises = batch.map(source => searchSingleSource(source, this.keyword, this.abortController.signal));

      const settled = await Promise.allSettled(promises);
      let booksChanged = false;

      for (let j = 0; j < settled.length; j++) {
        if (this.aborted) break;
        const entry = settled[j];
        const source = batch[j];
        if (entry.status === 'fulfilled' && entry.value) {
          this._accumulateResult(entry.value);
          if (entry.value.books.length > 0) booksChanged = true;
        } else {
          this.failedSources++;
          this.completedSources++;
          const reason = entry.reason ? (entry.reason.message || String(entry.reason)) : 'unknown error';
          this.allSourceDetails.push({
            sourceUrl: source.bookSourceUrl,
            sourceName: source.bookSourceName,
            success: false,
            resultCount: 0,
            latencyMs: 0,
            error: reason,
          });
        }
      }

      this.completedBatches++;

      if (booksChanged) {
        const deduplicated = mergeBooks([...this.allBooks]);
        this.allBooks = deduplicated;
      }

      yield this.buildProgress();

      if (i < this.batches.length - 1 && !this.aborted) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
  }
}

export { BatchSearchController, BATCH_SIZE };
