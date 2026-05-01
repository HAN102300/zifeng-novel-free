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

const novelCacheMap = new Map();
const readerCacheMap = new Map();
const CACHE_TTL = 86400000;

function saveNovelCache(bookData, sourceUrl, bookUrl) {
  const key = simpleHash(sourceUrl + '_' + (bookUrl || ''));
  novelCacheMap.set(key, {
    bookData,
    sourceUrl,
    bookUrl,
    timestamp: Date.now(),
  });
  return key;
}

function loadNovelCache(sourceUrl, bookUrl) {
  const key = simpleHash(sourceUrl + '_' + (bookUrl || ''));
  const data = novelCacheMap.get(key);
  if (!data) return null;
  if (Date.now() - data.timestamp > CACHE_TTL) {
    novelCacheMap.delete(key);
    return null;
  }
  return data;
}

function saveReaderCache(bookData, sourceUrl, bookUrl, tocUrl, chapters) {
  const key = simpleHash(sourceUrl + '_' + (bookUrl || ''));
  readerCacheMap.set(key, {
    bookData,
    sourceUrl,
    bookUrl,
    tocUrl,
    chapters,
    timestamp: Date.now(),
  });
  return key;
}

function loadReaderCache(sourceUrl, bookUrl) {
  const key = simpleHash(sourceUrl + '_' + (bookUrl || ''));
  const data = readerCacheMap.get(key);
  if (!data) return null;
  if (Date.now() - data.timestamp > CACHE_TTL) {
    readerCacheMap.delete(key);
    return null;
  }
  return data;
}

function cleanLocalStorageCache() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('novel_cache_') || k.startsWith('reader_cache_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`Cleaned ${keysToRemove.length} localStorage cache entries`);
    }
  } catch (e) {
    console.warn('Failed to clean localStorage cache:', e);
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
  cleanLocalStorageCache,
  getDefaultSource,
  isDefaultSource,
};
