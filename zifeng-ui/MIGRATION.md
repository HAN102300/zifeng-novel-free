# 迁移规约（P2 / P3 逐页改造时照此执行）

## 0. 铁律

1. **`src/**` 下禁止出现颜色字面量**（`#RGB` / `#RRGGBB` / `rgb(` / `rgba(` / `hsl(`）。
   需要 alpha 时写 `rgb(var(--zf-brand-rgb-500) / 0.35)`。
   唯一白名单：`index.html` 的 `<meta name="theme-color">` 与首帧引导脚本、
   `zifeng-ui/tokens/palette.js`、`zifeng-ui/tokens/hue.js`、`zifeng-ui/tokens/reader.js`。
2. **禁止新增 `!important`**。要压过 antd 用双 class 提权（见 §5）。
3. **禁止 JS 逐帧改 `style.transform` / 一次改多个 DOM style 属性**。
   用 framer-motion 的 `whileHover` / `useTransform`，或 CSS 自定义属性。
4. **infinite 动画必须是玻璃卡的兄弟层，不能是子孙**（否则每帧重采样 backdrop）。
   所有 infinite 动画必须挂 `animation-play-state: var(--zf-fx-loop, running)`。
5. **不写 rem / em 作为令牌值**（`useTheme` 会改 `documentElement.style.fontSize`，rem 基准在漂移）。
6. **不修改 `zifeng-ui/**`**（共享层由主 agent 统一维护，避免并行冲突）。

## 1. 导入方式

```js
import { ZfPageShell, ZfGrid, ZfPageHeader, ZfSectionTitle, ZfGlassSurface,
         ZfPill, ZfStatCard, ZfCoverCard, ZfSkeleton, ZfSkeletonGrid,
         ZfEmptyState, ZfErrorState } from '@zifeng/ui/components';
import { variants, EASE, DUR, SPRING, stagger } from '@zifeng/ui/motion';
import { useFx } from '@zifeng/ui/motion/FxContext';
import { useBreakpoint, useMediaQuery, useTicker, useInViewOnce } from '@zifeng/ui/hooks';
import { formatReadCount, formatScore, hasScore, splitTags, parseNumericValue } from '@zifeng/ui/format';
import { tokens, BRANDS } from '@zifeng/ui/tokens';
```

## 2. 容器宽度（`ZfPageShell` 的 `size`）

| 页面 | size | 实际宽度 |
|---|---|---|
| Home / Shelf / Category / CategoryDetail / RankDetail / NovelDetail | `lg` | 1180 |
| SearchResult | `xl` | 1420 |
| BookSourcePage | `md` | 900 |
| Login / ResetPassword | `xs` | 420 |
| Reader | `bare` | 用 `--zf-measure-reader` 约束行长 |

## 3. 令牌速查

**颜色** `--zf-brand-{50..900}` `--zf-brand-rgb-{300..900}` `--zf-grad-brand` `--zf-grad-brand-ink`
`--zf-glow-brand` `--zf-ring-brand` `--zf-tint-brand-{05..35}`
`--zf-canvas` `--zf-canvas-2` `--zf-surface-{1..3}`
`--zf-glass-{1,2,3}` `--zf-glass-border` `--zf-glass-border-strong` `--zf-glass-tint` `--zf-glass-edge-top`
`--zf-text-{primary,secondary,muted,faint}` `--zf-on-accent` `--zf-on-tint`
`--zf-status-{success,warning,error,info,processing}` `--zf-rank-{gold,silver,bronze}-{a,b}`

> **`--zf-on-tint` 是修「浅色模式白字落白底」的关键**：任何落在品牌底/浅 tint 底上的文字，
> 用 `--zf-on-accent`（品牌实底）或 `--zf-on-tint`（浅 tint 底），不要再写 `#fff`。

**间距**（无连字符）`--zf-s{0,1,2,3,4,5,6,7,8,10,12,16,20,24}` = 0/4/8/12/16/20/24/28/32/40/48/64/80/96
**圆角** `--zf-r-{xs,sm,md,lg,xl,2xl,full}` = 6/8/12/16/22/28/999
**描边** `--zf-bw-{thin,medium,thick}` = 1/2/3
**层级** `--zf-z-{base,sticky,navbar,drawer,modal,lightbox,toast,sheen}`
**模糊** `--zf-blur-{glass,nav,modal,light}` **阴影** `--zf-shadow-{1,2,3}`
**容器** `--zf-container-{xs,sm,md,lg,xl,full}` = 420/680/900/1180/1420/none

