const express = require("express");
const cors = require("cors");
const axios = require("axios");
const iconv = require("iconv-lite");
const {
  parseSearchResults,
  parseExplore,
  parseExploreUrl,
  parseBookInfo,
  parseToc,
  parseContent,
  buildSearchConfig,
  getSourceCompatibility,
  executeJsRule,
} = require("./ruleEngine");
const { resolveUrl, parseHeaders, sleep, isRetryableError, classifyError, createTTLMap, MAX_RETRIES, RETRY_DELAY_BASE } = require("./utils");
const { checkLoginState, injectAuthIntoConfig, isAuthFailure, persistAuthState, restoreAuthState } = require("./javaShim");

const app = express();

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3000,http://localhost:8088,http://127.0.0.1:8088").split(",");
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

const PROXY_BLOCKED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "192.168."];

function isProxyUrlAllowed(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return !PROXY_BLOCKED_HOSTS.some(blocked => hostname === blocked || hostname.startsWith(blocked));
  } catch {
    return false;
  }
}

const rateLimitMap = createTTLMap(60 * 1000, 120 * 1000, 5000);
function rateLimitMiddleware(maxRequests = 60, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const record = rateLimitMap.get(key) || { count: 0, startTime: now };
    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count++;
    }
    rateLimitMap.set(key, record, 120 * 1000);
    if (record.count > maxRequests) {
      return res.status(429).json({ error: "Too many requests" });
    }
    next();
  };
}

const PORT = process.env.PORT || 3001;

const MAOYAN_AUTH_CONFIG = {
  baseUrl: "http://api.jmlldsc.com",
  authEndpoint: "/auth/third",
  deviceId: "2d37f6b5b6b2605373092c3dc65a3b39",
  loginType: 1,
  clientHeaders: {
    "User-Agent": "okhttp/4.9.2",
    "client-device": "2d37f6b5b6b2605373092c3dc65a3b39",
    "client-brand": "Redmi",
    "client-version": "2.3.0",
    "client-name": "app.maoyankanshu.novel",
    "client-source": "android",
    "Content-Type": "application/json",
  },
};

let maoyanTokenCache = {
  token: null,
  expiresAt: 0,
  refreshing: false,
};

async function refreshMaoyanToken() {
  if (maoyanTokenCache.refreshing) {
    while (maoyanTokenCache.refreshing) {
      await sleep(100);
    }
    return maoyanTokenCache.token;
  }

  if (maoyanTokenCache.token && Date.now() < maoyanTokenCache.expiresAt) {
    return maoyanTokenCache.token;
  }

  maoyanTokenCache.refreshing = true;
  try {
    console.log("[MAOYAN-AUTH] Refreshing token...");
    const resp = await axios.post(
      MAOYAN_AUTH_CONFIG.baseUrl + MAOYAN_AUTH_CONFIG.authEndpoint,
      { openid: MAOYAN_AUTH_CONFIG.deviceId, type: MAOYAN_AUTH_CONFIG.loginType },
      { headers: MAOYAN_AUTH_CONFIG.clientHeaders, timeout: 10000 },
    );

    const data = resp.data;
    if (data.code === 200 && data.data && data.data.tokens) {
      const tokens = data.data.tokens;
      maoyanTokenCache.token = tokens.tokenType + tokens.token;
      maoyanTokenCache.expiresAt = Date.now() + (tokens.expiresIn - 86400) * 1000;
      console.log(`[MAOYAN-AUTH] Token refreshed, expires in ${Math.round((tokens.expiresIn - 86400) / 86400)} days`);
      return maoyanTokenCache.token;
    } else {
      console.error("[MAOYAN-AUTH] Refresh failed:", data.msg);
      return null;
    }
  } catch (e) {
    console.error("[MAOYAN-AUTH] Refresh error:", e.message);
    return null;
  } finally {
    maoyanTokenCache.refreshing = false;
  }
}

function isMaoyanApi(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.hostname === "api.jmlldsc.com" || parsed.hostname === "api.jxgtzxc.com";
  } catch {
    return false;
  }
}

