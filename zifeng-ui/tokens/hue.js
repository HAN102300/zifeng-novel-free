/* ============================================================
   品牌定义 —— 全仓库唯一的「主题色真相源」
   改这里一个 hue/chroma，CSS 渐变·光晕·滚动条·选区·antd 主色·
   framer 曲线全部跟随（经 scripts/build-css.mjs 生成）。
   chroma 为色阶峰值彩度（对应 600 档）。
   violet 的数值是从现网 --zf-primary-* 反解得到，故能复现既有品牌色。
   ============================================================ */

export const BRANDS = {
  violet: { key: 'violet', name: '优雅紫', hue: 292.72, chroma: 0.2466 },
  jade: { key: 'jade', name: '青玉', hue: 160, chroma: 0.16 },
  amber: { key: 'amber', name: '琥珀', hue: 60, chroma: 0.155 },
  crimson: { key: 'crimson', name: '胭脂', hue: 16.44, chroma: 0.19 },
  azure: { key: 'azure', name: '黛蓝', hue: 250, chroma: 0.17 },
};

export const BRAND_KEYS = Object.keys(BRANDS);
export const DEFAULT_BRAND = 'violet';

/**
 * 兼容既有 `zifeng_theme` localStorage 值。
 * 实际键名来自 zifeng-web/src/config/themes.js：
 *   purple / green / orange / red / default
 * 注意 purple 是默认存储值，必须显式列出，不能靠兜底分支。
 */
export const LEGACY_BRAND_ALIAS = {
  purple: 'violet',
  violet: 'violet',
  green: 'jade',
  orange: 'amber',
  red: 'crimson',
  blue: 'azure',
  default: 'azure',
};
