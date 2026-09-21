/* ============================================================
   antd v6 主题构建 —— 两端唯一的 ConfigProvider theme 来源
   目标：把此前 25+ 处 !important 要解决的冲突，改由组件级 token 承接。

   两条已实测确认的约束：
     ① 种子色（colorPrimary / colorBgContainer 等参与派生算法的）必须传
        hex 字面量。传 var() 会让 antd 的 colorIdentifier 算出非法色。
     ② 纯渲染 token（borderColor / headerBg / itemBg 等直接落到 CSS 的）
        可以给 var()，从而随 data-brand 自动切换。
   ============================================================ */

import { theme } from 'antd';
import { brandVar, normalizeBrand, surfaces, tokens } from '../tokens/index.js';

const { darkAlgorithm, defaultAlgorithm } = theme;

/** 取表面值：mode 为 'dark' | 'light' */
const sv = (key, mode) => {
  const v = surfaces[key];
  return typeof v === 'string' ? v : v[mode];
};

export function buildAntdTheme({ mode = 'dark', brand = 'violet', fontSize = 14 } = {}) {
  const isDark = mode === 'dark';
  const b = brandVar(normalizeBrand(brand)).ramp;

  return {
    algorithm: isDark ? darkAlgorithm : defaultAlgorithm,

    token: {
      /* —— 种子色：一律 hex —— */
      colorPrimary: b.b500,
      colorPrimaryHover: b.b600,
      colorPrimaryActive: b.b700,
      colorLink: b.b400,
      colorLinkHover: b.b300,
      colorLinkActive: b.b500,

      colorSuccess: tokens.status.success,
      colorWarning: tokens.status.warning,
      colorError: tokens.status.error,
      colorInfo: tokens.status.info,

      colorBgContainer: isDark ? surfaces.surface1.dark : surfaces.surface1.light,
      colorBgElevated: isDark ? surfaces.surface3.dark : surfaces.surface3.light,
      colorBgLayout: 'transparent',
      colorBgMask: isDark ? 'rgba(4, 2, 10, 0.72)' : 'rgba(30, 27, 46, 0.45)',

      colorText: sv('textPrimary', mode),
      colorTextSecondary: sv('textSecondary', mode),
      colorTextTertiary: sv('textMuted', mode),
      colorTextQuaternary: sv('textFaint', mode),
      colorTextBase: isDark ? '#F8FAFC' : '#1E1B2E',

      colorBorder: sv('glassBorder', mode),
      colorBorderSecondary: sv('glassBorder', mode),

      borderRadius: 12,
      borderRadiusLG: 16,
      borderRadiusSM: 8,

      fontFamily: 'var(--zf-font-ui)',
      fontSize,
      controlHeight: 36,
      controlHeightLG: 44,
      controlHeightSM: 28,
      fontWeightStrong: 600,
      wireframe: false,

      boxShadow: 'var(--zf-shadow-2)',
      boxShadowSecondary: 'var(--zf-shadow-3)',
    },

    components: {
      Layout: {
        headerBg: 'transparent',
        bodyBg: 'transparent',
        siderBg: 'transparent',
        footerBg: 'transparent',
        triggerBg: 'transparent',
        headerHeight: tokens.header.height,
        headerPadding: `0 ${tokens.gutter.base}px`,
        headerColor: sv('textPrimary', mode),
      },

      Card: {
        headerBg: 'transparent',
        bodyPadding: tokens.spacing[6],
        headerPadding: tokens.spacing[5],
        headerHeight: 52,
        headerFontSize: tokens.fontSize.lg,
        bodyPaddingSM: tokens.spacing[4],
        headerPaddingSM: tokens.spacing[4],
        headerHeightSM: 42,
        extraColor: sv('textMuted', mode),
        colorBorderSecondary: sv('glassBorder', mode),
      },

      Modal: {
        contentBg: sv('surface3', mode),
        headerBg: 'transparent',
        footerBg: 'transparent',
        titleColor: sv('textPrimary', mode),
        titleFontSize: tokens.fontSize['2xl'],
        titleLineHeight: tokens.lineHeight.snug,
        /* v6 的 Modal 没有 bodyPadding 组件 token —— 内容留白改由
           调用处 styles={{ body }} 提供，勿在此塞无效字段。 */
      },

      Table: {
        headerBg: 'var(--zf-glass-1)',
        headerColor: sv('textSecondary', mode),
        headerSplitColor: 'transparent',
        borderColor: 'var(--zf-glass-border)',
        rowHoverBg: 'var(--zf-tint-brand-08)',
        rowSelectedBg: 'var(--zf-tint-brand-10)',
        rowSelectedHoverBg: 'var(--zf-tint-brand-16)',
        bodySortBg: 'var(--zf-glass-1)',
        cellPaddingBlock: tokens.spacing[3],
        cellPaddingInline: tokens.spacing[4],
        cellFontSize: tokens.fontSize.sm,
        headerBorderRadius: 0,
        tableRadius: 0,
        selectionColumnWidth: 44,
        stickyScrollBarBg: 'rgb(var(--zf-brand-rgb-400) / 0.45)',
      },

      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        darkItemBg: 'transparent',
        darkSubMenuItemBg: 'transparent',
        darkItemSelectedBg: 'var(--zf-tint-brand-16)',
        itemBorderRadius: tokens.radius.md,
        itemHeight: 40,
        itemMarginInline: tokens.spacing[3],
        itemPaddingInline: tokens.spacing[4],
        iconMarginInlineEnd: tokens.spacing[3],
        activeBarWidth: 3,
        itemColor: sv('textSecondary', mode),
        itemHoverColor: sv('textPrimary', mode),
        itemSelectedColor: b.b400,
        darkItemColor: sv('textSecondary', mode),
        darkItemHoverColor: sv('textPrimary', mode),
        darkItemSelectedColor: sv('textPrimary', mode),
      },

      Pagination: {
        itemBg: 'transparent',
        itemLinkBg: 'transparent',
        itemActiveBg: 'var(--zf-tint-brand-16)',
        itemActiveColor: sv('textPrimary', mode),
        itemActiveColorHover: b.b400,
        itemSize: 32,
        itemSizeSM: 28,
      },

      Segmented: {
        trackBg: 'var(--zf-glass-1)',
        itemSelectedBg: 'var(--zf-glass-3)',
        itemColor: sv('textMuted', mode),
        itemSelectedColor: sv('textPrimary', mode),
        itemHoverBg: 'var(--zf-glass-2)',
        trackPadding: 3,
      },

      Descriptions: {
        labelBg: 'var(--zf-glass-1)',
        labelColor: sv('textMuted', mode),
        contentColor: sv('textPrimary', mode),
        titleColor: sv('textPrimary', mode),
        itemPaddingBottom: tokens.spacing[3],
        colonMarginRight: tokens.spacing[2],
      },

      Skeleton: {
        color: 'var(--zf-glass-1)',
        colorGradientEnd: 'var(--zf-glass-3)',
        blockRadius: tokens.radius.sm,
        paragraphLiHeight: 14,
        paragraphMarginTop: tokens.spacing[3],
        titleHeight: 18,
      },

      Tabs: {
        cardBg: 'var(--zf-glass-1)',
        cardHeight: 36,
        cardPadding: `6px ${tokens.spacing[4]}px`,
        horizontalItemPadding: `${tokens.spacing[3]}px 0`,
        horizontalMargin: '0',
        inkBarColor: b.b500,
        titleFontSize: tokens.fontSize.base,
        itemSelectedColor: sv('textPrimary', mode),
        itemHoverColor: b.b400,
      },

      Input: {
        paddingInline: tokens.spacing[3],
        paddingBlock: tokens.spacing[2],
        hoverBorderColor: 'var(--zf-glass-border-strong)',
        activeBorderColor: b.b500,
        activeShadow: 'var(--zf-ring-brand)',
        addonBg: 'var(--zf-glass-1)',
        hoverBg: 'transparent',
        inputFontSize: tokens.fontSize.base,
      },

      Select: {
        optionSelectedBg: 'var(--zf-tint-brand-16)',
        optionActiveBg: 'var(--zf-glass-1)',
        optionSelectedColor: sv('textPrimary', mode),
        optionPadding: `${tokens.spacing[2]}px ${tokens.spacing[3]}px`,
        zIndexPopup: tokens.zIndex.drawer,
      },

      /* v6 的 Button 组件 token 比预期丰富（此前判断「无 ComponentToken」有误）。
         但 borderRadius 不在其中，胶囊形仍需 utilities.css 的 .ant-btn.zf-btn 兜。 */
      Button: {
        fontWeight: tokens.fontWeight.strong,
        primaryShadow: 'none',
        defaultShadow: 'none',
        dangerShadow: 'none',
        contentFontSize: tokens.fontSize.base,
        paddingInline: tokens.spacing[5],
        paddingBlock: tokens.spacing[2],
        iconGap: tokens.spacing[2],
        defaultBg: 'var(--zf-glass-2)',
        defaultBorderColor: 'var(--zf-glass-border)',
        defaultColor: sv('textPrimary', mode),
      },

      Tag: {
        defaultBg: 'var(--zf-glass-1)',
        defaultColor: sv('textSecondary', mode),
        tagFontSize: tokens.fontSize.xs,
        tagPaddingHorizontal: tokens.spacing[2],
      },

      Drawer: {
        colorBgElevated: sv('surface3', mode),
        zIndexPopup: tokens.zIndex.drawer,
        draggerSize: 8,
      },

      Tooltip: {
        colorBgSpotlight: sv('surface3', mode),
        maxWidth: 260,
        zIndexPopup: tokens.zIndex.toast,
      },

      /* Empty 的 ComponentToken 在 v6 是空接口 {}，无可覆字段 ——
         空状态一律走 ZfEmptyState 组件，不要试图用 token 救。 */
    },
  };
}

export default buildAntdTheme;
