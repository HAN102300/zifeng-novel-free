import { searchBooksAPI, getContentAPI, getTocAPI, getBookInfoAPI, checkServerHealth, isServerAvailable, proxyRequest } from './apiClient';

export const searchWithServer = async (source, keyword, page = 1) => {
  try {
    const result = await searchBooksAPI(source, keyword, page);
    if (result.success) {
      return result.results || [];
    }
    return [];
  } catch (e) {
    console.warn('服务端搜索失败:', e.message);
    return [];
  }
};

export const getBookInfoWithServer = async (source, bookUrl, bookData = null) => {
  try {
    const result = await getBookInfoAPI(source, bookUrl, bookData);
    if (result.success) {
      return result.bookInfo;
    }
    return null;
  } catch (e) {
    console.warn('服务端获取详情失败:', e.message);
    return null;
  }
};

export const getTocWithServer = async (source, tocUrl) => {
  try {
    const result = await getTocAPI(source, tocUrl);
    if (result.success) {
      return result.chapters || [];
    }
    return [];
  } catch (e) {
    console.warn('服务端获取目录失败:', e.message);
    return [];
  }
};

export const getContentWithServer = async (source, chapterUrl) => {
  try {
    const result = await getContentAPI(source, chapterUrl);
    if (result.success) {
      return result.content || '';
    }
    return '';
  } catch (e) {
    console.warn('服务端获取内容失败:', e.message);
    return '';
  }
};

const CORS_PROXIES = [
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

export const fetchWithCorsProxy = async (url, options = {}) => {
  try {
    const result = await proxyRequest(url);
    return { ok: true, text: async () => result, json: async () => result };
  } catch {}

  for (const makeProxy of CORS_PROXIES) {
    try {
      const proxyUrl = makeProxy(url);
      const response = await fetch(proxyUrl, { ...options, signal: options.signal || AbortSignal.timeout(12000) });
      if (response.ok) return response;
    } catch {
      continue;
    }
  }

  try {
    const response = await fetch(url, { ...options, signal: options.signal || AbortSignal.timeout(8000) });
    return response;
  } catch (e) {
    throw new Error(`请求失败：${e.message}`);
  }
};

export { checkServerHealth, isServerAvailable };
