# Tasks

- [ ] Task 1: 安装 React Bits 组件
  - [ ] SubTask 1.1: 执行 `npx jsrepo add react-bits/BlurText-JS-CSS` 安装 BlurText
  - [ ] SubTask 1.2: 执行 `npx jsrepo add react-bits/CountUp-JS-CSS` 安装 CountUp
  - [ ] SubTask 1.3: 执行 `npx jsrepo add react-bits/ShinyText-JS-CSS` 安装 ShinyText
  - [ ] SubTask 1.4: 执行 `npx jsrepo add react-bits/DecryptedText-JS-CSS` 安装 DecryptedText
  - [ ] SubTask 1.5: 创建 `src/components/react-bits/index.js` 统一导出文件
  - [ ] SubTask 1.6: 创建 ReactBitsErrorBoundary 组件，包装每个 React Bits 组件的导出

- [ ] Task 2: 重构 batchSearch.js — 并发优化与逐源流式推送
  - [ ] SubTask 2.1: 将 BATCH_SIZE 改为动态计算：`Math.min(Math.max(Math.ceil(sources.length / 3), 5), 10)`
  - [ ] SubTask 2.2: 重构 `execute()` 方法：使用 Promise.race + 补充模式，每个书源完成后立即 yield，而非等待整批
  - [ ] SubTask 2.3: 实现增量去重合并：每收到一个书源结果就执行 mergeBooks，而非等整批结束
  - [ ] SubTask 2.4: 优化 SOURCE_TIMEOUT_MS 为可配置参数，默认 8000ms
  - [ ] SubTask 2.5: 添加搜索结果缓存机制（内存缓存，相同关键词+书源 5 分钟内不重复请求）

- [ ] Task 3: 重构 SearchResult.jsx — 递增式显示 + React Bits 动效
  - [ ] SubTask 3.1: 修改 startBatchSearch 中的结果更新逻辑：从 `setResults(progress.books)` 整批替换改为增量追加 `setResults(prev => mergeIncremental(prev, newBooks))`
  - [ ] SubTask 3.2: 实现增量合并函数 `mergeIncremental`：对比已有结果，仅追加新书、合并重复项
  - [ ] SubTask 3.3: 集成 CountUp 组件：搜索结果计数从直接渲染数字改为 `<CountUp to={count} from={prevCount} duration={0.8} />`
  - [ ] SubTask 3.4: 集成 ShinyText 组件：聚合搜索标记使用 `<ShinyText text="聚合搜索" speed={3} />`
  - [ ] SubTask 3.5: 集成 DecryptedText 组件：空结果提示使用 `<DecryptedText text="换个关键词试试？" animateOn="hover" />`
  - [ ] SubTask 3.6: 优化搜索结果卡片入场动画：新追加的卡片使用 BlurText 风格的模糊淡入（filter: blur → clear + opacity: 0 → 1）
  - [ ] SubTask 3.7: 添加 ReactBitsErrorBoundary 包装所有 React Bits 组件使用处

- [ ] Task 4: 首页 Hero 品牌区域 + 榜单标题动效
  - [ ] SubTask 4.1: 在 Home.jsx 榜单区上方添加 Hero 区域，使用 BlurText 展示品牌 Slogan
  - [ ] SubTask 4.2: 榜单标题（如"热门排行"）使用 BlurText 逐词模糊入场

- [ ] Task 5: 书架空状态引导动效
  - [ ] SubTask 5.1: 在 Shelf.jsx 空书架提示区域，将静态文字替换为 DecryptedText hover 解密效果

- [ ] Task 6: 详情页书名与数据动效
  - [ ] SubTask 6.1: NovelDetail.jsx 书名使用 ShinyText 光泽扫过效果
  - [ ] SubTask 6.2: 小说字数/阅读量等数字使用 CountUp 滚动显示

- [ ] Task 7: 阅读进度数字动效
  - [ ] SubTask 7.1: Reader.jsx 阅读进度百分比使用 CountUp 滚动显示

- [ ] Task 8: Browser-act 自动化浏览器测试
  - [ ] SubTask 8.1: 使用 Browser-act skill 对搜索页面进行自动化测试
  - [ ] SubTask 8.2: 验证搜索功能：输入关键词 → 切换搜索模式 → 查看结果
  - [ ] SubTask 8.3: 验证递增式结果显示：观察结果是否逐步追加
  - [ ] SubTask 8.4: 验证 React Bits 动效：CountUp 数字滚动、ShinyText 光泽、DecryptedText 解密
  - [ ] SubTask 8.5: 记录发现的问题并修复

# Task Dependencies
- Task 1 是所有后续任务的前置依赖（需先安装组件）
- Task 2 和 Task 3 有强依赖：Task 3 的递增式显示依赖 Task 2 的逐源流式推送
- Task 4、5、6、7 互相独立，可并行执行，但都依赖 Task 1
- Task 8 依赖所有其他任务完成
