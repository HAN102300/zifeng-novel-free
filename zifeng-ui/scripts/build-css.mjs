#!/usr/bin/env node
/* ============================================================
   生成 zifeng-ui/css/tokens.css
   用法：node zifeng-ui/scripts/build-css.mjs
   生成物提交进仓库（两端不跑构建前置脚本，避免 dev 启动依赖）。

   为什么是「生成期穷举」而不是运行时 setProperty：
     运行时打补丁会导致 FOUC、且必须访问过设置页才生效
     （现状 Setting.jsx:114-120 就是这个毛病）。穷举后运行时
     只需切换 html[data-brand]，CSS 侧渐变/光晕/滚动条/选区自动跟随。
   ============================================================ */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { tokens, brands, BRAND_KEYS, cssVarName } from '../tokens/index.js';
import { surfaces } from '../tokens/surfaces.js';
import { fx } from '../tokens/fx.js';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '../css/tokens.css');

const px = (v) => (typeof v === 'number' ? `${v}px` : String(v));
const line = (k, v) => `  ${k}: ${v};`;

/** 品牌相关变量：每个 [data-brand] 块内都要穷举一遍 */
function brandDecls(brand) {
  const r = brand.ramp;
  const out = [];
  for (const step of [50, 100, 200, 300, 400, 500, 600, 700, 800, 900]) {
    out.push(line(`--zf-brand-${step}`, r.hex[step]));
  }
  for (const step of [300, 400, 500, 600, 700, 900]) {
    out.push(line(`--zf-brand-rgb-${step}`, r.rgb[step]));
  }
  out.push(line('--zf-brand-rgb', r.rgb[500]));
  out.push(line('--zf-grad-brand', r.gradBrand));
  out.push(line('--zf-grad-brand-soft', r.gradBrandSoft));
  out.push(line('--zf-grad-brand-ink', r.gradBrandInk));
  out.push(line('--zf-glow-brand', r.glowBrand));
  out.push(line('--zf-glow-brand-soft', r.glowSoft));
  out.push(line('--zf-ring-brand', r.ringBrand));
  out.push(line('--zf-tint-brand-05', r.tint5));
  out.push(line('--zf-tint-brand-08', r.tint8));
  out.push(line('--zf-tint-brand-10', r.tint10));
  out.push(line('--zf-tint-brand-16', r.tint16));
  out.push(line('--zf-tint-brand-25', r.tint25));
  out.push(line('--zf-tint-brand-35', r.tint35));
  return out;
}

/** 表面/文本类变量按 dark|light 分轨 */
function surfaceDecls(mode) {
  const out = [];
  for (const [key, val] of Object.entries(surfaces)) {
    if (typeof val === 'string') {
      out.push(line(cssVarName('surfaces', key), val));
    } else {
      out.push(line(cssVarName('surfaces', key), val[mode]));
    }
  }
  return out;
}

