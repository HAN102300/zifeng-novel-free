/* ============================================================
   后台共享 UI 常量（仅视觉/结构层，不含业务逻辑）
   收敛现状：
     · cardStyle 在 Overview / SourceStats / SourceImport / FeedbackList 各写一份近似但不同的实现
     · 表高 calc() 在 Logs / FeedbackList / UserManagement / AdminManagement / SourceList
       五处写成四种不同的展开式
     · 分页 pageSizeOptions 与 ConfigProvider 的全局配置重复定义且互不一致
     · 用户名「2-8 字符」校验规则在 Login.jsx 与 AdminManagement.jsx 各写一份
   所有色/距/圆角一律引用 --zf-* 令牌，随 data-theme 自动切换，不再写 isDarkMode 三元式。
   ============================================================ */

export const BRAND_NAME = '紫枫小说管理后台';
export const BRAND_SHORT = '紫枫';
export const COPYRIGHT_YEAR = new Date().getFullYear();

/* ---------- 卡片 ---------- */

/**
 * antd Card 统一外观。
 * 底色/描边/阴影由 utilities.css 的 `.ant-card.zf-card` 承担（双 class 提权，无 !important），
 * 这里只补它没有的 overflow，避免各页再写一份 cardStyle。
 */
export const CARD = {
  className: 'zf-card',
  style: { overflow: 'hidden' },
  styles: { body: { padding: 'var(--zf-s4)' } },
};

/** 图表卡：底部多留一档呼吸，避免 x 轴刻度贴住卡片边 */
export const CHART_CARD = {
  ...CARD,
  styles: { body: { padding: 'var(--zf-s4) var(--zf-s4) var(--zf-s6)' } },
};

/** 悬停抬升：改由 CSS 承担（index.css 的 .card-lift），
    不再用 animejs 逐帧改 boxShadow —— 那与 Card 自身的 transition 互相打架。 */
export const LIFT_CLASS = 'card-lift';

/* ---------- 表格 ---------- */

/** 表格外壳：替代各页手写的 `borderRadius:12 + boxShadow 三元式` */
export const TABLE_SHELL = {
  flex: 1,
  minHeight: 0,
  borderRadius: 'var(--zf-r-md)',
  border: '1px solid var(--zf-glass-border)',
  boxShadow: 'var(--zf-shadow-1)',
  overflow: 'hidden',
  background: 'var(--zf-surface-1)',
};

/** 顶栏 64 + Content 上下内边距 24×2 —— 所有页面共有的固定扣减 */
export const TABLE_VIEWPORT_BASE = 112;

/** 表体高度：页面自身的头部占位由调用方传，公式只此一份 */
export const tableScrollY = (headroom = 0) =>
  `calc(100vh - ${TABLE_VIEWPORT_BASE + headroom}px)`;

/** 各页头部占位（页头行 / 统计卡 / 筛选行的实测累加） */
export const PAGE_HEADROOM = {
  /** 仅页头：用户管理、管理员管理 */
  plain: 88,
  /** 页头 + 搜索行：日志、书架、阅读历史 */
  filtered: 144,
  /** 统计卡 + 页头 + 筛选行：反馈列表 */
  stats: 212,
  /** 书源列表：含底部安全区 */
  source: 188,
};

/* ---------- 分页 ---------- */

/** 全局唯一的每页条数档位（此前 15/30/50 与 20/50/100 两套并存） */
export const PAGE_SIZE_OPTIONS = ['20', '50', '100'];
export const DEFAULT_PAGE_SIZE = 20;

/** 服务端分页的页面用这个再叠 current/pageSize/total */
export const TABLE_PAGINATION = {
  showSizeChanger: true,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
  showTotal: (total) => `共 ${total} 条记录`,
};

/** 客户端分页（数据一次性取回）的表用这个 */
export const LOCAL_PAGINATION = {
  pageSize: DEFAULT_PAGE_SIZE,
  ...TABLE_PAGINATION,
};

/* ---------- 表单校验 ---------- */

export const USERNAME_MIN = 2;
export const USERNAME_MAX = 8;
export const PASSWORD_MIN = 6;

export const USERNAME_RULES = [
  { required: true, message: '请输入用户名' },
  { min: USERNAME_MIN, message: `用户名至少 ${USERNAME_MIN} 个字符` },
  { max: USERNAME_MAX, message: `用户名最多 ${USERNAME_MAX} 个字符` },
];

export const PASSWORD_RULES = [
  { required: true, message: '请输入密码' },
  { min: PASSWORD_MIN, message: `密码至少 ${PASSWORD_MIN} 个字符` },
];

export const CAPTCHA_RULES = [{ required: true, message: '请输入验证码' }];

/* ---------- 排版 ---------- */

/** 等宽：URL / IP / 书源规则串统一用它 */
export const MONO = { fontFamily: 'var(--zf-font-mono)', fontVariantLigatures: 'none' };

/** 品牌渐变首字母头像：App.jsx 顶栏、AdminManagement、UserManagement 共用一种 */
export const AVATAR_SQUARE = (size = 32) => ({
  width: size,
  height: size,
  borderRadius: 'var(--zf-r-sm)',
  background: 'var(--zf-grad-brand)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--zf-on-accent)',
  fontSize: size >= 40 ? 'var(--zf-fs-lg)' : 'var(--zf-fs-sm)',
  fontWeight: 'var(--zf-fw-bold)',
  flexShrink: 0,
});

/** 超级管理员这类「受保护」身份用描边而非另一种颜色，避免彩虹 */
export const AVATAR_SQUARE_DANGER = {
  background: 'var(--zf-status-error)',
};
