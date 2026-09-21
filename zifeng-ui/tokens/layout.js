/* ============================================================
   布局令牌：间距 / 圆角 / 描边 / 层级 / 容器 / 断点
   现状：容器宽度 4 套并存（900/1400/800/无），断点 7 个魔数
   （480/768/780/880/992/1024/1100）。此处收敛为单一来源。
   ============================================================ */

/** 8pt 体系 */
export const spacing = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28,
  8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96,
};

export const gutter = { base: 20, md: 16, sm: 12 };

export const radius = {
  xs: 6, sm: 8, md: 12, lg: 16, xl: 22, '2xl': 28, full: 999,
};

export const borderWidth = { thin: 1, medium: 2, thick: 3 };

export const zIndex = {
  base: 0,
  sticky: 100,
  navbar: 1000,
  drawer: 1050,
  modal: 1100,
  lightbox: 1200,
  toast: 1300,
  /** 高光扫过层 */
  sheen: 9999,
};

/**
 * 容器宽度。页面到容器的映射见 ZfPageShell 的 size 属性。
 * full 用于确实需要出血的页（阅读器）。
 */
export const container = {
  xs: 420, sm: 680, md: 900, lg: 1180, xl: 1420, full: 'none',
};

/** 唯一允许的断点值，与 antd 栅格对齐 */
export const breakpoints = {
  xs: 480, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600,
};

/**
 * 旧魔数 → 新断点的迁移对照（走查时重点看 900–1000px，行为会变）
 *   780  → 768   Category.jsx / RankDetail.jsx
 *   880  → 992   Home.jsx / App.css / Navbar 折叠点（中屏会提前收进抽屉）
 *   1024 → 992   index.css
 *   1100 → 1200  useResponsive.js 默认值
 */
export const legacyBreakpointMap = { 780: 768, 880: 992, 1024: 992, 1100: 1200 };

export const header = { height: 64, heightMobile: 56 };

export const layout = { spacing, gutter, radius, borderWidth, zIndex, container, breakpoints, header };

export default layout;