function updateHeaderToken(headerStr, newToken) {
  if (!headerStr || !newToken) return headerStr;
  return headerStr.replace(
    /(['"]Authorization['"]\s*:\s*['"])(bearer[^'"]*)(['"])/i,
    `$1${newToken}$3`,
  );
}

async function fetchWithMaoyanAuth(config, source) {
  const result = await fetchWithConfig(config);

  if (isMaoyanApi(config.url) && typeof result === "string") {
    try {
      const parsed = JSON.parse(result);
      if (parsed.code === 4005 || parsed.code === 4006) {
        console.log(`[MAOYAN-AUTH] Detected auth failure (code ${parsed.code}), refreshing token...`);
        const newToken = await refreshMaoyanToken();
        if (newToken && source && source.header) {
          const updatedHeader = updateHeaderToken(source.header, newToken);
          const newHeaders = parseHeaders(updatedHeader);
          const retryConfig = { ...config, headers: newHeaders };
          console.log(`[MAOYAN-AUTH] Retrying with new token...`);
          return await fetchWithConfig(retryConfig);
        }
      }
    } catch {}
  }

  return result;
}

async function fetchWithAuthRetry(config, source) {
  let authedConfig = injectAuthIntoConfig(config, source);
  let responseData = await fetchWithConfig(authedConfig);

  if (isAuthFailure(responseData, source)) {
    console.log(`[AUTH-RETRY] Detected auth failure for: ${source.bookSourceName}`);

    if (source.loginUrl && !/^https?:\/\//i.test(source.loginUrl.trim())) {
      console.log(`[AUTH-RETRY] Attempting re-login for: ${source.bookSourceName}`);
      try {
        const ctx = { baseUrl: source.bookSourceUrl, source, key: '', page: 1, _loginMode: true };
        await executeJsRule(source.loginUrl, null, ctx);

        authedConfig = injectAuthIntoConfig(config, source);
        console.log(`[AUTH-RETRY] Re-login done, retrying request...`);
        responseData = await fetchWithConfig(authedConfig);

        if (isAuthFailure(responseData, source)) {
          console.log(`[AUTH-RETRY] Still failing after re-login for: ${source.bookSourceName}`);
        }
      } catch (e) {
        console.warn(`[AUTH-RETRY] Re-login failed for ${source.bookSourceName}:`, e.message);
      }
    } else if (source.loginUrl && /^https?:\/\//i.test(source.loginUrl.trim())) {
      console.log(`[AUTH-RETRY] Browser login required for: ${source.bookSourceName}, cannot auto-retry`);
    }
  }

  return responseData;
}

function extractRedirectUrl(html) {
  if (!html || typeof html !== "string") return null;
  const metaMatch = html.match(
    /<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?\d+;\s*url=([^"'\s>]+)/i,
  );
  if (metaMatch) return metaMatch[1];
  const jsMatch = html.match(
    /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/,
  );
  if (jsMatch) return jsMatch[1];
  return null;
}

async function fetchWithConfig(config) {
  const { url, method, body, headers, maxRedirects = 5 } = config;

  const axiosConfig = {
    url,
    method: method || "GET",
    timeout: 20000,
    maxRedirects: 10,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      "Accept-Encoding": "gzip, deflate",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      ...headers,
    },
    responseType: "arraybuffer",
    decompress: true,
    validateStatus: (status) => status >= 200 && status < 400,
  };

  if (body && (method === "POST" || method === "PUT")) {
    axiosConfig.data = body;
    if (!axiosConfig.headers["Content-Type"]) {
      axiosConfig.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }
  }

  let lastError = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios(axiosConfig);

      if (response.status >= 300 && response.status < 400 && maxRedirects > 0) {
        const location = response.headers.location;
        if (location) {
          let redirectUrl = location;
          if (!redirectUrl.startsWith("http")) {
            const baseMatch = url.match(/^(https?:\/\/[^/]+)/);
            if (baseMatch) {
              redirectUrl = redirectUrl.startsWith("/")
                ? baseMatch[1] + redirectUrl
                : baseMatch[1] + "/" + redirectUrl;
            }
          }
          console.log(`[REDIRECT] ${response.status} -> ${redirectUrl}`);
          return await fetchWithConfig({
            url: redirectUrl,
            method: "GET",
            headers: { ...axiosConfig.headers, Referer: url },
            maxRedirects: maxRedirects - 1,
          });
        }
      }

      const buf = Buffer.from(response.data);
      let charset = "utf-8";
      const overrideCharset = (axiosConfig.headers && axiosConfig.headers['x-override-charset']) || null;
      if (overrideCharset) {
        charset = overrideCharset;
      } else {
        const contentType = response.headers["content-type"] || "";
        const ctCharsetMatch = contentType.match(/charset=([^\s;]+)/i);
        if (ctCharsetMatch) {
          charset = ctCharsetMatch[1].trim().replace(/['"]/g, "");
        }
        if (charset.toLowerCase() === "utf-8" || charset.toLowerCase() === "utf8") {
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

      if (typeof data === "string" && maxRedirects > 0) {
        const redirectUrl = extractRedirectUrl(data);
        if (redirectUrl && redirectUrl !== url) {
          let fullRedirectUrl = redirectUrl;
          if (!fullRedirectUrl.startsWith("http")) {
            const baseMatch = url.match(/^(https?:\/\/[^/]+)/);
            if (baseMatch) {
              fullRedirectUrl = fullRedirectUrl.startsWith("/")
                ? baseMatch[1] + fullRedirectUrl
                : baseMatch[1] + "/" + fullRedirectUrl;
            }
          }
          if (fullRedirectUrl !== url) {
            console.log(`[META/JS REDIRECT] -> ${fullRedirectUrl}`);
            return await fetchWithConfig({
              url: fullRedirectUrl,
              method: "GET",
              headers: { ...axiosConfig.headers, Referer: url },
              maxRedirects: maxRedirects - 1,
            });
          }
        }
      }

      return data;
    } catch (e) {
      lastError = e;
      if (isRetryableError(e) && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, attempt);
        console.warn(
          `[RETRY] Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${e.message}, retrying in ${delay}ms...`,
        );
        await sleep(delay);
        if (attempt === 0) {
          axiosConfig.headers["Connection"] = "close";
          if (axiosConfig.timeout) {
            axiosConfig.timeout = Math.min(axiosConfig.timeout + 5000, 30000);
          }
        }
        continue;
      }
      break;
    }
  }

  throw lastError;
}

function parseDataUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('data:')) return null;

  const rest = url.slice(5);
  const base64Idx = rest.indexOf(';base64,');
  if (base64Idx === -1) return null;

  const urlHint = rest.slice(0, base64Idx);
  const afterBase64 = rest.slice(base64Idx + 8);

  let base64End = afterBase64.length;
  let jsonOptions = null;

  for (let i = 0; i < afterBase64.length; i++) {
    if (afterBase64[i] === ',' && afterBase64[i + 1] === '{') {
      try {
        jsonOptions = JSON.parse(afterBase64.slice(i + 1));
        base64End = i;
        break;
      } catch {}
    }
  }

  const base64Data = afterBase64.slice(0, base64End);

  let decodedData;
  try {
    decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
  } catch {
    return null;
  }

  let parsedData;
  try {
    parsedData = JSON.parse(decodedData);
  } catch {
    parsedData = decodedData;
  }

  return {
    urlHint,
    data: parsedData,
    rawDecoded: decodedData,
    options: jsonOptions,
    isDataUrl: true,
  };
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0",
  });
});

