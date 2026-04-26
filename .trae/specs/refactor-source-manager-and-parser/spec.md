# 书源管理页面重构与解析器完善 Spec

## Why
书源管理页面布局不够美观（顶部导航栏冗余、列表滚动溢出），且书源解析器对 HTML 网页类书源支持不完善，导致大量合法书源测活失败。用户无法区分是网站问题还是解析器问题，需要完善整条解析链路。

## What Changes
- 隐藏书源管理页面的顶部导航栏，改为页面内自包含的顶栏（返回、标题、数标、搜索、操作按钮）
- 重构书源列表滚动区域，限定高度并增加底部安全边距
- 完善 Legado 选择器解析器（`class.`/`tag.`/`id.` 链式选择器、`@textNodes`、`@html`、`@all`、`@content` 等）
- 完善 `@css:` 选择器（`:contains()` 伪类、多级选择器链、属性提取）
- 完善 `@XPath:` 选择器（基本 XPath 1.0 支持）
- 完善 JS 规则执行（`java.t2s`、`java.startBrowserAwait`、`java.ajax`、`java.getString` 等 shim）
- 完善 `@put/@get` 变量系统跨步骤传递
- 完善 `ruleExplore` 发现页规则解析
- 完善 `searchUrl` 中的 `<js>...</js>` 预处理
- 完善 `ruleContent` 中的 `nextContentUrl` 分页和 `replaceRegex` 正则替换
- **BREAKING**: 无破坏性变更，所有改动向后兼容

## Impact
- Affected specs: 书源管理页面 UI、书源解析引擎
- Affected code:
  - `src/pages/BookSourceManager.jsx` — 页面布局重构
  - `src/App.jsx` — 书源管理页面隐藏导航栏
  - `server/selectors.js` — Legado 选择器、CSS 选择器、XPath 选择器
  - `server/ruleEngine.js` — 规则引擎核心逻辑
  - `server/javaShim.js` — Java Shim 层（t2s、ajax、startBrowserAwait 等）

---

## ADDED Requirements

### Requirement: 书源管理页面布局重构

系统 SHALL 在书源管理页面隐藏顶部全局导航栏，改为页面内自包含的顶栏布局。

#### Scenario: 进入书源管理页面
- **WHEN** 用户导航到 `/book-source` 页面
- **THEN** 顶部全局 Navbar 不可见
- **AND** 页面顶部显示自包含顶栏，包含：返回按钮、标题"书源管理"、启用数标 Badge、搜索框、新建/导入/导出/重置按钮
- **AND** 所有按钮和标签关联当前主题色系

#### Scenario: 书源列表滚动
- **WHEN** 用户在书源列表中向下滚动
- **THEN** 列表区域高度限定为视口高度减去顶栏高度，不会导致整体页面滚动
- **AND** 列表最后一条书源下方留出足够的底部边距（至少 24px），确保不被截断

### Requirement: Legado 选择器完善

系统 SHALL 完整支持 Legado 格式的选择器语法，包括：

#### Scenario: 链式选择器解析
- **WHEN** 规则为 `class.intro@tag.span.0@text` 形式
- **THEN** 系统依次按 `class.intro` → `tag.span.0` → `@text` 三步解析，返回正确文本

#### Scenario: @textNodes 提取
- **WHEN** 规则包含 `@textNodes` 动作
- **THEN** 系统提取元素下所有直接文本节点（排除子元素文本），拼接返回

#### Scenario: @html 和 @all 提取
- **WHEN** 规则包含 `@html` 动作
- **THEN** 系统返回元素的内部 HTML 字符串
- **WHEN** 规则包含 `@all` 动作
- **THEN** 系统返回元素的外部 HTML 字符串（包含元素自身标签）

#### Scenario: @content 属性提取
- **WHEN** 规则包含 `@content` 动作（用于 meta 标签的 content 属性）
- **THEN** 系统正确提取 `content` 属性值

#### Scenario: 多级索引选择
- **WHEN** 规则为 `tag.li.-1` 或 `tag.div.2` 形式
- **THEN** 系统支持负索引（-1 表示最后一个）和正索引

### Requirement: @css: 选择器完善

系统 SHALL 完善 CSS 选择器支持。