**字体**
```
--zf-font-display  标题/书法（Noto Serif SC + 本地兜底）
--zf-font-ui       界面
--zf-font-reader   ★小说正文（衬线）
--zf-font-mono     代码/URL/规则串
```
**字号** `--zf-fs-{2xs,xs,sm,base,md,lg,xl,2xl,3xl,4xl,5xl,6xl}` = 11/12/13/14/15/18/22/28/38/52/64/80
**行高** `--zf-lh-{none,tight,snug,body,reader}` = 1/1.15/1.3/1.65/1.9
**字距** `--zf-ls-{tighter,normal,wide,display,serif-caps}`
**字重** `--zf-fw-{normal,strong,bold,black}` = 400/600/700/900
**流体** `--zf-fluid-{2xl,3xl,4xl,5xl}`
**行长** `--zf-measure-{text,reader,reader-wide}`
**断点**（唯一允许值）`--zf-bp-{xs,sm,md,lg,xl,xxl}` = 480/576/768/992/1200/1600

**动效** `--zf-ease-{out,in-out,spring,ink,glide}` `--zf-dur-{instant,fastest,fast,base,normal,slow,gentle,slower,sweep}`
JS 侧同源：`EASE.out` 是数组 `[0.16,1,0.3,1]`，不要写字面量。

**特效预算**（只读，由 `FxProvider` 决定）`--zf-fx-{loop,shimmer,orbs,tilt,parallax,sheen,cursor-halo,...}`
JS 侧用 `const { enabled } = useFx(); enabled('tilt')`。

## 4. 排版工具类

`.zf-h1 .zf-h2 .zf-h3 .zf-lede .zf-body .zf-caption .zf-label .zf-num .zf-mono`
`.zf-container--{xs,sm,md,lg,xl,full}` `.zf-glass` `.zf-glass--{1,2,3}`
`.zf-truncate` `.zf-clamp-2` `.zf-skeleton` `.zf-anim-{enter,reveal,drift,pulse-ring,float}`
`.zf-hide-md` `.zf-show-md` `.zf-hide-lg`

## 5. 覆盖 antd 的正确姿势

antd v6 的 Button / Input / Select / Tag **没有** ComponentToken，`Empty` 的是空对象。
不要写 `!important`，改用双 class 提权（权重 0,2,0 > hash 类的 0,1,1）：

```jsx
<Button classNames={{ root: 'zf-btn zf-btn--brand' }} />
```
可用变体：`zf-btn--brand` `zf-btn--glass` `zf-btn--ghost`，卡片 `ant-card.zf-card`，标签 `ant-tag.zf-tag`。
形状类（高度/圆角/字号）走 ConfigProvider 全局 token，不要逐处写。

## 6. 每页迁移固定动作

1. 外层包 `ZfPageShell`（决定容器宽度与栅格），页头用 `ZfPageHeader` / `ZfSectionTitle`
2. 删除页面内 `<style>{...}</style>` 内联块 → 样式并入令牌或工具类
3. 所有 `style={{...}}` 里的字面色/字号/圆角/间距 → 换成 `var(--zf-*)`
4. `motion` 的 `initial/animate/exit` 字面量 → 用 `variants.*`；缓动 → `EASE.*`
5. `onMouseEnter/onMouseLeave` 改 DOM style → `whileHover` / `whileTap`
6. 硬编码断点数字 → `useBreakpoint()`（`isMobile` / `up('lg')`）
7. 自写骨架屏 → `ZfSkeleton` / `ZfSkeletonGrid`
8. 空状态 → `ZfEmptyState`；错误态 → `ZfErrorState`
9. 各种胶囊/标签 → `ZfPill`（`tone` 受用途锁定约束）
10. 书籍卡片 → `ZfCoverCard`

## 7. 完成判据

```bash
node zifeng-ui/scripts/check-tokens.mjs        # 无悬空引用；硬编码色计数下降
cd zifeng-web   && npx vite build && npx eslint src --quiet
cd zifeng-admin && npx vite build && npx eslint src --quiet
```
浏览器侧（dev server 已跑在 5173 / 3002）：
```js
document.querySelectorAll('[style]').length / document.querySelectorAll('*').length   // 目标 < 15%
[...document.querySelectorAll('*')].filter(e => getComputedStyle(e).backdropFilter !== 'none').length
```
