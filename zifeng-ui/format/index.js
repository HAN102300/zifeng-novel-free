/* ============================================================
   共享格式化层
   收编现状：
     · formatReadCount 在 NovelCard.jsx:31-38 与 RankItem.jsx:20-27 逐字复制
     · 「0.0 分」：Home.jsx:487 用 `feature.score ?`（字符串 "0.0" 为 truthy），
       而 NovelCard.jsx:222 用 `Number(score) > 0` 才是正确守卫
     · 详情页标签串：NovelDetail.jsx:185 把整条原始 kind
       （"8个月前,7.8分,,轻松,热血,杀伐果断,…"）塞进单个 {className} 对象，
       所以从未被拆分 —— 元数据混在题材标签里，还带空项
   ============================================================ */

const toNumber = (v) => {
  if (v === undefined || v === null || v === '') return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
};

/** 是否有可展示的评分：0、"0"、"0.0"、null、非数字都算无 */
export function hasScore(score) {
  const n = toNumber(score);
  return Number.isFinite(n) && n > 0;
}

/** 评分文本，保留一位小数；无评分返回空串（调用方据此不渲染） */
export function formatScore(score, { digits = 1, suffix = '分' } = {}) {
  if (!hasScore(score)) return '';
  const n = toNumber(score);
  const fixed = n.toFixed(digits).replace(/\.0$/, '');
  return suffix ? `${fixed}${suffix}` : fixed;
}

/** 热度/阅读量：>=10000 显示为「x.x万」 */
export function formatReadCount(count) {
  if (count === undefined || count === null) return '0';
  const n = Number(count);
  if (Number.isNaN(n)) return String(count);
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  return String(n);
}

/** 字数：源站常给「668万字」这类带单位字符串，原样透传但要能拆出数值 */
export function parseNumericValue(value) {
  if (value === undefined || value === null) return null;
  const str = String(value);
  const match = str.match(/([\d.]+)\s*(亿|万|千)?/);
  if (!match) return null;
  const number = Number(match[1]);
  if (Number.isNaN(number)) return null;
  return { number, suffix: match[2] || '', raw: str };
}

export function formatWords(value) {
  const parsed = parseNumericValue(value);
  if (!parsed) return '未知';
  return `${parsed.number}${parsed.suffix || '字'}`;
}

/** 相对时间：「3天前」「8个月前」 */
export function formatRelativeTime(input) {
  if (!input) return '未知';
  const t = typeof input === 'number' ? input : Date.parse(String(input).replace(/-/g, '/'));
  if (Number.isNaN(t)) return String(input);
  const diff = Date.now() - t;
  if (diff < 0) return '刚刚';
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min}分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}小时前`;
  const day = Math.floor(hour / 24);
  if (day < 31) return `${day}天前`;
  const month = Math.floor(day / 31);
  if (month < 12) return `${month}个月前`;
  return `${Math.floor(month / 12)}年前`;
}

/**
 * 拆分书源返回的 kind / tags 原始串。
 * 中文逗号与英文逗号混用；含空项；且常把「8个月前」「7.8分」这类
 * 已经单独展示过的元数据混在题材里 —— 这里一并剔除，避免重复渲染。
 * @param {string|string[]} input
 * @param {{limit?: number, dropMeta?: boolean}} [opts]
 * @returns {string[]}
 */
export function splitTags(input, { limit = 8, dropMeta = true } = {}) {
  if (!input) return [];
  const raw = Array.isArray(input) ? input.join(',') : String(input);
  const seen = new Set();
  const out = [];

  for (const piece of raw.split(/[,，、;；|]/)) {
    const tag = piece.trim();
    if (!tag) continue;
    if (dropMeta && isMetaTag(tag)) continue;
    if (seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= limit) break;
  }
  return out;
}

/** 判定一个标签是否属于「已在别处单独展示的元数据」 */
function isMetaTag(tag) {
  if (/^\d+(\.\d+)?\s*(分|评分)$/u.test(tag)) return true; // 7.8分
  if (/^\d+\s*(天前|小时前|分钟前|个月前|年前|周前|秒前)$/u.test(tag)) return true; // 8个月前
  if (/^(连载|完结|未知|无)$/u.test(tag)) return true;
  return false;
}

/** 统一把书源返回的 category/kind 形态归一成 [{ className }]，供既有取用方兼容 */
export function toCategoryList(input) {
  return splitTags(input).map((className) => ({ className }));
}

/** 章节名清洗：去掉源站夹带的控制字符与全角空白 */
export function cleanChapterName(name) {
  if (!name) return '';
  return String(name).replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim();
}

export const format = {
  hasScore,
  formatScore,
  formatReadCount,
  parseNumericValue,
  formatWords,
  formatRelativeTime,
  splitTags,
  toCategoryList,
  cleanChapterName,
};

export default format;
