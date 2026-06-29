# 紫枫免费小说 · UI 重构设计规范 v1.0

> 方向：**品牌紫 + 玻璃拟态 + 复杂动画**
> 出品：UI Designer
> 配套原型：`design/zifeng-ui-redesign.html`（浏览器打开可交互预览）

---

## 1. 设计理念

| 维度 | 决策 | 理由 |
|---|---|---|
| 主色 | 紫枫紫 `#8B5CF6`（比现有 `#722ed1` 更年轻现代） | 契合「紫枫」品牌名，紫色在阅读类产品中传达沉静与想象力 |
| 视觉语言 | 玻璃拟态（Glassmorphism） | 项目已有 `glassStyle.js`，深化而非推倒；磨砂半透与流光背景相得益彰 |
| 动效灵魂 | 16 组统一动画令牌 | 解决现有「动画散落各处、风格不一」问题，全站复用 |
| 排版 | Noto Serif SC 标题 + Inter/Noto Sans SC 正文 | 衬线标题为小说产品注入「书卷气」 |

---

## 2. 设计令牌（Design Tokens）

### 2.1 色彩

**品牌紫主轴**
| Token | 值 | 用途 |
|---|---|---|
| `--zf-primary-50` | `#F5F3FF` | 浅底背景 |
| `--zf-primary-300` | `#C4B5FD` | 次级强调 |
| `--zf-primary-400` | `#A78BFA` | 文本强调、链接 |
| `--zf-primary-500` | `#8B5CF6` | **主色** · 按钮、聚焦、激活 |
| `--zf-primary-600` | `#7C3AED` | 渐变深色端 |
| `--zf-primary-700` | `#6D28D9` | 按压态 |
| `--zf-primary-900` | `#4C1D95` | 深色封面底 |

**辅助强调色（语义化）**
| Token | 值 | 语义 |
|---|---|---|
| `--zf-accent-magenta` | `#EC4899` | 热销 / 火焰榜 / 高亮 |
| `--zf-accent-cyan` | `#06B6D4` | 信息 / 更新 / 新书 |
| `--zf-accent-amber` | `#F59E0B` | 警告 / 完结 / 金牌 |
| `--zf-accent-emerald` | `#10B981` | 成功 / 在读 / 连载中 |
| `--zf-accent-rose` | `#F43F5E` | 危险 / 删除 |

**玻璃表面（暗色）**
| Token | 值 |
|---|---|
| `--zf-glass-bg` | `rgba(255,255,255,0.06)` |
| `--zf-glass-bg-strong` | `rgba(255,255,255,0.10)` |
| `--zf-glass-border` | `rgba(255,255,255,0.12)` |
| `--zf-glass-border-strong` | `rgba(255,255,255,0.20)` |
| `--zf-blur-glass` | `blur(18px) saturate(160%)` |

> 浅色模式令牌见原型 `<style>` 中 `[data-theme="light"]` 块。

### 2.2 排版
- **Display/标题**：`'Noto Serif SC', serif` — 权重 700/900，营造书卷气
- **UI/正文**：`'Inter', 'Noto Sans SC', system-ui` — 权重 400/500/600
- **字号阶**：12 · 13 · 14(基准) · 15 · 18 · 22 · 28 · 38 · 52
- **行高**：正文 1.6，标题 1.1

### 2.3 间距 / 圆角 / 阴影
- **间距**：4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64（8pt 体系）
- **圆角**：sm 8 · md 12 · lg 16 · xl 22 · full 999
- **阴影**：sm / md / lg 三级，含 `--zf-glow-primary` 光晕

