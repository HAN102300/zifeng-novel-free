# 搜索页面重构 + React Bits 动效优化 Spec

## Why

当前搜索结果页面存在核心体验问题：批量搜索性能受限（BATCH_SIZE=5 串行批次）、搜索结果无法递增式展示（整批替换而非逐条追加）、页面缺乏动效吸引力。同时项目优化文档存在多处遗漏：React Bits 组件实际未安装、缺少搜索性能优化方案、缺少移动端适配考虑、缺少错误边界降级策略。需要系统性重构搜索页面并补全优化方案。

## What Changes

- 安装 6 个 React Bits 组件（BlurText、CountUp、ShinyText、DecryptedText、TrueFocus、Magnet）到 `src/components/react-bits/` 目录
- 创建 React Bits 组件统一导出文件和 ErrorBoundary 包装
- 重构 `batchSearch.js`：增大并发数、实现逐源结果流式推送（每完成一个书源立即 yield）、优化去重合并策略
- 重构 `SearchResult.jsx`：实现递增式结果显示（新结果逐条追加而非整批替换）、集成 React Bits 动效组件
- 搜索结果计数使用 `CountUp` 滚动动画
- 聚合搜索标记使用 `ShinyText` 光泽效果
- 空结果状态使用 `DecryptedText` 增加趣味
- 搜索结果卡片入场使用 `BlurText` 风格的逐项模糊淡入
- 对其他高优先级页面（Home、Shelf、NovelDetail、Reader）集成 React Bits 组件
- 使用 Browser-act 进行自动化浏览器测试

## Impact

- Affected specs: 搜索功能、聚合搜索、批量搜索控制器、页面动效
- Affected code:
  - `zifeng-web/src/utils/batchSearch.js` — 核心批量搜索逻辑重构
  - `zifeng-web/src/pages/SearchResult.jsx` — 搜索结果页面全面重构
  - `zifeng-web/src/components/react-bits/` — 新增 React Bits 组件目录
  - `zifeng-web/src/pages/Home.jsx` — Hero 区域 + 榜单标题动效
  - `zifeng-web/src/pages/Shelf.jsx` — 空状态引导动效
  - `zifeng-web/src/pages/NovelDetail.jsx` — 书名/数据动效
  - `zifeng-web/src/pages/Reader.jsx` — 阅读进度动效

---

## ADDED Requirements

### Requirement: React Bits 组件安装与集成

系统 SHALL 安装 6 个 React Bits 组件（BlurText、CountUp、ShinyText、DecryptedText、TrueFocus、Magnet）到 `src/components/react-bits/` 目录，并提供统一导出文件。每个组件 SHALL 使用 JS-CSS 变体以兼容项目现有技术栈。

#### Scenario: 组件安装成功
- **WHEN** 执行 `npx jsrepo add` 安装 React Bits 组件
- **THEN** 组件文件应存在于 `src/components/react-bits/` 目录下
- **AND** 可通过 `import { BlurText } from '../components/react-bits'` 方式导入

#### Scenario: 组件加载失败降级
- **WHEN** React Bits 组件因错误无法渲染
- **THEN** ErrorBoundary 应捕获错误并降级渲染原始文本内容
- **AND** 页面其他功能不受影响

### Requirement: 批量搜索并发优化

系统 SHALL 优化批量搜索的并发策略，将 BATCH_SIZE 从 5 提升至动态计算值（基于书源总数），并实现逐源结果流式推送。

#### Scenario: 少量书源搜索
- **WHEN** 启用书源数量 ≤ 10
- **THEN** 所有书源应并发发起搜索请求
- **AND** 每个书源完成后立即推送结果

#### Scenario: 大量书源搜索
- **WHEN** 启用书源数量 > 10
- **THEN** 使用动态批次大小（Math.min(书源数, 10)）并发搜索
- **AND** 每个书源完成后立即推送结果，无需等待整批完成

#### Scenario: 逐源结果推送
- **WHEN** 某个书源搜索完成（无论成功或失败）
- **THEN** 应立即 yield 该书源的搜索结果
- **AND** 前端应立即展示新增的搜索结果
- **AND** 不应等待整批所有书源完成后才更新 UI

### Requirement: 搜索结果递增式显示

系统 SHALL 在搜索结果页面实现递增式结果显示，新搜索到的书籍逐条追加到结果列表中，而非整批替换。

#### Scenario: 聚合搜索递增显示
- **WHEN** 聚合搜索正在进行且某个书源返回了新结果
- **THEN** 新结果应逐条追加到现有结果列表末尾
- **AND** 新追加的结果应有入场动画（模糊淡入）
- **AND** 已展示的结果不应重新渲染或闪烁
- **AND** 结果计数应使用 CountUp 动态滚动更新

#### Scenario: 去重合并时结果更新
- **WHEN** 新书源返回的结果与已有结果重复
- **THEN** 应合并重复结果的信息（补充封面、简介等缺失字段）
- **AND** 合并后的结果卡片应有微妙的更新提示（如 sourceTag 更新）
- **AND** 不应导致整个列表重新渲染

