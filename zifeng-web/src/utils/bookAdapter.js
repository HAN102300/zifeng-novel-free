const ENABLE_ADAPTER = true;

const FIELDS = {
  name: ['name', 'bookName', 'title', 'book_name'],
  author: ['author', 'authorName', 'bookAuthor', 'author_name'],
  bookUrl: ['bookUrl', '_sourceUrl', 'url', 'book_url', 'detailUrl'],
  coverUrl: ['coverUrl', 'cover', 'cover_url', 'imgUrl', 'picUrl', 'imageUrl'],
  intro: ['intro', 'summary', 'description', 'desc', 'bookIntro'],
  kind: ['kind', 'category', 'type', 'genre', 'bookKind'],
  lastChapter: ['lastChapter', 'latestChapter', 'last_chapter', 'newChapter'],
  wordCount: ['wordCount', 'wordNum', 'word', 'words', 'word_count'],
  updateTime: ['updateTime', 'lastUpdateTime', 'lastUpdate', 'update_time', 'updatedAt'],
  tocUrl: ['tocUrl', 'toc_url', 'chapterUrl'],
  score: ['score', 'rating', 'rate', 'averageScore'],
  chapterCount: ['chapterCount', 'chapterNum', 'totalChapter', 'chapter_count'],
};

function pickFirst(obj, candidates) {
  if (!obj || typeof obj !== 'object') return '';
  for (const key of candidates) {
    if (obj[key] != null && obj[key] !== '') {
      const val = Array.isArray(obj[key]) ? obj[key][0] || '' : obj[key];
      return String(val).trim();
    }
  }
  return '';
}

function resolveUrl(baseUrl, url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('//')) return 'https:' + url;
  if (!baseUrl) return url;
  const base = baseUrl.replace(/\/+$/, '');
  if (url.startsWith('/')) return base + url;
  return base + '/' + url;
}

function adaptSearchResult(rawItem, source = {}) {
  if (!rawItem || typeof rawItem !== 'object') return null;

  const sourceUrl = source.bookSourceUrl || '';
  const sourceName = source.bookSourceName || '';

  const name = pickFirst(rawItem, FIELDS.name);
  if (!name) return null;

  const author = pickFirst(rawItem, FIELDS.author);
  const rawBookUrl = pickFirst(rawItem, FIELDS.bookUrl);
  const rawCoverUrl = pickFirst(rawItem, FIELDS.coverUrl);
  const intro = pickFirst(rawItem, FIELDS.intro);
  const kind = pickFirst(rawItem, FIELDS.kind);
  const lastChapter = pickFirst(rawItem, FIELDS.lastChapter);
  const wordCount = pickFirst(rawItem, FIELDS.wordCount);
  const updateTime = pickFirst(rawItem, FIELDS.updateTime);
  const tocUrl = pickFirst(rawItem, FIELDS.tocUrl);
  const score = pickFirst(rawItem, FIELDS.score);
  const chapterCount = pickFirst(rawItem, FIELDS.chapterCount);

  const bookUrl = resolveUrl(sourceUrl, rawBookUrl);
  const coverUrl = resolveUrl(sourceUrl, rawCoverUrl);

  return {
    id: bookUrl || Math.random().toString(36).slice(2),
    name,
    author,
    bookUrl,
    coverUrl,
    cover: coverUrl,
    intro,
    kind,
    lastChapter,
    wordCount,
    updateTime,
    tocUrl: resolveUrl(sourceUrl, tocUrl),
    score,
    chapterCount,
    sourceUrl,
    sourceName,
    sourceTag: sourceName,
    availableSourceNames: [sourceName],
    completeness: computeCompleteness({ name, author, coverUrl, intro, kind, lastChapter, wordCount, updateTime, tocUrl, score, chapterCount }),
    _raw: rawItem._rawItem || rawItem._raw || rawItem,
  };
}

function computeCompleteness(info) {
  let s = 0;
  if (info.name) s += 15;
  if (info.author) s += 15;
  if (info.coverUrl) s += 15;
  if (info.intro && info.intro.length > 10) s += 10;
  if (info.kind) s += 5;
  if (info.lastChapter) s += 10;
  if (info.wordCount) s += 5;
  if (info.updateTime) s += 5;
  if (info.tocUrl) s += 10;
  if (info.chapterCount) s += 5;
  if (info.score) s += 5;
  return s;
}

function adaptAggregatedSearch(aggregatedResponse) {
  if (!aggregatedResponse || !aggregatedResponse.books) return { books: [], sourceDetails: [], summary: '' };

  return {
    keyword: aggregatedResponse.keyword,
    books: aggregatedResponse.books.map(b => ({
      ...b,
      cover: b.coverUrl,
      sourceTag: b.availableSourceNames?.join(', ') || b.sourceName,
      completeness: b.completeness || computeCompleteness(b),
    })),
    sourceDetails: aggregatedResponse.sourceDetails || [],
    summary: `${aggregatedResponse.deduplicatedResults} 条结果 (来自 ${aggregatedResponse.succeededSources}/${aggregatedResponse.totalSources} 个书源, ${aggregatedResponse.elapsedMs}ms)`,
    meta: {
      totalSources: aggregatedResponse.totalSources,
      succeededSources: aggregatedResponse.succeededSources,
      failedSources: aggregatedResponse.failedSources,
      totalResults: aggregatedResponse.totalResults,
      deduplicatedResults: aggregatedResponse.deduplicatedResults,
      elapsedMs: aggregatedResponse.elapsedMs,
    },
  };
}

