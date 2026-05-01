const cheerio = require("cheerio");
const { resolveLegadoSelector, isLegadoSelector, resolveXPath } = require("./selectors");
const {
  createJavaShim,
  createSourceShim,
  createCookieShim,
  createCacheShim,
  createBookShim,
  createChapterShim,
} = require("./javaShim");

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

const ruleVariables = new Map();

function resolveJsonPath(data, path) {
  if (!path || data == null) return null;

  let normalizedPath = path.trim();

  if (normalizedPath.startsWith("$..")) {
    const fieldName = normalizedPath.slice(3);
    return findRecursive(data, fieldName);
  }

  if (normalizedPath.startsWith("$.")) {
    normalizedPath = normalizedPath.slice(2);
  } else if (normalizedPath.startsWith("$")) {
    normalizedPath = normalizedPath.slice(1);
    if (normalizedPath.startsWith("."))
      normalizedPath = normalizedPath.slice(1);
  }

  if (!normalizedPath) return data;

  const parts = parsePath(normalizedPath);
  let result = data;

  for (const part of parts) {
    if (result == null) return null;
    if (part.type === "index") {
      if (part.value === "*") {
        if (Array.isArray(result)) continue;
        return null;
      }
      result = result[part.value];
    } else if (part.type === "field") {
      result = result[part.value];
    }
  }

  return result;
}

function parsePath(path) {
  const parts = [];
  let i = 0;
  let current = "";

  while (i < path.length) {
    if (path[i] === ".") {
      if (current) {
        parts.push({ type: "field", value: current });
        current = "";
      }
      i++;
    } else if (path[i] === "[") {
      if (current) {
        parts.push({ type: "field", value: current });
        current = "";
      }
      const end = path.indexOf("]", i);
      if (end === -1) break;
      const indexStr = path.slice(i + 1, end).trim();
      if (indexStr === "*") {
        parts.push({ type: "index", value: "*" });
      } else if (indexStr.startsWith('"') || indexStr.startsWith("'")) {
        parts.push({ type: "field", value: indexStr.slice(1, -1) });
      } else {
        parts.push({ type: "index", value: parseInt(indexStr) || 0 });
      }
      i = end + 1;
    } else {
      current += path[i];
      i++;
    }
  }
  if (current) parts.push({ type: "field", value: current });
  return parts;
}

function findRecursive(data, fieldName) {
  if (data == null || typeof data !== "object") return null;

  if (Array.isArray(data)) {
    const results = [];
    for (const item of data) {
      const found = findRecursive(item, fieldName);
      if (found != null) {
        if (Array.isArray(found)) results.push(...found);
        else results.push(found);
      }
    }
    return results.length > 0 ? results : null;
  }

  if (data[fieldName] !== undefined) return data[fieldName];

  for (const value of Object.values(data)) {
    if (typeof value === "object") {
      const found = findRecursive(value, fieldName);
      if (found != null) return found;
    }
  }
  return null;
}

function resolveTemplate(template, data) {
  if (!template || typeof template !== "string") return template;
  if (!template.includes("{{")) return template;

  return template.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    if (expr.startsWith("$")) {
      const value = resolveJsonPath(data, expr);
      return value != null ? String(value) : "";
    }
    if (expr.startsWith("result")) {
      return data != null ? String(data) : "";
    }
    return match;
  });
}

