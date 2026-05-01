const cheerio = require('cheerio');
const xpathLib = require('xpath');
const { DOMParser } = require('xmldom');

function parseLegadoSelector($, rootEl, rule, returnElements = false) {
  if (!rule || typeof rule !== 'string') return null;

  const segments = splitSelectorChain(rule);
  let elements = rootEl ? $(rootEl) : $.root();
  const hasRoot = !!rootEl;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].trim();
    if (!seg) continue;

    if (seg.startsWith('!')) {
      const excludeIdx = parseInt(seg.slice(1));
      if (!isNaN(excludeIdx)) {
        const arr = elements.toArray();
        if (excludeIdx >= 0 && excludeIdx < arr.length) {
          arr.splice(excludeIdx, 1);
          elements = $(arr);
        } else if (excludeIdx < 0 && Math.abs(excludeIdx) <= arr.length) {
          arr.splice(arr.length + excludeIdx, 1);
          elements = $(arr);
        }
      }
      continue;
    }

    if (isAttributeAction(seg)) {
      return extractAttribute($, elements, seg);
    }

    elements = selectElements($, elements, seg, i === 0 && !hasRoot);
    if (!elements || elements.length === 0) return null;
  }

  if (returnElements) {
    return elements;
  }

  return extractDefault($, elements);
}

function splitSelectorChain(rule) {
  if (rule.startsWith('@css:')) {
    const cssPart = rule.slice(5);
    const lastAt = cssPart.lastIndexOf('@');
    if (lastAt > 0) {
      const possibleAction = '@' + cssPart.slice(lastAt + 1);
      if (isAttributeAction(possibleAction)) {
        return ['@css:' + cssPart.slice(0, lastAt), possibleAction];
      }
    }
    return [rule];
  }

  if (rule.startsWith('@XPath:') || rule.startsWith('@xpath:')) {
    return [rule];
  }

  const parts = [];
  let current = '';
  let depth = 0;
  let inBracket = false;

  for (let i = 0; i < rule.length; i++) {
    const ch = rule[i];
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === '[') inBracket = true;
    if (ch === ']') inBracket = false;

    if (ch === '@' && depth === 0 && !inBracket) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  return parts;
}

function isAttributeAction(seg) {
  const s = seg.startsWith('@') ? seg : '@' + seg;
  const attrActions = ['@text', '@html', '@src', '@href', '@content',
    '@style', '@value', '@alt', '@title', '@class', '@id',
    '@textNodes', '@ownText', '@allText', '@all'];
  if (attrActions.includes(s)) return true;
  if (/^@data-/.test(s)) return true;
  return false;
}

function extractAttribute($, elements, action) {
  const act = action.startsWith('@') ? action : '@' + action;
  const results = [];
  elements.each((_, el) => {
    const $el = $(el);
    let val = '';
    switch (act) {
      case '@text':
      case '@allText':
        val = $el.text().trim();
        break;
      case '@textNodes':
        var tn = [];
        $el.contents().each(function () {
          if (this.type === 'text') {
            var t = (this.data || '').trim();
            if (t) tn.push(t);
          }
        });
        val = tn.join('\n');
        break;
      case '@ownText':
        val = $el.children().remove().end().text().trim();
        break;
      case '@html':
        val = $el.html() || '';
        break;
      case '@all':
        val = $('<div>').append($el.clone()).html() || '';
        break;
      case '@src':
        val = $el.attr('src') || $el.attr('data-src') || '';
        break;
      case '@href':
        val = $el.attr('href') || '';
        break;
      case '@content':
        val = $el.attr('content') || '';
        break;
      case '@style':
        val = $el.attr('style') || '';
        break;
      case '@value':
        val = $el.attr('value') || '';
        break;
      case '@alt':
        val = $el.attr('alt') || '';
        break;
      case '@title':
        val = $el.attr('title') || '';
        break;
      case '@class':
        val = $el.attr('class') || '';
        break;
      case '@id':
        val = $el.attr('id') || '';
        break;
      default:
        const attrName = act.replace('@', '');
        val = $el.attr(attrName) || '';
    }
    if (val) results.push(val);
  });

  if (results.length === 0) return null;
  return results.length === 1 ? results[0] : results;
}