app.get("/api/proxy", rateLimitMiddleware(30, 60000), async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl)
    return res.status(400).json({ error: "Missing url parameter" });
  if (!isProxyUrlAllowed(targetUrl))
    return res.status(403).json({ error: "Target URL not allowed" });

  try {
    const data = await fetchWithConfig({
      url: targetUrl,
      method: "GET",
      headers: req.headers["user-agent"]
        ? { "User-Agent": req.headers["user-agent"] }
        : {},
    });

    const contentType =
      typeof data === "string" && data.trim().startsWith("{")
        ? "application/json"
        : "text/html";
    res.set("Content-Type", contentType);
    res.send(data);
  } catch (e) {
    res.status(502).json({ error: "Proxy failed" });
  }
});

app.post("/api/proxy", rateLimitMiddleware(30, 60000), async (req, res) => {
  const { url, method, headers, body } = req.body;
  if (!url) return res.status(400).json({ error: "Missing url" });
  if (!isProxyUrlAllowed(url))
    return res.status(403).json({ error: "Target URL not allowed" });

  try {
    const data = await fetchWithConfig({
      url,
      method: method || "GET",
      headers: headers || {},
      body,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(502).json({ error: "Proxy failed" });
  }
});

app.post("/api/test-source", async (req, res) => {
  const { source, keyword = "人", page = 1, fullTest = false } = req.body;

  if (!source || !source.bookSourceUrl) {
    return res.status(400).json({ error: "Invalid source" });
  }

  try {
    const config = await buildSearchConfig(source, keyword, page);
    if (!config) {
      return res.json({
        success: false,
        message: "无法构建搜索URL",
        errorType: "config",
      });
    }

    console.log(
      `[TEST] ${source.bookSourceName} -> ${config.url} method=${config.method} hasBody=${!!config.body}`,
    );

    let responseData;
    let requestInfo = {
      url: config.url,
      method: config.method,
      hasBody: !!config.body,
    };

    try {
      responseData = await fetchWithAuthRetry(config, source);
    } catch (e) {
      const classified = classifyError(e);
      console.error(
        `[TEST ERROR] ${source.bookSourceName}: ${e.code || ''} - ${e.message}`,
      );
      const hasLoginUrl = !!source.loginUrl;
      return res.json({
        success: false,
        message: classified.message,
        errorType: classified.type,
        requestInfo,
        errorCode: e.code || '',
        requiresLogin: hasLoginUrl,
        hasLoginUrl,
      });
    }

    if (!responseData) {
      const hasLoginUrl = !!source.loginUrl;
      return res.json({
        success: false,
        message: "服务器返回空内容",
        errorType: "empty_response",
        requestInfo,
        requiresLogin: hasLoginUrl,
        hasLoginUrl,
      });
    }

    let results;
    try {
      results = await parseSearchResults(source, responseData, {
        key: keyword,
        page,
      });
    } catch (e) {
      const classified = classifyError(e);
      return res.json({
        success: false,
        message: `搜索解析失败: ${classified.message}`,
        errorType: classified.type,
        requestInfo,
      });
    }

    const compat = getSourceCompatibility(source);

    const isHtml =
      typeof responseData === "string" &&
      (responseData.includes("<") || responseData.includes("&lt;"));
    const isJson =
      typeof responseData === "string" && responseData.trim().startsWith("{");

    if (!fullTest) {
      const hasLoginUrl = !!source.loginUrl;
      const requiresLogin = hasLoginUrl && results.length === 0 && isAuthFailure(responseData, source);

      return res.json({
        success: results.length > 0,
        message:
          results.length > 0
            ? `连接成功，找到 ${results.length} 条结果`
            : requiresLogin
              ? "需要登录后才能获取内容，请先执行登录操作"
              : isHtml
                ? "连接成功但未解析到结果，可能需要调整解析规则"
                : "连接成功但无搜索结果",
        resultCount: results.length,
        sample: results.slice(0, 3),
        compatibility: compat,
        rawLength: typeof responseData === "string" ? responseData.length : 0,
        responseType: isHtml ? "html" : isJson ? "json" : "unknown",
        requestInfo,
        requiresLogin,
        hasLoginUrl,
      });
    }

    const stages = {
      search: { success: results.length > 0, resultCount: results.length, sampleBook: null, error: null },
      bookInfo: { success: false, fields: {}, error: null },
      toc: { success: false, chapterCount: 0, error: null },
      content: { success: false, contentLength: 0, sampleContent: '', error: null },
    };

    if (results.length > 0) {
      const sampleBook = results[0];
      stages.search.sampleBook = {
        name: sampleBook.name,
        author: sampleBook.author,
        bookUrl: sampleBook._sourceUrl || sampleBook.bookUrl || sampleBook.url || '',
      };
    } else {
      stages.search.error = '搜索无结果';
      const allPass = false;
      return res.json({
        success: allPass,
        stages,
        overallSuccess: allPass,
        failedStage: 'search',
        resultCount: results.length,
        sample: results.slice(0, 3),
        compatibility: compat,
        rawLength: typeof responseData === "string" ? responseData.length : 0,
        responseType: isHtml ? "html" : isJson ? "json" : "unknown",
        requestInfo,
      });
    }

    let bookInfoResult = null;
    const sampleBook = results[0];
    const bookUrl = sampleBook._sourceUrl || sampleBook.bookUrl || sampleBook.url;

    try {
      let bookInfoData;
      if (bookUrl && bookUrl.startsWith('data:')) {
        bookInfoData = bookUrl;
      } else if (bookUrl) {
        const headers = parseHeaders(source.header);
        bookInfoData = await fetchWithAuthRetry({ url: bookUrl, method: "GET", headers }, source);
      }
      if (bookInfoData) {
        bookInfoResult = await parseBookInfo(source, bookInfoData, { book: sampleBook });
        stages.bookInfo.success = true;
        stages.bookInfo.fields = {
          name: bookInfoResult.name || '',
          author: bookInfoResult.author || '',
          coverUrl: bookInfoResult.coverUrl || '',
        };
      } else {
        stages.bookInfo.error = '无法获取详情页数据';
      }
    } catch (e) {
      const classified = classifyError(e);
      stages.bookInfo.error = `${classified.message}: ${e.message}`;
    }

    if (!stages.bookInfo.success) {
      const allPass = false;
      return res.json({
        success: allPass,
        stages,
        overallSuccess: allPass,
        failedStage: 'bookInfo',
        resultCount: results.length,
        sample: results.slice(0, 3),
        compatibility: compat,
        rawLength: typeof responseData === "string" ? responseData.length : 0,
        responseType: isHtml ? "html" : isJson ? "json" : "unknown",
        requestInfo,
      });
    }

    const tocUrl = bookInfoResult?.tocUrl || bookInfoResult?._tocUrl || sampleBook.tocUrl;
    let tocResult = null;

    try {
      if (tocUrl) {
        let tocData;
        if (tocUrl.startsWith('data:')) {
          tocData = tocUrl;
        } else {
          const headers = parseHeaders(source.header);
          tocData = await fetchWithAuthRetry({ url: tocUrl, method: "GET", headers }, source);
        }
        tocResult = await parseToc(source, tocData, { book: bookInfoResult || sampleBook });
        if (tocResult && tocResult.length > 0) {
          stages.toc.success = true;
          stages.toc.chapterCount = tocResult.length;
        } else {
          stages.toc.error = '目录解析结果为空';
        }
      } else {
        stages.toc.error = '无法获取目录URL';
      }
    } catch (e) {
      const classified = classifyError(e);
      stages.toc.error = `${classified.message}: ${e.message}`;
    }

    if (!stages.toc.success) {
      const allPass = false;
      return res.json({
        success: allPass,
        stages,
        overallSuccess: allPass,
        failedStage: 'toc',
        resultCount: results.length,
        sample: results.slice(0, 3),
        compatibility: compat,
        rawLength: typeof responseData === "string" ? responseData.length : 0,
        responseType: isHtml ? "html" : isJson ? "json" : "unknown",
        requestInfo,
      });
    }

    let contentResult = null;
    try {
      const sampleChapter = tocResult[0];
      const chapterUrl = sampleChapter.url || sampleChapter.chapterUrl;
      if (chapterUrl) {
        let contentData;
        if (chapterUrl.startsWith('data:')) {
          contentData = chapterUrl;
        } else {
          const headers = parseHeaders(source.header);
          contentData = await fetchWithAuthRetry({ url: chapterUrl, method: "GET", headers }, source);
        }
        contentResult = await parseContent(source, contentData, {
          book: bookInfoResult || sampleBook,
          chapter: sampleChapter,
        }, fetchWithConfig);
        const contentStr = typeof contentResult === 'object'
          ? contentResult.content || String(contentResult || '')
          : String(contentResult || '');
        if (contentStr && contentStr.trim().length > 0) {
          stages.content.success = true;
          stages.content.contentLength = contentStr.length;
          stages.content.sampleContent = contentStr.slice(0, 100);
        } else {
          stages.content.error = '正文内容为空';
        }
      } else {
        stages.content.error = '无法获取章节URL';
      }
    } catch (e) {
      const classified = classifyError(e);
      stages.content.error = `${classified.message}: ${e.message}`;
    }

    const allPass = stages.search.success && stages.bookInfo.success && stages.toc.success && stages.content.success;
    const failedStage = !stages.search.success ? 'search'
      : !stages.bookInfo.success ? 'bookInfo'
      : !stages.toc.success ? 'toc'
      : !stages.content.success ? 'content'
      : null;

    res.json({
      success: allPass,
      stages,
      overallSuccess: allPass,
      failedStage,
      resultCount: results.length,
      sample: results.slice(0, 3),
      compatibility: compat,
      rawLength: typeof responseData === "string" ? responseData.length : 0,
      responseType: isHtml ? "html" : isJson ? "json" : "unknown",
      requestInfo,
    });
  } catch (e) {
    console.error("[TEST ERROR]", e.message);
    res.json({ success: false, message: e.message, errorType: "parse" });
  }
});

app.post("/api/login", async (req, res) => {
  const { source, mode = "login" } = req.body;

  if (!source || !source.bookSourceUrl) {
    return res.status(400).json({ error: "Invalid source" });
  }

  try {
    if (mode === "check") {
      const state = checkLoginState(source);
      return res.json({
        success: true,
        mode: "check",
        loginState: state,
        message: state.isLoggedIn ? "已登录" : "未登录",
      });
    }

    if (!source.loginUrl) {
      const state = checkLoginState(source);
      return res.json({
        success: state.isLoggedIn,
        mode: "login",
        loginState: state,
        message: "该书源无loginUrl字段，无需脚本登录",
      });
    }

    console.log(`[LOGIN] Executing login for: ${source.bookSourceName}`);

    let loginCode = source.loginUrl;

    if (/^https?:\/\//i.test(loginCode.trim())) {
      console.log(`[LOGIN] HTTP login URL (browser required): ${source.bookSourceName} -> ${loginCode.trim().slice(0, 80)}`);
      return res.json({
        success: false,
        mode: "login",
        loginUrl: loginCode.trim(),
        message: `该书源需要通过浏览器完成登录: ${loginCode.trim().slice(0, 100)}`,
        loginState: { isLoggedIn: false, requiresBrowser: true },
      });
    }

    if (source.loginUi && typeof source.loginUi === 'string') {
      if (source.loginUi.includes('<js>') || source.loginUi.includes('function')) {
        const ctx = {
          baseUrl: source.bookSourceUrl,
          source,
          key: '',
          page: 1,
          _loginMode: true,
        };
        await executeJsRule(source.loginUi, null, ctx);
        console.log(`[LOGIN] loginUi pre-processing executed for: ${source.bookSourceName}`);
      }
    }

    const ctx = {
      baseUrl: source.bookSourceUrl,
      source,
      key: '',
      page: 1,
      _loginMode: true,
    };

    await executeJsRule(loginCode, null, ctx);

    const state = checkLoginState(source);
    console.log(`[LOGIN] Done: ${source.bookSourceName}, isLoggedIn=${state.isLoggedIn}`);

    res.json({
      success: state.isLoggedIn,
      mode: "login",
      loginState: state,
      message: state.isLoggedIn ? `登录成功 - ${source.bookSourceName}` : `登录脚本已执行，但未检测到登录状态 - ${source.bookSourceName}`,
    });
  } catch (e) {
    console.error(`[LOGIN ERROR] ${source.bookSourceName}:`, e.message);
    res.json({
      success: false,
      mode: mode,
      message: `登录执行失败: ${e.message}`,
      errorType: "login",
    });
  }
});

app.post("/api/browser-login", async (req, res) => {
  const { source } = req.body;
  if (!source || !source.bookSourceUrl) {
    return res.status(400).json({ error: "Invalid source" });
  }

  const loginUrl = (source.loginUrl || '').trim();
  if (!loginUrl) {
    return res.json({ success: false, message: "该书源未配置登录地址" });
  }

  const isHttpLogin = /^https?:\/\//i.test(loginUrl);
  if (!isHttpLogin) {
    return res.json({ success: false, message: "登录地址不是HTTP URL，请使用脚本登录", isScript: true });
  }

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

    const browser = await puppeteer.launch({
      headless: false,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--window-size=800,700",
      ],
      defaultViewport: { width: 780, height: 650 },
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    const sourceUrl = new URL(source.bookSourceUrl);
    await page.setCookie({
      name: "_placeholder",
      value: "1",
      domain: sourceUrl.hostname,
      path: "/",
    });

    await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    res.json({ success: true, message: "浏览器已打开，请完成登录后关闭窗口" });

    browser.on("disconnected", async () => {
      try {
        const pages = await browser.pages();
        for (const p of pages) {
          const cookies = await p.cookies();
          for (const c of cookies) {
            cookieStore.set(c.name, { value: c.value, _timestamp: Date.now() });
          }
        }
      } catch {}
      try {
        const state = checkLoginState(source);
        console.log(`[BROWSER-LOGIN] Browser closed, isLoggedIn=${state.isLoggedIn}`);
      } catch {}
    });

    setTimeout(async () => {
      try {
        if (browser.connected) {
          const pages = await browser.pages();
          for (const p of pages) {
            const cookies = await p.cookies();
            for (const c of cookies) {
              cookieStore.set(c.name, { value: c.value, _timestamp: Date.now() });
            }
          }
        }
      } catch {}
    }, 5000);

  } catch (e) {
    console.error(`[BROWSER-LOGIN ERROR] ${source.bookSourceName}:`, e.message);
    res.json({ success: false, message: `浏览器启动失败: ${e.message}` });
  }
});

app.post("/api/search", async (req, res) => {
  const { source, keyword, page = 1 } = req.body;

  if (!source || !keyword) {
    return res.status(400).json({ error: "Missing source or keyword" });
  }

  try {
    const config = await buildSearchConfig(source, keyword, page);
    if (!config) {
      return res.json({
        success: false,
        results: [],
        message: "无法构建搜索URL",
      });
    }

    console.log(
      `[SEARCH] ${source.bookSourceName} keyword=${keyword} page=${page} -> ${config.url}`,
    );

    const responseData = await fetchWithAuthRetry(config, source);
    const results = await parseSearchResults(source, responseData, {
      key: keyword,
      page,
    });

    res.json({
      success: true,
      results,
      total: results.length,
      page,
    });
  } catch (e) {
    console.error("[SEARCH ERROR]", e.message);
    const classified = classifyError(e);
    res.json({ success: false, results: [], message: classified.message, errorType: classified.type });
  }
});

app.post("/api/explore", async (req, res) => {
  const { source, exploreUrl } = req.body;

  if (!source || !exploreUrl) {
    return res.status(400).json({ error: "Missing source or exploreUrl" });
  }

  try {
    let url = exploreUrl;
    if (!url.startsWith("http")) {
      const base = (source.bookSourceUrl || "").replace(/\/+$/, "");
      url = base + (url.startsWith("/") ? "" : "/") + url;
    }
    const headers = parseHeaders(source.header);
    const config = { url, method: "GET", headers };
    console.log(`[EXPLORE] ${source.bookSourceName} -> ${url}`);
    const responseData = await fetchWithAuthRetry(config, source);
    const books = await parseExplore(source, responseData, {});
    res.json({ success: true, books });
  } catch (e) {
    console.error("[EXPLORE ERROR]", e.message);
    const classified = classifyError(e);
    res.json({ success: false, books: [], message: classified.message, errorType: classified.type });
  }
});

app.post("/api/book-info", async (req, res) => {
  const { source, bookUrl, bookData } = req.body;

  if (!source) {
    return res.status(400).json({ error: "Missing source" });
  }

  try {
    let responseData;

    if (bookUrl && bookUrl.startsWith('data:')) {
      console.log(`[BOOK-INFO] ${source.bookSourceName} -> data: URL detected`);
      responseData = bookUrl;
    } else if (bookUrl) {
      const headers = parseHeaders(source.header);
      let requestUrl = bookUrl;
      if (source.ruleBookInfo && source.ruleBookInfo.bookInfoUrl) {
        requestUrl = source.ruleBookInfo.bookInfoUrl.replace('{{bookUrl}}', bookUrl);
      }
      if (!requestUrl.startsWith('http')) {
        requestUrl = source.bookSourceUrl + (requestUrl.startsWith('/') ? '' : '/') + requestUrl;
      }
      const config = {
        url: requestUrl,
        method: "GET",
        headers,
      };
      console.log(`[BOOK-INFO] ${source.bookSourceName} -> ${requestUrl}`);
      responseData = await fetchWithAuthRetry(config, source);
    } else {
      responseData = bookData;
    }

    const bookInfo = await parseBookInfo(source, responseData, {
      book: bookData,
    });

    res.json({ success: true, bookInfo });
  } catch (e) {
    console.error("[BOOK-INFO ERROR]", e.message);
    const classified = classifyError(e);
    res.json({ success: false, message: classified.message, errorType: classified.type });
  }
});

app.post("/api/toc", async (req, res) => {
  const { source, tocUrl, book } = req.body;

  if (!source || !tocUrl) {
    return res.status(400).json({ error: "Missing source or tocUrl" });
  }

  try {
    let responseData;

    if (tocUrl.startsWith('data:')) {
      console.log(`[TOC] ${source.bookSourceName} -> data: URL detected`);
      responseData = tocUrl;
    } else {
      const headers = parseHeaders(source.header);
      let requestUrl = tocUrl;
      if (source.ruleToc && source.ruleToc.chapterListUrl) {
        let cleanTocUrl = tocUrl;
        const chapterListUrl = source.ruleToc.chapterListUrl;
        const templateMatch = chapterListUrl.match(/^(.*?)\{\{tocUrl\}\}(.*)$/);
        if (templateMatch) {
          const prefix = templateMatch[1];
          const suffix = templateMatch[2];
          if (cleanTocUrl.startsWith(prefix) && prefix.length > 0) {
            cleanTocUrl = cleanTocUrl.substring(prefix.length);
          } else if (cleanTocUrl.startsWith('/') && prefix.startsWith('/')) {
            const prefixParts = prefix.replace(/^\/+/, '').split('/');
            const tocParts = cleanTocUrl.replace(/^\/+/, '').split('/');
            let skipCount = 0;
            for (let i = 0; i < prefixParts.length && i < tocParts.length; i++) {
              if (prefixParts[i] === tocParts[i]) {
                skipCount = i + 1;
              } else {
                break;
              }
            }
            if (skipCount > 0) {
              cleanTocUrl = '/' + tocParts.slice(skipCount).join('/');
            }
          }
        }
        requestUrl = chapterListUrl.replace('{{tocUrl}}', cleanTocUrl);
      }
      if (!requestUrl.startsWith('http')) {
        requestUrl = resolveUrl(source.bookSourceUrl, requestUrl);
      }
      requestUrl = requestUrl.replace(/\/{2,}/g, (match, offset) => {
        if (offset > 6) return '/';
        return match;
      });
      console.log(`[TOC] ${source.bookSourceName} -> ${requestUrl}`);
      console.log(`[TOC] Request to: ${requestUrl}`);
      const tocConfig = {
        url: requestUrl,
        method: "GET",
        headers,
      };
      responseData = await fetchWithAuthRetry(tocConfig, source);
    }

    const chapters = await parseToc(source, responseData, { book });

    res.json({ success: true, chapters });
  } catch (e) {
    console.error("[TOC ERROR]", e.message);
    const classified = classifyError(e);
    res.json({ success: false, chapters: [], message: classified.message, errorType: classified.type });
  }
});

app.post("/api/content", async (req, res) => {
  const { source, chapterUrl, book, chapter } = req.body;

  if (!source || !chapterUrl) {
    return res.status(400).json({ error: "Missing source or chapterUrl" });
  }

  try {
    let responseData;

    if (chapterUrl.startsWith('data:')) {
      console.log(`[CONTENT] ${source.bookSourceName} -> data: URL detected`);
      responseData = chapterUrl;
    } else {
      const headers = parseHeaders(source.header);
      console.log(`[CONTENT] ${source.bookSourceName} -> ${chapterUrl}`);
      const contentConfig = {
        url: chapterUrl,
        method: "GET",
        headers,
      };
      responseData = await fetchWithAuthRetry(contentConfig, source);
    }

    const content = await parseContent(source, responseData, { book, chapter }, fetchWithConfig);

    res.json({
      success: true,
      content: typeof content === "object"
        ? content.content || content
        : String(content || ""),
    });
  } catch (e) {
    console.error("[CONTENT ERROR]", e.message);
    const classified = classifyError(e);
    res.json({ success: false, content: "", message: classified.message, errorType: classified.type });
  }
});

app.get("/api/import-from-url", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    console.log(`[IMPORT] ${url}`);
    const data = await fetchWithConfig({ url, method: "GET" });

    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch {
      const fixed = data.replace(/,\s*([}\]])/g, "$1");
      try {
        parsed = JSON.parse(fixed);
      } catch {
        return res.json({
          success: false,
          sources: [],
          count: 0,
          message: "无效的JSON格式",
        });
      }
    }

    const sources = Array.isArray(parsed) ? parsed : [parsed];
    const validSources = sources.filter(
      (s) => s && s.bookSourceUrl && s.bookSourceName,
    );

    const enrichedSources = validSources.map((s) => {
      const compat = getSourceCompatibility(s);
      return {
        ...s,
        _compatibility: compat.level,
        _features: compat.features,
      };
    });

    res.json({
      success: true,
      sources: enrichedSources,
      count: enrichedSources.length,
    });
  } catch (e) {
    console.error("[IMPORT ERROR]", e.message);
    res.json({ success: false, sources: [], count: 0, message: e.message });
  }
});

