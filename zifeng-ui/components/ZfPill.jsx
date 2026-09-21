/* ============================================================
   ZfPill —— 统一胶囊/标签
   解决：全站 5-6 种胶囊写法并存，且同一屏出现两种「全部」
   （筛选栏紫 vs 卡内蓝）；六大榜单用六套随机强调色。
   用途锁定：tone=brand 是唯一装饰色；status 只出现在状态语义位；
   rank 只出现在排名。
   ============================================================ */

import React from 'react';

const TONE = {
  brand: {
    bg: 'var(--zf-tint-brand-16)',
    color: 'var(--zf-on-tint)',
    border: '1px solid rgb(var(--zf-brand-rgb-500) / 0.32)',
  },
  neutral: {
    bg: 'var(--zf-glass-1)',
    color: 'var(--zf-text-secondary)',
    border: '1px solid var(--zf-glass-border)',
  },
  solid: {
    bg: 'var(--zf-grad-brand)',
    color: 'var(--zf-on-accent)',
    border: '1px solid transparent',
  },
  success: { bg: 'rgb(16 185 129 / .14)', color: 'var(--zf-status-success)', border: '1px solid rgb(16 185 129 / .32)' },
  warning: { bg: 'rgb(245 158 11 / .14)', color: 'var(--zf-status-warning)', border: '1px solid rgb(245 158 11 / .32)' },
  error: { bg: 'rgb(244 63 94 / .14)', color: 'var(--zf-status-error)', border: '1px solid rgb(244 63 94 / .32)' },
  info: { bg: 'rgb(6 182 212 / .14)', color: 'var(--zf-status-info)', border: '1px solid rgb(6 182 212 / .32)' },
};

const SIZE = {
  xs: { fontSize: 'var(--zf-fs-2xs)', padding: '1px 6px', gap: 2 },
  sm: { fontSize: 'var(--zf-fs-xs)', padding: '2px 8px', gap: 3 },
  md: { fontSize: 'var(--zf-fs-sm)', padding: '4px 10px', gap: 4 },
};

/** rank 变体：金银铜 → 中性，替代现状「1=橙 2=灰 3=深 4=紫 5=紫」的无逻辑配色 */
const RANK_GRADIENT = {
  1: 'linear-gradient(135deg, var(--zf-rank-gold-a), var(--zf-rank-gold-b))',
  2: 'linear-gradient(135deg, var(--zf-rank-silver-a), var(--zf-rank-silver-b))',
  3: 'linear-gradient(135deg, var(--zf-rank-bronze-a), var(--zf-rank-bronze-b))',
};

/**
 * @param {'span'|'button'|'a'} as 渲染标签。需要可点时用 button/a ——
 *   此前只有 span，调用方要自己补 role/tabIndex/onKeyDown 才有交互语义。
 */
export default function ZfPill({
  tone = 'neutral',
  size = 'sm',
  icon,
  rank,
  as = 'span',
  onClick,
  children,
  style,
  className = '',
  ...rest
}) {
  const isRank = Number.isFinite(rank) && rank > 0;
  const t = TONE[tone] ?? TONE.neutral;
  const s = SIZE[size] ?? SIZE.sm;

  const interactive = typeof onClick === 'function' || as !== 'span';
  const Comp = interactive ? as : 'span';

  return (
    <Comp
      type={Comp === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={`zf-pill ${interactive ? 'zf-pill--clickable' : ''} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: s.gap,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        lineHeight: 1.4,
        borderRadius: 'var(--zf-r-full)',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
        background: isRank ? (RANK_GRADIENT[rank] ?? RANK_GRADIENT[2]) : t.bg,
        color: isRank ? 'var(--zf-on-accent)' : t.color,
        border: isRank ? '1px solid transparent' : t.border,
        ...style,
      }}
      {...rest}
    >
      {icon ? <span aria-hidden="true" style={{ display: 'inline-flex' }}>{icon}</span> : null}
      {children}
    </Comp>
  );
}
