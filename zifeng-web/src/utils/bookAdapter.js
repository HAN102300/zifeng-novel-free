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
};
