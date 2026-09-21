#!/usr/bin/env node
/* ============================================================
   令牌交叉校验
   1) 扫 zifeng-ui/css/tokens.css 收集「已定义」变量
   2) 扫两端 src/** 与 zifeng-ui/** 收集「被引用」的 var(--zf-*)
   3) 报告悬空引用（写了但没定义）与孤儿令牌（定义了但没人用）
   4) 统计 src/** 里的硬编码颜色 / 内联魔法数，作为迁移进度基线

   用法：node zifeng-ui/scripts/check-tokens.mjs [--strict]
   --strict 时悬空引用会让进程以非 0 退出，可进 CI。
   ============================================================ */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(here, '..');
const repoRoot = resolve(uiRoot, '..');

const STRICT = process.argv.includes('--strict');
const EXTS = new Set(['.jsx', '.js', '.css', '.html']);
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', 'build', 'coverage']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTS.has(name.slice(name.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

const tokensCss = readFileSync(join(uiRoot, 'css/tokens.css'), 'utf8');
const defined = new Set([...tokensCss.matchAll(/^\s*(--zf-[a-zA-Z0-9-]+)\s*:/gm)].map((m) => m[1]));

const SCAN_ROOTS = [uiRoot, join(repoRoot, 'zifeng-web/src'), join(repoRoot, 'zifeng-admin/src')];
// 注意不能写成 flatMap(walk)：flatMap 会把索引作为第二个参数传进 out
const files = SCAN_ROOTS.flatMap((root) => walk(root));

if (process.env.DEBUG_SCAN) {
  console.log('scanned files:', files.length);
  console.log('pages:', files.filter((f) => f.includes('pages')).length);
  console.log('roots:', SCAN_ROOTS);
}

const referenced = new Map(); // varName -> Set(file)
const hardcoded = [];
const inlineStyleCounts = [];

for (const file of files) {
  const rel = relative(repoRoot, file).replace(/\\/g, '/');
  const src = readFileSync(file, 'utf8');

  for (const m of src.matchAll(/var\((--zf-[a-zA-Z0-9-]+)/g)) {
    /* 跳过模板字面量里的动态名：`var(--zf-brand-${s})` 会被上面的正则截成
       `--zf-brand-`，看起来像悬空引用其实是误报 —— 不排掉的话这两条会永久
       污染结果，让「零悬空引用」这个判据失去意义。
       偏移用 m[0].length（`var(` 是 4 个字符，不是 5）。 */
    const tail = src.slice(m.index + m[0].length);
    if (/^\s*\$\{/.test(tail)) continue;
    if (!referenced.has(m[1])) referenced.set(m[1], new Set());
    referenced.get(m[1]).add(rel);
  }

  // 硬编码颜色（zifeng-ui/tokens 与 index.html 引导样式属白名单）
  const whitelisted =
    rel.includes('zifeng-ui/tokens/') || rel.endsWith('index.html') || rel.includes('zifeng-ui/css/tokens.css');
  if (!whitelisted) {
    const hits = [...src.matchAll(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(\s*\d{1,3}\s*,/g)];
    if (hits.length) hardcoded.push([rel, hits.length]);
  }

  if (rel.endsWith('.jsx')) {
    const n = (src.match(/style=\{\{/g) || []).length;
    if (n) inlineStyleCounts.push([rel, n]);
  }
}

const dangling = [...referenced.entries()].filter(([name]) => !defined.has(name));
const orphans = [...defined].filter((name) => !referenced.has(name));

/** 先排序再截断 —— 早先写成 slice 后 sort，导致只取到遍历顺序的前 N 个 */
const fmt = (rows, n = 15) =>
  rows
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([f, c]) => `    ${String(c).padStart(4)}  ${f}`);

console.log(`\n令牌定义 ${defined.size} · 被引用 ${referenced.size}`);

if (dangling.length) {
  console.log(`\n✗ 悬空引用 ${dangling.length} 个（写了 var() 但 tokens.css 里没有）：`);
  for (const [name, fs] of dangling.sort()) {
    console.log(`    ${name}  ← ${[...fs].slice(0, 3).join(', ')}${fs.size > 3 ? ` 等 ${fs.size} 处` : ''}`);
  }
} else {
  console.log('\n✓ 无悬空引用');
}

if (orphans.length) {
  console.log(`\n· 孤儿令牌 ${orphans.length} 个（已定义但全仓库无人引用，可考虑删除）：`);
  console.log(`    ${orphans.join(', ')}`);
}

if (hardcoded.length) {
  const total = hardcoded.reduce((s, [, n]) => s + n, 0);
  console.log(`\n· 硬编码颜色（白名单外）合计 ${total} 处，分布于 ${hardcoded.length} 个文件，Top 15：`);
  console.log(fmt(hardcoded).join('\n'));
}

if (inlineStyleCounts.length) {
  const total = inlineStyleCounts.reduce((s, [, n]) => s + n, 0);
  console.log(`\n· style={{ 内联样式合计 ${total} 处，分布于 ${inlineStyleCounts.length} 个文件，Top 15：`);
  console.log(fmt(inlineStyleCounts).join('\n'));
}

console.log('');
if (STRICT && dangling.length) {
  console.error('check-tokens: 存在悬空引用');
  process.exit(1);
}