app.post("/api/import-from-json", async (req, res) => {
  const { json } = req.body;
  if (!json) return res.status(400).json({ error: "Missing json data" });

  try {
    let parsed;
    if (typeof json === "string") {
      try {
        parsed = JSON.parse(json);
      } catch {
        const fixed = json.replace(/,\s*([}\]])/g, "$1");
        parsed = JSON.parse(fixed);
      }
    } else {
      parsed = json;
    }

    const sources = Array.isArray(parsed) ? parsed : [parsed];
    const validSources = sources.filter(
      (s) => s && s.bookSourceUrl && s.bookSourceName,
    );

    const enrichedSources = validSources.map((s) => {
      const compat = getSourceCompatibility(s);
      return {
        ...s,
        _compatibility: compat.level,
        _features: compat.features,
      };
    });

    res.json({
      success: true,
      sources: enrichedSources,
      count: enrichedSources.length,
    });
  } catch (e) {
    res.json({ success: false, sources: [], count: 0, message: e.message });
  }
});

app.post("/api/auth/state", async (req, res) => {
  res.json({
    sourceVariables: [...require("./javaShim").sourceVariables.keys()],
    cookieStore: [...require("./javaShim").cookieStore.keys()],
    cacheStore: [...require("./javaShim").cacheStore.keys()],
  });
});

