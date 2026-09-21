import React from 'react'
import ReactDOM from 'react-dom/client'
// 顺序即层叠顺序：antd 基础重置 → 项目重置 → 令牌 → 工具类 → 关键帧 → 页面样式
import 'antd/dist/reset.css'
import '@zifeng/ui/css/reset.css'
import '@zifeng/ui/css/tokens.css'
import '@zifeng/ui/css/utilities.css'
import '@zifeng/ui/css/keyframes.css'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)