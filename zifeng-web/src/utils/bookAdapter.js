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
  if (info.coverUrl) s += 25;        // 提高封面权重（原 15 → 25）
  if (info.intro && info.intro.length > 10) s += 15;  // 提高简介权重（原 10 → 15）
  if (info.kind) s += 5;
  if (info.lastChapter) s += 5;      // 降低最新章节权重（原 10 → 5）
  if (info.wordCount) s += 5;
  if (info.updateTime) s += 5;
  if (info.tocUrl) s += 5;           // 降低目录URL权重（原 10 → 5）
  if (info.chapterCount) s += 5;
  if (info.score) s += 0;            // 评分移到相关性中处理
  return s;
}

/**
 * 计算小说与搜索关键词的相关性评分（满分 30）
 * - 书名完全匹配：30 分
 * - 书名包含关键词：20 分
 * - 作者完全匹配：15 分
 * - 作者包含关键词：10 分
 * - 简介包含关键词：5 分
 * 取最高的一项，不累加
 */
function computeRelevanceScore(info, keyword) {
  if (!keyword || !keyword.trim()) return 0;
  const kw = keyword.trim().toLowerCase();
  let score = 0;

  // 书名匹配
  const name = (info.name || '').toLowerCase();
  if (name === kw) {
    score = Math.max(score, 30);
  } else if (name.includes(kw)) {
    score = Math.max(score, 20);
  }

  // 作者匹配
  const author = (info.author || '').toLowerCase();
  if (author === kw) {
    score = Math.max(score, 15);
  } else if (author.includes(kw)) {
    score = Math.max(score, 10);
  }

  // 简介匹配
  const intro = (info.intro || '').toLowerCase();
  if (intro.includes(kw)) {
    score = Math.max(score, 5);
  }

  return score;
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

export {
  adaptSearchResult,
  adaptBookInfo,
  computeCompleteness,
  computeRelevanceScore,
};
