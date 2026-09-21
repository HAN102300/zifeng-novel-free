/* ============================================================
   阅读器主题令牌
   现状：Reader.jsx:53-62 的 8 套 bgPresets 是「第三套主题系统」，
   与 --zf-* 完全无桥接，且 Reader.jsx:174-180 每次挂载都会无条件
   覆盖 localStorage 里用户自选的 bgColor/textColor/bgImage。

   这里保留同名同色的 8 套预设并补上稳定 id；hex 字面量在此文件是
   允许的（纸/墨类阅读主题属于白名单，它们刻意不跟随品牌色——
   阅读底色染上品牌紫会伤害长文可读性）。
   ============================================================ */

import { readerMeasure } from './type.js';

export const readerThemes = [
  { id: 'default', name: '默认白', bg: '#FFFFFF', text: '#333333', mode: 'light' },
  { id: 'green', name: '护眼绿', bg: '#C7EDCC', text: '#333333', mode: 'light' },
  { id: 'cream', name: '护眼黄', bg: '#F5F5DC', text: '#333333', mode: 'light' },
  { id: 'grey', name: '淡灰', bg: '#E8E8E8', text: '#333333', mode: 'light' },
  { id: 'night', name: '暗夜', bg: '#1A1A2E', text: '#E0E0E0', mode: 'dark' },
  { id: 'black', name: '深黑', bg: '#0D0D0D', text: '#CCCCCC', mode: 'dark' },
  { id: 'parchment', name: '羊皮纸', bg: '#F1E7D0', text: '#5B4636', mode: 'light' },
  { id: 'blue', name: '淡蓝', bg: '#D6EAF8', text: '#2C3E50', mode: 'light' },
];

/**
 * 旧版 localStorage 存的是裸 hex，用它反查 id 做一次性迁移。
 * 命中即替换为 id 引用；未命中（用户自定义色）保留原值不丢。
 */
export const LEGACY_HEX_TO_ID = Object.fromEntries(
  readerThemes.map((t) => [t.bg.toUpperCase(), t.id]),
);

/** 阅读器专属排版，与 UI 层分离，避免 --zf-fs-base 漂移影响正文 */
export const readerTypography = {
  fontSize: { min: 14, default: 18, max: 30 },
  lineHeight: { loose: 1.6, default: 1.9, tight: 2.2 },
  paragraphIndent: '2em',
  /** 页面宽度（一行多少个汉字），与 --zf-measure-reader* 同源 */
  measure: readerMeasure,
};

export const reader = { themes: readerThemes, typography: readerTypography, legacyHexToId: LEGACY_HEX_TO_ID };

export default reader;