async function executeJsRule(code, resultValue, context) {
  if (!code || typeof code !== "string") return resultValue;

  const { baseUrl, source, book, key, page, chapter } = context;
  const java = createJavaShim(baseUrl, source, context);
  const sourceShim = createSourceShim(source);
  const cookieShim = createCookieShim();
  const cacheShim = createCacheShim();
  const bookShim = createBookShim(book || {});
  const chapterShim = createChapterShim(chapter || {});

  let jsLibCode = "";
  if (source && source.jsLib) {
    jsLibCode = source.jsLib + "\n";
  }

  try {
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;

    let wrappedCode = code.trim();
    const hasVarDecl = /\b(var|let|const)\s+/.test(wrappedCode);
    if (hasVarDecl || wrappedCode.endsWith(";")) {
      if (!wrappedCode.includes("return ") && !wrappedCode.includes("return\t")) {
        const trimmed = wrappedCode.trim();
        const semiPositions = [];
        let depth = 0;
        for (let i = 0; i < trimmed.length; i++) {
          const ch = trimmed[i];
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          if (ch === '}' || ch === ')' || ch === ']') depth--;
          if (ch === ';' && depth === 0) semiPositions.push(i);
        }
        if (semiPositions.length >= 2) {
          const secondLastSemiPos = semiPositions[semiPositions.length - 2];
          const lastSemiPos = semiPositions[semiPositions.length - 1];
          const lastStatement = trimmed.slice(secondLastSemiPos + 1, lastSemiPos).trim();
          if (lastStatement && !/^\b(var|let|const|if|for|while|switch|try|function|else|do)\b/.test(lastStatement)) {
            wrappedCode = trimmed.slice(0, secondLastSemiPos + 1) + " return " + lastStatement + ";";
          } else {
            const afterLastBrace = trimmed.match(/\}\s*([^{};]+);?\s*$/);
            if (afterLastBrace && afterLastBrace[1]) {
              const tailExpr = afterLastBrace[1].trim();
              if (tailExpr && !/^\b(var|let|const|if|for|while|switch|try|function|else|do)\b/.test(tailExpr)) {
                wrappedCode = trimmed.slice(0, trimmed.lastIndexOf(afterLastBrace[1])) + "return " + tailExpr + ";";
              }
            }
          }
        } else if (semiPositions.length === 1) {
          const lastSemiPos = semiPositions[0];
          const beforeSemi = trimmed.slice(0, lastSemiPos).trim();
          const afterSemi = trimmed.slice(lastSemiPos + 1).trim();
          if (afterSemi === "" && beforeSemi && !/^\b(var|let|const|if|for|while|switch|try|function|else|do)\b/.test(beforeSemi)) {
            wrappedCode = "return " + beforeSemi + ";";
          } else if (afterSemi && !/^\b(var|let|const|if|for|while|switch|try|function|else|do)\b/.test(afterSemi)) {
            wrappedCode = trimmed.slice(0, lastSemiPos + 1) + " return " + afterSemi + ";";
          }
        }
        if (!wrappedCode.startsWith("{")) {
          wrappedCode = "{ " + wrappedCode + " }";
        }
      }
    } else if (!wrappedCode.startsWith("{") && !wrappedCode.includes("return ") && !wrappedCode.includes("return\t")) {
      if (wrappedCode.includes(";") || wrappedCode.includes("\n")) {
        const statements = [];
        let current = "";
        let depth = 0;
        for (let i = 0; i < wrappedCode.length; i++) {
          const ch = wrappedCode[i];
          if (ch === '{' || ch === '(' || ch === '[') depth++;
          if (ch === '}' || ch === ')' || ch === ']') depth--;
          if ((ch === ';' || ch === '\n') && depth === 0) {
            const stmt = current.trim();
            if (stmt) statements.push(stmt);
            current = "";
          } else {
            current += ch;
          }
        }
        const lastStmt = current.trim();
        if (lastStmt) statements.push(lastStmt);
        if (statements.length > 1) {
          const last = statements[statements.length - 1];
          if (!/^\b(var|let|const|if|for|while|switch|try|function|else|do)\b/.test(last)) {
            statements[statements.length - 1] = "return " + last;
          }
          wrappedCode = "{ " + statements.join("; ") + "; }";
        } else {
          wrappedCode = `return (${wrappedCode});`;
        }
      } else {
        wrappedCode = `return (${wrappedCode});`;
      }
    }

    const cheerio = require("cheerio");

    const wrapElements = ($, selection) => {
      const arr = [];
      selection.each((i, el) => {
        arr.push(wrapElement($, $(el)));
      });
      return arr;
    };

    const wrapElement = ($, $el) => {
      return {
        attr: (name) => $el.attr(name) || "",
        text: () => $el.text().trim(),
        html: () => $el.html() || "",
        outerHtml: () => $.html($el) || "",
        select: (selector) => {
          const sub = $el.find(selector);
          return wrapElements($, sub);
        },
        selectFirst: (selector) => {
          const sub = $el.find(selector).first();
          if (sub.length === 0) return null;
          return wrapElement($, sub);
        },
        children: () => wrapElements($, $el.children()),
        parent: () => {
          const p = $el.parent();
          if (p.length === 0) return null;
          return wrapElement($, p);
        },
        tagName: () => ($el.get(0) ? $el.get(0).tagName : ""),
        id: () => $el.attr("id") || "",
        className: () => $el.attr("class") || "",
        hasClass: (cls) => $el.hasClass(cls),
        toString: () => $el.text().trim(),
      };
    };

    const orgShim = {
      jsoup: {
        Jsoup: {
          parse: (html) => {
            if (!html || typeof html !== "string") html = "";
            const $ = cheerio.load(html);
            const body = $("body").length > 0 ? $("body") : $.root();
            return {
              select: (selector) => {
                const selection = $(selector);
                return wrapElements($, selection);
              },
              selectFirst: (selector) => {
                const selection = $(selector).first();
                if (selection.length === 0) return null;
                return wrapElement($, selection);
              },
              text: () => $.root().text().trim(),
              html: () => $.html(),
              title: () => $("title").text().trim(),
              head: () => wrapElement($, $("head")),
              body: () => wrapElement($, $("body")),
            };
          },
          connect: (url) => ({
            get: async () => {
              const html = await java.ajax(url);
              return orgShim.jsoup.Jsoup.parse(html);
            },
            post: async () => {
              const html = await java.ajax(url);
              return orgShim.jsoup.Jsoup.parse(html);
            },
          }),
        },
      },
    };

    const fn = new AsyncFunction(
      "result",
      "java",
      "baseUrl",
      "source",
      "cookie",
      "cache",
      "book",
      "chapter",
      "key",
      "page",
      "CryptoJS",
      "org",
      `"use strict";
       const require = undefined;
       const process = undefined;
       const global = undefined;
       const globalThis = undefined;
       const __filename = undefined;
       const __dirname = undefined;
       ${jsLibCode}
       ${wrappedCode}`,
    );

    const cryptoShim = {
      MD5: (str) => ({
        toString: () =>
          require("crypto").createHash("md5").update(str).digest("hex"),
      }),
      HmacMD5: (str, key) => ({
        toString: () =>
          require("crypto").createHmac("md5", key).update(str).digest("hex"),
      }),
      HmacSHA256: (str, key) => ({
        toString: () =>
          require("crypto").createHmac("sha256", key).update(str).digest("hex"),
      }),
      enc: { Utf8: "utf8", Base64: "base64", Hex: "hex" },
      AES: {
        decrypt: (str, key, opts) => str,
        encrypt: (str, key, opts) => str,
      },
    };

    const execResult = await fn(
      resultValue,
      java,
      baseUrl,
      sourceShim,
      cookieShim,
      cacheShim,
      bookShim,
      chapterShim,
      key || "",
      page || 1,
      cryptoShim,
      orgShim,
    );
    return execResult !== undefined ? execResult : resultValue;
  } catch (e) {
    console.warn("JS规则执行失败:", e.message, code.slice(0, 100));
    return resultValue;
  }
}

