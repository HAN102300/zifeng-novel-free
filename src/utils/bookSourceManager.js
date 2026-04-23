import { testBookSourceAPI, importFromUrlAPI } from './apiClient.js';

const STORAGE_KEY = 'zifeng_book_sources';
const ACTIVE_SOURCE_KEY = 'zifeng_active_source';

const DEFAULT_SOURCE = {
  bookSourceName: '猫眼看书',
  bookSourceUrl: 'http://api.jmlldsc.com',
  bookSourceType: 0,
  bookSourceGroup: '默认',
  enabled: true,
  header: "{\n'User-Agent': 'okhttp/4.9.2','client-device': '2d37f6b5b6b2605373092c3dc65a3b39','client-brand': 'Redmi','client-version': '2.3.0','client-name': 'app.maoyankanshu.novel','client-source': 'android','Authorization': 'bearereyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGkuanhndHp4Yy5jb21cL2F1dGhcL3RoaXJkIiwiaWF0IjoxNjgzODkxNjUyLCJleHAiOjE3NzcyMDM2NTIsIm5iZiI6MTY4Mzg5MTY1MiwianRpIjoiR2JxWmI4bGZkbTVLYzBIViIsInN1YiI6Njg3ODYyLCJwcnYiOiJhMWNiMDM3MTgwMjk2YzZhMTkzOGVmMzBiNDM3OTQ2NzJkZDAxNmM1In0.mMxaC2SVyZKyjC6rdUqFVv5d9w_X36o0AdKD7szvE_Q'\n}",
  searchUrl: '/search?page={{page}}&keyword={{key}}',
  ruleSearch: {
    author: '$.authorName',
    bookList: '$.data[*]',
    bookUrl: '/novel/{{$.novelId}}?isSearch=1',
    coverUrl: '$.cover',
    intro: '$.summary',
    kind: '{{$..className}},{{$.averageScore}}分',
    lastChapter: '',
    name: '$.novelName',
    wordCount: '$.wordNum'
  },
  ruleBookInfo: {
    author: '$.authorName',
    coverUrl: '$..cover',
    init: '$.data',
    intro: '$..summary',
    kind: '{{$.lastChapter.decTime}},{{$.averageScore}}分,{{$.className}},{{$..tagName}}',
    lastChapter: '$.lastChapter.chapterName',
    name: '$.novelName',
    tocUrl: '/novel/{{$.novelId}}/chapters?readNum=1',
    wordCount: '$.wordNum'
  },
  ruleToc: {
    chapterList: '$.data.list[*]',
    chapterName: '$.chapterName',
    chapterUrl: '$.path@js:java.aesBase64DecodeToString(result,"f041c49714d39908","AES/CBC/PKCS5Padding","0123456789abcdef")',
    updateTime: '{{$.updatedAt}} 字数：{{$.wordNum}}'
  },
  ruleContent: {
    content: '$.content',
    replaceRegex: '##一秒记住.*精彩阅读。|7017k'
  }
};

export const getDefaultSource = () => ({ ...DEFAULT_SOURCE });

export const getBookSources = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [DEFAULT_SOURCE];
    const sources = JSON.parse(data);
    if (!sources || sources.length === 0) return [DEFAULT_SOURCE];
    return sources;
  } catch {
    return [DEFAULT_SOURCE];
  }
};

export const saveBookSources = (sources) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    return true;
  } catch (e) {
    console.error('保存书源失败:', e);
    return false;
  }
};

export const addBookSource = (source) => {
  const sources = getBookSources();
  const existingIndex = sources.findIndex(
    s => s.bookSourceUrl === source.bookSourceUrl || s.bookSourceName === source.bookSourceName
  );
  if (existingIndex !== -1) {
    sources[existingIndex] = { ...source, enabled: true };
  } else {
    sources.push({ ...source, enabled: true });
  }
  saveBookSources(sources);
  return sources;
};