app.post("/api/auth/persist", async (req, res) => {
  const ok = persistAuthState(AUTH_STATE_FILE);
  res.json({ success: ok, file: AUTH_STATE_FILE });
});

const path = require('path');
const AUTH_STATE_FILE = path.join(__dirname, 'auth_state.json');

restoreAuthState(AUTH_STATE_FILE);

const PERSIST_INTERVAL_MS = 5 * 60 * 1000;
const persistTimer = setInterval(() => {
  persistAuthState(AUTH_STATE_FILE);
}, PERSIST_INTERVAL_MS);
persistTimer.unref();

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received, saving auth state...');
  persistAuthState(AUTH_STATE_FILE);
  clearInterval(persistTimer);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received, saving auth state...');
  persistAuthState(AUTH_STATE_FILE);
  clearInterval(persistTimer);
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`\n🚀 Book Source Server v2.0 running on port ${PORT}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/proxy?url=...`);
  console.log(`  POST /api/proxy { url, method, headers, body }`);
  console.log(`  POST /api/test-source { source, keyword, page, fullTest }`);
  console.log(`  POST /api/login { source, mode }`);
  console.log(`  POST /api/search { source, keyword, page }`);
  console.log(`  POST /api/explore { source, exploreUrl }`);
  console.log(`  POST /api/book-info { source, bookUrl, bookData }`);
  console.log(`  POST /api/toc { source, tocUrl, book }`);
  console.log(`  POST /api/content { source, chapterUrl, book, chapter }`);
  console.log(`  GET  /api/import-from-url?url=...`);
  console.log(`  POST /api/import-from-json { json }`);
  console.log(`\nSupported rule types:`);
  console.log(`  ✅ JSONPath ($.xxx, $..xxx)`);
  console.log(`  ✅ Legado selectors (class./id./tag.)`);
  console.log(`  ✅ CSS selectors (@css:)`);
  console.log(`  ✅ XPath (@XPath:)`);
  console.log(`  ✅ JS rules (<js>...</js>, @js:)`);
  console.log(`  ✅ Rule chains (||, &&, ##, @put/@get)`);
  console.log(`  ✅ JS library (jsLib)`);
  console.log(`  ✅ Full java shim (ajax, crypto, etc.)`);
  console.log(`  ✅ data: URL protocol`);
  console.log(`  ✅ Multi-stage alive testing`);
  console.log(`  ✅ Login + auto re-auth + state persistence`);
  console.log("");
});

module.exports = { fetchWithConfig, parseDataUrl };