function splitRuleAlternatives(rule) {
  const parts = [];
  let current = "";
  let depth = 0;
  let inJs = false;

  for (let i = 0; i < rule.length; i++) {
    const ch = rule[i];

    if (rule.slice(i, i + 4) === "<js>") {
      inJs = true;
      depth++;
    }
    if (rule.slice(i, i + 5) === "</js>") {
      inJs = false;
      depth = Math.max(0, depth - 1);
    }
    if (rule.slice(i, i + 4) === "@js:") {
      inJs = true;
    }

    if (ch === "|" && rule[i + 1] === "|" && !inJs && depth === 0) {
      parts.push(current);
      current = "";
      i++;
      continue;
    }

    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

function splitRuleConcat(rule) {
  const parts = [];
  let current = "";
  let depth = 0;
  let inJs = false;

  for (let i = 0; i < rule.length; i++) {
    const ch = rule[i];

    if (rule.slice(i, i + 4) === "<js>") {
      inJs = true;
      depth++;
    }
    if (rule.slice(i, i + 5) === "</js>") {
      inJs = false;
      depth = Math.max(0, depth - 1);
    }
    if (rule.slice(i, i + 4) === "@js:") {
      inJs = true;
    }

    if (ch === "&" && rule[i + 1] === "&" && !inJs && depth === 0) {
      parts.push(current);
      current = "";
      i++;
      continue;
    }

    current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

function splitRuleReplace(rule) {
  const idx = rule.indexOf("##");
  if (idx === -1) return { mainRule: rule, replaceRegex: "" };

  let depth = 0;
  for (let i = 0; i < idx; i++) {
    if (rule.slice(i, i + 4) === "<js>") depth++;
    if (rule.slice(i, i + 5) === "</js>") depth--;
  }
  if (depth > 0) return { mainRule: rule, replaceRegex: "" };

  return {
    mainRule: rule.slice(0, idx),
    replaceRegex: rule.slice(idx + 2),
  };
}

function applyReplaceRegex(value, replaceRegex) {
  if (!replaceRegex || value == null) return value;

  const patterns = replaceRegex.split("||");
  let result = String(value);

  for (const pattern of patterns) {
    if (!pattern) continue;
    try {
      const regex = new RegExp(pattern, "g");
      result = result.replace(regex, "");
    } catch (e) {
      console.warn("正则替换失败:", pattern, e.message);
    }
  }

  return result;
}

function extractPutVariables(rule, data) {
  const putMatch = rule.match(/@put:\{([^}]+)\}/);
  if (!putMatch) return rule;

  const vars = putMatch[1];
  const pairs = vars.split(",");
  for (const pair of pairs) {
    const [key, ...valueParts] = pair.split(":");
    if (key && valueParts.length) {
      const value = valueParts.join(":").trim();
      let resolvedValue = value;
      if (value.startsWith("$")) {
        resolvedValue = resolveJsonPath(data, value);
      }
      ruleVariables.set(
        key.trim(),
        resolvedValue != null ? String(resolvedValue) : "",
      );
    }
  }

  return rule.replace(/@put:\{[^}]+\}/, "").trim();
}

function applyGetVariables(rule) {
  return rule.replace(/@get:\{([^}]+)\}/g, (match, key) => {
    return ruleVariables.get(key.trim()) || "";
  });
}

async function resolveRuleValue(data, rule, context) {
  if (!rule || typeof rule !== "string") return null;

  rule = rule.trim();
  if (!rule) return null;

  rule = applyGetVariables(rule);
  rule = extractPutVariables(rule, data);
  if (!rule) return null;

  const { mainRule, replaceRegex } = splitRuleReplace(rule);

  const alternatives = splitRuleAlternatives(mainRule);
  let result = null;

  for (const alt of alternatives) {
    const concatParts = splitRuleConcat(alt);
    const partResults = [];

    for (const part of concatParts) {
      const trimmedPart = part.trim();
      if (!trimmedPart) continue;

      const value = await resolveSingleRule(data, trimmedPart, context);
      if (value != null) {
        partResults.push(value);
      }
    }

    if (partResults.length > 0) {
      if (partResults.length === 1 && typeof partResults[0] === "object") {
        result = partResults[0];
      } else {
        result = partResults.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join("\n");
      }
      break;
    }
  }

  if (replaceRegex && result != null) {
    result = applyReplaceRegex(result, replaceRegex);
  }

  return result;
}

async function resolveSingleRule(data, rule, context) {
  if (!rule) return null;

  if (rule.startsWith("<js>")) {
    const jsMatch = rule.match(/^<js>([\s\S]*?)<\/js>\s*(.*)/);
    if (jsMatch) {
      const jsCode = jsMatch[1];
      const afterJs = jsMatch[2].trim();
      let jsResult = await executeJsRule(jsCode, data, context);
      if (afterJs) {
        jsResult = await resolveSingleRule(jsResult, afterJs, context);
      }
      return jsResult;
    }
  }

  if (rule.includes("<js>")) {
    const jsMatch = rule.match(/([\s\S]*?)<js>([\s\S]*?)<\/js>([\s\S]*)/);
    if (jsMatch) {
      const beforeJs = jsMatch[1].trim();
      const jsCode = jsMatch[2];
      const afterJs = jsMatch[3].trim();

      let preResult = data;
      if (beforeJs) {
        preResult = await resolveSingleRule(data, beforeJs, context);
      }

      let jsResult = await executeJsRule(jsCode, preResult, context);

      if (afterJs) {
        jsResult = await resolveSingleRule(jsResult, afterJs, context);
      }
      return jsResult;
    }
  }

  if (rule.includes("@js:")) {
    const jsIdx = rule.indexOf("@js:");
    const beforeJs = rule.slice(0, jsIdx).trim();
    const jsCode = rule.slice(jsIdx + 4).trim();

    let preResult = beforeJs
      ? await resolveSingleRule(data, beforeJs, context)
      : data;
    return await executeJsRule(jsCode, preResult, context);
  }

  if (rule.startsWith("$.") || rule.startsWith("$..")) {
    return resolveJsonPath(data, rule);
  }

  if (rule.includes("{{")) {
    return resolveTemplate(rule, data);
  }

  if (rule.startsWith("@XPath:")) {
    const xpathExpr = rule.slice(7).trim();
    const htmlStr = typeof data === "string" ? data : data?._html || JSON.stringify(data);
    return resolveXPath(htmlStr, xpathExpr);
  }

  if (isLegadoSelector(rule)) {
    const htmlStr =
      typeof data === "string" ? data : data?._html || JSON.stringify(data);
    if (htmlStr && (htmlStr.includes("<") || htmlStr.includes("&lt;"))) {
      return resolveLegadoSelector(htmlStr, rule);
    }
    return null;
  }

  if (
    /^[a-zA-Z_]\w*$/.test(rule) &&
    data &&
    typeof data === "object" &&
    !Array.isArray(data)
  ) {
    return data[rule] || null;
  }

  return rule;
}

async function parseBookListFromRules(source, responseData, rules, context = {}) {
  if (!responseData) return [];
  if (!rules) return [];

  const bookListRule = rules.bookList || "$.data";
  const htmlStr = typeof responseData === "string" ? responseData : JSON.stringify(responseData);
  const ctx = { baseUrl: source.bookSourceUrl, source, contextHtml: htmlStr, ...context };

  let bookList;
  let isHtmlSource = false;
  let cheerioInstance = null;

  if (typeof responseData === "string") {
    try {
      responseData = JSON.parse(responseData);
    } catch {
      isHtmlSource = true;
    }
  }

  if (isLegadoSelector(bookListRule) || isHtmlSource) {
    const htmlStr =
      typeof responseData === "string"
        ? responseData
        : JSON.stringify(responseData);
    const elements = resolveLegadoSelector(htmlStr, bookListRule, true);
    if (elements && elements.length > 0) {
      const cheerio = require("cheerio");
      cheerioInstance = cheerio.load(htmlStr);
      bookList = elements.toArray().map((el) => ({
        _isHtmlElement: true,
        _el: el,
        _html: cheerioInstance.html(el),
        _text: cheerioInstance(el).text().trim(),
      }));
    } else {
      bookList = [];
    }
  } else if (bookListRule.includes("<js>")) {
    const jsMatch = bookListRule.match(/<js>([\s\S]*?)<\/js>/);
    if (jsMatch) {
      bookList = await executeJsRule(jsMatch[1], responseData, ctx);
    } else {
      bookList = await executeJsRule(bookListRule, responseData, ctx);
    }
  } else if (bookListRule.includes("@js:")) {
    const jsCode = bookListRule.split("@js:")[1];
    bookList = await executeJsRule(jsCode, responseData, ctx);
  } else if (bookListRule.startsWith("$.") || bookListRule.startsWith("$..")) {
    bookList = resolveJsonPath(responseData, bookListRule);
  } else {
    bookList = resolveJsonPath(responseData, bookListRule);
  }

  if (!Array.isArray(bookList)) {
    if (bookList && typeof bookList === "object") {
      const possibleArrays = Object.values(bookList).filter((v) =>
        Array.isArray(v),
      );
      if (possibleArrays.length > 0) {
        bookList = possibleArrays[0];
      } else {
        bookList = [bookList];
      }
    } else {
      return [];
    }
  }

  const results = [];
  for (const item of bookList) {
    let name, author, bookUrl, coverUrl, intro, kind, lastChapter, wordCount;

    if (item && item._isHtmlElement && cheerioInstance) {
      const $el = cheerioInstance(item._el);
      const elHtml = item._html;

      name = resolveLegadoSelectorForElement(cheerioInstance, $el, rules.name);
      author = resolveLegadoSelectorForElement(
        cheerioInstance,
        $el,
        rules.author,
      );
      bookUrl = resolveLegadoSelectorForElement(
        cheerioInstance,
        $el,
        rules.bookUrl,
      );
      coverUrl = resolveLegadoSelectorForElement(
        cheerioInstance,
        $el,
        rules.coverUrl,
      );
      intro = resolveLegadoSelectorForElement(
        cheerioInstance,
        $el,
        rules.intro,
      );
      kind = resolveLegadoSelectorForElement(cheerioInstance, $el, rules.kind);
      lastChapter = resolveLegadoSelectorForElement(
        cheerioInstance,
        $el,
        rules.lastChapter,
      );
      wordCount = resolveLegadoSelectorForElement(
        cheerioInstance,
        $el,
        rules.wordCount,
      );
    } else {
      const searchFields = ['name', 'author', 'bookUrl', 'coverUrl', 'intro', 'kind', 'lastChapter', 'wordCount'];
      for (const field of searchFields) {
        try {
          const value = await resolveRuleValue(item, rules[field], ctx);
          if (field === 'name') name = value;
          else if (field === 'author') author = value;
          else if (field === 'bookUrl') bookUrl = value;
          else if (field === 'coverUrl') coverUrl = value;
          else if (field === 'intro') intro = value;
          else if (field === 'kind') kind = value;
          else if (field === 'lastChapter') lastChapter = value;
          else if (field === 'wordCount') wordCount = value;
        } catch (e) {
          console.error(`[PARSE ERROR] ruleSearch.${field} failed: rule="${rules[field]}", error="${e.message}"`);
          if (field === 'name') name = '';
          else if (field === 'author') author = '';
          else if (field === 'bookUrl') bookUrl = '';
          else if (field === 'coverUrl') coverUrl = '';
          else if (field === 'intro') intro = '';
          else if (field === 'kind') kind = '';
          else if (field === 'lastChapter') lastChapter = '';
          else if (field === 'wordCount') wordCount = '';
        }
      }
    }

    name = name || "未知书名";
    author = author || "未知作者";
    bookUrl = bookUrl || "";
    coverUrl = coverUrl || "";
    intro = intro || "";
    kind = kind || "";
    lastChapter = lastChapter || "";
    wordCount = wordCount || "";

    name = Array.isArray(name) ? name.join(" ") : String(name);
    author = Array.isArray(author) ? author.join(" ") : String(author);
    bookUrl = Array.isArray(bookUrl) ? bookUrl[0] || "" : String(bookUrl);
    coverUrl = Array.isArray(coverUrl) ? coverUrl[0] || "" : String(coverUrl);
    intro = Array.isArray(intro) ? intro.join("\n") : String(intro);
    kind = Array.isArray(kind) ? kind.join(",") : String(kind);
    lastChapter = Array.isArray(lastChapter)
      ? lastChapter.join(" ")
      : String(lastChapter);
    wordCount = Array.isArray(wordCount)
      ? wordCount[0] || ""
      : String(wordCount);

    if (bookUrl && !bookUrl.startsWith("http")) {
      bookUrl = resolveUrl(source.bookSourceUrl, bookUrl);
    }
    if (coverUrl && !coverUrl.startsWith("http")) {
      if (coverUrl.startsWith("//")) {
        coverUrl = "https:" + coverUrl;
      } else {
        coverUrl = resolveUrl(source.bookSourceUrl, coverUrl);
      }
    }

    results.push({
      id: bookUrl || Math.random().toString(36).slice(2),
      name: String(name),
      author: String(author),
      cover: coverUrl,
      summary: String(intro),
      lastChapter: String(lastChapter),
      wordNum: String(wordCount),
      category: String(kind),
      _sourceUrl: bookUrl,
      _rawItem: item._isHtmlElement ? undefined : item,
    });
  }

  return results.filter((item) => item.name && item.name !== "未知书名");
}

async function parseSearchResults(source, responseData, context = {}) {
  return parseBookListFromRules(source, responseData, source.ruleSearch, context);
}

async function parseExplore(source, responseData, context = {}) {
  if (!source.ruleExplore) return [];
  return parseBookListFromRules(source, responseData, source.ruleExplore, context);
}

function parseExploreUrl(exploreUrl) {
  if (!exploreUrl || typeof exploreUrl !== 'string') return [];
  exploreUrl = exploreUrl.trim();
  if (!exploreUrl) return [];
  try {
    const parsed = JSON.parse(exploreUrl);
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        title: item.title || '',
        url: item.url || ''
      })).filter(item => item.title && item.url);
    }
  } catch {}
  return exploreUrl.split('\n').map(line => line.trim()).filter(line => line).map(line => {
    const idx = line.indexOf('::');
    if (idx !== -1) {
      return { title: line.slice(0, idx).trim(), url: line.slice(idx + 2).trim() };
    }
    return null;
  }).filter(item => item && item.title && item.url);
}

