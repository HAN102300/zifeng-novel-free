import { getDefaultSource as _getDefaultSource } from './bookSourceManager';
import CRYPTO_CONFIG from './cryptoConfig';

const MAOYAN_DECRYPT = {
  key: CRYPTO_CONFIG.MAOYAN_KEY,
  iv: CRYPTO_CONFIG.MAOYAN_IV,
};

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function saveNovelCache(bookData, sourceUrl, bookUrl) {
  const key = `novel_cache_${simpleHash(sourceUrl + '_' + (bookUrl || ''))}`;
  const cacheData = {
    bookData,
    sourceUrl,
    bookUrl,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to save novel cache:', e);
  }
  return key;
}

function loadNovelCache(sourceUrl, bookUrl) {
  const key = `novel_cache_${simpleHash(sourceUrl + '_' + (bookUrl || ''))}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > 86400000) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveReaderCache(bookData, sourceUrl, bookUrl, tocUrl, chapters) {
  const key = `reader_cache_${simpleHash(sourceUrl + '_' + (bookUrl || ''))}`;
  const cacheData = {
    bookData,
    sourceUrl,
    bookUrl,
    tocUrl,
    chapters,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (e) {
    console.warn('Failed to save reader cache:', e);
  }
  return key;
}

function loadReaderCache(sourceUrl, bookUrl) {
  const key = `reader_cache_${simpleHash(sourceUrl + '_' + (bookUrl || ''))}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > 86400000) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function getDefaultSource() {
  return _getDefaultSource();
}

function isDefaultSource(sourceUrl) {
  return sourceUrl === _getDefaultSource().bookSourceUrl;
}

export {
  MAOYAN_DECRYPT,
  simpleHash,
  saveNovelCache,
  loadNovelCache,
  saveReaderCache,
  loadReaderCache,
  getDefaultSource,
  isDefaultSource,
};
