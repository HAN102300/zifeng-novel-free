# 小说详情页增强 + 全站动画系统设计

> **日期**: 2026-07-08
> **主题**: 章节数自适应显示 + NovelDetail 沉浸式动画 + 全站动画审查与背景层
> **状态**: 设计待审查

## 概述

本设计涵盖三项任务：

1. **章节数自适应显示** — 大屏显示汉字数字（一千三百二十一章），小屏显示阿拉伯数字（1321章）
2. **小说详情页沉浸式动画** — 水墨粒子背景、3D封面跟踪、书法水印、错峰入场、翻页转场
3. **全站动画审查与背景层** — 系统性补全所有页面动画，融入水墨+书法背景元素

## 任务1：章节数自适应显示

### 需求

* 大屏设备（≥1100px）：显示汉字数字 + "章"后缀，如"一千三百二十一章"

* 小屏设备（＜1100px）：显示阿拉伯数字 + "章"后缀，如"1321章"

* 字数字段同步汉字化（大屏显示"一百二十八万字"）

* 保留 CountUp 数字递增动画（小屏），大屏用逐字浮现效果

### 技术方案

#### 新增工具函数 `src/utils/numberToChinese.js`

```javascript
// 将阿拉伯数字转为中文数字
// 1321 → "一千三百二十一"
// 1285000 → "一百二十八万五千"（字数场景，保留"万"单位）
export function numberToChinese(num, { unit = '', simplified = false } = {}) {
  // 实现中文数字转换逻辑
  // 支持万/亿单位
  // simplified: 超大数字简写（一万三千二百 vs 一万三千二百二十一）
}
```

#### 新增 Hook `src/hooks/useResponsive.js`

```javascript
// 响应式断点检测
// 返回 isLargeScreen (≥1100px)
export function useResponsive() {
  const [isLargeScreen, setIsLargeScreen] = useState(
    window.matchMedia('(min-width: 1100px)').matches
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1100px)');
    const handler = (e) => setIsLargeScreen(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return { isLargeScreen };
}
```

#### 修改 `NovelDetail.jsx` 章节数显示逻辑（L535-548）

* 大屏：`numberToChinese(parsed.number)` + "章"，逐字浮现动画

* 小屏：保留 `CountUp` + "章"后缀

* 字数字段（L520-534）同步处理

#### 新增 CSS 动画 `src/styles/animations.css`

```css
/* 逐字浮现（汉字数字入场） */
@keyframes charReveal {
  from { opacity: 0; transform: translateY(8px) scale(0.9); filter: blur(4px); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
```

### 影响文件

* `src/utils/numberToChinese.js`（新增）

* `src/hooks/useResponsive.js`（新增）

* `src/pages/NovelDetail.jsx`（修改 L520-548）

* `src/styles/animations.css`（新增 charReveal keyframe）

***

## 任务2：小说详情页沉浸式动画（方案C）

### 需求

* 沉浸影院级动画效果，优先最佳视觉表现

* 封面3D倾斜跟随鼠标

* 背景加入水墨+书法元素

* 启用 `prefers-reduced-motion` 降级，低端设备回退到方案A（素雅轻量）

### 动画清单

#### 1. 加载态：骨架屏替换 Spin

* 新增 `NovelDetailSkeleton` 组件，匹配详情页布局（封面占位 + 信息区占位 + 简介占位）

* 使用 `skel` keyframe 微光扫描

#### 2. 封面：3D视差跟踪鼠标

* `motion.div` + `onMouseMove` 计算 rotateX/rotateY

* `whileHover` 放大 + 光晕增强

* 鼠标离开回弹（spring 物理）

#### 3. 标题：保留 ShinyText + 下划线绘制

* ShinyText 已有流光扫过

* 新增 SVG 下划线 `pathLength` 动画（0→1 绘制效果）

#### 4. 信息区：错峰浮现（stagger）

* 标题 → 作者 → 标签 → 统计 → 简介 → 按钮

* 每项 delay 递增 0.08s，使用 `staggerChildren`

* `reveal` keyframe + framer-motion `staggerChildren`

#### 5. 标签：悬停放大 + 发光

* `whileHover={{ scale: 1.1 }}` + `boxShadow` 紫光

#### 6. 统计数字：CountUp 弹簧物理

* 已有 CountUp，增加 `spring` transition

* 数字微跳效果（scale 1→1.05→1）

#### 7. 简介：whileInView 滚动揭示

* `whileInView={{ opacity: 1, y: 0 }}` + `viewport={{ once: true }}`

* 展开过渡（"展开全文"按钮）

