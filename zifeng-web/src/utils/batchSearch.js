import { searchBooksAPI } from './apiClient';
import { adaptSearchResult, computeCompleteness } from './bookAdapter';

const DEFAULT_SOURCE_TIMEOUT_MS = 8000;
const BATCH_DELAY_MS = 100;

const searchCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCacheKey(source, keyword) {
  return `${source.bookSourceUrl}::${keyword}`;
}

function getCachedResult(source, keyword) {
  const key = getCacheKey(source, keyword);
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.result;
  }
  if (entry) {
    searchCache.delete(key);
  }
  return null;
}

function setCachedResult(source, keyword, result) {
  const key = getCacheKey(source, keyword);
  searchCache.set(key, { result, timestamp: Date.now() });
  if (searchCache.size > 500) {
    const oldestKey = searchCache.keys().next().value;
    searchCache.delete(oldestKey);
  }
}

function computeBatchSize(sourceCount) {
  return Math.min(Math.max(Math.ceil(sourceCount / 3), 5), 10);
}

function isValidSourceUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\/[a-zA-Z0-9]/.test(url.trim());
}

function normalizeForDedup(name, author) {
  return (name || '').replace(/[\s\-_.,()（）\[\]【】]/g, '').toLowerCase()
    + '_' + (author || '').replace(/[\s\-_.,·]/g, '').toLowerCase();
}

function searchSingleSource(source, keyword, signal, timeoutMs = DEFAULT_SOURCE_TIMEOUT_MS) {
  const cached = getCachedResult(source, keyword);
  if (cached) {
    return Promise.resolve({ ...cached, fromCache: true });
  }

  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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

        const searchResult = {
          source,
          success: true,
          books: adapted,
          latencyMs: result.latencyMs || 0,
          error: null,
        };
        setCachedResult(source, keyword, searchResult);
        return searchResult;
      }
      return { source, success: false, books: [], latencyMs: 0, error: result.message || result.errorType || 'parse failed' };
    })
    .catch(err => {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { source, success: false, books: [], latencyMs: timeoutMs, error: 'timeout' };
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
  constructor(sources, keyword, options = {}) {
    this.keyword = keyword;
    this.aborted = false;
    this.abortController = new AbortController();
    this.timeoutMs = options.timeoutMs || DEFAULT_SOURCE_TIMEOUT_MS;

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

    const batchSize = computeBatchSize(validSources.length);
    const batchCount = Math.ceil(validSources.length / batchSize);
    this.batches = Array.from({ length: batchCount }, (_, i) =>
      validSources.slice(i * batchSize, (i + 1) * batchSize)
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
      finished: this.completedSources >= this.totalSources,
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
      fromCache: result.fromCache || false,
    });
  }

  async *execute() {
    for (let i = 0; i < this.batches.length; i++) {
      if (this.aborted) break;

      const batch = this.batches[i];
      const pending = new Map();
      for (let j = 0; j < batch.length; j++) {
        const source = batch[j];
        const promise = searchSingleSource(source, this.keyword, this.abortController.signal, this.timeoutMs);
        pending.set(j, { source, promise });
      }

      while (pending.size > 0) {
        if (this.aborted) break;

        const entries = Array.from(pending.entries());
        const indexedPromises = entries.map(([origIndex, v]) =>
          v.promise.then(
            val => ({ origIndex, status: 'fulfilled', value: val, source: v.source }),
            err => ({ origIndex, status: 'rejected', reason: err, source: v.source })
          )
        );

        const firstSettled = await Promise.race(indexedPromises);

        if (this.aborted) break;

        const { origIndex } = firstSettled;
        pending.delete(origIndex);

        if (firstSettled.status === 'fulfilled' && firstSettled.value) {
          this._accumulateResult(firstSettled.value);
          if (firstSettled.value.books.length > 0) {
            const deduplicated = mergeBooks([...this.allBooks]);
            this.allBooks = deduplicated;
          }
        } else {
          this.failedSources++;
          this.completedSources++;
          const reason = firstSettled.reason
            ? (firstSettled.reason.message || String(firstSettled.reason))
            : 'unknown error';
          this.allSourceDetails.push({
            sourceUrl: firstSettled.source.bookSourceUrl,
            sourceName: firstSettled.source.bookSourceName,
            success: false,
            resultCount: 0,
            latencyMs: 0,
            error: reason,
          });
        }

        if (pending.size === 0) {
          this.completedBatches++;
        }

        yield this.buildProgress();
      }

      if (i < this.batches.length - 1 && !this.aborted) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
  }
}

export { BatchSearchController, computeBatchSize, DEFAULT_SOURCE_TIMEOUT_MS };