function mergeSearchResults(resultsFromMultipleSources) {
  const merged = {};

  for (const { source, results } of resultsFromMultipleSources) {
    for (const book of results) {
      const key = normalizeForDedup(book.name, book.author);
      if (merged[key]) {
        merged[key] = mergeBooks(merged[key], book);
      } else {
        merged[key] = { ...book };
      }
    }
  }

  return Object.values(merged).map(b => ({
    ...b,
    sourceTag: b.availableSourceNames?.join(', ') || b.sourceName,
  }));
}

function normalizeForDedup(name, author) {
  return (name || '').replace(/[\s\-_.,()（）\[\]【】]/g, '').toLowerCase()
    + '_' + (author || '').replace(/[\s\-_.,·]/g, '').toLowerCase();
}

function mergeBooks(existing, incoming) {
  const merged = { ...existing };

  if (!merged.coverUrl && incoming.coverUrl) {
    merged.coverUrl = incoming.coverUrl;
    merged.cover = incoming.coverUrl;
    (merged.extra || (merged.extra = {})).coverUrl_source = incoming.sourceName;
  }
  if ((!merged.intro || merged.intro.length < 10) && incoming.intro && incoming.intro.length > 10) {
    merged.intro = incoming.intro;
    (merged.extra || (merged.extra = {})).intro_source = incoming.sourceName;
  }
  if (!merged.kind && incoming.kind) merged.kind = incoming.kind;
  if (!merged.lastChapter && incoming.lastChapter) merged.lastChapter = incoming.lastChapter;
  if (!merged.wordCount && incoming.wordCount) merged.wordCount = incoming.wordCount;
  if (!merged.updateTime && incoming.updateTime) merged.updateTime = incoming.updateTime;
  if (!merged.tocUrl && incoming.tocUrl) merged.tocUrl = incoming.tocUrl;
  if (!merged.chapterCount && incoming.chapterCount) merged.chapterCount = incoming.chapterCount;
  if (!merged.score && incoming.score) merged.score = incoming.score;

  if (!merged.availableSourceNames.includes(incoming.sourceName)) {
    merged.availableSourceNames.push(incoming.sourceName);
  }
  merged.completeness = computeCompleteness(merged);

  return merged;
}

function adaptBookInfo(rawInfo, source = {}) {
  if (!rawInfo || typeof rawInfo !== 'object') return null;

  const sourceUrl = source.bookSourceUrl || '';
  const sourceName = source.bookSourceName || '';

  const name = pickFirst(rawInfo, FIELDS.name);
  if (!name) return null;

  const author = pickFirst(rawInfo, FIELDS.author);
  const rawCoverUrl = pickFirst(rawInfo, FIELDS.coverUrl);
  const intro = pickFirst(rawInfo, FIELDS.intro);
  const kind = pickFirst(rawInfo, FIELDS.kind);
  const lastChapter = pickFirst(rawInfo, FIELDS.lastChapter);
  const wordCount = pickFirst(rawInfo, FIELDS.wordCount);
  const updateTime = pickFirst(rawInfo, FIELDS.updateTime);
  const rawTocUrl = pickFirst(rawInfo, FIELDS.tocUrl);
  const score = pickFirst(rawInfo, FIELDS.score);
  const chapterCount = pickFirst(rawInfo, FIELDS.chapterCount);

  return {
    name,
    author,
    coverUrl: resolveUrl(sourceUrl, rawCoverUrl),
    intro,
    kind,
    lastChapter,
    wordCount,
    updateTime,
    tocUrl: resolveUrl(sourceUrl, rawTocUrl),
    score,
    chapterCount,
    sourceUrl,
    sourceName,
  };
}

function adaptChapterList(rawChapters = []) {
  if (!Array.isArray(rawChapters)) return [];
  return rawChapters.map((ch, idx) => {
    if (!ch || typeof ch !== 'object') {
      return { name: String(ch), url: '', index: idx };
    }
    return {
      name: ch.name || ch.chapterName || ch.title || `第${idx + 1}章`,
      url: ch.url || ch.chapterUrl || ch.href || '',
      index: ch.index != null ? ch.index : idx,
      isVip: !!ch.isVip,
      isPay: !!ch.isPay,
      isVolume: !!ch.isVolume,
    };
  }).filter(ch => ch.name);
}

function adaptContent(rawContent) {
  if (!rawContent) return '';
  if (typeof rawContent === 'string') return rawContent;
  if (Array.isArray(rawContent)) return rawContent.join('\n');
  return String(rawContent);
}

function toSearchResultFormat(unified) {
  if (!unified) return null;
  return {
    id: unified.id,
    name: unified.name,
    author: unified.author,
    coverUrl: unified.coverUrl,
    cover: unified.coverUrl,
    intro: unified.intro,
    summary: unified.intro,
    lastChapter: unified.lastChapter,
    wordNum: unified.wordCount,
    wordCount: unified.wordCount,
    category: unified.kind,
    kind: unified.kind,
    _sourceUrl: unified.bookUrl,
    bookUrl: unified.bookUrl,
    sourceUrl: unified.sourceUrl,
    sourceName: unified.sourceName,
    _raw: unified._raw,
  };
}

function toDetailFormat(unified) {
  if (!unified) return null;
  return {
    name: unified.name,
    author: unified.author,
    coverUrl: unified.coverUrl,
    intro: unified.intro,
    kind: unified.kind,
    lastChapter: unified.lastChapter,
    wordCount: unified.wordCount,
    updateTime: unified.updateTime,
    tocUrl: unified.tocUrl,
    score: unified.score,
    chapterCount: unified.chapterCount,
    sourceUrl: unified.sourceUrl,
    sourceName: unified.sourceName,
  };
}

export {
  ENABLE_ADAPTER,
  adaptSearchResult,
  adaptBookInfo,
  adaptChapterList,
  adaptContent,
  toSearchResultFormat,
  toDetailFormat,
  resolveUrl,
  adaptAggregatedSearch,
  mergeSearchResults,
  computeCompleteness,
};