function resolveLegadoSelectorForElement($, $el, rule) {
  if (!rule) return null;
  const { parseLegadoSelector } = require("./selectors");
  const result = parseLegadoSelector($, $el, rule);
  return result;
}

async function parseBookInfo(source, responseData, context = {}) {
  const rules = source.ruleBookInfo || {};
  const htmlStr = typeof responseData === "string" ? responseData : JSON.stringify(responseData);
  const ctx = { baseUrl: source.bookSourceUrl, source, contextHtml: htmlStr, ...context };

  let data = responseData;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {}
  }

  if (rules.init) {
    data = await resolveRuleValue(data, rules.init, ctx);
  }

  if (Array.isArray(data) && data.length > 0) {
    data = data[0];
  }

  const bookInfo = {};
  const fields = ['name', 'author', 'coverUrl', 'intro', 'kind', 'lastChapter', 'tocUrl', 'wordCount'];
  for (const field of fields) {
    try {
      bookInfo[field] = await resolveRuleValue(data, rules[field], ctx);
    } catch (e) {
      console.error(`[PARSE ERROR] ruleBookInfo.${field} failed: rule="${rules[field]}", error="${e.message}"`);
      bookInfo[field] = '';
    }
  }
  bookInfo.score = '';
  bookInfo.chapterCount = '';
  bookInfo.lastUpdateTime = '';
  if (rules.score) {
    try {
      bookInfo.score = await resolveRuleValue(data, rules.score, ctx);
    } catch (e) {
      console.error(`[PARSE ERROR] ruleBookInfo.score failed: rule="${rules.score}", error="${e.message}"`);
      bookInfo.score = '';
    }
  }
  if (rules.chapterCount) {
    try {
      bookInfo.chapterCount = await resolveRuleValue(data, rules.chapterCount, ctx);
    } catch (e) {
      console.error(`[PARSE ERROR] ruleBookInfo.chapterCount failed: rule="${rules.chapterCount}", error="${e.message}"`);
      bookInfo.chapterCount = '';
    }
  }
  if (rules.lastUpdateTime) {
    try {
      bookInfo.lastUpdateTime = await resolveRuleValue(data, rules.lastUpdateTime, ctx);
    } catch (e) {
      console.error(`[PARSE ERROR] ruleBookInfo.lastUpdateTime failed: rule="${rules.lastUpdateTime}", error="${e.message}"`);
      bookInfo.lastUpdateTime = '';
    }
  }

  const ensureString = (v) => {
    if (Array.isArray(v)) return v[0] || "";
    return v != null ? String(v) : "";
  };

  bookInfo.name = ensureString(bookInfo.name);
  bookInfo.author = ensureString(bookInfo.author);
  bookInfo.coverUrl = ensureString(bookInfo.coverUrl);
  bookInfo.intro = ensureString(bookInfo.intro);
  bookInfo.kind = ensureString(bookInfo.kind);
  bookInfo.lastChapter = ensureString(bookInfo.lastChapter);
  bookInfo.tocUrl = ensureString(bookInfo.tocUrl);
  bookInfo.wordCount = ensureString(bookInfo.wordCount);

  const baseUrl = (source.bookSourceUrl || "").replace(/\/+$/, "");

  if (bookInfo.coverUrl && !bookInfo.coverUrl.startsWith("http")) {
    if (bookInfo.coverUrl.startsWith("//")) {
      bookInfo.coverUrl = "https:" + bookInfo.coverUrl;
    } else {
      bookInfo.coverUrl = resolveUrl(baseUrl, bookInfo.coverUrl);
    }
  }

  if (bookInfo.tocUrl && !bookInfo.tocUrl.startsWith("http")) {
    bookInfo.tocUrl = resolveUrl(baseUrl, bookInfo.tocUrl);
  }

  return bookInfo;
}

