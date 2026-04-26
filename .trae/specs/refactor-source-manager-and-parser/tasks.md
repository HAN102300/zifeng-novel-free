# Tasks

## 阶段一：书源管理页面布局重构

- [x] Task 1: 隐藏书源管理页面的顶部导航栏
  - [x] SubTask 1.1: 修改 App.jsx，在 `/book-source` 路由页面也隐藏 Navbar
  - [x] SubTask 1.2: 修改 BookSourceManager.jsx，关联主题色系

- [x] Task 2: 重构书源列表滚动区域
  - [x] SubTask 2.1: 限定列表区域高度
  - [x] SubTask 2.2: 为列表最后一条书源增加底部边距（padding-bottom: 24px）
  - [x] SubTask 2.3: 确保批量操作栏（sticky）在列表滚动时仍然可见

## 阶段二：Legado 选择器完善

- [x] Task 3: 完善 Legado 选择器 `@textNodes` 支持
  - [x] SubTask 3.1: 在 selectors.js 中实现 `@textNodes` 动作

- [x] Task 4: 完善 Legado 选择器 `@html` 和 `@all` 支持
  - [x] SubTask 4.1: 实现 `@html` 动作
  - [x] SubTask 4.2: 实现 `@all` 动作

- [x] Task 5: 完善 Legado 选择器 `@content` 和其他属性提取
  - [x] SubTask 5.1: 确保 `@content` 正确提取 meta 标签 content 属性
  - [x] SubTask 5.2: 支持 `@src`、`@href`、`@data-src`、`@alt`、`@title` 等常见属性提取

- [x] Task 6: 完善 Legado 选择器多级索引和负索引
  - [x] SubTask 6.1: 确保 `tag.li.-1` 负索引正确工作
  - [x] SubTask 6.2: 确保 `class.xxx.0` 正索引正确工作
  - [x] SubTask 6.3: 修复 `!` 排除索引的边界情况

## 阶段三：CSS 和 XPath 选择器完善

- [x] Task 7: 完善 `@css:` 选择器
  - [x] SubTask 7.1: 支持 `:contains()` 伪类选择器
  - [x] SubTask 7.2: 支持属性选择器 `[attr=value]`
  - [x] SubTask 7.3: 支持复合选择器
  - [x] SubTask 7.4: 支持 `:last-child`、`:nth-child()`、`:has()` 伪类

- [x] Task 8: 实现 `@XPath:` 选择器
  - [x] SubTask 8.1: 引入 xpath + xmldom 库
  - [x] SubTask 8.2: 实现基本 XPath 1.0 查询
  - [x] SubTask 8.3: 支持 XPath 返回元素列表
  - [x] SubTask 8.4: 在 resolveSingleRule 中集成 @XPath: 分支

## 阶段四：Java Shim 层完善

- [x] Task 9: 实现 `java.t2s` 繁简转换
  - [x] SubTask 9.1: 引入 opencc-js 库
  - [x] SubTask 9.2: 在 javaShim.js 中实现 `t2s(str)` 方法

- [x] Task 10: 实现 `java.getString` 和 `java.getElement`
  - [x] SubTask 10.1: 实现 `getString(rule)`
  - [x] SubTask 10.2: 实现 `getElement(rule)`

- [x] Task 11: 完善 `java.ajax` 同步请求
  - [x] SubTask 11.1: 确保 `ajax(url)` 正确使用 source 的 header 配置
  - [x] SubTask 11.2: 支持 POST 方法和自定义请求体

- [x] Task 12: 完善 `java.startBrowserAwait` Puppeteer 集成
  - [x] SubTask 12.1: 确保 Puppeteer 懒加载启动
  - [x] SubTask 12.2: 支持等待特定元素出现后返回
  - [x] SubTask 12.3: 支持提取 Cookie 供后续请求使用

## 阶段五：规则引擎增强

- [x] Task 13: 支持 `ruleExplore` 发现页规则
  - [x] SubTask 13.1: 在后端增加 `/api/explore` 端点
  - [x] SubTask 13.2: 实现 `parseExplore` 函数，复用 parseSearchResults 的逻辑
  - [x] SubTask 13.3: 解析 `exploreUrl` 字段（纯文本格式和 JSON 数组格式）
  - [x] SubTask 13.4: 前端增加发现页入口和 UI

- [x] Task 14: 支持 `searchUrl` 中的 JS 预处理
  - [x] SubTask 14.1: 在 `/api/search` 端点中，检测 `searchUrl` 是否包含 `<js>...</js>` 前缀
  - [x] SubTask 14.2: 如果包含，先执行 JS 代码，再拼接后续 URL 模板

- [x] Task 15: 完善测活流程的多阶段验证
  - [x] SubTask 15.1: 搜索阶段：验证搜索规则能否返回结果
  - [x] SubTask 15.2: 详情阶段：验证 bookInfo 规则能否提取书名、作者等
  - [x] SubTask 15.3: 目录阶段：验证 toc 规则能否返回章节列表
  - [x] SubTask 15.4: 内容阶段：验证 content 规则能否提取正文
  - [x] SubTask 15.5: 返回每阶段的具体结果和失败原因

- [x] Task 16: 完善错误分类和日志
  - [x] SubTask 16.1: 区分网络错误/超时/SSL/WAF/认证/解析错误
  - [x] SubTask 16.2: 解析错误时输出具体是哪条规则失败、期望值和实际值

## 阶段六：后端架构升级方案

- [x] Task 17: 提供 3 套后端架构升级参考方案
  - [x] SubTask 17.1: 方案 A — 轻量级
  - [x] SubTask 17.2: 方案 B — 中等规模
  - [x] SubTask 17.3: 方案 C — 完整平台

# Task Dependencies
- [Task 2] depends on [Task 1]
- [Task 7] depends on [Task 3, 4, 5, 6]
- [Task 8] depends on [Task 7]
- [Task 10] depends on [Task 3, 7]
- [Task 13] depends on [Task 3-8]
- [Task 14] depends on [Task 12]
- [Task 15] depends on [Task 3-14]
- [Task 17] 无依赖，可并行
