const cheerio = require("cheerio");
const { JSONPath } = require("jsonpath-plus");
const xpath = require("xpath");
const { DOMParser } = require("@xmldom/xmldom");

const JS_PATTERN = /<(js|script)>([\s\S]*?)<\/\1>/i;
const JS_PATTERN2 = /@(js|JS):([\s\S]*)$/;
const PUT_PATTERN = /@put:\{([^}]+)\}/g;
const GET_PATTERN = /@get:\{([^}]+)\}/g;
const EVAL_PATTERN = /\{\{([^}]+)\}\}/g;
const REPLACE_PATTERN = /##(.+?)##(.*)$/;

const MODE_DEFAULT = "default";
const MODE_JS = "js";
const MODE_JSON = "json";
const MODE_XPATH = "xpath";
const MODE_REGEX = "regex";

class SourceRule {
  constructor(ruleStr, mode = MODE_DEFAULT, isJSON = false) {
    this.mode = mode;
    this.replaceRegex = "";
    this.replacement = "";
    this.replaceFirst = false;
    this.putMap = {};
    this.rule = this._parseRule(ruleStr, isJSON);
  }

  _parseRule(ruleStr, isJSON) {
    if (this.mode === MODE_JS || this.mode === MODE_REGEX) {
      return ruleStr;
    }

    let rule = ruleStr;

    if (rule.startsWith("@CSS:")) {
      this.mode = MODE_DEFAULT;
      return rule;
    }
    if (rule.startsWith("@@")) {
      this.mode = MODE_DEFAULT;
      return rule.substring(2);
    }
    if (rule.startsWith("@XPath:")) {
      this.mode = MODE_XPATH;
      return rule.substring(7);
    }
    if (rule.startsWith("@Json:")) {
      this.mode = MODE_JSON;
      return rule.substring(6);
    }
    if (isJSON || rule.startsWith("$.") || rule.startsWith("$[")) {
      this.mode = MODE_JSON;
      return rule;
    }
    if (rule.startsWith("//")) {
      this.mode = MODE_XPATH;
      return rule;
    }

    const replaceMatch = rule.match(REPLACE_PATTERN);
    if (replaceMatch) {
      this.replaceRegex = replaceMatch[1];
      this.replacement = replaceMatch[2] || "";
      rule = rule.substring(0, replaceMatch.index);
      if (this.replaceRegex.startsWith("!")) {
        this.replaceFirst = true;
        this.replaceRegex = this.replaceRegex.substring(1);
      }
    }

    rule = this._splitPutRule(rule);

    return rule;
  }

  _splitPutRule(rule) {
    return rule.replace(PUT_PATTERN, (match, jsonStr) => {
      try {
        const parsed = JSON.parse(jsonStr);
        Object.assign(this.putMap, parsed);
      } catch {}
      return "";
    }).trim();
  }

  makeUpRule(result) {
    if (Object.keys(this.putMap).length > 0 && result != null) {
      // putMap is handled by AnalyzeRule
    }
  }
}

class AnalyzeRule {
  constructor(ruleData = null, source = null) {
    this.ruleData = ruleData;
    this.source = source;
    this.content = null;
    this.baseUrl = null;
    this.isJSON = false;
    this._variables = {};
    this._cheerioCache = null;
    this._domCache = null;
  }

  setContent(content, baseUrl = null) {
    if (content == null) throw new Error("Content cannot be null");
    this.content = content;
    this.isJSON = this._isJSON(content);
    if (baseUrl) this.baseUrl = baseUrl;
    this._cheerioCache = null;
    this._domCache = null;
    return this;
  }

  setBaseUrl(baseUrl) {
    if (baseUrl) this.baseUrl = baseUrl;
    return this;
  }

  getString(ruleStr, mContent = null, isUrl = false) {
    if (!ruleStr) return "";
    const ruleList = this._splitSourceRule(ruleStr);
    return this._getString(ruleList, mContent, isUrl);
  }