export const addBookSources = (newSources) => {
  let sources = getBookSources();
  for (const source of newSources) {
    const existingIndex = sources.findIndex(
      s => s.bookSourceUrl === source.bookSourceUrl || s.bookSourceName === source.bookSourceName
    );
    if (existingIndex !== -1) {
      sources[existingIndex] = { ...source, enabled: source.enabled !== false };
    } else {
      sources.push({ ...source, enabled: source.enabled !== false });
    }
  }
  saveBookSources(sources);
  return sources;
};

export const removeBookSource = (bookSourceUrl) => {
  const sources = getBookSources();
  const filtered = sources.filter(s => s.bookSourceUrl !== bookSourceUrl);
  if (filtered.length === 0) {
    saveBookSources([DEFAULT_SOURCE]);
    return [DEFAULT_SOURCE];
  }
  saveBookSources(filtered);
  return filtered;
};

export const toggleBookSource = (bookSourceUrl, enabled) => {
  const sources = getBookSources();
  const source = sources.find(s => s.bookSourceUrl === bookSourceUrl);
  if (source) {
    source.enabled = enabled;
    saveBookSources(sources);
  }
  return sources;
};

export const getActiveSource = () => {
  try {
    const activeUrl = localStorage.getItem(ACTIVE_SOURCE_KEY);
    if (!activeUrl) return DEFAULT_SOURCE;
    const sources = getBookSources();
    const source = sources.find(s => s.bookSourceUrl === activeUrl);
    return source || DEFAULT_SOURCE;
  } catch {
    return DEFAULT_SOURCE;
  }
};

export const setActiveSource = (bookSourceUrl) => {
  localStorage.setItem(ACTIVE_SOURCE_KEY, bookSourceUrl);
};

const checkRuleFormat = (source) => {
  const allRules = [
    ...Object.values(source.ruleSearch || {}),
    ...Object.values(source.ruleBookInfo || {}),
    ...Object.values(source.ruleToc || {}),
    ...Object.values(source.ruleContent || {}),
    source.searchUrl || '',
    source.header || ''
  ];

  let hasJs = false;
  let hasCss = false;
  let hasJsonPath = false;

  for (const rule of allRules) {
    if (typeof rule !== 'string') continue;
    if (rule.includes('<js>') || rule.includes('</js>') || rule.includes('@js:')) hasJs = true;
    if (/^(class\.|tag\.|id\.|attr\.|text|html|src|href|content)/.test(rule) || /@(text|html|src|href|content|tag\.|class\.|id\.|attr\.|img)/.test(rule)) hasCss = true;
    if (rule.startsWith('$.') || rule.startsWith('$..') || rule.startsWith('{{$.')) hasJsonPath = true;
  }

  return { hasJs, hasCss, hasJsonPath };
};

export const detectSourceType = (source) => {
  if (source.bookSourceType !== undefined && source.bookSourceType !== null && source.bookSourceType !== 0) {
    return source.bookSourceType;
  }

  const { hasCss, hasJsonPath } = checkRuleFormat(source);

  if (hasCss && !hasJsonPath) return 1;
  if (hasJsonPath && !hasCss) return 0;

  const searchUrl = source.searchUrl || '';
  if (searchUrl.includes('<js>') || searchUrl.includes('@js:')) return 0;
  if (searchUrl.includes('class.') || searchUrl.includes('tag.')) return 1;

  return source.bookSourceType || 0;
};

export const getSourceCompatibility = (source) => {
  const { hasJs, hasCss, hasJsonPath } = checkRuleFormat(source);
  const issues = [];
  let level = 'full';

  if (hasJs) {
    issues.push('包含JS规则，需要后端支持');
    level = 'partial';
  }

  const searchUrl = source.searchUrl || '';
  if (searchUrl.includes('<js>') || searchUrl.includes('@js:')) {
    if (!issues.some(i => i.includes('JS规则'))) {
      issues.push('搜索地址包含JS脚本，需要后端支持');
    }
    level = 'partial';
  }

  if (hasCss && !hasJsonPath) {
    issues.push('网页解析规则，需要后端HTML解析');
    level = level === 'full' ? 'partial' : level;
  }

  return { level, issues, hasJs, hasCss, hasJsonPath };
};

