/* ============================================================
   ZfAmbient —— 背景氛围光球层
   下沉动机：此前 Home / SearchResult / NovelDetail 各写一份光球定位与
   渐变，且它们被塞在带 backdrop-filter 的玻璃卡「内部」—— 违反合成器
   铁律 ②（infinite 动画必须是玻璃卡的兄弟层，否则每帧重采样 backdrop）。

   本组件渲染为**独立的 fixed 兄弟层**，数量与模糊半径由 tier 决定
   （见 css/utilities.css 的 .zf-ambient__orb:nth-child 规则与 --zf-fx-orbs）。
   ============================================================ */

import React from 'react';

/** 五颗光球的落点与色相偏移；多出的几颗在低 tier 由 CSS 裁掉 */
const ORBS = [
  { size: 420, top: '-8%', left: '-6%', tint: 'var(--zf-brand-rgb-500)', alpha: 0.30, anim: 'zf-anim-drift' },
  { size: 360, top: '12%', right: '-8%', tint: 'var(--zf-brand-rgb-400)', alpha: 0.22, anim: 'zf-anim-drift-b' },
  { size: 300, bottom: '-6%', left: '18%', tint: 'var(--zf-brand-rgb-600)', alpha: 0.20, anim: 'zf-anim-drift-c' },
  { size: 260, top: '42%', left: '52%', tint: 'var(--zf-brand-rgb-400)', alpha: 0.14, anim: 'zf-anim-drift' },
  { size: 220, bottom: '18%', right: '12%', tint: 'var(--zf-brand-rgb-500)', alpha: 0.12, anim: 'zf-anim-drift-b' },
];

/**
 * @param {boolean} fixed 固定视口（默认）还是随文档滚动（页面内绝对定位）
 */
export default function ZfAmbient({ fixed = true, count = ORBS.length, className = '', style }) {
  return (
    <div
      aria-hidden="true"
      className={`zf-ambient ${className}`}
      style={{
        position: fixed ? 'fixed' : 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 'var(--zf-z-base)',
        ...style,
      }}
    >
      {ORBS.slice(0, count).map((orb, i) => (
        <span
          key={i}
          className={`zf-ambient__orb ${orb.anim}`}
          style={{
            width: orb.size,
            height: orb.size,
            top: orb.top,
            left: orb.left,
            right: orb.right,
            bottom: orb.bottom,
            background: `radial-gradient(circle at center, rgb(${orb.tint} / ${orb.alpha}), transparent 68%)`,
          }}
        />
      ))}
    </div>
  );
}