  getStringList(ruleStr, mContent = null, isUrl = false) {
    if (!ruleStr) return null;
    const ruleList = this._splitSourceRule(ruleStr);
    return this._getStringList(ruleList, mContent, isUrl);
  }

  getElements(ruleStr) {
    if (!ruleStr) return [];
    const ruleList = this._splitSourceRule(ruleStr, true);
    return this._getElements(ruleList);
  }

  getElement(ruleStr) {
    if (!ruleStr) return null;
    const ruleList = this._splitSourceRule(ruleStr, true);
    const results = this._getElements(ruleList);
    return results.length > 0 ? results[0] : null;
  }

  _getString(ruleList, mContent = null, isUrl = false) {
    const content = mContent != null ? mContent : this.content;
    if (content == null || ruleList.length === 0) return "";

    let result = content;

    for (const sourceRule of ruleList) {
      this._putRule(sourceRule.putMap);
      sourceRule.makeUpRule(result);
      if (result == null) continue;

      const rule = sourceRule.rule;
      if (rule || sourceRule.replaceRegex) {
        result = this._applyRule(result, sourceRule, isUrl);
      }

      if (result != null && sourceRule.replaceRegex) {
        result = this._replaceRegex(String(result), sourceRule);
      }
    }

    if (result == null) result = "";
    let resultStr = String(result);

    if (isUrl) {
      if (!resultStr.trim()) return this.baseUrl || "";
      return this._resolveUrl(this.baseUrl, resultStr);
    }

    return this._unescapeHtml(resultStr);
  }

  _getStringList(ruleList, mContent = null, isUrl = false) {
    const content = mContent != null ? mContent : this.content;
    if (content == null || ruleList.length === 0) return null;

    let result = content;

    for (const sourceRule of ruleList) {
      this._putRule(sourceRule.putMap);
      sourceRule.makeUpRule(result);
      if (result == null) continue;

      const rule = sourceRule.rule;
      if (rule) {
        result = this._applyRuleList(result, sourceRule);
      }

      if (sourceRule.replaceRegex && Array.isArray(result)) {
        result = result.map(item => this._replaceRegex(String(item), sourceRule));
      } else if (sourceRule.replaceRegex) {
        result = this._replaceRegex(String(result), sourceRule);
      }
    }

    if (result == null) return null;
    if (typeof result === "string") {
      result = result.split("\n");
    }
    if (!Array.isArray(result)) return [String(result)];

    if (isUrl) {
      const urlList = [];
      for (const url of result) {
        const absoluteURL = this._resolveUrl(this.baseUrl, String(url));
        if (absoluteURL && !urlList.includes(absoluteURL)) {
          urlList.push(absoluteURL);
        }
      }
      return urlList;
    }

    return result.map(String);
  }

  _getElements(ruleList) {
    const content = this.content;
    if (content == null || ruleList.length === 0) return [];

    let result = content;

    for (const sourceRule of ruleList) {
      this._putRule(sourceRule.putMap);
      if (result == null) continue;

      const rule = sourceRule.rule;
      result = this._applyElementsRule(result, sourceRule);

      if (sourceRule.replaceRegex) {
        result = this._replaceRegex(String(result), sourceRule);
      }
    }

    if (Array.isArray(result)) return result;
    return result != null ? [result] : [];
  }

  _applyRule(content, sourceRule, isUrl = false) {
    const rule = sourceRule.rule;
    if (!rule) return content;

    switch (sourceRule.mode) {
      case MODE_JS:
        return this._evalJS(rule, content);
      case MODE_JSON:
        return this._analyzeByJsonPath(content, rule);
      case MODE_XPATH:
        return this._analyzeByXPath(content, rule);
      case MODE_DEFAULT:
        return this._analyzeByJSoup(content, rule, isUrl);
      case MODE_REGEX:
        return this._analyzeByRegex(content, rule);
      default:
        return rule;
    }
  }