function extractDefault($, elements) {
  const results = [];
  elements.each((_, el) => {
    const $el = $(el);
    const tag = ($el.prop('tagName') || '').toLowerCase();
    if (tag === 'img') {
      results.push($el.attr('src') || $el.attr('data-src') || '');
    } else if (tag === 'a') {
      const text = $el.text().trim();
      results.push(text || $el.attr('href') || '');
    } else {
      results.push($el.text().trim());
    }
  });
  if (results.length === 0) return null;
  return results.length === 1 ? results[0] : results;
}

function selectElements($, elements, seg, isFirst) {
  if (seg.startsWith('@css:')) {
    return selectByCss($, elements, seg.slice(5));
  }
  if (seg.startsWith('@XPath:') || seg.startsWith('@xpath:')) {
    return selectByXPath($, elements, seg.replace(/^@[Xx]Path:/, ''));
  }
  if (seg.startsWith('class.')) {
    return selectByLegadoClass($, elements, seg.slice(6), isFirst);
  }
  if (seg.startsWith('id.')) {
    return selectByLegadoId($, elements, seg.slice(3), isFirst);
  }
  if (seg.startsWith('tag.')) {
    return selectByLegadoTag($, elements, seg.slice(4), isFirst);
  }
  if (seg.startsWith('attr.')) {
    return selectByAttr($, elements, seg.slice(5));
  }
  if (seg.startsWith('.')) {
    return selectByLegadoClass($, elements, seg.slice(1), isFirst);
  }
  if (seg.startsWith('#')) {
    return selectByLegadoId($, elements, seg.slice(1), isFirst);
  }
  if (seg.startsWith('[')) {
    return selectByCss($, elements, seg);
  }
  if (/^[a-zA-Z][a-zA-Z0-9]*$/.test(seg)) {
    return selectByLegadoTag($, elements, seg, isFirst);
  }
  return selectByCss($, elements, seg);
}

function selectByCss($, elements, selector) {
  try {
    let cssSel = selector;
    let containsText = null;
    const containsMatch = cssSel.match(/:contains\((?:"([^"]+)"|'([^']+)'|([^)'"]+))\)/);
    if (containsMatch) {
      containsText = (containsMatch[1] || containsMatch[2] || containsMatch[3]).trim();
      cssSel = cssSel.replace(/:contains\((?:"[^"]*"|'[^']*'|[^)'"]+)\)/g, '');
    }
    cssSel = cssSel
      .replace(/:eq\((\d+)\)/g, ':nth-child($1)')
      .replace(/:first/i, ':first-child')
      .replace(/:last/i, ':last-child');
    let found = elements.find(cssSel);
    if (containsText !== null && found.length > 0) {
      found = found.filter(function () {
        return $(this).text().includes(containsText);
      });
    }
    return found.length > 0 ? found : null;
  } catch (e) {
    return null;
  }
}

function selectByXPath($, elements, xpath) {
  try {
    const result = xpathToCss(xpath);
    if (result) {
      const found = elements.find(result);
      if (found.length > 0) return found;
    }
    return tryXPathText($, elements, xpath);
  } catch {
    return null;
  }
}