### Requirement: 搜索页面 React Bits 动效集成

系统 SHALL 在搜索结果页面集成以下 React Bits 组件动效：

1. 搜索结果计数使用 `CountUp` 滚动动画
2. "聚合搜索"标记使用 `ShinyText` 光泽效果
3. 空结果提示使用 `DecryptedText` hover 解密效果
4. 搜索结果卡片入场使用 framer-motion 逐项模糊淡入（灵感来自 BlurText）

#### Scenario: 搜索结果计数动画
- **WHEN** 聚合搜索结果数量更新
- **THEN** 数字应使用 CountUp 从上一个值滚动到新值
- **AND** 动画时长应与数字变化幅度成比例

#### Scenario: 聚合搜索标记光泽
- **WHEN** 搜索模式为聚合搜索
- **THEN** "聚合搜索"文字应使用 ShinyText 组件展示
- **AND** 光泽效果应与主题色协调

#### Scenario: 空结果趣味提示
- **WHEN** 搜索完成但无结果
- **THEN** 空状态提示文字应使用 DecryptedText 展示
- **AND** hover 时文字应出现解密效果

### Requirement: 首页 Hero 品牌区域

系统 SHALL 在首页榜单区上方添加 Hero 区域，使用 BlurText 展示品牌 Slogan。

#### Scenario: 首屏品牌传达
- **WHEN** 用户访问首页
- **THEN** 应在榜单区上方看到品牌 Slogan（如"紫枫免费小说"）
- **AND** Slogan 应使用 BlurText 逐词模糊淡入动画
- **AND** 副标题也应使用 BlurText 延迟入场

### Requirement: 书架空状态引导动效

系统 SHALL 在书架为空时使用 DecryptedText 展示引导文字。

#### Scenario: 空书架趣味引导
- **WHEN** 用户书架为空
- **THEN** 引导文字应使用 DecryptedText 展示
- **AND** hover 时文字应出现解密效果
- **AND** 引导文字应鼓励用户去书城添加书籍

### Requirement: 详情页书名与数据动效

系统 SHALL 在小说详情页为书名和数据展示添加动效。

#### Scenario: 书名光泽效果
- **WHEN** 用户进入小说详情页
- **THEN** 书名应使用 ShinyText 光泽扫过效果
- **AND** 光泽效果应与主题色协调

#### Scenario: 数据滚动动画
- **WHEN** 小说字数/阅读量等数据加载完成
- **THEN** 数字应使用 CountUp 从 0 滚动到目标值
- **AND** 动画应在数据进入视口时触发

### Requirement: 阅读进度数字动效

系统 SHALL 在阅读器中使用 CountUp 展示阅读进度百分比。

#### Scenario: 翻页后进度更新
- **WHEN** 用户翻页导致阅读进度变化
- **THEN** 进度百分比应使用 CountUp 从旧值滚动到新值
- **AND** 动画应平滑自然

### Requirement: Browser-act 自动化测试

系统 SHALL 在所有改动完成后使用 Browser-act 进行自动化浏览器测试，验证页面功能和交互正常。

#### Scenario: 自动化测试覆盖
- **WHEN** 所有代码改动完成
- **THEN** 应使用 Browser-act 对搜索页面进行自动化点击测试
- **AND** 应验证搜索功能、结果展示、动效交互等核心流程
- **AND** 发现的问题应记录并修复

## MODIFIED Requirements

### Requirement: 批量搜索控制器
原需求：使用固定 BATCH_SIZE=5 的串行批次搜索，每批完成后 yield 一次。
修改为：使用动态并发数（基于书源总数自适应），每个书源完成后立即 yield，实现真正的流式结果推送。去重合并策略从"每批结束后合并"改为"每源完成后增量合并"。

### Requirement: 搜索结果页面展示
原需求：搜索结果整批替换展示，使用 framer-motion 入场动画。
修改为：搜索结果递增式追加展示，新结果逐条入场，使用 BlurText 风格的模糊淡入动画。集成 React Bits 组件（CountUp、ShinyText、DecryptedText）增强视觉体验。

## REMOVED Requirements

### Requirement: TrueFocus 用于小说详情页书名
**Reason**: TrueFocus 焦点框轮播在书名场景下可能分散用户注意力，且书名通常较短，焦点框轮播效果不明显。改用 ShinyText 光泽效果更为克制优雅。
**Migration**: NovelDetail 书名改用 ShinyText 组件。

### Requirement: Magnet 用于设置卡片和反馈按钮
**Reason**: Magnet 鼠标磁吸效果在移动端无意义（无鼠标），且可能干扰正常滚动操作。当前阶段暂不集成 Magnet 组件，优先保证核心搜索体验。
**Migration**: 设置卡片和反馈按钮保持现有交互方式，后续版本可考虑条件性启用 Magnet（仅桌面端）。
