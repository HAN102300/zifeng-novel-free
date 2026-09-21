/* ============================================================
   ZfErrorBoundary + ZfErrorState
   现状：后台完全没有错误边界；用户端有 ErrorBoundary，但 react-bits
   每个调用点都要手工套一层（NovelDetail.jsx 4 处、SearchResult.jsx
   一次 3 层嵌套）。这里提供统一实现，并让 ZfPageShell 可内置一层。
   ============================================================ */

import React from 'react';
import { Button } from 'antd';
import ZfEmptyState from './ZfEmptyState.jsx';

export default class ZfErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.props.onError?.(error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <ZfErrorState
        error={error}
        onRetry={this.reset}
        title={this.props.title}
        description={this.props.description}
      />
    );
  }
}

/** 可独立使用的错误态（网络失败、解析超时等） */
export function ZfErrorState({
  title = '出错了',
  description,
  error,
  onRetry,
  action,
  style,
}) {
  return (
    <ZfEmptyState
      icon="!"
      title={title}
      description={description ?? error?.message ?? '请重试，若持续失败请检查网络或书源状态。'}
      action={
        onRetry || action
          ? action ?? (
              /* 必须带 ant-btn：双 class 提权靠的是 .ant-btn.zf-btn（0,2,0）
                 才能压过 antd 的 hash 类，裸 button 上写 zf-btn 不生效。 */
              <Button className="zf-btn zf-btn--glass" onClick={onRetry}>
                重试
              </Button>
            )
          : null
      }
      style={style}
    />
  );
}
