const axios = require("axios");
const crypto = require("crypto");
const iconv = require("iconv-lite");
const OpenCC = require("opencc-js");
const t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
const { parseHeaders, createTTLMap } = require("./utils");

const sourceVariables = new Map();
const cookieStore = new Map();
const cacheStore = new Map();

const MAX_MAP_SIZE = 1000;
const MAP_CLEANUP_INTERVAL = 10 * 60 * 1000;

function cleanupMap(map, maxAge = 30 * 60 * 1000) {
  const now = Date.now();
  for (const [key, value] of map) {
    if (value && value._timestamp && (now - value._timestamp > maxAge)) {
      map.delete(key);
    }
  }
  if (map.size > MAX_MAP_SIZE * 2) {
    const keys = [...map.keys()].slice(0, map.size - MAX_MAP_SIZE);
    keys.forEach(k => map.delete(k));
  }
}

setInterval(() => {
  cleanupMap(sourceVariables);
  cleanupMap(cookieStore);
  cleanupMap(cacheStore);
}, MAP_CLEANUP_INTERVAL);

let _browserInstance = null;
let _browserLaunchPromise = null;

async function getBrowserInstance() {
  if (_browserInstance && _browserInstance.connected) {
    return _browserInstance;
  }
  if (_browserLaunchPromise) {
    return _browserLaunchPromise;
  }
  _browserLaunchPromise = (async () => {
    try {
      const puppeteer = require("puppeteer");
      const chromePaths = [
        process.env.CHROME_PATH,
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        process.env.LOCALAPPDATA + "/Google/Chrome/Application/chrome.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        process.env.LOCALAPPDATA + "/Microsoft/Edge/Application/msedge.exe",
      ].filter(Boolean);
      let executablePath = null;
      const fs = require("fs");
      for (const p of chromePaths) {
        try { if (fs.existsSync(p)) { executablePath = p; break; } } catch {}
      }
      _browserInstance = await puppeteer.launch({
        headless: "new",
        executablePath,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
      _browserInstance.on("disconnected", () => {
        _browserInstance = null;
        _browserLaunchPromise = null;
      });
      return _browserInstance;
    } catch (e) {
      console.warn("[PUPPETEER] Failed to launch browser:", e.message);
      _browserLaunchPromise = null;
      throw e;
    }
  })();
  return _browserLaunchPromise;
}

function simpleJsonPath(data, path) {
  if (!path || data == null) return "";
  let p = path.trim();
  if (p.startsWith("$.")) p = p.slice(2);
  else if (p.startsWith("$..")) {
    p = p.slice(3);
  } else if (p.startsWith("$")) p = p.slice(1);
  if (!p) return data != null ? String(data) : "";
  const parts = p.split(/\.|\[(\d+)\]/).filter(Boolean);
  let result = data;
  for (const part of parts) {
    if (result == null) return "";
    const idx = parseInt(part);
    result = isNaN(idx) ? result[part] : result[idx];
  }
  return result != null ? String(result) : "";
}

const AJAX_MAX_RETRIES = 2;
const AJAX_RETRY_DELAY = 800;

function isAjaxRetryableError(error) {
  if (!error) return false;
  const code = error.code || "";
  const message = error.message || "";
  return ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].some(
    (e) => code === e || message.includes(e),
  );
}

function createJavaShim(baseUrl, sourceData = {}, requestContext = {}) {
  const requestVars = requestContext._ruleVariables || new Map();
  const contextHtml = requestContext.contextHtml || '';

  const put = (key, value) => {
    requestVars.set(key, value);
    if (requestContext._ruleVariables) {
      requestContext._ruleVariables = requestVars;
    }
  };

  const get = (key) => {
    if (requestVars.has(key)) return requestVars.get(key);
    return sourceVariables.get(key) || '';
  };

  const sourceHeaders = parseHeaders(sourceData.header);

  const ajax = async (url, headers) => {
    let fullUrl = url;
    let ajaxOptions = {};
    let useWebView = false;
    let customCharset = "";
    let customMethod = "GET";
    let customBody = "";
    let customHeaders = {};

    if (typeof fullUrl === "string" && fullUrl.includes(",")) {
      const commaIdx = fullUrl.indexOf(",");
      const urlPart = fullUrl.slice(0, commaIdx).trim();
      const optionStr = fullUrl.slice(commaIdx + 1).trim();
      fullUrl = urlPart;
      try {
        const parsed = JSON.parse(optionStr.replace(/'/g, '"'));
        ajaxOptions = parsed;
        if (parsed.webView) useWebView = true;
        if (parsed.charset) customCharset = parsed.charset;
        if (parsed.method) customMethod = parsed.method;
        if (parsed.body) customBody = parsed.body;
        if (parsed.headers) customHeaders = parsed.headers;
      } catch {}
    }

    if (!fullUrl.startsWith("http")) {
      fullUrl = baseUrl + (fullUrl.startsWith("/") ? "" : "/") + fullUrl;
    }

    if (useWebView) {
      try {
        const browser = await getBrowserInstance();
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36"
        );
        if (customHeaders["Referer"]) {
          await page.setExtraHTTPHeaders({ Referer: customHeaders["Referer"] });
        }
        await page.goto(fullUrl, { waitUntil: "networkidle2", timeout: 30000 });
        await new Promise((r) => setTimeout(r, 2000));
        const html = await page.content();
        const cookies = await page.cookies();
        for (const c of cookies) {
          cookieStore.set(c.name, { value: c.value, _timestamp: Date.now() });
        }
        await page.close();
        return html;
      } catch (e) {
        console.warn("java.ajax webView failed:", e.message, fullUrl);
        return "";
      }
    }

    const mergedHeaders = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate",
      Referer: baseUrl,
      ...sourceHeaders,
      ...(typeof headers === "object" ? headers : {}),
      ...customHeaders,
    };

    let lastError = null;
    for (let attempt = 0; attempt <= AJAX_MAX_RETRIES; attempt++) {
      try {
        const axiosConfig = {
          timeout: 20000,
          maxRedirects: 10,
          headers: mergedHeaders,
          responseType: "arraybuffer",
          decompress: true,
          validateStatus: (status) => status >= 200 && status < 400,
        };

        let res;
        if (customMethod.match(/post/i) && customBody) {
          res = await axios.post(fullUrl, customBody, axiosConfig);
        } else {
          res = await axios.get(fullUrl, axiosConfig);
        }

        const buf = Buffer.from(res.data);
        let charset = customCharset || "utf-8";
        if (!customCharset || /utf-?8/i.test(charset)) {
          const contentType = res.headers["content-type"] || "";
          const ctCharsetMatch = contentType.match(/charset=([^\s;]+)/i);
          if (ctCharsetMatch && !/utf-?8/i.test(ctCharsetMatch[1])) {
            charset = ctCharsetMatch[1].trim();
          } else {
            const headSample = buf.slice(0, Math.min(buf.length, 2048)).toString("utf-8");
            const metaCharsetMatch = headSample.match(/charset=["']?([^"'\s>]+)/i);
            if (metaCharsetMatch && !/utf-?8/i.test(metaCharsetMatch[1])) {
              charset = metaCharsetMatch[1].trim();
            }
          }
        }

        let data;
        if (/utf-?8/i.test(charset)) {
          data = buf.toString("utf-8");
        } else {
          data = iconv.decode(buf, charset);
        }
        return data;
      } catch (e) {
        lastError = e;
        if (isAjaxRetryableError(e) && attempt < AJAX_MAX_RETRIES) {
          await new Promise((r) =>
            setTimeout(r, AJAX_RETRY_DELAY * (attempt + 1)),
          );
          continue;
        }
        console.warn("java.ajax failed:", e.message, url);
        return "";
      }
    }
    return "";
  };

  const ajaxAll = async (urls) => {
    const results = await Promise.all(urls.map((u) => ajax(u)));
    return results.join("\n");
  };

  const createSymmetricCrypto = (mode, key, iv) => {
    const algoMap = {
      "aes/cbc/pkcs5padding": "aes-128-cbc",
      "aes/cbc/pkcs7padding": "aes-128-cbc",
      "aes-128-cbc": "aes-128-cbc",
      "aes-256-cbc": "aes-256-cbc",
      "aes/ecb/pkcs5padding": "aes-128-ecb",
      "aes/ecb/pkcs7padding": "aes-128-ecb",
      "aes-128-ecb": "aes-128-ecb",
      "aes-256-ecb": "aes-256-ecb",
    };
    const nodeAlgo = algoMap[mode.toLowerCase()] || "aes-128-cbc";
    const keyBuf = typeof key === "string" ? Buffer.from(key, "utf-8") : key;
    const ivBuf = iv
      ? typeof iv === "string"
        ? Buffer.from(iv, "utf-8")
        : iv
      : Buffer.alloc(16, 0);

    return {
      decryptStr: (encrypted) => {
        try {
          const decipher = crypto.createDecipheriv(nodeAlgo, keyBuf, ivBuf);
          decipher.setAutoPadding(true);
          let decrypted = decipher.update(encrypted, "base64", "utf8");
          decrypted += decipher.final("utf8");
          return decrypted;
        } catch (e) {
          console.warn("SymmetricCrypto.decryptStr failed:", e.message);
          return encrypted;
        }
      },
      encrypt: (plaintext) => {
        try {
          const cipher = crypto.createCipheriv(nodeAlgo, keyBuf, ivBuf);
          cipher.setAutoPadding(true);
          let encrypted = cipher.update(plaintext, "utf8", "base64");
          encrypted += cipher.final("base64");
          return encrypted;
        } catch (e) {
          console.warn("SymmetricCrypto.encrypt failed:", e.message);
          return plaintext;
        }
      },
    };
  };

  const getString = (rule) => {
    if (!rule || !contextHtml) return '';
    const $ = require('cheerio').load(contextHtml);
    const { resolveLegadoSelector, isLegadoSelector } = require('./selectors');
    if (isLegadoSelector(rule)) {
      return resolveLegadoSelector(contextHtml, rule) || '';
    }
    return '';
  };

  const getElement = (rule) => {
    if (!rule || !contextHtml) return null;
    const $ = require('cheerio').load(contextHtml);
    const { resolveLegadoSelector, isLegadoSelector } = require('./selectors');
    if (rule.startsWith('@css:')) {
      const cssSelector = rule.slice(5).trim();
      const el = $(cssSelector).first();
      return {
        attr: (name) => el.attr(name) || '',
        text: () => el.text().trim(),
        html: () => el.html() || '',
      };
    }
    if (isLegadoSelector(rule)) {
      const elements = resolveLegadoSelector(contextHtml, rule, true);
      if (elements && elements.length > 0) {
        const el = $(elements.first());
        return {
          attr: (name) => el.attr(name) || '',
          text: () => el.text().trim(),
          html: () => el.html() || '',
        };
      }
    }
    return null;
  };

  return {
    ajax,
    ajaxAll,
    connect: ajax,
    getString,
    getElement,
    getStrResponse: ajax,
    put,
    get,
    log: (...args) => console.log("[JS-LOG]", ...args),
    toast: (msg) => console.log("[JS-TOAST]", msg),
    longToast: (msg) => console.log("[JS-LONGTOAST]", msg),
    t2s: (str) => {
      if (typeof str !== 'string') str = String(str);
      return t2sConverter(str);
    },

    base64Decode: (str) => {
      try {
        return Buffer.from(str, "base64").toString("utf-8");
      } catch {
        return str;
      }
    },
    base64Encode: (str) => {
      try {
        return Buffer.from(str, "utf-8").toString("base64");
      } catch {
        return str;
      }
    },
    hexDecodeToString: (str) => {
      try {
        if (typeof str !== 'string') {
          str = String(str);
        }
        if (!/^[0-9a-fA-F]+$/.test(str)) {
          return str;
        }
        return Buffer.from(str, "hex").toString("utf-8");
      } catch {
        return str;
      }
    },
    hexEncodeToString: (str) => {
      try {
        return Buffer.from(str, "utf-8").toString("hex");
      } catch {
        return str;
      }
    },

    aesBase64DecodeToString: (str, key, algo, iv) => {
      try {
        const mode = algo || "AES/CBC/PKCS5Padding";
        const nodeAlgo = mode.includes("ECB") ? "aes-128-ecb" : "aes-128-cbc";
        const keyBuf = Buffer.from(key, "utf-8");
        const ivBuf = iv ? Buffer.from(iv, "utf-8") : Buffer.alloc(16, 0);
        const decipher = crypto.createDecipheriv(nodeAlgo, keyBuf, ivBuf);
        decipher.setAutoPadding(!mode.includes("NoPadding"));
        let decrypted = decipher.update(str, "base64", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
      } catch (e) {
        console.warn("AES decrypt failed:", e.message);
        return str;
      }
    },
    aesEncryptToBase64: (str, key, algo, iv) => {
      try {
        const mode = algo || "AES/CBC/PKCS5Padding";
        const nodeAlgo = mode.includes("ECB") ? "aes-128-ecb" : "aes-128-cbc";
        const keyBuf = Buffer.from(key, "utf-8");
        const ivBuf = iv ? Buffer.from(iv, "utf-8") : Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv(nodeAlgo, keyBuf, ivBuf);
        cipher.setAutoPadding(!mode.includes("NoPadding"));
        let encrypted = cipher.update(str, "utf8", "base64");
        encrypted += cipher.final("base64");
        return encrypted;
      } catch (e) {
        return str;
      }
    },
    createSymmetricCrypto,

    md5Encode: (str) => crypto.createHash("md5").update(str).digest("hex"),
    hmacMD5: (str, key) =>
      crypto.createHmac("md5", key).update(str).digest("hex"),
    hmacSHA256: (str, key) =>
      crypto.createHmac("sha256", key).update(str).digest("hex"),
    sha1: (str) => crypto.createHash("sha1").update(str).digest("hex"),
    sha256: (str) => crypto.createHash("sha256").update(str).digest("hex"),

    encodeURIComponent: (str) => encodeURIComponent(String(str)),
    decodeURIComponent: (str) => {
      try {
        return decodeURIComponent(String(str));
      } catch {
        return str;
      }
    },
    encodeURI: (str) => encodeURI(String(str)),
    decodeURI: (str) => {
      try {
        return decodeURI(String(str));
      } catch {
        return str;
      }
    },

    jsonParse: (str) => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    },
    timeFormat: (timestamp) => {
      try {
        const d = new Date(Number(timestamp));
        return d.toLocaleString("zh-CN", { hour12: false });
      } catch {
        return String(timestamp);
      }
    },
    timeFormatUTC: (timestamp) => {
      try {
        const d = new Date(Number(timestamp));
        return d.toUTCString();
      } catch {
        return String(timestamp);
      }
    },

    startBrowser: (url, title) => console.log("[JS-BROWSER]", url, title),
    startBrowserAwait: async (url, title) => {
      console.log("[JS-BROWSER-AWAIT]", url, title);
      try {
        const browser = await getBrowserInstance();
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        if (title) {
          try {
            await page.waitForFunction(
              (t) => document.title.includes(t) || document.readyState === "complete",
              { timeout: 15000 },
              title
            );
          } catch {}
        }

        await new Promise((r) => setTimeout(r, 2000));

        const cookies = await page.cookies();
        for (const cookie of cookies) {
          cookieStore.set(cookie.name, { value: cookie.value, _timestamp: Date.now() });
        }

        const html = await page.content();
        await page.close();
        return html;
      } catch (e) {
        console.error("[JS-BROWSER-AWAIT ERROR]", e.message);
        return "";
      }
    },
  };
}

function createSourceShim(sourceData = {}) {
  const sourceUrl = sourceData.bookSourceUrl || "";
  let sourceVars = sourceVariables.get(sourceUrl);
  if (!sourceVars) {
    sourceVars = new Map();
    sourceVariables.set(sourceUrl, sourceVars);
  }
  sourceVars._timestamp = Date.now();

  return {
    getKey: () => sourceUrl,
    get: (key) => sourceVars.get(key) || "",
    put: (key, value) => {
      sourceVars.set(key, value);
      sourceVars._timestamp = Date.now();
    },
    getVariable: () => sourceVars.get("_variable") || "",
    setVariable: (str) => {
      sourceVars.set("_variable", str);
      sourceVars._timestamp = Date.now();
    },
    getLoginInfoMap: () => {
      const loginInfo = sourceVars.get("_loginInfo");
      if (!loginInfo) return new Map();
      try {
        const obj =
          typeof loginInfo === "string" ? JSON.parse(loginInfo) : loginInfo;
        return new Map(Object.entries(obj));
      } catch {
        return new Map();
      }
    },
    getLoginInfo: () => sourceVars.get("_loginInfo") || "",
    setLoginInfo: (info) => {
      sourceVars.set("_loginInfo", info);
      sourceVars._timestamp = Date.now();
    },
  };
}

function createCookieShim() {
  return {
    getCookie: (url) => {
      const entry = cookieStore.get(url);
      if (!entry) return "";
      if (entry._timestamp && Date.now() - entry._timestamp > 30 * 60 * 1000) {
        cookieStore.delete(url);
        return "";
      }
      return entry.value || "";
    },
    setCookie: (url, cookie) => cookieStore.set(url, { value: cookie, _timestamp: Date.now() }),
    removeCookie: (url) => cookieStore.delete(url),
  };
}

function createCacheShim() {
  return {
    get: (key) => {
      const entry = cacheStore.get(key);
      if (!entry) return "";
      if (entry._timestamp && Date.now() - entry._timestamp > 30 * 60 * 1000) {
        cacheStore.delete(key);
        return "";
      }
      return entry.value || "";
    },
    put: (key, value) => cacheStore.set(key, { value, _timestamp: Date.now() }),
  };
}

function createBookShim(bookData = {}) {
  const proxy = {
    name: bookData.name || "",
    author: bookData.author || "",
    bookUrl: bookData._sourceUrl || "",
    coverUrl: bookData.cover || "",
    intro: bookData.summary || "",
    tocUrl: bookData.tocUrl || "",
    durChapterIndex: bookData.durChapterIndex || 0,
    durChapterName: bookData.durChapterName || "",
    type: bookData.type || 0,
    getVariable: (key) => bookData._variables?.[key] || "",
    setVariable: (key, value) => {
      if (!bookData._variables) bookData._variables = {};
      bookData._variables[key] = value;
    },
  };

  return new Proxy(proxy, {
    set(target, prop, value) {
      target[prop] = value;
      if (bookData && typeof bookData === 'object') {
        bookData[prop] = value;
      }
      return true;
    },
    get(target, prop) {
      return target[prop];
    }
  });
}

function createChapterShim(chapterData = {}) {
  return {
    index: chapterData.index || 0,
    title: chapterData.title || chapterData.name || "",
    url: chapterData.url || chapterData.chapterUrl || "",
    isVip: chapterData.isVip || false,
    isPay: chapterData.isPay || false,
    baseUrl: chapterData.baseUrl || "",
  };
}

function checkLoginState(source) {
  const sourceUrl = source.bookSourceUrl || '';
  const sourceVars = sourceVariables.get(sourceUrl);
  const cookieEntry = cookieStore.get(sourceUrl);

  const loginInfo = sourceVars?.get('_loginInfo');
  const hasCookies = cookieEntry && cookieEntry.value;

  let loginInfoParsed = null;
  if (loginInfo) {
    try {
      loginInfoParsed = typeof loginInfo === 'string' ? JSON.parse(loginInfo) : loginInfo;
    } catch {}
  }

  return {
    hasLoginInfo: !!loginInfo,
    hasCookies: !!hasCookies,
    loginInfoPreview: loginInfo ? String(loginInfo).slice(0, 200) : '',
    cookiePreview: hasCookies ? String(cookieEntry.value).slice(0, 200) : '',
    isLoggedIn: !!(loginInfo || hasCookies),
    parsed: loginInfoParsed,
  };
}

function injectAuthIntoConfig(config, source) {
  if (!config || !source) return config;

  const newHeaders = { ...config.headers };
  const sourceUrl = source.bookSourceUrl || '';

  const cookieEntry = cookieStore.get(sourceUrl);
  if (cookieEntry && cookieEntry.value) {
    newHeaders['Cookie'] = cookieEntry.value;
    try {
      const urlObj = new URL(sourceUrl);
      const domainCookies = [];
      for (const [key, entry] of cookieStore) {
        if (entry && entry.value && key !== sourceUrl) {
          try {
            const keyUrl = new URL(key);
            if (keyUrl.hostname === urlObj.hostname || keyUrl.hostname.endsWith('.' + urlObj.hostname)) {
              domainCookies.push(entry.value);
            }
          } catch {}
        }
      }
      if (domainCookies.length > 0) {
        newHeaders['Cookie'] = [cookieEntry.value, ...domainCookies].join('; ');
      }
    } catch {}
  }

  const sourceVars = sourceVariables.get(sourceUrl);
  const loginInfo = sourceVars?.get('_loginInfo');
  if (loginInfo) {
    try {
      const info = typeof loginInfo === 'string' ? JSON.parse(loginInfo) : loginInfo;
      if (info.token) {
        newHeaders['Authorization'] = info.token.startsWith('Bearer ') ? info.token : `Bearer ${info.token}`;
      }
      if (info.headers && typeof info.headers === 'object') {
        Object.assign(newHeaders, info.headers);
      }
    } catch {}
  }

  return { ...config, headers: newHeaders };
}

function isAuthFailure(responseData, source) {
  if (!responseData) return false;
  if (typeof responseData !== 'string') return false;

  if (responseData.length === 0) {
    return false;
  }

  if (responseData.length < 2000) {
    const lower = responseData.toLowerCase();
    if (/请(先)?登录/.test(responseData)) return true;
    if (/login\s*\(/.test(lower) && responseData.length < 500) return true;
    if (/<form[^>]*login/.test(lower) && responseData.length < 800) return true;
  }

  try {
    const parsed = JSON.parse(responseData);
    const authCodes = [4001, 4005, 4006, 401, 403, 1001, 10001, -1];
    if (authCodes.includes(parsed.code) || authCodes.includes(parsed.status)) {
      return true;
    }
    if (parsed.msg && /(登录|认证|token|auth|expired|过期)/i.test(parsed.msg)) {
      return true;
    }
    if (parsed.message && /(login|auth|token|expired)/i.test(parsed.message)) {
      return true;
    }
  } catch {}

  return false;
}

function persistAuthState(stateFile) {
  try {
    const fs = require('fs');
    const state = {
      sourceVariables: {},
      cookieStore: {},
      cacheStore: {},
      savedAt: new Date().toISOString(),
    };

    for (const [key, vars] of sourceVariables) {
      state.sourceVariables[key] = Object.fromEntries(vars);
    }
    for (const [key, entry] of cookieStore) {
      state.cookieStore[key] = entry;
    }
    for (const [key, entry] of cacheStore) {
      state.cacheStore[key] = entry;
    }

    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
    console.log(`[AUTH-PERSIST] Saved to ${stateFile} (${Object.keys(state.sourceVariables).length} sources, ${Object.keys(state.cookieStore).length} cookies)`);
    return true;
  } catch (e) {
    console.warn('[AUTH-PERSIST] Save failed:', e.message);
    return false;
  }
}

function restoreAuthState(stateFile) {
  try {
    const fs = require('fs');
    if (!fs.existsSync(stateFile)) {
      console.log('[AUTH-PERSIST] No saved state found');
      return false;
    }

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));

    for (const [key, vars] of Object.entries(state.sourceVariables || {})) {
      const map = new Map(Object.entries(vars));
      map._timestamp = Date.now();
      sourceVariables.set(key, map);
    }
    for (const [key, entry] of Object.entries(state.cookieStore || {})) {
      entry._timestamp = Date.now();
      cookieStore.set(key, entry);
    }
    for (const [key, entry] of Object.entries(state.cacheStore || {})) {
      entry._timestamp = Date.now();
      cacheStore.set(key, entry);
    }

    console.log(`[AUTH-PERSIST] Restored from ${stateFile} (${Object.keys(state.sourceVariables).length} sources, saved at ${state.savedAt || 'unknown'})`);
    return true;
  } catch (e) {
    console.warn('[AUTH-PERSIST] Restore failed:', e.message);
    return false;
  }
}

module.exports = {
  createJavaShim,
  createSourceShim,
  createCookieShim,
  createCacheShim,
  createBookShim,
  createChapterShim,
  checkLoginState,
  injectAuthIntoConfig,
  isAuthFailure,
  persistAuthState,
  restoreAuthState,
  sourceVariables,
  cookieStore,
  cacheStore,
};