async function parseToc(source, responseData, context = {}) {
  const rules = source.ruleToc || {};
  const htmlStr = typeof responseData === "string" ? responseData : JSON.stringify(responseData);
  const ctx = { baseUrl: source.bookSourceUrl, source, contextHtml: htmlStr, ...context };

  let data = responseData;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {}
  }

  let chapterList = await resolveRuleValue(data, rules.chapterList, ctx);
  if (!Array.isArray(chapterList)) chapterList = [];

  const chapters = [];
  const tocBaseUrl = (source.bookSourceUrl || "").replace(/\/+$/, "");

  for (const item of chapterList) {
    let chapterName, chapterUrl, isVip, isPay, updateTime;
    const tocFields = ['chapterName', 'chapterUrl', 'isVip', 'isPay', 'updateTime'];
    for (const field of tocFields) {
      try {
        const value = await resolveRuleValue(item, rules[field], ctx);
        if (field === 'chapterName') chapterName = value;
        else if (field === 'chapterUrl') chapterUrl = value;
        else if (field === 'isVip') isVip = value;
        else if (field === 'isPay') isPay = value;
        else if (field === 'updateTime') updateTime = value;
      } catch (e) {
        console.error(`[PARSE ERROR] ruleToc.${field} failed: rule="${rules[field]}", error="${e.message}"`);
        if (field === 'chapterName') chapterName = '';
        else if (field === 'chapterUrl') chapterUrl = '';
        else if (field === 'isVip') isVip = '';
        else if (field === 'isPay') isPay = '';
        else if (field === 'updateTime') updateTime = '';
      }
    }

    if (Array.isArray(chapterUrl)) chapterUrl = chapterUrl[0] || "";
    if (chapterUrl && !String(chapterUrl).startsWith("http")) {
      chapterUrl = resolveUrl(tocBaseUrl, String(chapterUrl));
    }

    if (chapterName) {
      chapters.push({
        name: Array.isArray(chapterName)
          ? String(chapterName.join(" "))
          : String(chapterName),
        url: String(chapterUrl || ""),
        isVip: isVip === "true" || isVip === true,
        isPay: isPay === "true" || isPay === true,
        updateTime: updateTime ? String(updateTime) : "",
      });
    }
  }

  return chapters;
}