function staticDecls() {
  const out = [];
  const push = (group, obj, transform = px) => {
    for (const [k, v] of Object.entries(obj)) out.push(line(cssVarName(group, k), transform(v)));
  };
  push('fonts', tokens.fonts, String);
  push('fontSize', tokens.fontSize);
  push('fluid', tokens.fluid, String);
  push('lineHeight', tokens.lineHeight, String);
  push('letterSpacing', tokens.letterSpacing, String);
  push('fontWeight', tokens.fontWeight, String);
  push('measure', tokens.measure, String);
  push('spacing', tokens.spacing);
  push('gutter', tokens.gutter);
  push('radius', tokens.radius);
  push('borderWidth', tokens.borderWidth);
  push('zIndex', tokens.zIndex, String);
  push('container', tokens.container);
  push('breakpoints', tokens.breakpoints);
  push('header', tokens.header);
  push('easing', tokens.easing, String);
  push('duration', tokens.duration, String);
  push('ink', tokens.ink, String);
  push('paper', tokens.paper, String);
  push('status', tokens.status, String);
  tokens.chart.forEach((c, i) => out.push(line(`--zf-chart-${i + 1}`, c)));
  out.push(line('--zf-rank-gold-a', tokens.rank.gold[0]));
  out.push(line('--zf-rank-gold-b', tokens.rank.gold[1]));
  out.push(line('--zf-rank-silver-a', tokens.rank.silver[0]));
  out.push(line('--zf-rank-silver-b', tokens.rank.silver[1]));
  out.push(line('--zf-rank-bronze-a', tokens.rank.bronze[0]));
  out.push(line('--zf-rank-bronze-b', tokens.rank.bronze[1]));
  out.push(line('--zf-grad-sheen', 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%)'));
  return out;
}

/**
 * 旧变量名 → 新变量名。
 * 迁移期 54 个文件仍在引用 --zf-primary-* / --zf-glass-bg / --zf-bg-base 等，
 * 保留别名可让「逐页迁移」成为可能，而不是一次性大爆炸改写。
 * 每页迁完后此表可整块删除。
 */
function legacyAliases() {
  return [
    line('--zf-primary-50', 'var(--zf-brand-50)'),
    line('--zf-primary-100', 'var(--zf-brand-100)'),
    line('--zf-primary-200', 'var(--zf-brand-200)'),
    line('--zf-primary-300', 'var(--zf-brand-300)'),
    line('--zf-primary-400', 'var(--zf-brand-400)'),
    line('--zf-primary-500', 'var(--zf-brand-500)'),
    line('--zf-primary-600', 'var(--zf-brand-600)'),
    line('--zf-primary-700', 'var(--zf-brand-700)'),
    line('--zf-primary-800', 'var(--zf-brand-800)'),
    line('--zf-primary-900', 'var(--zf-brand-900)'),
    line('--zf-bg-base', 'var(--zf-canvas)'),
    line('--zf-bg-elevated', 'var(--zf-surface-1)'),
    line('--zf-glass-bg', 'var(--zf-glass-1)'),
    line('--zf-glass-bg-strong', 'var(--zf-glass-3)'),
    /* 注意：--zf-glass-border / --zf-glass-border-strong / --zf-text-*
       新旧同名，由 surfaces 直接生成，切勿在此再写别名 —— 早先一条
       `--zf-glass-border: var(--zf-glass-border-strong)` 会把自身覆盖成
       更强的描边，属于自指错误。 */
    line('--zf-glass-highlight', 'var(--zf-glass-edge-top)'),
    line('--zf-font-serif', 'var(--zf-font-display)'),
    line('--zf-shadow-sm', 'var(--zf-shadow-1)'),
    line('--zf-shadow-md', 'var(--zf-shadow-2)'),
    line('--zf-shadow-lg', 'var(--zf-shadow-3)'),
    line('--zf-glow-primary', 'var(--zf-glow-brand)'),
    line('--zf-glow-magenta', '0 0 24px rgb(236 72 153 / .40)'),
    line('--zf-accent-magenta', '#EC4899'),
    line('--zf-accent-cyan', 'var(--zf-status-info)'),
    line('--zf-accent-amber', 'var(--zf-status-warning)'),
    line('--zf-accent-emerald', 'var(--zf-status-success)'),
    line('--zf-accent-rose', 'var(--zf-status-error)'),
  ];
}

function fxDecls(tier) {
  const out = [];
  for (const [k, v] of Object.entries(fx)) {
    const val = v[tier];
    out.push(line(cssVarName('fx', k), typeof val === 'number' ? String(val) : val));
  }
  return out;
}

const block = (selector, decls, comment) =>
  `${comment ? `  /* ${comment} */\n` : ''}${selector} {\n${decls.join('\n')}\n}`;

/**
 * tier 由 [data-fx] 覆盖；但 FxProvider 挂载前 html 上没有该属性，
 * 若 :root 不兜底，--zf-fx-loop 就是未定义，animation-play-state 会
 * 退化成隐式 running —— 等于总闸失效。故 :root 预置 tier 1（标准）为
 * 保守默认，JS 挂载后再精修到 0 或 2。
 */
const DEFAULT_FX_TIER = 1;

const css = `/* ============================================================
   紫枫 · 设计令牌（生成物，请勿手改）
   由 zifeng-ui/scripts/build-css.mjs 从 zifeng-ui/tokens/*.js 生成
   改值请改 tokens/ 下的源文件后重新生成。
   ============================================================ */

${block(':root', [...staticDecls(), ...brandDecls(brands.violet), ...surfaceDecls('dark'), ...fxDecls(DEFAULT_FX_TIER), ...legacyAliases()], `默认态：深色 + 优雅紫 + tier ${DEFAULT_FX_TIER}（FxProvider 挂载前的保守兜底）`)}

${block('[data-theme="light"]', surfaceDecls('light'), '浅色模式：保住玻璃身份的配方（见 tokens/surfaces.js 注释）')}

${BRAND_KEYS.map((k) => block(`[data-brand="${k}"]`, brandDecls(brands[k]), `${brands[k].name}`)).join('\n\n')}

${[0, 1, 2].map((t) => block(`[data-fx="${t}"]`, fxDecls(t), `特效预算 tier ${t}（由 motion/FxContext.jsx 判定）`)).join('\n\n')}
`;

writeFileSync(outFile, css, 'utf8');
console.log(`✓ 已生成 ${outFile}`);
console.log(`  变量总数：${(css.match(/^\s+--/gm) || []).length}`);
