/* ============================================================
   ZfPageShell —— 全站唯一的页面容器
   解决：内容容器宽度 4 套并存（900/1400/800/无）、首页与书架在宽屏
   被拉满 1900px、三套栅格并存、断点 7 个魔数。

   size 与令牌的映射：
     xs   420  登录 / 重置密码
     sm   680  预留
     md   900  书源管理
     lg  1180  首页 / 分类 / 榜单 / 详情 / 书架
     xl  1420  搜索结果
     full     阅读器（改用 measure 约束行长，不套容器）
   ============================================================ */

import React from 'react';
import { useBreakpoint } from '../hooks/index.js';

const SIZE_CLASS = {
  xs: 'zf-container--xs',
  sm: 'zf-container--sm',
  md: 'zf-container--md',
  lg: 'zf-container--lg',
  xl: 'zf-container--xl',
  full: 'zf-container--full',
};

/**
 * @param {string} size 容器宽度档位
 * @param {boolean} bare 裸模式：不加内边距与宽度约束，供阅读器这类出血布局使用
 * @param {React.ReactNode} header 页头插槽（放在容器内、内容之上）
 */
export default function ZfPageShell({
  size = 'lg',
  bare = false,
  header,
  footer,
  children,
  gap = 'var(--zf-s8)',
  className = '',
  style,
  ...rest
}) {
  const { isMobile } = useBreakpoint();

  if (bare) {
    return (
      <div className={`zf-shell zf-shell--bare ${className}`} style={style} {...rest}>
        {header}
        {children}
        {footer}
      </div>
    );
  }

  return (
    <div
      className={`zf-shell ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 'var(--zf-s5)' : 'var(--zf-s8)',
        width: '100%',
        ...style,
      }}
      {...rest}
    >
      {header}
      {/* gap 放在内容容器上而非外层：否则页面必须自己再套一层 flex 才能撑开区块间距 */}
      <div
        className={`zf-container ${SIZE_CLASS[size] ?? SIZE_CLASS.lg}`}
        style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 'var(--zf-s5)' : gap }}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

/**
 * 响应式栅格：替代 antd Row/Col、App.css 的 .novel-grid-*、
 * 以及各页 <style>{} 内联块这三套并存写法。
 */
export function ZfGrid({
  min = 220,
  gap = 'var(--zf-s4)',
  columns = null,
  children,
  style,
  className = '',
}) {
  const template = columns
    ? `repeat(${columns}, minmax(0, 1fr))`
    : `repeat(auto-fill, minmax(${typeof min === 'number' ? `${min}px` : min}, 1fr))`;

  return (
    <div
      className={`zf-grid ${className}`}
      style={{ display: 'grid', gridTemplateColumns: template, gap, ...style }}
    >
      {children}
    </div>
  );
}
