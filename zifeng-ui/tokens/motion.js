/* ============================================================
   动效令牌
   现状：缓动曲线 [0.16,1,0.3,1] 以字面量散在 14 处，而 --zf-ease-out
   与之等价却不被 JS 侧引用。此处 CSS 与 JS 同源导出。
   ============================================================ */

/** cubic-bezier 控制点，JS 侧 framer-motion 直接用作 ease 数组 */
export const easingCurves = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
  spring: [0.34, 1.56, 0.64, 1],
  /** 水墨扩散：起步慢、中段加速、尾段收得住 */
  ink: [0.22, 0.68, 0.24, 1],
  /** 磁吸/视差：跟随感强 */
  glide: [0.2, 0.8, 0.2, 1],
};

const bezier = (a, b, c, d) => `cubic-bezier(${a},${b},${c},${d})`;

export const easing = Object.fromEntries(
  Object.entries(easingCurves).map(([k, v]) => [k, bezier(...v)]),
);

export const duration = {
  instant: '0.09s',
  fastest: '0.12s',
  fast: '0.18s',
  base: '0.24s',
  normal: '0.32s',
  slow: '0.6s',
  gentle: '0.7s',
  slower: '1.1s',
  sweep: '1.6s',
};

/** framer-motion spring 参数（数字版，与 duration 同一设计意图） */
export const spring = {
  snappy: { type: 'spring', stiffness: 420, damping: 32, mass: 0.9 },
  soft: { type: 'spring', stiffness: 170, damping: 24 },
  magnetic: { type: 'spring', stiffness: 300, damping: 20 },
  gentle: { type: 'spring', stiffness: 120, damping: 20 },
};

export const durationMs = {
  instant: 90, fastest: 120, fast: 180, base: 240, normal: 320, slow: 500, gentle: 700, slower: 900,
};

export const motion = { easing, easingCurves, duration, durationMs, spring };

export default motion;