### 2.4 动画令牌
| Token | 值 | 用途 |
|---|---|---|
| `--zf-ease-out` | `cubic-bezier(.16,1,.3,1)` | 通用出场 |
| `--zf-ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | 弹簧反馈 |
| `--zf-dur-fast` | `.18s` | 微交互 |
| `--zf-dur-normal` | `.32s` | 标准过渡 |
| `--zf-dur-slow` | `.6s` | 装饰动画 |

---

## 3. 全新导航栏

### 结构
`Logo（流光扫过）` · `菜单（磁吸下划线）` · `全局搜索（聚焦光晕）` · `主题切换` · `暗色切换` · `头像` · `汉堡（移动端）`

### 交互特性
1. **玻璃磨砂**：`backdrop-filter: blur(18px) saturate(160%)`，浮于内容之上
2. **滚动收缩**：滚动 >20px 时 padding 减小、阴影加深、背景提亮（`.scrolled` 类）
3. **磁吸下划线**：菜单 hover/active 时，渐变下划线以 `ease-spring` 滑动到目标，带紫色光晕。实现：`framer-motion layoutId` 或 JS 计算 `offsetLeft/offsetWidth`
4. **Logo 扫光**：每 4s 一道高光横扫 Logo 标记（`logoShine` keyframe）
5. **搜索聚焦**：紫色 4px 光晕环 + 背景提亮
6. **响应式**：≤880px 隐藏菜单与搜索，显示汉堡按钮

### 菜单项
首页 · 分类 · 书架 · 排行榜（HOT 角标）· 书源

---

## 4. 统一组件库

### 4.1 按钮 Button
| 变体 | 样式 | 动效 |
|---|---|---|
| `btn-primary` | 紫色渐变 | 光泽扫过 + 上浮光晕 |
| `btn-glass` | 磨砂半透 | 背景提亮 + 边框高亮 |
| `btn-ghost` | 紫色描边 | 背景填充 12% |
| `btn-danger` | 玫红渐变 | 上浮 + 红色光晕 |
| 尺寸 | sm / 默认 / lg | — |
| 图标按钮 | `btn-icon` 42×42 | — |

### 4.2 小说卡 NovelCard
- **结构**：封面（200×280 比例）+ 排名徽章 + 角标 + 标题 + 作者 + 分类标签 + 阅读量
- **入场**：`cardEnter` 错峰淡入上浮，`animation-delay` 每项 +0.08s
- **hover**：整卡 `translateY(-8px) scale(1.02)` + 封面 `scale(1.12)` + 暗角渐显
- **排名徽章**：Top1 金色脉冲光晕（`pulseGold`）、Top2 银、Top3 铜
- **角标**：`hot` 品红渐变、`new` 青色渐变

### 4.3 榜单条目 RankItem
- **结构**：序号 + 封面 + 书名/简介 + 状态
- **hover**：整行 `translateX(6px)` + 边框高亮
- **序号着色**：前 3 名金/银/铜
- **状态**：在读用脉冲绿点（`livePulse`）

### 4.4 标签 Tag
`tag-primary` / `tag-magenta` / `tag-emerald` / `tag-amber` / 默认 — 圆角胶囊，半透底色 + 同色描边

### 4.5 进度条 Progress
- 渐变填充（紫→品红）+ 光晕
- 流光扫过（`progressShine`）表示进行中

### 4.6 分区标题 SectionHeader
- 图标方块（fire/trophy/rise/check 四套渐变）+ 标题 + 副标题 + 「查看全部 →」
- 「查看全部」hover 时间距扩大

### 4.7 空状态 / 骨架屏
- 空状态：图标圆 + 文案 + 引导按钮
- 骨架屏：`skel` 渐变滚动，优先于 Spinner

---

## 5. 复杂动画清单（16 组）

### 页面级
| 名称 | 时长 | 说明 |
|---|---|---|
| `meshShift` | 18s | 背景流光网格缓慢漂移 |
| `float1/2/3` | 16-22s | 三颗装饰光球浮动 |
| `cardEnter` | .6s | 小说卡错峰淡入上浮 |
| `reveal` | .7s | 滚动揭示（IntersectionObserver） |

### 组件级
| 名称 | 时长 | 说明 |
|---|---|---|
| `logoShine` | 4s | Logo 高光扫过 |
| `shimmer` | 2.5s | 文字流光 |
| `gradFlow` | 3-4s | 渐变文字流动 |
| `progressShine` | 1.5-2s | 进度条流光 |
| `livePulse` | 1.8s | 状态点脉冲 |
| `pulseGold` | 2s | 金牌光晕脉冲 |
| `skel` | 1.4s | 骨架屏滚动 |

### 交互级
| 名称 | 触发 | 说明 |
|---|---|---|
| 磁吸下划线 | hover/active | 弹簧滑动 + 光晕 |
| 按钮光泽扫过 | hover | `::before` translateX |
| 卡片上浮缩放 | hover | translateY + scale |
| 搜索聚焦光晕 | focus | 4px 紫色环 |
| 数字滚动 | 入视 | countUp 动效 |

---

## 6. 响应式策略

| 断点 | 导航栏 | 小说网格 |
|---|---|---|
| ≥1100px | 完整菜单 + 搜索 | 6 列 |
| 768-1099px | 完整菜单 + 搜索 | 4 列 |
| ≤880px | 汉堡菜单 | — |
| ≤720px | 汉堡菜单 | 2 列 |

> 与现有 `App.css` 的 6/5/4/3/2 列断点体系对齐，保留移动端横向滚动模式。

---

## 7. 无障碍（WCAG AA）

| 项 | 标准 | 实现 |
|---|---|---|
| 文本对比度 | ≥4.5:1 | 正文 `#F8FAFC`/`#0B0814` ≈ 17:1 |
| 焦点可见 | 可见焦点环 | 所有交互 `:focus-visible` 紫色 2px 描边 + 3px 偏移 |
| 触达区 | ≥38px | 图标按钮 38px、头像 38px、按钮内边距充足 |
| 动效偏好 | 尊重 reduced-motion | 装饰动画应包裹 `@media (prefers-reduced-motion: reduce)` |
| 键盘导航 | 全键盘可用 | 菜单为 `<button>`，可 Tab/Enter |

---

## 8. 开发者对接路径

1. **令牌迁移**：将原型 `:root` 的 `--zf-**` 变量迁入 `zifeng-web/src/index.css`
2. **Ant Design 映射**：`ConfigProvider theme.token` 设 `colorPrimary:#8B5CF6`、`borderRadius:12`、`fontSize:14`
3. **玻璃工具扩展**：`utils/glassStyle.js` 新增 `glassNavbar(scrolled)`、`glassNavIndicator()`
4. **导航栏重构**：替换 `App.jsx` Header，菜单用 `framer-motion layoutId` 实现磁吸下划线
5. **小说卡组件化**：提炼 `NovelCard` 为独立组件，统一错峰 delay 与 Top3 徽章
6. **动画集中**：keyframes 收入 `animations.css`，布局动画用 Framer Motion，装饰动画用 CSS
7. **主题切换**：保留现有 5 套主题色，主色映射到 `--zf-primary-500`

---

## 9. 交付清单

| 文件 | 说明 |
|---|---|
| `design/zifeng-ui-redesign.html` | 交互式原型（浏览器直接打开） |
| `design/REDESIGN-SPEC.md` | 本规范文档 |

原型内含：设计令牌展示 · 全新导航栏（可交互）· 组件库（按钮/小说卡/榜单/标签/进度/分区标题/空状态/骨架）· 首页原型 · 书架页原型 · 动画清单 · 开发对接指南。右下角浮动按钮可切换深/浅色与回顶。