#### 8. 按钮：粒子扫光 + 悬停升起 + 点击涟漪

* 保留 `btn-shimmer` 类

* 新增 `whileHover={{ y: -3 }}` + `whileTap={{ scale: 0.97 }}`

* 点击涟漪效果（径向扩散圆）

#### 9. 背景：水墨粒子 + 书法水印

* 3-4 个紫色/品红墨团 `float1-3` 缓慢漂浮

* 角落书法水印汉字"墨"（超低透明度）

* `pointer-events: none` 不影响交互

#### 10. 页面过渡：翻页效果

* 进入：从右侧翻入（rotateY + opacity）

* 退出：向左侧翻出

* 使用 `AnimatePresence` + `exit` 属性

### 降级策略

```css
@media (prefers-reduced-motion: reduce) {
  /* 禁用3D倾斜、粒子、翻页，保留基础淡入 */
  .novel-detail-cover-3d { transform: none !important; }
  .novel-detail-bg-particles { display: none !important; }
}
```

* JS 层检测 `window.matchMedia('(prefers-reduced-motion: reduce)')` 回退到方案A

* 移动端（touch设备）禁用鼠标跟踪，改用陀螺仪（可选）

### 影响文件

* `src/pages/NovelDetail.jsx`（大幅重构动画层）

* `src/components/NovelDetailSkeleton.jsx`（新增）

* `src/components/NovelBackground.jsx`（新增，水墨背景通用组件，内含墨团浮动）

* `src/components/CalligraphyWatermark.jsx`（新增，书法水印子组件）

* `src/styles/animations.css`（新增 charReveal/pageFlip/ripple keyframes）

***

## 任务3：全站动画审查与背景层

### 审查结果

| 页面/组件          | 动画完备度 | 主要缺失       |
| -------------- | ----- | ---------- |
| Home           | 高     | 无          |
| Category       | 高     | 无          |
| Shelf          | 高     | 无          |
| RankDetail     | 高     | 无          |
| CategoryDetail | 高     | 无          |
| SearchResult   | 高     | 无          |
| Login          | 高     | 无          |
| Reader         | 高     | 无          |
| NovelDetail    | 中→高   | 任务2增强中     |
| UserCenter     | 中     | 缺滚动触发、悬停效果 |
| BookSourcePage | 中     | 缺滚动触发、骨架屏  |
| Setting        | 低     | 无入场动画、无悬停  |
| BackButton     | 无     | 完全无动画      |
| FeedbackButton | 无     | 完全无动画      |

### 背景层方案：水墨+书法组合

#### 新增通用组件 `src/components/NovelBackground.jsx`

```jsx
// 可复用的小说主题背景层
// props: char (水印汉字), variant (ink/calligraphy/both)
// 内部：墨团 float1-3 + 书法水印 + pointer-events:none
<NovelBackground char="阅" variant="both" />
```

#### 每页水印汉字映射

| 页面               | 水印汉字 | 寓意    |
| ---------------- | ---- | ----- |
| Home（首页）         | 阅    | 阅读·开启 |
| Shelf（书架）        | 藏    | 收藏·珍藏 |
| Category（分类）     | 寻    | 寻觅·探索 |
| Setting（设置）      | 韵    | 韵味·调韵 |
| NovelDetail（详情）  | 墨    | 笔墨·书墨 |
| Reader（阅读器）      | 静    | 静心·沉浸 |
| Login（登录）        | 归    | 归来·归属 |
| UserCenter（用户中心） | 己    | 自己·本心 |

### P1 高优先 — 补全缺失动画

#### Setting.jsx

* 入场动画：`motion.div` + `initial/animate` opacity+y

* 设置项 `whileHover={{ x: 4 }}` 滑动反馈

* 主题切换面板 `layoutId` 平滑过渡

#### BackButton.jsx

* `whileHover={{ x: -4 }}` 左移反馈

* `whileTap={{ scale: 0.95 }}` 点击收缩

* 箭头图标 `motion` 弹性绘制

#### FeedbackButton.jsx

* `livePulse` 脉冲呼吸

* `whileHover={{ scale: 1.1 }}` 放大

* `whileTap={{ scale: 0.9 }}` 收缩

#### UserCenter.jsx

* 统计卡片 `whileInView` 滚动揭示

* 列表项 `staggerChildren` 错峰入场

* 头像 `whileHover` 旋转+放大

#### BookSourcePage.jsx

* 骨架屏替换 Spin

* 书源卡片 `whileInView` + `whileHover`

* 列表项错峰入场

