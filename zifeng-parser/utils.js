const RETRYABLE_ERRORS = [
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "EPROTO",
  "ERR_BAD_RESPONSE",
];

const NON_RETRYABLE_ERRORS = [
  "ENOTFOUND",
  "ECONNREFUSED",
];

const MAX_RETRIES = 2;
const RETRY_DELAY_BASE = 800;

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
  // 如果已经是对象，直接返回
  if (typeof headerStr === 'object') return headerStr;
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
  if (NON_RETRYABLE_ERRORS.some((e) => code === e || message.includes(e)))
    return false;
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

function validateSource(source) {
  const errors = [];

  if (!source || typeof source !== 'object') {
    errors.push('source必须是对象');
    return { valid: false, errors };
  }

  if (!source.bookSourceUrl || typeof source.bookSourceUrl !== 'string') {
    errors.push('缺少bookSourceUrl');
  } else if (source.bookSourceUrl.length > 2000) {
    errors.push('bookSourceUrl超过最大长度');
  }

  if (!source.bookSourceName || typeof source.bookSourceName !== 'string') {
    errors.push('缺少bookSourceName');
  }

  const ruleFields = ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore'];
  for (const field of ruleFields) {
    if (source[field] && typeof source[field] !== 'object') {
      errors.push(`${field}必须是对象`);
    }
  }

  if (source.jsLib && typeof source.jsLib !== 'string') {
    errors.push('jsLib必须是字符串');
  } else if (source.jsLib && source.jsLib.length > 50000) {
    errors.push('jsLib超过最大长度限制(50KB)');
  }

  if (source.header && typeof source.header === 'string' && source.header.length > 10000) {
    errors.push('header超过最大长度限制(10KB)');
  }

  if (source.loginUrl && typeof source.loginUrl === 'string' && source.loginUrl.length > 5000) {
    errors.push('loginUrl超过最大长度限制(5KB)');
  }

  if (source.searchUrl && typeof source.searchUrl === 'string' && source.searchUrl.length > 5000) {
    errors.push('searchUrl超过最大长度限制(5KB)');
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  resolveUrl,
  parseHeaders,
  sleep,
  isRetryableError,
  classifyError,
  createTTLMap,
  validateSource,
  RETRYABLE_ERRORS,
  NON_RETRYABLE_ERRORS,
  MAX_RETRIES,
  RETRY_DELAY_BASE,
};
