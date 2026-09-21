/* zh_CN locale 再导出 —— 两端统一从这里取，避免各自 import 路径漂移。
   此前两端 ConfigProvider 都没设 locale，导致后台分页器显示英文「20 / page」。

   ★ 必须显式解包，不能写 `export { default as zhCN } from 'antd/locale/zh_CN'`。
   antd 的 locale 经 Vite 预打包后是 CJS 互操作形态，那条写法透传出来的是
   模块命名空间 `{ default: { locale, Pagination, ... } }`，ConfigProvider
   拿到后找不到 locale 字段，会静默回退英文（实测就是这样）。 */

import zhCNModule from 'antd/locale/zh_CN';

export const zhCN = zhCNModule?.default ?? zhCNModule;