async function parseContent(source, responseData, context = {}) {
  const rules = source.ruleContent || {};
  const htmlStr = typeof responseData === "string" ? responseData : JSON.stringify(responseData);
  const ctx = { baseUrl: source.bookSourceUrl, source, contextHtml: htmlStr, ...context };

  let data = responseData;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {}
  }

  let content;
  try {
    content = await resolveRuleValue(data, rules.content, ctx);
  } catch (e) {
    console.error(`[PARSE ERROR] ruleContent.content failed: rule="${rules.content}", error="${e.message}"`);
    content = '';
  }

  if (content && rules.replaceRegex) {
    content = applyReplaceRegex(content, rules.replaceRegex);
  }

  if (rules.nextContentUrl) {
    const maxPages = 10;
    let pageCount = 0;
    let currentData = data;
    let allContent = content ? String(content) : "";

    while (pageCount < maxPages) {
      const nextUrl = await resolveRuleValue(currentData, rules.nextContentUrl, ctx);
      if (!nextUrl || typeof nextUrl !== 'string' || !nextUrl.startsWith('http')) break;

      try {
        const { fetchWithConfig } = require("./index");
        const headers = parseHeaders(source.header);
        const nextResponseData = await fetchWithConfig({
          url: nextUrl,
          method: "GET",
          headers,
        });

        let nextData = nextResponseData;
        if (typeof nextData === "string") {
          try { nextData = JSON.parse(nextData); } catch {}
        }

        const nextContent = await resolveRuleValue(nextData, rules.content, ctx);
        if (!nextContent) break;

        allContent += "\n" + String(nextContent);
        currentData = nextData;
        pageCount++;
      } catch (e) {
        console.warn("[nextContentUrl] fetch failed:", e.message);
        break;
      }
    }

    content = allContent;
  }

  return content;
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

