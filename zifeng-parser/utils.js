const RETRYABLE_ERRORS = [
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
  "EPROTO",
  "ERR_BAD_RESPONSE",
];

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

function resolveUrl(baseUrl, relativePath) {
  if (!relativePath) return baseUrl;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  if (relativePath.startsWith('//')) {
    return 'https:' + relativePath;
  }
  try {
    const base = baseUrl.replace(/\/+$/, '');
    if (relativePath.startsWith('/')) {
      const urlObj = new URL(base);
      const qIdx = relativePath.indexOf('?');
      if (qIdx >= 0) {
        urlObj.pathname = relativePath.substring(0, qIdx);
        urlObj.search = relativePath.substring(qIdx);
      } else {
        urlObj.pathname = relativePath;
      }
      return urlObj.href;
    }
    if (base.endsWith('/')) {
      return new URL(relativePath, base).href;
    }
    return new URL(relativePath, base + '/').href;
  } catch {
    return baseUrl.replace(/\/+$/, '') + '/' + relativePath.replace(/^\/+/, '');
  }
}

function parseHeaders(headerStr) {
  if (!headerStr) return {};
  if (headerStr.includes("<js>")) return {};

  try {
    const cleaned = headerStr.replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {
    try {
      const headers = {};
      const content = headerStr.replace(/^\s*\{/, '').replace(/\}\s*$/, '').trim();
      const pairs = content.split(/,(?=[\s]*[\w-]+\s*:)/);
      for (const pair of pairs) {
        const colonIdx = pair.indexOf(":");
        if (colonIdx > 0) {
          const key = pair.slice(0, colonIdx).trim().replace(/['"]/g, '');
          const value = pair.slice(colonIdx + 1).trim().replace(/['"]/g, '');
          if (key) headers[key] = value;
        }
      }
      return headers;
    } catch {
      return {};
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error) {
  if (!error) return false;
  const code = error.code || "";
  const message = error.message || "";
  if (RETRYABLE_ERRORS.some((e) => code === e || message.includes(e)))
    return true;
  if (error.response && error.response.status >= 500) return true;
  if (
    message.includes("socket disconnected") ||
    message.includes("connect ETIMEDOUT")
  )
    return true;
  return false;
}

function classifyError(error) {
  const msg = error.message || String(error);
  if (error.code === 'ECONNABORTED' || msg.includes('timeout')) return { type: 'timeout', message: '请求超时' };
  if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || msg.includes('SSL')) return { type: 'ssl', message: 'SSL证书错误' };
  if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('WAF') || msg.includes('cloudflare')) return { type: 'waf', message: 'WAF防护/访问被拒' };
  if (msg.includes('401') || msg.includes('Unauthorized')) return { type: 'auth', message: '需要认证' };
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('network')) return { type: 'network', message: '网络错误' };
  return { type: 'parse', message: '解析错误' };
}

function createTTLMap(cleanupInterval = 30 * 60 * 1000, maxAge = 2 * 60 * 60 * 1000, maxSize = 1000) {
  const map = new Map();

  const cleanup = () => {
    const now = Date.now();
    for (const [key, value] of map) {
      if (value && value._ttl && now > value._ttl) {
        map.delete(key);
      }
    }
    if (map.size > maxSize * 2) {
      const keys = [...map.keys()].slice(0, map.size - maxSize);
      keys.forEach(k => map.delete(k));
    }
  };

  const timer = setInterval(cleanup, cleanupInterval);
  if (timer.unref) timer.unref();

  return {
    get(key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (entry._ttl && Date.now() > entry._ttl) {
        map.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, ttlMs) {
      map.set(key, {
        value,
        _ttl: ttlMs ? Date.now() + ttlMs : null,
      });
    },
    has(key) {
      return this.get(key) !== undefined;
    },
    delete(key) {
      return map.delete(key);
    },
    get size() {
      return map.size;
    },
    entries() {
      return map.entries();
    },
    keys() {
      return map.keys();
    },
    values() {
      return map.values();
    },
    forEach(callback) {
      map.forEach((entry, key) => {
        if (!entry._ttl || Date.now() <= entry._ttl) {
          callback(entry.value, key);
        }
      });
    },
    clear() {
      map.clear();
    },
  };
}

module.exports = {
  resolveUrl,
  parseHeaders,
  sleep,
  isRetryableError,
  classifyError,
  createTTLMap,
  RETRYABLE_ERRORS,
  MAX_RETRIES,
  RETRY_DELAY_BASE,
};
