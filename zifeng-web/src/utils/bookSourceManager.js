import CRYPTO_CONFIG from "./cryptoConfig";
import { parseHeaders } from "./headers";

const STORAGE_KEY = "zifeng_book_sources";
const ACTIVE_SOURCE_KEY = "zifeng_active_source";

const DEFAULT_SOURCE = {
  bookSourceName: "猫眼看书",
  bookSourceUrl: "http://api.jmlldsc.com",
  bookSourceType: 0,
  bookSourceGroup: "默认",
  enabled: true,
  header: `{\n'User-Agent': 'okhttp/4.9.2','client-device': '2d37f6b5b6b2605373092c3dc65a3b39','client-brand': 'Redmi','client-version': '2.3.0','client-name': 'app.maoyankanshu.novel','client-source': 'android','Authorization': '${CRYPTO_CONFIG.MAOYAN_AUTH_TOKEN}'\n}`,
  searchUrl: "/search?page={{page}}&keyword={{key}}",
  ruleSearch: {
    author: "$.authorName",
    bookList: "$.data[*]",
    bookUrl: "/novel/{{$.novelId}}?isSearch=1",
    coverUrl: "$.cover",
    intro: "$.summary",
    kind: "{{$..className}},{{$.averageScore}}分",
    lastChapter: "",
    name: "$.novelName",
    wordCount: "$.wordNum",
  },
  ruleBookInfo: {
    author: "$.authorName",
    coverUrl: "$..cover",
    init: "$.data",
    intro: "$..summary",
    kind: "{{$.lastChapter.decTime}},{{$.averageScore}}分,{{$.className}},{{$..tagName}}",
    lastChapter: "$.lastChapter.chapterName",
    name: "$.novelName",
    score: "$.averageScore",
    chapterCount: "$.chapterNum",
    lastUpdateTime: "$.lastChapter.decTime",
    tocUrl: "/novel/{{$.novelId}}/chapters?readNum=1",
    wordCount: "$.wordNum",
  },
  ruleToc: {
    chapterList: "$.data.list[*]",
    chapterName: "$.chapterName",
    chapterUrl: `$.path@js:java.aesBase64DecodeToString(result,"${CRYPTO_CONFIG.MAOYAN_KEY}","AES/CBC/PKCS5Padding","${CRYPTO_CONFIG.MAOYAN_IV}")`,
    updateTime: "{{$.updatedAt}} 字数：{{$.wordNum}}",
  },
  ruleContent: {
    content: "$.content",
    replaceRegex: "##一秒记住.*精彩阅读。|7017k",
  },
};

export const getDefaultSource = () => ({ ...DEFAULT_SOURCE });

/**
 * 将后端返回的书源中字符串类型的 rule 字段反序列化为对象
 * 后端数据库中 ruleSearch/ruleBookInfo/ruleToc/ruleContent/header 等字段存储为 JSON 字符串
 * parser 要求这些字段必须是对象，否则验证失败
 */
export const normalizeSource = (source) => {
  if (!source || typeof source !== 'object') return source;
  const ruleFields = ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore', 'header', 'loginUi'];
  const normalized = { ...source };
  for (const field of ruleFields) {
    if (typeof normalized[field] === 'string' && normalized[field].trim()) {
      try {
        normalized[field] = JSON.parse(normalized[field]);
      } catch {
        // 解析失败保留原值
      }
    }
  }
  return normalized;
};

/**
 * 批量规范化书源列表
 */
export const normalizeSources = (sources) => {
  if (!Array.isArray(sources)) return sources;
  return sources.map(normalizeSource);
};

export const getBookSources = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [DEFAULT_SOURCE];
    const sources = JSON.parse(data);
    if (!sources || sources.length === 0) return [DEFAULT_SOURCE];
    return sources;
  } catch {
    return [DEFAULT_SOURCE];
  }
};

export const saveBookSources = (sources) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    return true;
  } catch (e) {
    console.error("保存书源失败:", e);
    return false;
  }
};

export const toggleBookSource = (bookSourceUrl, enabled) => {
  const sources = getBookSources();
  const source = sources.find((s) => s.bookSourceUrl === bookSourceUrl);
  if (source) {
    source.enabled = enabled;
    saveBookSources(sources);
  }
  return sources;
};

export const getActiveSource = () => {
  try {
    const activeUrl = localStorage.getItem(ACTIVE_SOURCE_KEY);
    if (!activeUrl) return DEFAULT_SOURCE;
    const sources = getBookSources();
    let source = sources.find((s) => s.bookSourceUrl === activeUrl);
    if (!source) {
      const normalizeUrl = (url) =>
        (url || "")
          .replace(/^https?:\/\//, "")
          .replace(/\/+$/, "")
          .toLowerCase();
      const norm = normalizeUrl(activeUrl);
      source = sources.find((s) => normalizeUrl(s.bookSourceUrl) === norm);
    }
    return source || DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
};

export const setActiveSource = (bookSourceUrl) => {
  localStorage.setItem(ACTIVE_SOURCE_KEY, bookSourceUrl);
};