function xpathToCss(xpath) {
  try {
    let css = xpath
      .replace(/\/\//g, ' ')
      .replace(/\//g, ' > ')
      .replace(/\[@(\w+)=['"]([^'"]+)['"]\]/g, '[$1="$2"]')
      .replace(/\[@(\w+)\]/g, '[$1]')
      .replace(/text\(\)/g, '')
      .replace(/@(\w+)/g, '')
      .replace(/following-sibling::(\w+)/g, '$1 ~ ')
      .replace(/\[(\d+)\]/g, ':nth-child($1)')
      .trim();
    css = css.replace(/^\s*>\s*/, '').replace(/\s+/g, ' ');
    return css || null;
  } catch {
    return null;
  }
}

function tryXPathText($, elements, xpath) {
  const textMatch = xpath.match(/text\(\)$/);
  const attrMatch = xpath.match(/@(\w+)$/);
  if (textMatch || attrMatch) {
    const basePath = xpath.replace(/\/text\(\)$/, '').replace(/\/@\w+$/, '');
    const css = xpathToCss(basePath);
    if (css) {
      const found = elements.find(css);
      if (found.length > 0) return found;
    }
  }
  return null;
}

function applyIndex($, found, childIndex) {
  if (isNaN(childIndex)) return found;
  const arr = found.toArray();
  if (childIndex >= 0) {
    if (childIndex < arr.length) return $(arr[childIndex]);
  } else {
    const idx = arr.length + childIndex;
    if (idx >= 0 && idx < arr.length) return $(arr[idx]);
  }
  return found;
}

function selectByLegadoClass($, elements, classExpr, isFirst) {
  const parts = classExpr.split('.');
  let className = parts[0];
  let childIndex = parts.length > 1 ? parseInt(parts[1]) : NaN;

  let found;
  if (isFirst) {
    found = $(`.${className}`);
    if (found.length === 0) {
      found = $(`[class*="${className}"]`);
    }
  } else {
    const selfMatch = elements.filter(function () {
      return $(this).hasClass(className);
    });
    if (selfMatch.length > 0) {
      found = selfMatch;
    } else {
      found = elements.find(`.${className}`);
      if (found.length === 0) {
        found = elements.find(`[class*="${className}"]`);
      }
    }
  }

  if (found.length === 0) return null;
  if (!isNaN(childIndex)) {
    const indexed = applyIndex($, found, childIndex);
    if (indexed !== found) return indexed;
  }
  return found;
}

function selectByLegadoId($, elements, idExpr, isFirst) {
  const parts = idExpr.split('.');
  let idName = parts[0];
  let childIndex = parts.length > 1 ? parseInt(parts[1]) : NaN;

  let found;
  if (isFirst) {
    found = $(`#${idName}`);
  } else {
    const selfMatch = elements.filter(function () {
      return ($(this).attr('id') || '') === idName;
    });
    if (selfMatch.length > 0) {
      found = selfMatch;
    } else {
      found = elements.find(`#${idName}`);
    }
  }

  if (found.length === 0) return null;
  if (!isNaN(childIndex)) {
    const indexed = applyIndex($, found, childIndex);
    if (indexed !== found) return indexed;
  }
  return found;
}

function selectByLegadoTag($, elements, tagExpr, isFirst) {
  const parts = tagExpr.split('.');
  let tagName = parts[0];
  let childIndex = parts.length > 1 ? parseInt(parts[1]) : NaN;

  let found;
  if (isFirst) {
    found = $(tagName);
  } else {
    const selfMatch = elements.filter(function () {
      return ($(this).get(0) || {}).tagName === tagName.toLowerCase();
    });
    if (selfMatch.length > 0) {
      found = selfMatch;
    } else {
      found = elements.find(tagName);
    }
  }

  if (found.length === 0) return null;
  if (!isNaN(childIndex)) {
    const indexed = applyIndex($, found, childIndex);
    if (indexed !== found) return indexed;
  }
  return found;
}

function selectByAttr($, elements, attrExpr) {
  const parts = attrExpr.split('.');
  let attrName = parts[0];
  let attrValue = parts.length > 1 ? parts[1] : null;

  if (attrValue) {
    return elements.find(`[${attrName}="${attrValue}"]`);
  }
  return elements.find(`[${attrName}]`);
}

function resolveXPath(htmlStr, rule, returnElements = false) {
  if (!htmlStr || !rule) return null;
  try {
    const xmlStr = htmlToXml(htmlStr);
    const doc = new DOMParser({
      errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} }
    }).parseFromString(xmlStr, 'text/xml');
    const nodes = xpathLib.select(rule, doc);
    if (!nodes || nodes.length === 0) return null;
    if (returnElements) {
      const $ = cheerio.load(htmlStr);
      const cheerioEls = [];
      for (const node of nodes) {
        if (node.nodeType === 1) {
          const matched = matchXpathNodeToCheerio($, node);
          if (matched) cheerioEls.push(matched);
        }
      }
      return cheerioEls.length > 0 ? $(cheerioEls) : null;
    }
    const results = [];
    for (const node of nodes) {
      if (node.nodeType === 2) {
        results.push(node.nodeValue || '');
      } else if (node.nodeType === 3) {
        const text = (node.nodeValue || '').trim();
        if (text) results.push(text);
      } else if (node.nodeType === 1) {
        const text = (node.textContent || '').trim();
        if (text) results.push(text);
      } else if (typeof node === 'string') {
        results.push(node);
      }
    }
    if (results.length === 0) return null;
    return results.length === 1 ? results[0] : results;
  } catch (e) {
    return null;
  }
}

