/* ============================================================
   紫枫免费小说 · 错误边界与懒加载包装组件
   ============================================================ */

import React, { Suspense } from 'react';
import { Spin } from 'antd';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    // 生产环境静默记录，不输出到 console
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>页面加载出错</h2>
          <p style={{ color: '#999' }}>{this.state.error?.message || '未知错误'}</p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--zf-primary-500)', color: '#fff', cursor: 'pointer', fontSize: 16
            }}
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const LazyLoad = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    }>
      {children}
    </Suspense>
  </ErrorBoundary>
);
