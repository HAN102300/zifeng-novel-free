const cheerio = require('cheerio');

function parseLegadoSelector($, rootEl, rule, returnElements = false) {
  if (!rule || typeof rule !== 'string') return null;

  const segments = splitSelectorChain(rule);
  let elements = rootEl ? $(rootEl) : $.root();

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i].trim();
    if (!seg) continue;

    if (seg.startsWith('!')) {
      const excludeIdx = parseInt(seg.slice(1));
      if (!isNaN(excludeIdx) && elements.length > excludeIdx) {
        const arr = elements.toArray();
        arr.splice(excludeIdx, 1);
        elements = $(arr);
      }
      continue;
    }

    if (isAttributeAction(seg)) {
      return extractAttribute($, elements, seg);
    }

    elements = selectElements($, elements, seg, i === 0);
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
    '@textNodes', '@ownText', '@allText'];
  return attrActions.includes(s);
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
        val = $el.contents().filter(function () {
          return this.type === 'text';
        }).text().trim();
        break;
      case '@ownText':
        val = $el.children().remove().end().text().trim();
        break;
      case '@html':
        val = $el.html() || '';
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
    const cssSel = selector
      .replace(/:eq\((\d+)\)/g, ':nth-child($1)')
      .replace(/:first/i, ':first-child')
      .replace(/:last/i, ':last-child');
    const root = elements;
    const found = root.find(cssSel);
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

function selectByLegadoClass($, elements, classExpr, isFirst) {
  const parts = classExpr.split('.');
  let className = parts[0];
  let childIndex = parts.length > 1 ? parseInt(parts[1]) : -1;

  if (isFirst) {
    let found = $(`.${className}`);
    if (found.length === 0) {
      found = $(`[class*="${className}"]`);
    }
    if (childIndex >= 0 && found.length > childIndex) {
      return $(found.toArray()[childIndex]);
    }
    return found.length > 0 ? found : null;
  }

  let found = elements.find(`.${className}`);
  if (found.length === 0) {
    found = elements.find(`[class*="${className}"]`);
  }
  if (childIndex >= 0 && found.length > childIndex) {
    return $(found.toArray()[childIndex]);
  }
  return found.length > 0 ? found : null;
}

function selectByLegadoId($, elements, idExpr, isFirst) {
  const parts = idExpr.split('.');
  let idName = parts[0];
  let childIndex = parts.length > 1 ? parseInt(parts[1]) : -1;

  if (isFirst) {
    let found = $(`#${idName}`);
    if (childIndex >= 0 && found.length > childIndex) {
      return $(found.toArray()[childIndex]);
    }
    return found.length > 0 ? found : null;
  }

  let found = elements.find(`#${idName}`);
  if (childIndex >= 0 && found.length > childIndex) {
    return $(found.toArray()[childIndex]);
  }
  return found.length > 0 ? found : null;
}

function selectByLegadoTag($, elements, tagExpr, isFirst) {
  const parts = tagExpr.split('.');
  let tagName = parts[0];
  let childIndex = parts.length > 1 ? parseInt(parts[1]) : -1;

  if (isFirst) {
    let found = $(tagName);
    if (childIndex >= 0 && found.length > childIndex) {
      return $(found.toArray()[childIndex]);
    }
    return found.length > 0 ? found : null;
  }

  let found = elements.find(tagName);
  if (childIndex >= 0 && found.length > childIndex) {
    return $(found.toArray()[childIndex]);
  }
  return found.length > 0 ? found : null;
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

function resolveLegadoSelector(html, rule, returnElements = false) {
  if (!html || !rule) return null;

  const $ = cheerio.load(html);

  if (rule.startsWith('@css:')) {
    const cssRule = rule.slice(5);
    const lastAt = cssRule.lastIndexOf('@');
    let selector = cssRule;
    let action = 'text';

    if (lastAt > 0) {
      const possibleAction = cssRule.slice(lastAt + 1);
      if (['text', 'html', 'src', 'href', 'content', 'style', 'textNodes', 'ownText'].includes(possibleAction)) {
        selector = cssRule.slice(0, lastAt);
        action = possibleAction;
      }
    }

    const elements = $(selector);
    if (returnElements) return elements;
    return extractFromElements($, elements, action);
  }

  if (rule.startsWith('@XPath:') || rule.startsWith('@xpath:')) {
    const xpathRule = rule.replace(/^@[Xx]Path:/, '');
    if (returnElements) {
      const css = xpathToCss(xpathRule.replace(/\/text\(\)$/, '').replace(/\/@\w+$/, ''));
      if (css) {
        const elements = $(css);
        return elements.length > 0 ? elements : null;
      }
      return null;
    }
    return resolveXPathRule($, xpathRule);
  }

  if (rule.startsWith('[') && rule.includes(']@')) {
    const bracketEnd = rule.indexOf(']@');
    const selector = rule.slice(0, bracketEnd + 1);
    const action = rule.slice(bracketEnd + 2) || 'text';
    const elements = $(selector);
    if (returnElements) return elements;
    return extractFromElements($, elements, action);
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
      case 'src': val = $el.attr('src') || $el.attr('data-src') || ''; break;
      case 'href': val = $el.attr('href') || ''; break;
      case 'content': val = $el.attr('content') || ''; break;
      case 'style': val = $el.attr('style') || ''; break;
      case 'textNodes':
        val = $el.contents().filter(function () { return this.type === 'text'; }).text().trim();
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
  if (rule.includes('@text') || rule.includes('@html') || rule.includes('@src') || rule.includes('@href')) return true;
  if (/^\.[\w-]+/.test(rule) && !rule.startsWith('$.') && !rule.startsWith('$..')) return true;
  if (rule.startsWith('#')) return true;
  if (rule.startsWith('[') && rule.includes(']@')) return true;
  return false;
}

module.exports = {
  resolveLegadoSelector,
  parseLegadoSelector,
  isLegadoSelector,
  extractFromElements
};