function htmlToXml(html) {
  let xml = html;
  xml = xml.replace(/<!DOCTYPE[^>]*>/gi, '');
  xml = xml.replace(/<br\s*\/?>/gi, '<br/>');
  xml = xml.replace(/<hr\s*\/?>/gi, '<hr/>');
  xml = xml.replace(/<img([^>]*?)(\s*\/)?>/gi, '<img$1/>');
  xml = xml.replace(/<input([^>]*?)(\s*\/)?>/gi, '<input$1/>');
  xml = xml.replace(/<meta([^>]*?)(\s*\/)?>/gi, '<meta$1/>');
  xml = xml.replace(/<link([^>]*?)(\s*\/)?>/gi, '<link$1/>');
  xml = xml.replace(/<col([^>]*?)(\s*\/)?>/gi, '<col$1/>');
  xml = xml.replace(/<area([^>]*?)(\s*\/)?>/gi, '<area$1/>');
  xml = xml.replace(/<base([^>]*?)(\s*\/)?>/gi, '<base$1/>');
  xml = xml.replace(/<embed([^>]*?)(\s*\/)?>/gi, '<embed$1/>');
  xml = xml.replace(/<source([^>]*?)(\s*\/)?>/gi, '<source$1/>');
  xml = xml.replace(/<track([^>]*?)(\s*\/)?>/gi, '<track$1/>');
  xml = xml.replace(/<wbr([^>]*?)(\s*\/)?>/gi, '<wbr$1/>');
  xml = xml.replace(/&(?!(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);)/g, '&amp;');
  if (!xml.includes('<?xml')) {
    xml = '<?xml version="1.0" encoding="UTF-8"?>' + xml;
  }
  return xml;
}

function matchXpathNodeToCheerio($, xmlNode) {
  const tag = (xmlNode.tagName || '').toLowerCase();
  if (!tag) return null;
  const attrs = {};
  if (xmlNode.attributes) {
    for (let i = 0; i < xmlNode.attributes.length; i++) {
      const attr = xmlNode.attributes[i];
      attrs[attr.name] = attr.value;
    }
  }
  let selector = tag;
  if (attrs.id) {
    selector = tag + '#' + attrs.id;
  } else if (attrs.class) {
    const firstClass = attrs.class.split(/\s+/)[0];
    if (firstClass) selector = tag + '.' + firstClass;
  }
  const candidates = $(selector);
  if (candidates.length === 0) {
    const fallback = $(tag);
    if (fallback.length === 1) return fallback.get(0);
    return null;
  }
  if (candidates.length === 1) return candidates.get(0);
  const textContent = (xmlNode.textContent || '').trim().substring(0, 50);
  if (textContent) {
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates.eq(i);
      if (el.text().trim().startsWith(textContent.substring(0, 20))) {
        return candidates.get(i);
      }
    }
  }
  return candidates.get(0);
}