async function buildSearchConfig(source, keyword, page) {
  let rawUrl = source.searchUrl || "";
  let method = "GET";
  let body = null;
  let headers = parseHeaders(source.header);

  if (rawUrl.startsWith("<js>")) {
    const jsEnd = rawUrl.indexOf("</js>");
    if (jsEnd !== -1) {
      const jsCode = rawUrl.slice(4, jsEnd);
      const remainingUrl = rawUrl.slice(jsEnd + 5).trim();
      const ctx = { baseUrl: source.bookSourceUrl, source, key: keyword, page };
      try {
        const result = await executeJsRule(jsCode, null, ctx);
        if (result && typeof result === "string") {
          rawUrl = result;
        } else if (result && typeof result === "object") {
          if (result.url) rawUrl = result.url;
          if (result.method) method = result.method.toUpperCase();
          if (result.body) body = result.body;
          if (result.headers) headers = { ...headers, ...result.headers };
          if (!rawUrl && remainingUrl) rawUrl = remainingUrl;
        } else {
          rawUrl = remainingUrl;
        }
      } catch (e) {
        console.warn("JS searchUrl execution failed:", e.message);
        rawUrl = remainingUrl;
      }
    }
  } else if (rawUrl.includes("<js>") || rawUrl.includes("@js:")) {
    let jsCode = rawUrl
      .replace(/^<js>/, "")
      .replace(/<\/js>$/, "")
      .replace(/^@js:/, "");

    jsCode = jsCode
      .replace(/\{\{java\.encodeURI\(key\)\}\}/g, encodeURIComponent(keyword))
      .replace(/\{\{java\.encodeURIComponent\(key\)\}\}/g, encodeURIComponent(keyword))
      .replace(/\{\{key\}\}/g, keyword.replace(/'/g, "\\'"))
      .replace(/\{\{keyword\}\}/g, keyword.replace(/'/g, "\\'"))
      .replace(/\{\{page\}\}/g, String(page))
      .replace(/\{\{\(([^)]+)\)\}\}/g, (_, expr) => {
        try {
          const safeExpr = expr.replace(/page/g, String(page)).replace(/key/g, `"${keyword}"`);
          return String(new Function("return " + safeExpr)());
        } catch { return _; }
      })
      .replace(/\{\{cookie\.\w+\([^)]*\)\}\}/g, "")
      .replace(/\{\{source\.\w+\([^)]*\)\}\}/g, source.bookSourceUrl || "")
      .replace(/\n/g, ";\n");

    const ctx = { baseUrl: source.bookSourceUrl, source, key: keyword, page };
    try {
      const result = await executeJsRule(jsCode, null, ctx);

      if (result && typeof result === "string") {
        rawUrl = result;
      } else if (result && typeof result === "object") {
        if (result.url) rawUrl = result.url;
        if (result.method) method = result.method.toUpperCase();
        if (result.body) body = result.body;
        if (result.headers) headers = { ...headers, ...result.headers };
      } else {
        console.warn(
          "JS searchUrl returned empty result for:",
          source.bookSourceName,
        );
        rawUrl = "";
      }
    } catch (e) {
      console.warn("JS searchUrl execution failed:", e.message);
      rawUrl = "";
    }
  }

  if (!rawUrl && !source.bookSourceUrl) {
    return null;
  }

  if (
    source.bookSourceUrl &&
    !/^https?:\/\//i.test(source.bookSourceUrl) &&
    !rawUrl.startsWith("http")
  ) {
    console.warn(
      "Non-HTTP bookSourceUrl, likely aggregate source:",
      source.bookSourceName,
      source.bookSourceUrl,
    );
    if (!rawUrl || !rawUrl.startsWith("http")) {
      return null;
    }
  }

  const postMatch = rawUrl.match(/^(.+?),\s*(\{[\s\S]*\})\s*$/);
  if (postMatch) {
    rawUrl = postMatch[1].trim();
    try {
      const jsonStr = postMatch[2].replace(/'/g, '"');
      const config = JSON.parse(jsonStr);
      method = (config.method || method).toUpperCase();
      if (config.body) body = config.body;
      if (config.headers) headers = { ...headers, ...config.headers };
      if (config.webView) {
      }
    } catch (e) {
      console.warn(
        "Failed to parse search URL config:",
        postMatch[2],
        e.message,
      );
    }
  }

  let url = rawUrl
    .replace(/\{\{page\}\}/g, String(page))
    .replace(/\{\{key\}\}/g, encodeURIComponent(keyword))
    .replace(/\{\{keyword\}\}/g, encodeURIComponent(keyword))
    .replace(/\{\{keyRaw\}\}/g, keyword)
    .replace(/\{\{keywordRaw\}\}/g, keyword)
    .replace(/\{\{keyEncoded\}\}/g, encodeURIComponent(keyword))
    .replace(/\{\{keywordEncoded\}\}/g, encodeURIComponent(keyword))
    .replace(/\{\{\(page-1\)\}\}/g, String(page - 1))
    .replace(/\{\{\(page\)\}\}/g, String(page));

  url = url.replace(/\{\{cookie\.removeCookie\([^)]*\)\}\}/g, "");
  url = url.replace(/\{\{cookie\.\w+\([^)]*\)\}\}/g, "");
  url = url.replace(/\{\{source\.getKey\(\)\}\}/g, source.bookSourceUrl || "");
  url = url.replace(/\{\{source\.getVariable\(\)\}\}/g, "");
  url = url.replace(/\{\{source\.getVar\([^)]*\)\}\}/g, "");
  url = url.replace(/\{\{java\.\w+\([^)]*\)\}\}/g, (match) => {
    try {
      const inner = match.slice(2, -2);
      if (inner.startsWith("java.encodeURI(")) {
        const arg = inner.slice(15, -1);
        if (arg === "key") return encodeURIComponent(keyword);
      }
      if (inner.startsWith("java.encodeURIComponent(")) {
        const arg = inner.slice(25, -1);
        if (arg === "key") return encodeURIComponent(keyword);
      }
    } catch {}
    return "";
  });

  url = url.replace(/\{\{[^{}]*\}\}/g, (match) => {
    const inner = match.slice(2, -2).trim();
    if (inner.startsWith("$.")) {
      try {
        const val = resolveJsonPath(source, inner);
        return val != null ? String(val) : "";
      } catch {
        return "";
      }
    }
    return "";
  });

  url = url.replace(/[\r\n]+/g, "").trim();

  if (!url.startsWith("http")) {
    const base = (source.bookSourceUrl || "").replace(/\/+$/, "");
    url = base + (url.startsWith("/") ? "" : "/") + url;
  }

  if (body) {
    body = body
      .replace(/\{\{key\}\}/g, keyword)
      .replace(/\{\{keyword\}\}/g, keyword)
      .replace(/\{\{keyEncoded\}\}/g, encodeURIComponent(keyword))
      .replace(/\{\{keywordEncoded\}\}/g, encodeURIComponent(keyword))
      .replace(/\{\{page\}\}/g, String(page));

    if (
      headers["Content-Type"] &&
      headers["Content-Type"].includes("application/json")
    ) {
      try {
        const bodyObj = JSON.parse(body);
        for (const key of Object.keys(bodyObj)) {
          if (typeof bodyObj[key] === "string") {
            bodyObj[key] = bodyObj[key]
              .replace(/\{\{key\}\}/g, keyword)
              .replace(/\{\{keyword\}\}/g, keyword)
              .replace(/\{\{keyEncoded\}\}/g, encodeURIComponent(keyword))
              .replace(/\{\{keywordEncoded\}\}/g, encodeURIComponent(keyword))
              .replace(/\{\{page\}\}/g, String(page));
          }
        }
        body = JSON.stringify(bodyObj);
      } catch {}
    }
  }

  if (!headers["Referer"] && url) {
    try {
      const urlObj = new URL(url);
      headers["Referer"] = urlObj.origin + "/";
    } catch {}
  }

  if (!headers["Origin"] && url) {
    try {
      const urlObj = new URL(url);
      headers["Origin"] = urlObj.origin;
    } catch {}
  }

  return { url, method, body, headers };
}

