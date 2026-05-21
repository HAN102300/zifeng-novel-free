# 搜索结果为空与进度显示修复 Spec

## Why
大量书源搜索返回空结果（`{"success":true,"results":[],"total":0}`）或解析错误（`{"success":false,"message":"解析错误","errorType":"parse"}`），且搜索结果页面在聚合搜索模式下始终显示"正在搜索中【第X/Y批】"而不逐步加载已找到的结果，导致用户体验极差。经审查发现前端批量搜索逻辑存在多个缺陷：成功但无结果的书源被错误归类为失败、错误信息丢失、进度展示不友好、空结果时无中间状态反馈。

## What Changes
- 修复 `batchSearch.js` 中 `_accumulateResult` 方法：成功返回0结果的书源应计为 `succeededSources` 而非 `failedSources`
- 修复 `batchSearch.js` 中 `searchSingleSource` 方法：保留解析器返回的实际错误信息而非统一替换为 "parse failed"
- 修复 `batchSearch.js` 中 `execute` 方法：为 `Promise.allSettled` 的 rejected 条目补充 sourceDetail 记录
- 修改 `SearchResult.jsx` 加载状态展示：在聚合搜索无结果时显示书源搜索进度详情（已搜索/成功/失败数）
- 修改 `SearchResult.jsx` 进度文案：将"第X/Y批"改为"已搜索 X/Y 个书源"
- 修改 `SearchResult.jsx` 空结果中间态：在聚合搜索进行中但暂无结果时，显示已搜索书源的状态标签

## Impact
- Affected specs: 搜索功能、聚合搜索、批量搜索控制器
- Affected code:
  - `zifeng-web/src/utils/batchSearch.js` — 核心批量搜索逻辑
  - `zifeng-web/src/pages/SearchResult.jsx` — 搜索结果页面展示

---

## ADDED Requirements

### Requirement: 批量搜索书源成功/失败分类修正
系统 SHALL 在批量搜索中正确区分"书源请求成功但无结果"与"书源请求失败"两种情况。当书源返回 `{success: true, results: []}` 时，应将该书源计为成功（succeededSources），仅当书源返回 `{success: false}` 或请求异常时才计为失败（failedSources）。

#### Scenario: 书源成功返回空结果
- **WHEN** 某书源搜索请求成功返回 `{success: true, results: []}`
- **THEN** 该书源应被计入 `succeededSources`
- **AND** `failedSources` 不应增加
- **AND** sourceDetail 中 `success` 字段为 `true`，`resultCount` 为 `0`

#### Scenario: 书源请求失败
- **WHEN** 某书源搜索请求返回 `{success: false, message: "解析错误", errorType: "parse"}`
- **THEN** 该书源应被计入 `failedSources`
- **AND** sourceDetail 中 `success` 字段为 `false`，`error` 字段包含实际错误信息

### Requirement: 搜索错误信息透传
系统 SHALL 在批量搜索中将解析器返回的实际错误信息透传到 sourceDetail 中，而非用通用文本替换。

#### Scenario: 解析器返回错误信息
- **WHEN** 解析器返回 `{success: false, message: "解析错误", errorType: "parse"}`
- **THEN** `searchSingleSource` 返回的 `error` 字段应包含原始错误信息（如 "解析错误"）
- **AND** 不应统一替换为 "parse failed"

#### Scenario: 网络超时
- **WHEN** 书源请求因超时被中止
- **THEN** `searchSingleSource` 返回的 `error` 字段应为 "timeout"
- **AND** sourceDetail 中记录超时信息

### Requirement: Promise.allSettled rejected 条目补充 sourceDetail
系统 SHALL 在批量搜索的 `execute` 方法中，为 `Promise.allSettled` 返回的 rejected 条目也生成 sourceDetail 记录。

#### Scenario: 单个书源 Promise 被 reject
- **WHEN** 批量搜索中某个书源的 Promise 状态为 rejected
- **THEN** 应为该书源生成一条 sourceDetail 记录
- **AND** 该记录的 `success` 为 `false`，`error` 包含 rejection 原因
- **AND** `allSourceDetails` 数组长度应等于已处理的书源总数

### Requirement: 聚合搜索进度展示优化
系统 SHALL 在搜索结果页面的加载状态中展示更有意义的进度信息。

#### Scenario: 聚合搜索进行中且暂无结果
- **WHEN** 聚合搜索正在进行，但尚未找到任何结果
- **THEN** 页面应显示"正在搜索书源... 已搜索 X/Y 个书源（Z 个成功，W 个失败）"
- **AND** 应显示已搜索书源的状态标签（成功/失败/无结果）
- **AND** 不应仅显示旋转加载图标而无进度信息

#### Scenario: 聚合搜索进行中且已有部分结果
- **WHEN** 聚合搜索正在进行，且已找到部分结果
- **THEN** 结果列表应立即展示已找到的结果
- **AND** 底部应显示"正在搜索更多书源... 已搜索 X/Y 个书源"
- **AND** 已有结果不应被加载状态遮挡

#### Scenario: 聚合搜索完成但无结果
- **WHEN** 聚合搜索全部完成，但所有书源均未返回结果
- **THEN** 应显示空结果页面
- **AND** 应展示各书源的搜索状态（哪些成功无结果、哪些失败及原因）
- **AND** 用户可据此判断是关键词问题还是书源问题

### Requirement: 进度文案使用书源维度而非批次维度
系统 SHALL 在搜索进度展示中使用书源数量而非批次数量。

#### Scenario: 进度文案展示
- **WHEN** 聚合搜索正在进行
- **THEN** 进度文案应显示"已搜索 X/Y 个书源"
- **AND** 不应显示"第 X/Y 批"

## MODIFIED Requirements

### Requirement: 搜索结果页面加载状态
原需求：搜索时显示旋转加载图标和进度条。
修改为：搜索时根据搜索模式显示不同的进度信息——聚合搜索显示书源级别的搜索进度和已搜索书源状态标签；单书源搜索显示简单的加载指示器。当聚合搜索暂无结果时，仍应显示已搜索书源的详细状态而非仅显示旋转图标。

## REMOVED Requirements

无移除需求。