function resolveLegadoSelector(html, rule, returnElements = false) {
  if (!html || !rule) return null;

  const $ = cheerio.load(html);

  if (rule.startsWith('@XPath:') || rule.startsWith('@xpath:')) {
    const xpathRule = rule.replace(/^@[Xx]Path:/, '');
    return resolveXPath(html, xpathRule, returnElements);
  }

  return parseLegadoSelector($, null, rule, returnElements);
}

function extractFromElements($, elements, action) {
  if (!elements || elements.length === 0) return null;

  const results = [];
  elements.each((_, el) => {
    const $el = $(el);
    let val = '';
    switch (action) {
      case 'text': val = $el.text().trim(); break;
      case 'html': val = $el.html() || ''; break;
      case 'all': val = $('<div>').append($el.clone()).html() || ''; break;
      case 'src': val = $el.attr('src') || $el.attr('data-src') || ''; break;
      case 'href': val = $el.attr('href') || ''; break;
      case 'content': val = $el.attr('content') || ''; break;
      case 'style': val = $el.attr('style') || ''; break;
      case 'textNodes':
        var tn = [];
        $el.contents().each(function () {
          if (this.type === 'text') {
            var t = (this.data || '').trim();
            if (t) tn.push(t);
          }
        });
        val = tn.join('\n');
        break;
      case 'ownText':
        val = $el.children().remove().end().text().trim();
        break;
      default:
        val = $el.attr(action) || $el.text().trim();
    }
    if (val) results.push(val);
  });

  if (results.length === 0) return null;
  return results.length === 1 ? results[0] : results;
}

function resolveXPathRule($, xpath) {
  const textMatch = xpath.match(/\/text\(\)$/);
  const attrMatch = xpath.match(/\/@(\w+)$/);

  let basePath = xpath;
  let extractType = 'elements';

  if (textMatch) {
    basePath = xpath.replace(/\/text\(\)$/, '');
    extractType = 'text';
  } else if (attrMatch) {
    basePath = xpath.replace(/\/@\w+$/, '');
    extractType = attrMatch[1];
  }

  const css = xpathToCss(basePath);
  if (!css) return null;

  const elements = $(css);
  if (elements.length === 0) return null;

  const results = [];
  elements.each((_, el) => {
    const $el = $(el);
    if (extractType === 'text') {
      const text = $el.text().trim();
      if (text) results.push(text);
    } else if (extractType === 'elements') {
      results.push($el);
    } else {
      const attr = $el.attr(extractType) || '';
      if (attr) results.push(attr);
    }
  });

  if (results.length === 0) return null;
  return results.length === 1 ? results[0] : results;
}

function isLegadoSelector(rule) {
  if (!rule || typeof rule !== 'string') return false;
  if (rule.startsWith('@css:')) return true;
  if (rule.startsWith('@XPath:') || rule.startsWith('@xpath:')) return true;
  if (/^(class\.|tag\.|id\.|attr\.)/.test(rule)) return true;
  if (rule.includes('@text') || rule.includes('@html') || rule.includes('@src') || rule.includes('@href') || rule.includes('@all') || rule.includes('@data-')) return true;
  if (/^\.[\w-]+/.test(rule) && !rule.startsWith('$.') && !rule.startsWith('$..')) return true;
  if (rule.startsWith('#')) return true;
  if (rule.startsWith('[') && rule.includes(']@')) return true;
  return false;
}

module.exports = {
  resolveLegadoSelector,
  resolveXPath,
  parseLegadoSelector,
  isLegadoSelector,
  extractFromElements
};