#### Scenario: :contains() 伪类
- **WHEN** 规则为 `@css:p:contains(作者：)@text` 形式
- **THEN** 系统正确匹配包含指定文本的元素

#### Scenario: 多级 CSS 选择器链
- **WHEN** 规则为 `@css:div.col-md-9.book-detail > h2@text` 形式
- **THEN** 系统正确解析 CSS 选择器部分和后续动作

#### Scenario: CSS 属性选择器
- **WHEN** 规则为 `@css:a[title="BL"]@text` 形式
- **THEN** 系统正确匹配具有指定属性的元素

### Requirement: @XPath: 选择器支持

系统 SHALL 支持基本的 XPath 1.0 选择器。

#### Scenario: 基本 XPath 查询
- **WHEN** 规则为 `@XPath://meta[@property='og:novel:author']/@content` 形式
- **THEN** 系统使用 XPath 引擎解析 HTML，返回匹配节点的文本或属性值

#### Scenario: XPath 返回元素列表
- **WHEN** 规则为 `@XPath://div[@class='list']//a` 且用于 bookList
- **THEN** 系统返回匹配的元素列表，供后续规则逐项解析

### Requirement: Java Shim 层完善

系统 SHALL 完善后端 Java Shim 层，支持 Legado 书源中常用的 Java 方法。

#### Scenario: java.t2s 繁简转换
- **WHEN** JS 规则调用 `java.t2s(result)`
- **THEN** 系统将繁体中文文本转换为简体中文

#### Scenario: java.getString 从 HTML 提取
- **WHEN** JS 规则调用 `java.getString("class.book-update@text")`
- **THEN** 系统使用 Legado 选择器从当前 HTML 中提取文本

#### Scenario: java.ajax 同步请求
- **WHEN** JS 规则调用 `java.ajax(url)`
- **THEN** 系统发起 HTTP GET 请求并返回响应体

#### Scenario: java.startBrowserAwait 浏览器渲染
- **WHEN** JS 规则调用 `java.startBrowserAwait(url, title)`
- **THEN** 系统使用 Puppeteer 渲染页面（处理人机验证、JS 渲染内容），返回页面 HTML

#### Scenario: java.getElement 获取元素
- **WHEN** JS 规则调用 `java.getElement("@css:#bookDetailWrapper")`
- **THEN** 系统返回匹配的 Cheerio 元素对象，支持 `.attr()` 等方法调用

### Requirement: 发现页（ruleExplore）规则解析

系统 SHALL 支持 `ruleExplore` 发现页规则解析。

#### Scenario: 发现页 URL 解析
- **WHEN** 书源包含 `exploreUrl` 字段
- **THEN** 系统解析 `exploreUrl` 中的分类 URL 列表（支持纯文本格式和 JSON 数组格式）

#### Scenario: 发现页内容解析
- **WHEN** 调用发现页 API 并传入 `exploreUrl` 中的分类 URL
- **THEN** 系统使用 `ruleExplore` 规则解析返回的 HTML/JSON，提取书籍列表

### Requirement: searchUrl 中的 JS 预处理

系统 SHALL 支持 `searchUrl` 中的 `<js>...</js>` 预处理脚本。

#### Scenario: searchUrl 包含 JS 预处理
- **WHEN** `searchUrl` 格式为 `<js>...代码...</js>/search/{{key}}/1.html`
- **THEN** 系统先执行 JS 代码（如检测人机验证），再拼接后续 URL 模板发起搜索请求

### Requirement: 后端架构升级方案

系统 SHALL 提供后端架构升级的参考方案，供用户决策。

#### Scenario: 查看架构方案
- **WHEN** 用户需要了解 SpringBoot + MySQL + Redis 后端架构方案
- **THEN** 系统提供 3 套可选方案，包含技术栈、架构图、优劣势分析

---

## MODIFIED Requirements

### Requirement: 书源测活流程
原测活仅执行搜索，现增加多阶段测活：搜索 → 详情 → 目录 → 内容，逐步验证每条规则是否正确解析，并给出具体失败环节和原因。

### Requirement: 规则引擎错误处理
原规则引擎静默返回 null，现增加详细错误日志和错误分类（网络/超时/SSL/WAF/认证/解析），帮助用户区分网站问题和解析器问题。

---

## REMOVED Requirements

### Requirement: 无移除项
所有改动向后兼容，不移除任何现有功能。
