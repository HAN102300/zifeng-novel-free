/* ============================================================
   framer-motion 共享配置
   现状：缓动曲线 [0.16,1,0.3,1] 以字面量散在 14 处，而 --zf-ease-out
   与之等价却不被 JS 侧引用；130 处 <motion.*> 各写各的 initial/animate。
   这里把曲线、时长、spring 与常用 variants 集中一处，与 CSS 令牌同源。
   ============================================================ */

import { easingCurves, durationMs, spring } from '../tokens/motion.js';

/** 与 --zf-ease-* 同源的 cubic-bezier 数组 */
export const EASE = { ...easingCurves };
export const DUR = { ...durationMs };
export const SPRING = { ...spring };

/** 列表错峰：每档 55ms，超过 12 项后压缩避免尾部等待过久 */
export const stagger = (step = 55, max = 12) =>
  (i) => ({ delay: Math.min(i, max) * (step / 1000) });

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: { duration: DUR.base / 1000, ease: EASE.out } },
    exit: { opacity: 0, y: -12, transition: { duration: DUR.fast / 1000, ease: EASE.inOut } },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: DUR.normal / 1000, ease: EASE.out } },
    exit: { opacity: 0, transition: { duration: DUR.fast / 1000 } },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.94 },
    animate: { opacity: 1, scale: 1, transition: SPRING.soft },
    exit: { opacity: 0, scale: 0.96, transition: { duration: DUR.fast / 1000 } },
  },
  /** 卡片入场：配合 stagger() 使用 */
  cardIn: {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0, transition: SPRING.snappy },
    exit: { opacity: 0, y: 12, transition: { duration: DUR.fast / 1000 } },
  },
  listRise: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0, transition: { duration: DUR.base / 1000, ease: EASE.out } },
    exit: { opacity: 0, x: 12, transition: { duration: DUR.fast / 1000 } },
  },
  /** 滚动揭示：给 whileInView 用 */
  reveal: {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { duration: DUR.slow / 1000, ease: EASE.out, delay: i * 0.06 },
    }),
  },
  /** 玻璃卡悬停抬升 —— 替代散落的 whileHover 字面量 */
  hoverLift: {
    y: -6,
    transition: SPRING.magnetic,
  },
  hoverPress: { scale: 0.985, transition: { duration: DUR.instant / 1000 } },
  /** 遮罩揭示（滚动驱动） */
  maskReveal: {
    hidden: { clipPath: 'inset(0 100% 0 0)' },
    visible: { clipPath: 'inset(0 0% 0 0)', transition: { duration: DUR.gentle / 1000, ease: EASE.ink } },
  },
  /** 路由转场：tier 0/1 用 fade，tier 2 用 ink */
  pageFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: DUR.normal / 1000, ease: EASE.out } },
    exit: { opacity: 0, transition: { duration: DUR.fast / 1000 } },
  },
  pageSlide: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: DUR.normal / 1000, ease: EASE.glide } },
    exit: { opacity: 0, y: -8, transition: { duration: DUR.fast / 1000 } },
  },
};

/** 视差位移：给 useTransform 用的标准区间 */
export const parallax = {
  slow: { start: 0, end: 40 },
  medium: { start: 0, end: 80 },
  fast: { start: 0, end: 140 },
};

export default variants;