  _applyRuleList(content, sourceRule) {
    const rule = sourceRule.rule;
    if (!rule) return content;

    switch (sourceRule.mode) {
      case MODE_JS:
        return this._evalJS(rule, content);
      case MODE_JSON:
        return this._analyzeByJsonPathList(content, rule);
      case MODE_XPATH:
        return this._analyzeByXPathList(content, rule);
      case MODE_DEFAULT:
        return this._analyzeByJSoupList(content, rule);
      case MODE_REGEX:
        return this._analyzeByRegexList(content, rule);
      default:
        return [rule];
    }
  }

  _applyElementsRule(content, sourceRule) {
    const rule = sourceRule.rule;
    if (!rule) return content;

    switch (sourceRule.mode) {
      case MODE_JS:
        return this._evalJS(rule, content);
      case MODE_JSON:
        return this._analyzeByJsonPathElements(content, rule);
      case MODE_XPATH:
        return this._analyzeByXPathElements(content, rule);
      case MODE_DEFAULT:
        return this._analyzeByJSoupElements(content, rule);
      case MODE_REGEX:
        return this._analyzeByRegexElements(content, rule);
      default:
        return [];
    }
  }

  _analyzeByJSoup(content, rule, isUrl = false) {
    try {
      const $ = this._getCheerio(content);
      if (!$) return "";

      const selector = this._parseCssRule(rule);
      if (selector.attr) {
        const el = $(selector.path);
        let val = "";
        if (selector.attr === "text") {
          val = el.text().trim();
        } else if (selector.attr === "html" || selector.attr === "innerHTML") {
          val = el.html() || "";
        } else if (selector.attr === "outerHtml") {
          val = $.html(el) || "";
        } else {
          val = el.attr(selector.attr) || "";
        }
        return val;
      }
      return $(selector.path).text().trim();
    } catch (e) {
      return "";
    }
  }

  _analyzeByJSoupList(content, rule) {
    try {
      const $ = this._getCheerio(content);
      if (!$) return [];

      const selector = this._parseCssRule(rule);
      const elements = $(selector.path);
      const results = [];

      elements.each((i, el) => {
        if (selector.attr) {
          if (selector.attr === "text") {
            results.push($(el).text().trim());
          } else if (selector.attr === "html" || selector.attr === "innerHTML") {
            results.push($(el).html() || "");
          } else if (selector.attr === "outerHtml") {
            results.push($.html($(el)) || "");
          } else {
            results.push($(el).attr(selector.attr) || "");
          }
        } else {
          results.push($(el).text().trim());
        }
      });

      return results;
    } catch (e) {
      return [];
    }
  }

  _analyzeByJSoupElements(content, rule) {
    try {
      const $ = this._getCheerio(content);
      if (!$) return [];

      const elements = $(rule);
      const results = [];

      elements.each((i, el) => {
        results.push({
          _type: "element",
          _el: el,
          _html: $.html($(el)),
          _text: $(el).text().trim(),
          _tag: el.tagName,
          _attrs: el.attribs || {},
          _cheerio: $,
        });
      });

      return results;
    } catch (e) {
      return [];
    }
  }

  _parseCssRule(rule) {
    const attrPatterns = [
      /@text$/i,
      /@html$/i,
      /@innerHTML$/i,
      /@outerHtml$/i,
      /@href$/i,
      /@src$/i,
      /@attr\(([^)]+)\)$/i,
      /@(\w+)$/,
    ];

    for (const pattern of attrPatterns) {
      const match = rule.match(pattern);
      if (match) {
        const path = rule.substring(0, match.index).trim();
        let attr = match[1] || match[0].substring(1);

        if (attr === "text") return { path, attr: "text" };
        if (attr === "html" || attr === "innerHTML") return { path, attr: "html" };
        if (attr === "outerHtml") return { path, attr: "outerHtml" };
        if (attr.startsWith("attr(")) {
          return { path, attr: match[1] };
        }
        return { path, attr };
      }
    }

