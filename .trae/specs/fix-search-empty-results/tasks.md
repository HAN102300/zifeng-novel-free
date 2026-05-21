# Tasks

- [x] Task 1: 修复 `_accumulateResult` 书源成功/失败分类逻辑
  - [x] SubTask 1.1: 修改 `_accumulateResult` 方法，使用 `result.success` 判断成功/失败，而非 `result.books.length > 0`
  - [x] SubTask 1.2: 成功但无结果的书源计入 `succeededSources`，仅失败书源计入 `failedSources`
  - [x] SubTask 1.3: sourceDetail 中 `success` 字段与 `result.success` 保持一致

- [x] Task 2: 修复 `searchSingleSource` 错误信息透传
  - [x] SubTask 2.1: 当解析器返回 `{success: false, message: "..."}` 时，将 `message` 透传到 `error` 字段
  - [x] SubTask 2.2: 当解析器返回 `{success: true, results: [...]}` 时，`error` 为 `null`
  - [x] SubTask 2.3: 网络超时时 `error` 为 "timeout"，其他异常时 `error` 为 `err.message`

- [x] Task 3: 修复 `execute` 方法中 rejected 条目缺失 sourceDetail
  - [x] SubTask 3.1: 在 `Promise.allSettled` 的 rejected 分支中，根据对应 batch 中的 source 信息生成 sourceDetail
  - [x] SubTask 3.2: 确保需要追踪当前 batch 中每个 promise 对应的 source 引用

- [x] Task 4: 优化 `SearchResult.jsx` 聚合搜索加载状态展示
  - [x] SubTask 4.1: 当 `loading && results.length === 0 && batchProgress` 时，显示书源搜索进度详情而非仅旋转图标
  - [x] SubTask 4.2: 进度文案从"第 X/Y 批"改为"已搜索 X/Y 个书源（Z 个成功，W 个失败）"
  - [x] SubTask 4.3: 在加载状态下也展示已搜索书源的状态标签（绿色=有结果、橙色=成功无结果、红色=失败）
  - [x] SubTask 4.4: 聚合搜索完成但无结果时，在空结果页面展示书源搜索状态摘要

- [x] Task 5: 验证修复效果
  - [x] SubTask 5.1: 启动开发服务器，执行聚合搜索，验证进度展示正确
  - [x] SubTask 5.2: 验证成功无结果的书源被正确归类为 succeededSources
  - [x] SubTask 5.3: 验证失败书源的错误信息被正确透传
  - [x] SubTask 5.4: 验证搜索完成后空结果页面显示书源状态摘要

# Task Dependencies
- Task 4 依赖 Task 1、Task 2、Task 3（前端展示依赖后端数据正确性）
- Task 5 依赖 Task 1、Task 2、Task 3、Task 4（验证依赖所有修复完成）
- Task 1、Task 2、Task 3 可并行执行
