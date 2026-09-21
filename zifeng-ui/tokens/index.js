/* ============================================================
   令牌聚合出口 —— JS 侧唯一 import 点
   CSS 侧由 scripts/build-css.mjs 生成为 css/tokens.css。
   两边同源，不存在手写第二份值的可能。
   ============================================================ */

import { deriveRamp } from './brand.js';
import { BRANDS, BRAND_KEYS, DEFAULT_BRAND, LEGACY_BRAND_ALIAS } from './hue.js';
import { palette, ink, paper, status, rank, chart } from './palette.js';
import { surfaces } from './surfaces.js';
import { typography, fonts, fontSize, fluid, lineHeight, letterSpacing, fontWeight, measure } from './type.js';
import { layout, spacing, gutter, radius, borderWidth, zIndex, container, breakpoints, header } from './layout.js';
import { motion, easing, easingCurves, duration, durationMs, spring } from './motion.js';
import { fx, TIERS, TRANSITIONS } from './fx.js';
import { reader, readerThemes, readerTypography } from './reader.js';

/** 每套品牌的完整派生色阶 */
export const brands = Object.fromEntries(
  Object.entries(BRANDS).map(([k, b]) => [k, { ...b, ramp: deriveRamp(b) }]),
);

export const tokens = {
  brands,
  brandKeys: BRAND_KEYS,
  defaultBrand: DEFAULT_BRAND,
  legacyBrandAlias: LEGACY_BRAND_ALIAS,
  palette,
  ink,
  paper,
  status,
  rank,
  chart,
  surfaces,
  typography,
  fonts,
  fontSize,
  fluid,
  lineHeight,
  letterSpacing,
  fontWeight,
  measure,
  layout,
  spacing,
  gutter,
  radius,
  borderWidth,
  zIndex,
  container,
  breakpoints,
  header,
  motion,
  easing,
  easingCurves,
  duration,
  durationMs,
  spring,
  fx,
  tiers: TIERS,
  transitions: TRANSITIONS,
  reader,
  readerThemes,
  readerTypography,
};

/** 取某个品牌派生值，如 brandVar('violet').ramp.hex[500] */
export const brandVar = (key) => brands[key] ?? brands[DEFAULT_BRAND];

/** 归一化 localStorage 里可能存在的旧主题名 */
export const normalizeBrand = (key) => {
  if (!key) return DEFAULT_BRAND;
  if (brands[key]) return key;
  return LEGACY_BRAND_ALIAS[key] ?? DEFAULT_BRAND;
};

/**
 * 令牌路径 → CSS 变量名。
 *   surfaces.canvas      → --zf-canvas
 *   fontSize.base        → --zf-fs-base
 *   spacing[4]           → --zf-s4
 *   radius.md            → --zf-r-md
 *   easing.out           → --zf-ease-out
 *   duration.base        → --zf-dur-base
 *   fx.loop              → --zf-fx-loop
 *   brand 500            → --zf-brand-500
 */
const CSS_NAME = {
  surfaces: 'zf-{k}',
  fontSize: 'zf-fs-{k}',
  fluid: 'zf-fluid-{k}',
  lineHeight: 'zf-lh-{k}',
  letterSpacing: 'zf-ls-{k}',
  fontWeight: 'zf-fw-{k}',
  fonts: 'zf-font-{k}',
  measure: 'zf-measure-{k}',
  spacing: 'zf-s{k}',
  gutter: 'zf-gutter-{k}',
  radius: 'zf-r-{k}',
  borderWidth: 'zf-bw-{k}',
  zIndex: 'zf-z-{k}',
  container: 'zf-container-{k}',
  breakpoints: 'zf-bp-{k}',
  header: 'zf-header-{k}',
  easing: 'zf-ease-{k}',
  duration: 'zf-dur-{k}',
  fx: 'zf-fx-{k}',
  ink: 'zf-ink-{k}',
  paper: 'zf-paper-{k}',
  status: 'zf-status-{k}',
  chart: 'zf-chart-{k}',
};

/** 驼峰键 → kebab：glassBorder→glass-border、surface1→surface-1、onAccent→on-accent */
const kebab = (s) =>
  String(s)
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();

export function cssVarName(group, key) {
  const tpl = CSS_NAME[group];
  if (!tpl) throw new Error(`未知令牌分组: ${group}`);
  return `--${tpl.replace('{k}', kebab(key))}`;
}

export {
  BRANDS,
  BRAND_KEYS,
  DEFAULT_BRAND,
  LEGACY_BRAND_ALIAS,
  deriveRamp,
  palette,
  ink,
  paper,
  status,
  rank,
  chart,
  surfaces,
  typography,
  fonts,
  fontSize,
  fluid,
  lineHeight,
  letterSpacing,
  fontWeight,
  measure,
  layout,
  spacing,
  gutter,
  radius,
  borderWidth,
  zIndex,
  container,
  breakpoints,
  header,
  motion,
  easing,
  easingCurves,
  duration,
  durationMs,
  spring,
  fx,
  TIERS,
  TRANSITIONS,
  reader,
  readerThemes,
  readerTypography,
};