    return { path: rule, attr: null };
  }

  _analyzeByJsonPath(content, rule) {
    try {
      let data = content;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return ""; }
      }
      const result = JSONPath({ path: rule, json: data, wrap: false });
      if (result == null) return "";
      if (Array.isArray(result)) return result.map(String).join("\n");
      return String(result);
    } catch (e) {
      return "";
    }
  }

  _analyzeByJsonPathList(content, rule) {
    try {
      let data = content;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return []; }
      }
      const result = JSONPath({ path: rule, json: data, wrap: true });
      if (!Array.isArray(result)) return result != null ? [String(result)] : [];
      return result.map(String);
    } catch (e) {
      return [];
    }
  }

  _analyzeByJsonPathElements(content, rule) {
    try {
      let data = content;
      if (typeof data === "string") {
        try { data = JSON.parse(data); } catch { return []; }
      }
      const result = JSONPath({ path: rule, json: data, wrap: true });
      if (!Array.isArray(result)) return result != null ? [result] : [];
      return result;
    } catch (e) {
      return [];
    }
  }

  _analyzeByXPath(content, rule) {
    try {
      const doc = this._getDom(content);
      if (!doc) return "";
      const nodes = xpath.select(rule, doc);
      if (!nodes || nodes.length === 0) return "";
      const node = nodes[0];
      if (typeof node === "string") return node;
      return node.textContent || node.value || "";
    } catch (e) {
      return "";
    }
  }

  _analyzeByXPathList(content, rule) {
    try {
      const doc = this._getDom(content);
      if (!doc) return [];
      const nodes = xpath.select(rule, doc);
      if (!nodes || nodes.length === 0) return [];
      return nodes.map(n => typeof n === "string" ? n : (n.textContent || n.value || ""));
    } catch (e) {
      return [];
    }
  }

  _analyzeByXPathElements(content, rule) {
    try {
      const doc = this._getDom(content);
      if (!doc) return [];
      const nodes = xpath.select(rule, doc);
      if (!nodes || nodes.length === 0) return [];
      return nodes.map(n => ({
        _type: "xpathNode",
        _node: n,
        _text: typeof n === "string" ? n : (n.textContent || ""),
        _tag: n.tagName || "",
      }));
    } catch (e) {
      return [];
    }
  }

  _analyzeByRegex(content, rule) {
    try {
      const contentStr = typeof content === "string" ? content : JSON.stringify(content);
      const regexParts = rule.split("&&");
      if (regexParts.length < 1) return "";
      const regex = new RegExp(regexParts[0], "gs");
      const match = regex.exec(contentStr);
      if (!match) return "";
      if (regexParts.length > 1 && match.length > 1) {
        const groupIdx = parseInt(regexParts[1]) || 1;
        return match[groupIdx] || "";
      }
      return match[0] || "";
    } catch (e) {
      return "";
    }
  }

  _analyzeByRegexList(content, rule) {
    try {
      const contentStr = typeof content === "string" ? content : JSON.stringify(content);
      const regex = new RegExp(rule, "gs");
      const results = [];
      let match;
      while ((match = regex.exec(contentStr)) !== null) {
        results.push(match[0]);
      }
      return results;
    } catch (e) {
      return [];
    }
  }

  _analyzeByRegexElements(content, rule) {
    return this._analyzeByRegexList(content, rule);
  }

  _evalJS(rule, result) {
    try {
      const book = this.ruleData || {};
      const source = this.source || {};
      const java = this._createJavaShim();
      const baseUrl = this.baseUrl || "";

      const fn = new Function("result", "book", "source", "java", "baseUrl", "cookie", "cache",
        `"use strict"; try { return (function() { ${rule} })(); } catch(e) { return ''; }`
      );
      return fn(result, book, source, java, baseUrl, this._createCookieShim(), this._createCacheShim());
    } catch (e) {
      return "";
    }
  }

  _splitSourceRule(ruleStr, allInOne = false) {
    if (!ruleStr) return [];

    const ruleList = [];
    let mode = MODE_DEFAULT;
    let start = 0;

    if (allInOne && ruleStr.startsWith(":")) {
      mode = MODE_REGEX;
      start = 1;
    }

    const jsMatch1 = ruleStr.match(JS_PATTERN);
    if (jsMatch1) {
      const before = ruleStr.substring(0, jsMatch1.index).trim();
      if (before) ruleList.push(new SourceRule(before, mode, this.isJSON));
      ruleList.push(new SourceRule(jsMatch1[2], MODE_JS, this.isJSON));
      const after = ruleStr.substring(jsMatch1.index + jsMatch1[0].length).trim();
      if (after) ruleList.push(new SourceRule(after, mode, this.isJSON));
      return ruleList;
    }

    const jsMatch2 = ruleStr.match(JS_PATTERN2);
    if (jsMatch2) {
      const before = ruleStr.substring(0, jsMatch2.index).trim();
      if (before) ruleList.push(new SourceRule(before, mode, this.isJSON));
      ruleList.push(new SourceRule(jsMatch2[2], MODE_JS, this.isJSON));
      return ruleList;
    }

    const trimmed = ruleStr.substring(start).trim();
    if (trimmed) {
      ruleList.push(new SourceRule(trimmed, mode, this.isJSON));
    }

    return ruleList;
  }

  _putRule(putMap) {
    if (!putMap || Object.keys(putMap).length === 0) return;
    for (const [key, value] of Object.entries(putMap)) {
      const resolvedValue = this.getString(value);
      this._variables[key] = resolvedValue;
    }
  }

  _replaceRegex(result, rule) {
    if (!rule.replaceRegex) return result;
    try {
      const regex = new RegExp(rule.replaceRegex, "g");
      if (rule.replaceFirst) {
        const match = result.match(regex);
        if (match) {
          return match[0].replace(new RegExp(rule.replaceRegex), rule.replacement);
        }
        return "";
      }
      return result.replace(regex, rule.replacement);
    } catch {
      return result;
    }
  }

  _resolveUrl(baseUrl, url) {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("//")) {
      if (url.startsWith("//")) return "https:" + url;
      return url;
    }
    if (!baseUrl) return url;
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return url;
    }
  }

  _unescapeHtml(str) {
    return str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }

  _isJSON(content) {
    if (typeof content === "object") return true;
    if (typeof content === "string") {
      const trimmed = content.trim();
      return (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
             (trimmed.startsWith("[") && trimmed.endsWith("]"));
    }
    return false;
  }

  _getCheerio(content) {
    if (this._cheerioCache && content === this.content) return this._cheerioCache;
    try {
      const html = typeof content === "string" ? content : JSON.stringify(content);
      const $ = cheerio.load(html);
      if (content === this.content) this._cheerioCache = $;
      return $;
    } catch {
      return null;
    }
  }

  _getDom(content) {
    if (this._domCache && content === this.content) return this._domCache;
    try {
      const html = typeof content === "string" ? content : JSON.stringify(content);
      const doc = new DOMParser().parseFromString(html, "text/html");
      if (content === this.content) this._domCache = doc;
      return doc;
    } catch {
      return null;
    }
  }

  _createJavaShim() {
    return {
      log: (...args) => console.log("[AnalyzeRule JS]", ...args),
      ajax: (url) => { throw new Error("java.ajax not supported in AnalyzeRule"); },
      get: (key) => this._variables[key] || "",
      put: (key, value) => { this._variables[key] = String(value); },
    };
  }

  _createCookieShim() {
    return {
      get: (key) => "",
      set: (key, value) => {},
    };
  }

  _createCacheShim() {
    const cache = {};
    return {
      get: (key) => cache[key] || "",
      set: (key, value) => { cache[key] = String(value); },
    };
  }
}

module.exports = { AnalyzeRule, SourceRule };