export const parseHeaders = (headerStr) => {
  try {
    if (!headerStr) return {};
    if (headerStr.includes('<js>')) return {};
    const cleaned = headerStr.replace(/'/g, '"');
    return JSON.parse(cleaned);
  } catch {
    try {
      const headers = {};
      const pairs = headerStr.replace(/[{}'"]/g, '').split(',');
      for (const pair of pairs) {
        const [key, ...valueParts] = pair.split(':');
        if (key && valueParts.length) {
          headers[key.trim()] = valueParts.join(':').trim();
        }
      }
      return headers;
    } catch {
      return {};
    }
  }
};

export const testBookSource = async (source) => {
  try {
    const result = await testBookSourceAPI(source, '人', 1);
    return {
      success: result.success,
      message: result.message,
      resultCount: result.resultCount
    };
  } catch (e) {
    return { success: false, message: e.message || '连接失败' };
  }
};

export const exportBookSources = (sources) => {
  return JSON.stringify(sources, null, 2);
};

export const importBookSourcesFromJson = (jsonStr) => {
  try {
    let data;
    const trimmed = jsonStr.trim();

    try {
      data = JSON.parse(trimmed);
    } catch {
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const fixed = trimmed.replace(/,\s*([}\]])/g, '$1');
        data = JSON.parse(fixed);
      } else {
        return [];
      }
    }

    let sources;
    if (Array.isArray(data)) {
      sources = data;
    } else if (data && typeof data === 'object') {
      sources = [data];
    } else {
      return [];
    }

    return sources
      .filter(s => s && s.bookSourceUrl && s.bookSourceName)
      .map(s => {
        const detectedType = detectSourceType(s);
        const compat = getSourceCompatibility(s);
        return {
          ...s,
          bookSourceType: detectedType,
          enabled: s.enabled !== false,
          _compatibility: compat.level,
          _compatIssues: compat.issues
        };
      });
  } catch (e) {
    console.error('导入解析失败:', e);
    return [];
  }
};

export const fetchBookSourcesFromUrl = async (url) => {
  if (!url) throw new Error('URL不能为空');

  try {
    const result = await importFromUrlAPI(url);
    if (!result.success || result.count === 0) {
      throw new Error('解析到0个有效书源，请检查URL是否正确');
    }
    return result.sources.map(s => {
      const detectedType = detectSourceType(s);
      const compat = getSourceCompatibility(s);
      return {
        ...s,
        bookSourceType: detectedType,
        enabled: s.enabled !== false,
        _compatibility: compat.level,
        _compatIssues: compat.issues
      };
    });
  } catch (e) {
    throw new Error(`导入失败：${e.message}`);
  }
};

export const parseSearchUrl = (source) => {
  const raw = source.searchUrl || '';
  let url = raw;
  let method = 'GET';
  let body = null;
  let headers = {};

  if (raw.includes('<js>') || raw.includes('@js:')) {
    return { url: raw, method: 'GET', body: null, headers: {}, isJs: true };
  }

  const postMatch = raw.match(/^(.+?),\s*(\{[\s\S]*\})\s*$/);
  if (postMatch) {
    url = postMatch[1].trim();
    try {
      const config = JSON.parse(postMatch[2]);
      method = (config.method || 'GET').toUpperCase();
      if (config.body) body = config.body;
      if (config.headers) headers = config.headers;
    } catch {}
  }

  return { url, method, body, headers, isJs: false };
};

export const buildSearchUrl = (source, keyword, page) => {
  const parsed = parseSearchUrl(source);
  if (parsed.isJs || !parsed.url) return null;

  let url = parsed.url
    .replace('{{page}}', String(page))
    .replace('{{key}}', encodeURIComponent(keyword))
    .replace('{{keyword}}', encodeURIComponent(keyword))
    .replace('{{(page-1)}}', String(page - 1))
    .replace('{{(page)}}', String(page));

  if (!url.startsWith('http')) {
    url = `${source.bookSourceUrl}${url}`;
  }

  return url;
};

