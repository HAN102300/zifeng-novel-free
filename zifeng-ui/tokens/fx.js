/* ============================================================
   特效预算 / 层级令牌
   —— 支撑「更炫」而不至于失控掉帧。
   设计意图：不是删特效，而是给特效一个总闸和分级。

   tier 由 motion/FxContext.jsx 计算并写到 html[data-fx]：
     0 基础  reduced-motion / FPS<40 / deviceMemory<=2
     1 标准  触屏 / 窄屏 / hardwareConcurrency<=4
     2 全效  其余桌面
   ============================================================ */

export const TIERS = { BASE: 0, STANDARD: 1, FULL: 2 };

/**
 * 每项为 [tier0, tier1, tier2]。
 * play-state 类值直接给 CSS 关键字，数值类给数字。
 */
export const fx = {
  /** 所有 infinite 动画的总闸：animation-play-state: var(--zf-fx-loop) */
  loop: ['paused', 'running', 'running'],
  shimmer: ['paused', 'running', 'running'],
  /** 背景氛围光球数量 */
  orbs: [0, 3, 5],
  orbBlur: ['0px', '70px', '100px'],
  particles: [0, 0, 8],
  tilt: [0, 0, 1],
  parallax: [0, 0, 1],
  sheen: [0, 0, 1],
  cursorHalo: ['none', 'none', 'block'],
  routeTransition: ['fade', 'fade', 'ink'],
  /** 同屏常驻 infinite 动画上限 */
  budgetAmbient: [0, 2, 6],
  /** 同屏并发一次性动效上限（IntersectionObserver + 令牌桶调度） */
  budgetVisible: [4, 8, 14],
  /** DOM 中允许同时带 will-change 的节点数 */
  maxAnimated: [60, 140, 260],
  /** 路由转场时长，tier0 强制缩短 */
  transitionDur: ['0.15s', '0.25s', '0.4s'],
};

/** 转场类型枚举，供 FxContext 与 PageTransition 共用 */
export const TRANSITIONS = { fade: 'fade', slide: 'slide', ink: 'ink' };

export const fxVars = (tier) =>
  Object.fromEntries(Object.entries(fx).map(([k, v]) => [k, v[tier]]));

export default fx;
