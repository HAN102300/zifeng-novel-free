/* ============================================================
   排版令牌
   现状问题：--zf-font-serif 被用作品牌标题装饰（31 处），而小说正文
   用的是 Inter —— 字体语义用反了。此处按角色重新分工。
   一律 px：useTheme 会写 documentElement.style.fontSize，rem 基准在漂移。
   ============================================================ */

/** 本地字体名在前，Google Fonts 为辅，最后落到系统中文字体兜底 */
export const fonts = {
  display: `'Noto Serif SC','Source Han Serif SC','Songti SC','SimSun',serif`,
  ui: `'Inter','Noto Sans SC','PingFang SC','Microsoft YaHei',system-ui,sans-serif`,
  /** ★ 小说正文改用衬线 */
  reader: `'Noto Serif SC','Songti SC','SimSun',serif`,
  mono: `'JetBrains Mono',ui-monospace,Consolas,monospace`,
};

export const fontSize = {
  '2xs': 11, // 新增：原先 11px 无处可引，导致 NovelCard/SectionHeader 写死
  xs: 12,
  sm: 13,
  base: 14,
  md: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 38,
  '4xl': 52,
  '5xl': 64, // 新增：原先 64px 无处可引
  '6xl': 80, // 新增：后台 KPI / 落地大标题预留
};

/** 流体型：宽屏 Hero 不再用固定 52px */
export const fluid = {
  '2xl': 'clamp(22px, 3.2vw, 30px)',
  '3xl': 'clamp(26px, 4.2vw, 38px)',
  '4xl': 'clamp(30px, 5.2vw, 46px)',
  '5xl': 'clamp(36px, 6.2vw, 54px)',
};

export const lineHeight = {
  none: 1,
  tight: 1.15,
  snug: 1.3,
  body: 1.65,
  reader: 1.9,
};

export const letterSpacing = {
  tighter: '-0.02em',
  normal: '0',
  wide: '0.04em',
  display: '0.08em',
  /** 竖排单字标签（「紫」「枫」「阅」这类品牌装饰位） */
  serifCaps: '0.18em',
};

export const fontWeight = { normal: 400, strong: 600, bold: 700, black: 900 };

/**
 * 正文行长约束：过宽的行读起来会串行。
 * reader* 用 em —— 阅读器舞台自带正文字号，所以 em 数就是「一行多少个汉字」，
 * 字号变大时列宽同步变宽，行长恒定。min/max 既是 CSS 兜底也是滑块两极。
 */
export const readerMeasure = { min: 30, default: 46, max: 60 };

export const measure = {
  text: '68ch',
  reader: `${readerMeasure.default}em`,
  readerMin: `${readerMeasure.min}em`,
  readerMax: `${readerMeasure.max}em`,
};

export const typography = { fonts, fontSize, fluid, lineHeight, letterSpacing, fontWeight, measure };

export default typography;