### P2 中优先 — 全站背景层 + 转场

#### 全站背景层

* 在 `App.jsx` 的 `GlassBackground` 组件中集成 `NovelBackground`

* 根据路由自动切换水印汉字

* 仅在 `glassMode` 开启时显示

#### 页面转场翻页效果

* 修改 `App.jsx` 的 `pageTransition`：

  * 进入：`rotateY: -15deg → 0` + `opacity: 0 → 1`

  * 退出：`rotateY: 0 → 15deg` + `opacity: 1 → 0`

  * `transformPerspective: 1000`

#### 骨架屏统一化

* 抽取 `src/components/Skeleton.jsx` 通用骨架组件

* 各页面 Spin 替换为 Skeleton

### P3 低优先 — 打磨

#### Reader.jsx 翻页动画

* 章节切换：横向滑动 + 透视翻页

* `AnimatePresence` + `mode="popLayout"`

#### SearchResult.jsx 列表增强

* 搜索结果项 `layoutId` 平滑过渡

* 高亮关键词 `gradFlow` 流光

#### Navbar.jsx 微交互

* 导航项悬停下划线 `pathLength` 绘制

* Logo `glowPulse` 呼吸光晕

### 性能策略

用户明确表示：**优先最佳动画效果，不特别限制性能**。

* 全部使用 framer-motion（GPU加速 transform/opacity）

* 背景层用 CSS 动画（`will-change: transform`）

* 粒子效果用 `transform3d` 触发 GPU 层

* 降级仅针对 `prefers-reduced-motion` 用户和低端设备检测

### 影响文件汇总

**新增文件：**

* `src/utils/numberToChinese.js`

* `src/hooks/useResponsive.js`

* `src/components/NovelDetailSkeleton.jsx`

* `src/components/NovelBackground.jsx`

* `src/components/CalligraphyWatermark.jsx`

* `src/components/Skeleton.jsx`

**修改文件：**

* `src/pages/NovelDetail.jsx`（任务1+2核心）

* `src/pages/Setting.jsx`（P1动画补全）

* `src/pages/UserCenter.jsx`（P1动画补全）

* `src/pages/BookSourcePage.jsx`（P1动画补全）

* `src/pages/Reader.jsx`（P3翻页）

* `src/pages/SearchResult.jsx`（P3增强）

* `src/pages/Home.jsx`（背景层集成）

* `src/pages/Category.jsx`（背景层集成）

* `src/pages/Shelf.jsx`（背景层集成）

* `src/pages/Login.jsx`（背景层集成）

* `src/components/BackButton.jsx`（P1动画）

* `src/components/FeedbackButton.jsx`（P1动画）

* `src/components/Navbar.jsx`（P3微交互）

* `src/App.jsx`（背景层集成+转场）

* `src/styles/animations.css`（新增 keyframes）

***

## 架构设计

### 组件层级

```
App.jsx
├── GlassBackground（现有）
│   └── NovelBackground（新增，水墨+书法）
│       ├── InkBlobs（墨团浮动）
│       └── CalligraphyWatermark（书法水印）
├── Navbar
├── Content
│   └── AnimatePresence
│       └── Routes（翻页转场）
│           ├── Home + NovelBackground char="阅"
│           ├── NovelDetail + NovelBackground(char="墨") + 3D封面
│           ├── Setting + 入场动画
│           └── ...
└── FeedbackButton（脉冲动画）
```

### 数据流

* `useResponsive()` hook 提供断点状态 → NovelDetail 章节数显示

* `numberToChinese()` 纯函数 → 数字转换

* 路由 location → NovelBackground 的 char prop（水印汉字映射）

* `prefers-reduced-motion` → 动画降级开关

### 错误处理

* `numberToChinese` 输入非数字时返回原值

* 3D跟踪鼠标在 touch 设备自动禁用

* 背景层组件独立错误边界，失败不影响页面渲染

***

## 实施顺序

1. **基础工具层**：`numberToChinese.js` + `useResponsive.js` + 新增 keyframes
2. **任务1**：NovelDetail 章节数+字数汉字化
3. **通用组件层**：`NovelBackground` + `CalligraphyWatermark` + `Skeleton`
4. **任务2**：NovelDetail 沉浸式动画（骨架屏→3D封面→错峰→背景→转场）
5. **P1 补全**：Setting + BackButton + FeedbackButton + UserCenter + BookSourcePage
6. **P2 全站**：App.jsx 背景层集成 + 翻页转场 + 骨架屏统一
7. **P3 打磨**：Reader 翻页 + SearchResult + Navbar 微交互

