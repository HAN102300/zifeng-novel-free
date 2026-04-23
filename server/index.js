const express = require("express");
const cors = require("cors");
const axios = require("axios");
const {
  parseSearchResults,
  parseBookInfo,
  parseToc,
  parseContent,
  parseHeaders,
  buildSearchConfig,
  getSourceCompatibility,
} = require("./ruleEngine");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 3001;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      ...headers,
    },
    responseType: "text",
    transformResponse: [(data) => data],
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

      const data = response.data;
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

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "2.0",
  });
});

app.get("/api/proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl)
    return res.status(400).json({ error: "Missing url parameter" });

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
    res.status(502).json({ error: "Proxy failed", message: e.message });
  }
});

app.post("/api/proxy", async (req, res) => {
  const { url, method, headers, body } = req.body;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const data = await fetchWithConfig({
      url,
      method: method || "GET",
      headers: headers || {},
      body,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(502).json({ error: "Proxy failed", message: e.message });
  }
});

app.post("/api/test-source", async (req, res) => {
  const { source, keyword = "人", page = 1 } = req.body;

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
      responseData = await fetchWithConfig(config);
    } catch (e) {
      const errorCode = e.code || "";
      let errorType = "network";
      let userMessage = e.message;

      if (errorCode === "ECONNRESET" || userMessage.includes("ECONNRESET")) {
        errorType = "connection_reset";
        userMessage =
          "连接被服务器重置(ECONNRESET)，服务器可能拒绝了请求，请检查书源地址是否正确";
      } else if (errorCode === "ETIMEDOUT" || userMessage.includes("timeout")) {
        errorType = "timeout";
        userMessage = "请求超时，服务器响应时间过长";
      } else if (errorCode === "ECONNREFUSED") {
        errorType = "connection_refused";
        userMessage = "连接被拒绝，服务器可能已关闭或地址错误";
      } else if (e.response) {
        errorType = "http_error";
        userMessage = `HTTP错误 ${e.response.status}: ${e.response.statusText || "服务器返回错误"}`;
      } else if (errorCode === "EPROTO" || userMessage.includes("SSL")) {
        errorType = "ssl_error";
        userMessage = "SSL/TLS握手失败，服务器证书可能有问题";
      }

      console.error(
        `[TEST ERROR] ${source.bookSourceName}: ${errorCode} - ${e.message}`,
      );
      return res.json({
        success: false,
        message: userMessage,
        errorType,
        requestInfo,
        errorCode,
      });
    }

    if (!responseData) {
      return res.json({
        success: false,
        message: "服务器返回空内容",
        errorType: "empty_response",
        requestInfo,
      });
    }

    const results = await parseSearchResults(source, responseData, {
      key: keyword,
      page,
    });
    const compat = getSourceCompatibility(source);

    const isHtml =
      typeof responseData === "string" &&
      (responseData.includes("<") || responseData.includes("&lt;"));
    const isJson =
      typeof responseData === "string" && responseData.trim().startsWith("{");

    res.json({
      success: results.length > 0,
      message:
        results.length > 0
          ? `连接成功，找到 ${results.length} 条结果`
          : isHtml
            ? "连接成功但未解析到结果，可能需要调整解析规则"
            : "连接成功但无搜索结果",
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

    const responseData = await fetchWithConfig(config);
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
    res.json({ success: false, results: [], message: e.message });
  }
});

app.post("/api/book-info", async (req, res) => {
  const { source, bookUrl, bookData } = req.body;

  if (!source) {
    return res.status(400).json({ error: "Missing source" });
  }

  try {
    let responseData = bookData;

    if (bookUrl) {
      const headers = parseHeaders(source.header);
      const config = {
        url: bookUrl,
        method: "GET",
        headers,
      };
      console.log(`[BOOK-INFO] ${source.bookSourceName} -> ${bookUrl}`);
      responseData = await fetchWithConfig(config);
    }

    const bookInfo = await parseBookInfo(source, responseData, {
      book: bookData,
    });

    res.json({ success: true, bookInfo });
  } catch (e) {
    console.error("[BOOK-INFO ERROR]", e.message);
    res.json({ success: false, message: e.message });
  }
});

app.post("/api/toc", async (req, res) => {
  const { source, tocUrl } = req.body;

  if (!source || !tocUrl) {
    return res.status(400).json({ error: "Missing source or tocUrl" });
  }

  try {
    const headers = parseHeaders(source.header);
    console.log(`[TOC] ${source.bookSourceName} -> ${tocUrl}`);
    const responseData = await fetchWithConfig({
      url: tocUrl,
      method: "GET",
      headers,
    });
    const chapters = await parseToc(source, responseData);

    res.json({ success: true, chapters });
  } catch (e) {
    console.error("[TOC ERROR]", e.message);
    res.json({ success: false, chapters: [], message: e.message });
  }
});

app.post("/api/content", async (req, res) => {
  const { source, chapterUrl } = req.body;

  if (!source || !chapterUrl) {
    return res.status(400).json({ error: "Missing source or chapterUrl" });
  }

  try {
    const headers = parseHeaders(source.header);
    console.log(`[CONTENT] ${source.bookSourceName} -> ${chapterUrl}`);
    const responseData = await fetchWithConfig({
      url: chapterUrl,
      method: "GET",
      headers,
    });
    const content = await parseContent(source, responseData);

    res.json({
      success: true,
      content:
        typeof content === "object"
          ? content.content || content
          : String(content || ""),
    });
  } catch (e) {
    console.error("[CONTENT ERROR]", e.message);
    res.json({ success: false, content: "", message: e.message });
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

app.listen(PORT, () => {
  console.log(`\n🚀 Book Source Server v2.0 running on port ${PORT}`);
  console.log(`\nAPI Endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/proxy?url=...`);
  console.log(`  POST /api/proxy { url, method, headers, body }`);
  console.log(`  POST /api/test-source { source, keyword, page }`);
  console.log(`  POST /api/search { source, keyword, page }`);
  console.log(`  POST /api/book-info { source, bookUrl, bookData }`);
  console.log(`  POST /api/toc { source, tocUrl }`);
  console.log(`  POST /api/content { source, chapterUrl }`);
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
  console.log("");
});