function getSourceCompatibility(source) {
  const allRules = [
    ...Object.values(source.ruleSearch || {}),
    ...Object.values(source.ruleBookInfo || {}),
    ...Object.values(source.ruleToc || {}),
    ...Object.values(source.ruleContent || {}),
    source.searchUrl || "",
    source.header || "",
  ];

  let hasJs = false;
  let hasCss = false;
  let hasJsonPath = false;
  const features = [];

  for (const rule of allRules) {
    if (typeof rule !== "string") continue;
    if (
      rule.includes("<js>") ||
      rule.includes("</js>") ||
      rule.includes("@js:")
    ) {
      hasJs = true;
      features.push("JS规则");
    }
    if (isLegadoSelector(rule)) {
      hasCss = true;
      features.push("网页解析");
    }
    if (
      rule.startsWith("$.") ||
      rule.startsWith("$..") ||
      rule.startsWith("{{$.")
    ) {
      hasJsonPath = true;
      features.push("JSON API");
    }
  }

  const level = hasJs
    ? "full"
    : hasCss
      ? "full"
      : hasJsonPath
        ? "full"
        : "unknown";

  return {
    level,
    features: [...new Set(features)],
    hasJs,
    hasCss,
    hasJsonPath,
  };
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

module.exports = {
  resolveJsonPath,
  resolveTemplate,
  resolveRuleValue,
  executeJsRule,
  parseSearchResults,
  parseExplore,
  parseExploreUrl,
  parseBookInfo,
  parseToc,
  parseContent,
  parseHeaders,
  buildSearchConfig,
  getSourceCompatibility,
  applyReplaceRegex,
  classifyError,
  ruleVariables,
};