export const getSearchRequestConfig = async (source, keyword, page) => {
  const parsed = parseSearchUrl(source);

  if (parsed.isJs) return null;
  if (!parsed.url) return null;

  let url = parsed.url
    .replace('{{page}}', String(page))
    .replace('{{key}}', encodeURIComponent(keyword))
    .replace('{{keyword}}', encodeURIComponent(keyword))
    .replace('{{(page-1)}}', String(page - 1))
    .replace('{{(page)}}', String(page));

  if (!url.startsWith('http')) {
    url = `${source.bookSourceUrl}${url}`;
  }

  let body = parsed.body;
  if (body) {
    body = body
      .replace('{{key}}', encodeURIComponent(keyword))
      .replace('{{keyword}}', encodeURIComponent(keyword))
      .replace('{{page}}', String(page));
  }

  const sourceHeaders = parseHeaders(source.header);
  const configHeaders = parsed.headers || {};
  const headers = { ...sourceHeaders, ...configHeaders };

  return { url, method: parsed.method, body, headers };
};

const LOGIN_STATUS_KEY = 'zifeng_source_login_status';

export const detectLoginCapability = (source) => {
  const loginUrl = source.loginUrl || '';
  const loginUi = source.loginUi || '';
  const bookSourceGroup = (source.bookSourceGroup || '').toLowerCase();
  const bookSourceName = (source.bookSourceName || '').toLowerCase();

  let hasLogin = false;
  let loginType = 'none';
  let loginUrlExtracted = '';

  if (loginUi && loginUi.trim()) {
    hasLogin = true;
    loginType = 'ui';
    try {
      const uiItems = JSON.parse(loginUi);
      if (Array.isArray(uiItems)) {
        const loginAction = uiItems.find(item => item.type === 'button' && (item.name || '').includes('登录'));
        if (loginAction && loginAction.action) {
          loginUrlExtracted = source.bookSourceUrl || '';
        }
      }
    } catch {}
  }

  if (loginUrl && loginUrl.trim()) {
    hasLogin = true;
    if (loginType === 'none') loginType = 'script';

    const urlMatch = loginUrl.match(/https?:\/\/[^\s"'`]+/);
    if (urlMatch) {
      loginUrlExtracted = urlMatch[0];
    } else if (loginUrl.startsWith('//')) {
      loginUrlExtracted = 'https:' + loginUrl.split('\n')[0].trim();
    }
  }

  if (!hasLogin) return { hasLogin: false, loginType: 'none', loginUrl: '', isAggregate: false, loginRequired: false };

  if (!loginUrlExtracted && source.bookSourceUrl) {
    loginUrlExtracted = source.bookSourceUrl;
  }

  const isAggregate = ['聚合', '融合', '多源', '书源网', '源仓库'].some(kw =>
    bookSourceGroup.includes(kw) || bookSourceName.includes(kw)
  );

  const loginRequired = loginType === 'ui' || (loginUrl && loginUrl.includes('请登录'));

  return { hasLogin, loginType, loginUrl: loginUrlExtracted, isAggregate, loginRequired };
};

export const getSourceLoginStatus = (bookSourceUrl) => {
  try {
    const data = localStorage.getItem(LOGIN_STATUS_KEY);
    if (!data) return {};
    const all = JSON.parse(data);
    return all[bookSourceUrl] || {};
  } catch {
    return {};
  }
};

export const setSourceLoginStatus = (bookSourceUrl, status) => {
  try {
    const data = localStorage.getItem(LOGIN_STATUS_KEY);
    const all = data ? JSON.parse(data) : {};
    all[bookSourceUrl] = {
      ...all[bookSourceUrl],
      ...status,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(LOGIN_STATUS_KEY, JSON.stringify(all));
  } catch {}
};

export const clearSourceLoginStatus = (bookSourceUrl) => {
  try {
    const data = localStorage.getItem(LOGIN_STATUS_KEY);
    const all = data ? JSON.parse(data) : {};
    delete all[bookSourceUrl];
    localStorage.setItem(LOGIN_STATUS_KEY, JSON.stringify(all));
  } catch {}
};
