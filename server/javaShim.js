const axios = require("axios");
const crypto = require("crypto");

const sourceVariables = new Map();
const cookieStore = new Map();
const cacheStore = new Map();

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

function createJavaShim(baseUrl, sourceData = {}) {
  const sourceVars =
    sourceVariables.get(sourceData.bookSourceUrl || baseUrl) || new Map();

  const ajax = async (url, headers) => {
    let fullUrl = url;
    if (!fullUrl.startsWith("http")) {
      fullUrl = baseUrl + (fullUrl.startsWith("/") ? "" : "/") + fullUrl;
    }

    let lastError = null;
    for (let attempt = 0; attempt <= AJAX_MAX_RETRIES; attempt++) {
      try {
        const res = await axios.get(fullUrl, {
          timeout: 20000,
          maxRedirects: 10,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate",
            Connection: attempt > 0 ? "close" : "keep-alive",
            Referer: baseUrl,
            ...(typeof headers === "object" ? headers : {}),
          },
          responseType: "text",
          decompress: true,
          validateStatus: (status) => status >= 200 && status < 400,
        });
        return typeof res.data === "string"
          ? res.data
          : JSON.stringify(res.data);
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

  const getString = (path, data) => {
    if (!path || data == null) return "";
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return "";
      }
    }
    const result = simpleJsonPath(data, path);
    return result;
  };

  return {
    ajax,
    ajaxAll,
    connect: ajax,
    getString,
    getStrResponse: ajax,
    log: (...args) => console.log("[JS-LOG]", ...args),
    toast: (msg) => console.log("[JS-TOAST]", msg),
    longToast: (msg) => console.log("[JS-LONGTOAST]", msg),

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
    startBrowserAwait: (url, title) => {
      console.log("[JS-BROWSER-AWAIT]", url, title);
      return "";
    },
  };
}

function createSourceShim(sourceData = {}) {
  const sourceUrl = sourceData.bookSourceUrl || "";
  const sourceVars = sourceVariables.get(sourceUrl) || new Map();

  return {
    getKey: () => sourceUrl,
    get: (key) => sourceVars.get(key) || "",
    put: (key, value) => {
      sourceVars.set(key, value);
      sourceVariables.set(sourceUrl, sourceVars);
    },
    getVariable: () => sourceVars.get("_variable") || "",
    setVariable: (str) => {
      sourceVars.set("_variable", str);
      sourceVariables.set(sourceUrl, sourceVars);
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
      sourceVariables.set(sourceUrl, sourceVars);
    },
  };
}

function createCookieShim() {
  return {
    getCookie: (url) => cookieStore.get(url) || "",
    setCookie: (url, cookie) => cookieStore.set(url, cookie),
    removeCookie: (url) => cookieStore.delete(url),
  };
}

function createCacheShim() {
  return {
    get: (key) => cacheStore.get(key) || "",
    put: (key, value) => cacheStore.set(key, value),
  };
}

function createBookShim(bookData = {}) {
  return {
    name: bookData.name || "",
    author: bookData.author || "",
    bookUrl: bookData._sourceUrl || "",
    coverUrl: bookData.cover || "",
    intro: bookData.summary || "",
    durChapterIndex: bookData.durChapterIndex || 0,
    durChapterName: bookData.durChapterName || "",
    getVariable: (key) => bookData._variables?.[key] || "",
    setVariable: (key, value) => {
      if (!bookData._variables) bookData._variables = {};
      bookData._variables[key] = value;
    },
  };
}

module.exports = {
  createJavaShim,
  createSourceShim,
  createCookieShim,
  createCacheShim,
  createBookShim,
  sourceVariables,
  cookieStore,
  cacheStore,
};
