/* ============================================================
   表面层级 —— 深色 / 浅色双轨
   核心目标：让浅色模式保住「紫玻璃」身份，而不是退化成灰底白卡。

   浅色保玻璃五味配方（缺一即退化为灰白）：
     ① canvas 带紫调（#F3F0FB，绝不纯白）
     ② 玻璃底掺品牌 tint
     ③ 描边用品牌色而非灰
     ④ blur 叠 saturate + brightness 抬对比
     ⑤ 阴影带品牌色
   ============================================================ */

/**
 * 每个表面值以 { dark, light } 给出。
 * light 里凡引用品牌色的地方写成 rgb(品牌 rgb 三元组 / alpha) —— 由
 * build-css.mjs 原样写入 CSS，故主题切换时自动跟随，无需 JS 参与。
 */
export const surfaces = {
  canvas: { dark: '#0B0814', light: '#F3F0FB' },
  canvas2: { dark: '#0F0B1C', light: '#EDE7F8' },

  /** glassMode=OFF 时的实底层级；仍保留品牌描边与 tint，故 OFF 态也是品牌态 */
  surface1: { dark: '#131022', light: '#FFFFFF' },
  surface2: { dark: '#171329', light: '#FAF8FE' },
  surface3: { dark: '#1D1832', light: '#F3EFFC' },

  /** 玻璃三档：1 弱（列表行/chip）2 标准卡 3 强（导航/弹窗/浮层/Hero） */
  glass1: { dark: 'rgba(255,255,255,.05)', light: 'rgba(255,255,255,.46)' },
  glass2: { dark: 'rgba(255,255,255,.08)', light: 'rgba(255,255,255,.62)' },
  glass3: { dark: 'rgba(255,255,255,.12)', light: 'rgba(255,255,255,.76)' },

  glassTint: {
    dark: 'rgb(var(--zf-brand-rgb-500) / .10)',
    light: 'rgb(var(--zf-brand-rgb-500) / .08)',
  },
  glassBorder: {
    dark: 'rgba(255,255,255,.12)',
    light: 'rgb(var(--zf-brand-rgb-600) / .16)',
  },
  glassBorderStrong: {
    dark: 'rgba(255,255,255,.20)',
    light: 'rgb(var(--zf-brand-rgb-600) / .30)',
  },
  /** 上沿高光，玻璃质感的关键；浅色要更强的白高光才看得出来 */
  glassEdgeTop: {
    dark: 'inset 0 1px 0 rgba(255,255,255,.16)',
    light: 'inset 0 1px 0 rgba(255,255,255,.95)',
  },

  blurGlass: { dark: 'blur(18px) saturate(160%)', light: 'blur(20px) saturate(200%) brightness(1.04)' },
  blurNav: { dark: 'blur(24px) saturate(170%)', light: 'blur(26px) saturate(210%) brightness(1.05)' },
  blurModal: { dark: 'blur(28px) saturate(180%)', light: 'blur(30px) saturate(215%) brightness(1.05)' },
  blurLight: { dark: 'blur(8px)', light: 'blur(10px) saturate(160%)' },

  shadow1: {
    dark: '0 1px 2px rgba(0,0,0,.30)',
    light: '0 1px 2px rgb(var(--zf-brand-rgb-600) / .06)',
  },
  shadow2: {
    dark: '0 8px 24px rgba(0,0,0,.35)',
    light: '0 8px 24px rgb(var(--zf-brand-rgb-600) / .10)',
  },
  shadow3: {
    dark: '0 24px 64px rgba(0,0,0,.50)',
    light: '0 24px 64px rgb(var(--zf-brand-rgb-600) / .18)',
  },

  textPrimary: { dark: '#F8FAFC', light: '#1E1B2E' },
  textSecondary: { dark: '#CBD5E1', light: '#475569' },
  textMuted: { dark: '#94A3B8', light: '#64748B' },
  textFaint: { dark: '#64748B', light: '#94A3B8' },
  /** 落在品牌色/渐变底上的文字 —— 修「浅色模式白字落白底」的关键 */
  onAccent: { dark: '#FFFFFF', light: '#FFFFFF' },
  /** 落在浅 tint 底上的文字，浅色模式必须用深色而非白 */
  onTint: { dark: '#F8FAFC', light: 'rgb(var(--zf-brand-rgb-700))' },
};

export default surfaces;
