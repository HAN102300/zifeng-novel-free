/* ============================================================
   紫枫 · 阅读器
   P2 迁移要点（写法依据 zifeng-ui/MIGRATION.md）：
     · 8 套阅读配色不再本地硬编码，统一引用 @zifeng/ui/tokens/reader.js；
       旧 localStorage 里的裸 hex 用 LEGACY_HEX_TO_ID 一次性迁成 id 引用。
     · 阅读主题落成一组 --reader-* 局部自定义属性（纸/墨），全页只有
       readerVars() 这一个来源；圆角/间距/层级/动效一律走 --zf-* 令牌。
     · 正文衬线 --zf-font-reader + --zf-lh-reader + 2em 首行缩进 +
       页面宽度（--rd-measure，em = 一行汉字数）夹在 100% 视口与两极之间。
     · 加载态由「整屏一个 Spin」改为顶栏常驻 + ZfSkeleton(reader) 骨架，
       并补 20s 超时与错误态（ZfErrorState），不再无限转圈。
     · 三态共用同一棵树（只换正文区内容），顶栏/弹窗/抽屉不会随状态切换重挂载。
     · Modal / Drawer 是 antd 传送门，落在应用画布上，内部只用 --zf-* 一套
       体系；正文区只用 --reader-*。两套不再混在同一段样式里。
   ============================================================ */

import React, { useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Select, Slider, Modal, message, Tooltip, Drawer } from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined,
  ArrowUpOutlined, ArrowDownOutlined, SettingOutlined,
  FontSizeOutlined, ColumnWidthOutlined, LineHeightOutlined,
  BgColorsOutlined, BoldOutlined, UnorderedListOutlined
} from '@ant-design/icons';
import { ZfPageShell, ZfSkeleton, ZfErrorState } from '@zifeng/ui/components';
import { variants, EASE, DUR } from '@zifeng/ui/motion';
import { useBreakpoint, useTicker } from '@zifeng/ui/hooks';
import { container, spacing, fontWeight as FW, letterSpacing as LS } from '@zifeng/ui/tokens';
import { readerThemes, readerTypography, LEGACY_HEX_TO_ID } from '@zifeng/ui/tokens/reader.js';
import BackButton from '../components/BackButton';
import { ThemeContext, AuthContext } from '../App';
import { getTocAPI, getContentAPI, saveReadingProgress as apiSaveReadingProgress, getReadingProgress as apiGetReadingProgress } from '../utils/apiClient';
import { getBookSources, getDefaultSource as getDefaultSourceFromManager, normalizeSource } from '../utils/bookSourceManager';
import { loadReaderCache, simpleHash, isDefaultSource } from '../utils/novelConfig';
import { CountUp, ReactBitsErrorBoundary } from '../components/react-bits';

const MAX_CACHE_SIZE = 100;

const evictOldest = (map) => {
  if (map.size <= MAX_CACHE_SIZE) return;
  const oldestKey = map.keys().next().value;
  map.delete(oldestKey);
};

const cache = {
  chapters: new Map(),
  content: new Map(),
  expireTime: 24 * 60 * 60 * 1000,
  isExpired: (timestamp) => Date.now() - timestamp > cache.expireTime,
  setChapters: (key, chapters) => {
    evictOldest(cache.chapters);
    cache.chapters.set(key, { data: chapters, timestamp: Date.now() });
  },
  getChapters: (key) => {
    const cached = cache.chapters.get(key);
    if (cached && !cache.isExpired(cached.timestamp)) return cached.data;
    cache.chapters.delete(key);
    return null;
  },
  setContent: (chapterUrl, content) => {
    evictOldest(cache.content);
    cache.content.set(chapterUrl, { data: content, timestamp: Date.now() });
  },
  getContent: (chapterUrl) => {
    const cached = cache.content.get(chapterUrl);
    if (cached && !cache.isExpired(cached.timestamp)) return cached.data;
    cache.content.delete(chapterUrl);
    return null;
  }
};

/* ============================================================
   阅读主题 → --reader-* 局部属性（全页唯一的纸/墨来源）
   ============================================================ */

const RT = readerTypography;
const SETTINGS_KEY = 'reader_settings';
/** 取色器选出的非预设配色走这条分支 */
const CUSTOM_THEME_ID = 'custom';
const DEFAULT_THEME = readerThemes[0];

const themeById = (id) => readerThemes.find((t) => t.id === id) ?? DEFAULT_THEME;

/** 深浅色切换时落到哪套纸墨：阅读底色刻意不跟随品牌色（长文可读性优先） */
const themeIdForMode = (mode) => (readerThemes.find((t) => t.mode === mode) ?? DEFAULT_THEME).id;

/** 只采信 #rgb / #rrggbb 两种写法，其余（含被污染的旧数据）一律回落 */
const HEX_RE = /^#([\da-f]{3}|[\da-f]{6})$/i;
const isHex = (v) => HEX_RE.test(String(v ?? '').trim());

/** #rrggbb → "r g b"，供 rgb(var(--reader-fg-rgb) / .16) 这类派生色使用 */
function toTriplet(value, fallback) {
  const hit = HEX_RE.exec(String(value ?? '').trim());
  if (!hit) return fallback;
  let hex = hit[1];
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/* 兜底通道取默认纸/墨的通道值，避免出现任何写死的灰 */
const FALLBACK_FG_RGB = toTriplet(DEFAULT_THEME.text, '0 0 0');
const FALLBACK_BG_RGB = toTriplet(DEFAULT_THEME.bg, '255 255 255');

/** <input type="color"> 只吃 #rrggbb，补全 3 位写法否则取色器显示成全黑 */
function toFullHex(value, fallback) {
  const hit = HEX_RE.exec(String(value ?? '').trim());
  if (!hit) return fallback;
  return hit[1].length === 3 ? `#${hit[1].split('').map((c) => c + c).join('')}` : `#${hit[1]}`;
}

const DEFAULT_SETTINGS = {
  fontSize: RT.fontSize.default,
  fontWeight: FW.normal,
  lineHeight: RT.lineHeight.default,
  paragraphSpacing: spacing[4],
  indent: Number.parseFloat(RT.paragraphIndent),
  letterSpacing: Number(LS.normal),
  measure: RT.measure.default,
  themeId: DEFAULT_THEME.id,
  custom: { bg: DEFAULT_THEME.bg, text: DEFAULT_THEME.text },
  bgImage: '',
};

/**
 * 读盘 + 一次性迁移。
 * 旧版本存的是裸 hex（bgColor/textColor）：命中预设就换成 id 引用，
 * 命中不了的（用户自定义色）保留进 custom，不把用户数据弄丢。
 */
function loadSettings() {
  let raw = null;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    raw = saved ? JSON.parse(saved) : null;
  } catch {
    raw = null;
  }
  const s = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };

  if (raw && isHex(raw.bgColor)) {
    s.themeId = LEGACY_HEX_TO_ID[String(raw.bgColor).toUpperCase()] ?? CUSTOM_THEME_ID;
    s.custom = { bg: raw.bgColor, text: isHex(raw.textColor) ? raw.textColor : DEFAULT_THEME.text };
  }
  /* 迁完必须抹掉旧字段：否则下次读盘还会拿它覆盖用户后来选的阅读主题 */
  delete s.bgColor;
  delete s.textColor;
  if (s.themeId !== CUSTOM_THEME_ID && !readerThemes.some((t) => t.id === s.themeId)) {
    s.themeId = DEFAULT_THEME.id;
  }
  const custom = s.custom && typeof s.custom === 'object' ? s.custom : {};
  s.custom = {
    bg: isHex(custom.bg) ? custom.bg : DEFAULT_THEME.bg,
    text: isHex(custom.text) ? custom.text : DEFAULT_THEME.text,
  };
  if (typeof s.bgImage !== 'string') s.bgImage = '';
  return s;
}

/* ============================================================
   尺寸常量与动效（与 --zf-dur-* / --zf-ease-* 同源）
   ============================================================ */

/** 目录行高：与 zifeng-ui/antd/theme.js 的 Menu.itemHeight 对齐 */
const ROW_H = 40;
const TOC_BUFFER = 5;
/** 滚动超过这个距离才浮出回顶/回底按钮 */
const FLOAT_BUTTON_AT = 200;
/** 超过此时长判定为书源解析超时，给错误态而不是无限骨架 */
const LOAD_TIMEOUT_MS = 20000;
const PREFETCH_DELAY_MS = 1000;
const MAX_BG_IMAGE_BYTES = 2 * 1024 * 1024;
const AUTO_SAVE_INTERVAL_MS = 15000;

/* ============================================================
   样式常量：一处定义，多处引用
   ============================================================ */

/** 正文态：纸/墨由阅读主题给出，派生色由通道值算出 */
const readerVars = (theme, bgImage) => ({
  '--reader-bg': theme.bg,
  '--reader-fg': theme.text,
  '--reader-fg-rgb': toTriplet(theme.text, FALLBACK_FG_RGB),
  '--reader-bg-rgb': toTriplet(theme.bg, FALLBACK_BG_RGB),
  '--reader-line': 'rgb(var(--reader-fg-rgb) / 0.16)',
  '--reader-line-strong': 'rgb(var(--reader-fg-rgb) / 0.32)',
  '--reader-fill': 'rgb(var(--reader-fg-rgb) / 0.06)',
  '--reader-fill-strong': 'rgb(var(--reader-fg-rgb) / 0.12)',
  '--reader-chrome': 'rgb(var(--reader-bg-rgb) / 0.86)',
  '--reader-shell-bg': bgImage
    ? `url(${bgImage}) top center / cover fixed no-repeat var(--reader-bg)`
    : 'var(--reader-bg)',
});

/** 骨架 / 错误态落在应用画布上：属性同名、取值换成 --zf-*，语义仍然只有一套 */
const chromeVars = {
  '--reader-bg': 'var(--zf-canvas)',
  '--reader-fg': 'var(--zf-text-primary)',
  '--reader-fg-rgb': 'var(--zf-brand-rgb-500)',
  '--reader-bg-rgb': 'var(--zf-brand-rgb-500)',
  '--reader-line': 'var(--zf-glass-border)',
  '--reader-line-strong': 'var(--zf-glass-border-strong)',
  '--reader-fill': 'var(--zf-glass-1)',
  '--reader-fill-strong': 'var(--zf-glass-3)',
  '--reader-chrome': 'var(--zf-glass-2)',
  '--reader-shell-bg': 'var(--zf-canvas)',
};

const SHELL_STYLE = {
  position: 'relative',
  minHeight: '100vh',
  /* 章节切换有 40px 横向位移，用 clip 而不是 hidden —— clip 不生成滚动容器，
     顶栏的 position: sticky 才不会失效 */
  overflowX: 'clip',
  background: 'var(--reader-shell-bg)',
  color: 'var(--reader-fg)',
  fontFamily: 'var(--zf-font-ui)',
};

const TOPBAR_STYLE = {
  position: 'sticky',
  top: 0,
  zIndex: 'var(--zf-z-sticky)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--zf-s3)',
  padding: 'var(--zf-s3) var(--zf-gutter-base)',
  background: 'var(--reader-chrome)',
  borderBottom: 'var(--zf-bw-thin) solid var(--reader-line)',
  backdropFilter: 'var(--zf-blur-glass)',
  WebkitBackdropFilter: 'var(--zf-blur-glass)',
  color: 'var(--reader-fg)',
};

const TOPBAR_CENTER_STYLE = {
  flex: '1 1 auto',
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--zf-s1)',
};

const TOPBAR_TITLE_STYLE = {
  display: 'block',
  maxWidth: '100%',
  fontSize: 'var(--zf-fs-md)',
  fontWeight: FW.strong,
  lineHeight: 'var(--zf-lh-snug)',
  textAlign: 'center',
};

const TOPBAR_META_STYLE = {
  fontSize: 'var(--zf-fs-2xs)',
  lineHeight: 'var(--zf-lh-snug)',
  fontVariantNumeric: 'tabular-nums',
  opacity: 0.6,
};

const ICON_BTN_STYLE = { color: 'var(--reader-fg)', flexShrink: 0 };

/** 原先被复制 4 遍的 6 属性玻璃按钮串，收敛为唯一定义 */
const PILL_STYLE = {
  flexShrink: 0,
  color: 'var(--reader-fg)',
  background: 'var(--reader-fill)',
  border: 'var(--zf-bw-thin) solid var(--reader-line)',
  backdropFilter: 'var(--zf-blur-light)',
  WebkitBackdropFilter: 'var(--zf-blur-light)',
  borderRadius: 'var(--zf-r-full)',
  transition: 'background var(--zf-dur-fast) var(--zf-ease-out), '
    + 'border-color var(--zf-dur-fast) var(--zf-ease-out), '
    + 'color var(--zf-dur-fast) var(--zf-ease-out)',
};

const BACK_STYLE = {
  ...PILL_STYLE,
  padding: 'var(--zf-s2) var(--zf-s4)',
  fontSize: 'var(--zf-fs-base)',
  boxShadow: 'none',
};

/** 章节导航条（顶/底复用同一组件，样式只此一份） */
const NAV_ROW_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  padding: 'var(--zf-s4) 0',
  borderBottom: 'var(--zf-bw-thin) solid var(--reader-line)',
};

const NAV_CENTER_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--zf-s2)',
  flex: '1 1 auto',
  minWidth: 0,
};

const NAV_LABEL_STYLE = {
  color: 'var(--reader-fg)',
  fontSize: 'var(--zf-fs-base)',
  flexShrink: 0,
};

const SELECT_STYLE = { minWidth: 120, maxWidth: 240, flex: '1 1 auto' };

const HAIRLINE_STYLE = {
  height: 0,
  borderTop: 'var(--zf-bw-thin) solid var(--reader-line)',
};

/**
 * 行长由「页面宽度」设置驱动：列宽先吃满可用视口，再被两极夹住。
 * em 相对本元素字号，而本元素字号就是正文字号（见 stageStyle），
 * 所以数值 = 一行多少个汉字 —— 字号调大时列宽同步变宽，读起来的字数恒定。
 * clamp 让手改过的 localStorage 也撑不破版，100% 保证窄屏永不溢出。
 */
const READER_MEASURE =
  'min(100%, clamp(var(--zf-measure-reader-min), ' +
  'var(--rd-measure, var(--zf-measure-reader)), var(--zf-measure-reader-max)))';

const STAGE_STYLE = {
  width: '100%',
  maxWidth: READER_MEASURE,
  marginInline: 'auto',
  paddingInline: 'var(--zf-gutter-base)',
  paddingBottom: 'var(--zf-s16)',
};

/* 用 paddingBlock 而不是 padding 简写，免得覆盖掉舞台的左右 gutter */
const ARTICLE_STYLE = { paddingBlock: 'var(--zf-s6) var(--zf-s10)' };

/**
 * 正文段落。字号/行高/缩进/段距/字距是用户可调项，由 <article> 落成 --rd-*，
 * 变量缺省时回落到令牌（--zf-fs-lg = 18px = RT.fontSize.default、
 * --zf-lh-reader = 1.9 = RT.lineHeight.default、2em = RT.paragraphIndent）。
 */
const PARA_STYLE = {
  margin: '0 0 var(--rd-gap, var(--zf-s4))',
  fontFamily: 'var(--zf-font-reader)',
  fontSize: 'var(--rd-fs, var(--zf-fs-lg))',
  fontWeight: 'var(--rd-weight, var(--zf-fw-normal))',
  lineHeight: 'var(--rd-lh, var(--zf-lh-reader))',
  textIndent: 'var(--rd-indent, 2em)',
  letterSpacing: 'var(--rd-ls, var(--zf-ls-normal))',
  overflowWrap: 'break-word',
};

const BLANK_STYLE = {
  padding: 'var(--zf-s12) 0',
  textAlign: 'center',
  fontFamily: 'var(--zf-font-reader)',
  fontSize: 'var(--zf-fs-base)',
  opacity: 0.55,
};

const SKELETON_STAGE_STYLE = { ...STAGE_STYLE, ...ARTICLE_STYLE };

const FLOATER_STYLE = {
  position: 'fixed',
  right: 'var(--zf-s6)',
  top: '50%',
  zIndex: 'var(--zf-z-navbar)',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s3)',
};

const FLOAT_BTN_STYLE = {
  width: spacing[12],
  height: spacing[12],
  borderRadius: 'var(--zf-r-full)',
  border: 'none',
  background: 'var(--zf-grad-brand)',
  color: 'var(--zf-on-accent)',
  boxShadow: 'var(--zf-shadow-2), var(--zf-glow-brand)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
};

const FLOAT_ICON_STYLE = { fontSize: 'var(--zf-fs-lg)', color: 'inherit' };

/* ---- 设置弹窗（antd 传送门 → 应用画布，只用 --zf-* 一套体系） ---- */
const columnStyle = (sideBySide) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s4)',
  flex: sideBySide ? '1 1 50%' : '1 1 auto',
});

const MODAL_FLEX_STYLE = (sideBySide) => ({
  display: 'flex',
  flexDirection: sideBySide ? 'row' : 'column',
  gap: sideBySide ? 'var(--zf-s6)' : 'var(--zf-s4)',
});

const ROW_HEAD_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  marginBottom: 'var(--zf-s2)',
};

const ROW_LABEL_STYLE = { fontWeight: FW.strong, fontSize: 'var(--zf-fs-base)' };

const ROW_VALUE_STYLE = {
  marginLeft: 'auto',
  color: 'var(--zf-text-muted)',
  fontSize: 'var(--zf-fs-sm)',
  fontVariantNumeric: 'tabular-nums',
};

const COLOR_INPUT_STYLE = {
  height: spacing[8],
  border: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
  borderRadius: 'var(--zf-r-xs)',
  cursor: 'pointer',
};

const CUSTOM_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s3)',
  flexWrap: 'wrap',
  marginTop: 'var(--zf-s3)',
};

const HINT_STYLE = { fontSize: 'var(--zf-fs-sm)', color: 'var(--zf-text-secondary)' };

const UPLOAD_LABEL_STYLE = {
  padding: 'var(--zf-s1) var(--zf-s3)',
  borderRadius: 'var(--zf-r-xs)',
  border: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
  cursor: 'pointer',
  fontSize: 'var(--zf-fs-sm)',
};

const SWATCH_GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 'var(--zf-s2)',
  marginBottom: 'var(--zf-s3)',
};

/** 选中态用描边（outline）而不是底色，深色纸墨下也看得出选了哪一套 */
const swatchStyle = (selected, compact) => ({
  height: compact ? spacing[8] : spacing[10],
  borderRadius: 'var(--zf-r-xs)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'var(--zf-fs-2xs)',
  outline: selected
    ? 'var(--zf-bw-medium) solid var(--zf-brand-500)'
    : 'var(--zf-bw-thin) solid var(--zf-glass-border)',
  outlineOffset: 'var(--zf-bw-medium)',
  transition: 'outline-color var(--zf-dur-fast) var(--zf-ease-out)',
});

/* ---- 目录抽屉（同为传送门 → --zf-* 体系） ---- */
const TOC_SCROLLER_STYLE = { height: '100%', overflowY: 'auto', overscrollBehavior: 'contain' };

/** 目录行：块级 + 行高撑满，截断交给 .zf-truncate 工具类（flex 容器不吃 text-overflow） */
const TOC_ROW_STYLE = {
  display: 'block',
  height: ROW_H,
  lineHeight: `${ROW_H}px`,
  padding: '0 var(--zf-s4)',
  cursor: 'pointer',
  fontSize: 'var(--zf-fs-base)',
  color: 'var(--zf-text-secondary)',
  borderBottom: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
  transition: 'background-color var(--zf-dur-fast) var(--zf-ease-out)',
};

const TOC_ROW_ACTIVE_STYLE = {
  ...TOC_ROW_STYLE,
  background: 'var(--zf-tint-brand-10)',
  color: 'var(--zf-on-tint)',
  fontWeight: FW.strong,
};

const TOC_ROW_HOVER_STYLE = { ...TOC_ROW_STYLE, background: 'var(--zf-glass-1)' };

/* ============================================================
   动效变体
   ============================================================ */

const CHAPTER_MOTION = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: DUR.base / 1000, ease: EASE.out } },
  exit: { opacity: 0, x: -40, transition: { duration: DUR.fast / 1000, ease: EASE.inOut } },
};

/** 浮标居中靠 motion 的 y 百分比完成 —— 不能再写 CSS transform，会被 motion 覆盖 */
const FLOATER_MOTION = {
  initial: { opacity: 0, y: '-42%', scale: 0.82 },
  animate: { opacity: 1, y: '-50%', scale: 1, transition: { duration: DUR.normal / 1000, ease: EASE.out } },
  exit: { opacity: 0, y: '-42%', scale: 0.82, transition: { duration: DUR.fast / 1000 } },
};

/* ============================================================
   子组件
   ============================================================ */

/** 常驻顶栏：加载中 / 出错时也在，用户永远能返回与改设置 */
function ReaderTopBar({ title, meta, onBack, onOpenSettings }) {
  return (
    <div style={TOPBAR_STYLE}>
      <BackButton onClick={onBack} text="返回" style={BACK_STYLE} />
      <div style={TOPBAR_CENTER_STYLE}>
        {title ? <span style={TOPBAR_TITLE_STYLE} className="zf-truncate">{title}</span> : null}
        {meta}
      </div>
      <Tooltip title="阅读设置">
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={onOpenSettings}
          style={ICON_BTN_STYLE}
          aria-label="阅读设置"
        />
      </Tooltip>
    </div>
  );
}

/** 章节导航条：原先上下两份、四段重复的玻璃按钮串收敛到这里 */
function ChapterNav({ chapters, index, onSwitch, onOpenToc }) {
  const options = useMemo(
    () => chapters.map((chapter, i) => ({ value: i, label: chapter.chapterName })),
    [chapters],
  );

  return (
    <div style={NAV_ROW_STYLE}>
      <Button
        type="text"
        classNames={{ root: 'zf-btn' }}
        icon={<ArrowLeftOutlined />}
        onClick={() => onSwitch(index - 1)}
        disabled={index === 0}
        style={PILL_STYLE}
      >
        上一章
      </Button>
      <div style={NAV_CENTER_STYLE}>
        <span style={NAV_LABEL_STYLE}>目录</span>
        <Select
          virtual
          value={index}
          onChange={onSwitch}
          style={SELECT_STYLE}
          popupMatchSelectWidth={false}
          listHeight={256}
          options={options}
        />
        <Tooltip title="打开目录">
          <Button
            type="text"
            icon={<UnorderedListOutlined />}
            onClick={onOpenToc}
            style={ICON_BTN_STYLE}
            aria-label="打开目录"
          />
        </Tooltip>
      </div>
      <Button
        type="text"
        classNames={{ root: 'zf-btn' }}
        icon={<ArrowRightOutlined />}
        onClick={() => onSwitch(index + 1)}
        disabled={index === chapters.length - 1}
        style={PILL_STYLE}
      >
        下一章
      </Button>
    </div>
  );
}

/** 设置弹窗里的一行：标签 + 当前值 + 控件 */
function SettingRow({ icon, label, value, children }) {
  return (
    <div>
      <div style={ROW_HEAD_STYLE}>
        {icon}
        <span style={ROW_LABEL_STYLE}>{label}</span>
        {value != null ? <span style={ROW_VALUE_STYLE}>{value}</span> : null}
      </div>
      {children}
    </div>
  );
}

/* ============================================================
   设置弹窗
   ============================================================ */

function ReaderSettingsModal({
  open,
  onClose,
  settings,
  onPatch,
  sideBySide,
  mdLayout,
  modalWidth,
  activeTheme,
  setDraftColors,
  commitDraftColors,
  choosePreset,
  onBgImageUpload,
  onReset,
}) {
  const patch = (key) => (v) => onPatch((prev) => ({ ...prev, [key]: v }));
  const compact = !mdLayout;
  const pick = (which) => (e) => setDraftColors((prev) => ({ ...(prev ?? {}), [which]: e.target.value }));

  return (
    <Modal
      title="阅读设置"
      open={open}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      centered
      styles={{ body: { maxHeight: mdLayout ? '70vh' : '60vh', overflowY: 'auto' } }}
    >
      <div style={MODAL_FLEX_STYLE(sideBySide)}>
        <div style={columnStyle(sideBySide)}>
          <SettingRow icon={<FontSizeOutlined />} label="字体大小" value={`${settings.fontSize}px`}>
            <Slider
              min={RT.fontSize.min}
              max={RT.fontSize.max}
              step={1}
              value={settings.fontSize}
              onChange={patch('fontSize')}
            />
          </SettingRow>

          <SettingRow icon={<ColumnWidthOutlined />} label="页面宽度" value={`${settings.measure} 字/行`}>
            <Slider
              min={RT.measure.min}
              max={RT.measure.max}
              step={1}
              value={settings.measure}
              onChange={patch('measure')}
              marks={mdLayout
                ? { [RT.measure.min]: '窄', [RT.measure.default]: '适中', [RT.measure.max]: '宽' }
                : undefined}
            />
          </SettingRow>

          <SettingRow icon={<BoldOutlined />} label="字体粗细" value={settings.fontWeight}>
            <Slider
              min={300}
              max={FW.bold}
              step={100}
              value={settings.fontWeight}
              onChange={patch('fontWeight')}
              marks={mdLayout
                ? { 300: '细', 400: '常规', 500: '中等', 700: '粗' }
                : { 300: '细', 700: '粗' }}
            />
          </SettingRow>

          <SettingRow icon={<ColumnWidthOutlined />} label="段落缩进" value={`${settings.indent}字符`}>
            <Slider min={0} max={4} step={1} value={settings.indent} onChange={patch('indent')} />
          </SettingRow>

          <SettingRow icon={<LineHeightOutlined />} label="行距" value={settings.lineHeight}>
            <Slider min={1.2} max={3} step={0.1} value={settings.lineHeight} onChange={patch('lineHeight')} />
          </SettingRow>

          <SettingRow label="段落间距" value={`${settings.paragraphSpacing}px`}>
            <Slider
              min={spacing[1]}
              max={spacing[10]}
              step={spacing[1]}
              value={settings.paragraphSpacing}
              onChange={patch('paragraphSpacing')}
            />
          </SettingRow>

          <SettingRow label="字间距" value={`${settings.letterSpacing}px`}>
            <Slider min={0} max={5} step={0.5} value={settings.letterSpacing} onChange={patch('letterSpacing')} />
          </SettingRow>
        </div>

        <div style={columnStyle(sideBySide)}>
          <SettingRow label="字体颜色" value={activeTheme.text}>
            <input
              type="color"
              value={toFullHex(activeTheme.text, DEFAULT_SETTINGS.custom.text)}
              onChange={pick('text')}
              onBlur={commitDraftColors}
              style={{ ...COLOR_INPUT_STYLE, width: compact ? '100%' : spacing[16] }}
            />
          </SettingRow>

          <SettingRow icon={<BgColorsOutlined />} label="背景设置">
            <div style={SWATCH_GRID_STYLE}>
              {readerThemes.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.name}
                  onClick={() => choosePreset(t)}
                  style={{
                    ...swatchStyle(settings.themeId === t.id && !settings.bgImage, compact),
                    background: t.bg,
                    color: t.text,
                  }}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div style={CUSTOM_ROW_STYLE}>
              <span style={HINT_STYLE}>自定义颜色：</span>
              <input
                type="color"
                value={toFullHex(activeTheme.bg, DEFAULT_SETTINGS.custom.bg)}
                onChange={pick('bg')}
                onBlur={commitDraftColors}
                style={{ ...COLOR_INPUT_STYLE, width: spacing[10] }}
              />
            </div>
            <div style={CUSTOM_ROW_STYLE}>
              <span style={HINT_STYLE}>背景图片</span>
              <label style={UPLOAD_LABEL_STYLE}>
                选择图片
                <input type="file" accept="image/*" onChange={onBgImageUpload} style={{ display: 'none' }} />
              </label>
              {settings.bgImage ? (
                <Button size="small" danger onClick={() => onPatch((prev) => ({ ...prev, bgImage: '' }))}>
                  清除图片
                </Button>
              ) : null}
            </div>
          </SettingRow>

          <Button onClick={onReset} block style={{ marginTop: sideBySide ? 'auto' : 'var(--zf-s1)' }}>
            恢复默认设置
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ============================================================
   目录抽屉（虚拟滚动，行悬停改状态而不是改 DOM style）
   ============================================================ */

function TocDrawer({
  open,
  onClose,
  currentIndex,
  width,
  onPick,
  scrollerRef,
  onScroll,
  visibleStartIndex,
  visibleChapters,
  totalHeight,
  offsetY,
}) {
  const [hovered, setHovered] = useState(null);

  return (
    <Drawer
      title="目录"
      open={open}
      onClose={onClose}
      width={width}
      styles={{ body: { padding: 0, overflow: 'hidden' } }}
    >
      <div ref={scrollerRef} onScroll={onScroll} style={TOC_SCROLLER_STYLE}>
        <div style={{ position: 'relative', height: totalHeight }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleChapters.map((chapter, i) => {
              const idx = visibleStartIndex + i;
              const rowStyle = idx === currentIndex
                ? TOC_ROW_ACTIVE_STYLE
                : hovered === idx
                  ? TOC_ROW_HOVER_STYLE
                  : TOC_ROW_STYLE;
              return (
                <div
                  key={idx}
                  style={rowStyle}
                  className="zf-truncate"
                  onClick={() => { onPick(idx); onClose(); }}
                  onMouseEnter={() => setHovered(idx)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {chapter.chapterName}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

/* ============================================================
   页面
   ============================================================ */

const Reader = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDarkMode } = useContext(ThemeContext);
  const { isLoggedIn, userInfo } = useContext(AuthContext);
  const { isXs, isMobile, up } = useBreakpoint();
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [bookUrl, setBookUrl] = useState('');
  const [tocUrl, setTocUrl] = useState('');
  const [bookData, setBookData] = useState(null);
  const isSwitchingChapterRef = useRef(false);
  const [showToc, setShowToc] = useState(false);
  const [tocScrollTop, setTocScrollTop] = useState(0);
  /** 抽屉可视高度改为实测，取代旧的内联 `window.innerHeight - 55` 魔数 */
  const [tocViewportH, setTocViewportH] = useState(0);
  const tocContainerRef = useRef(null);
  const prevProgressRef = useRef(0);
  /** 取色器拖动期间的即时预览：不落盘，也不产生第二份配色来源 */
  const [draftColors, setDraftColors] = useState(null);

  const [readerSettings, setReaderSettings] = useState(loadSettings);

  /* ---- 目录虚拟滚动窗口 ---- */
  const tocViewport = tocViewportH || ROW_H * 16;
  const handleTocScroll = (e) => {
    const el = e.currentTarget;
    setTocScrollTop(el.scrollTop);
    if (el.clientHeight && el.clientHeight !== tocViewportH) setTocViewportH(el.clientHeight);
  };
  const visibleStartIndex = Math.max(0, Math.floor(tocScrollTop / ROW_H) - TOC_BUFFER);
  const visibleEndIndex = Math.min(chapters.length, Math.ceil((tocScrollTop + tocViewport) / ROW_H) + TOC_BUFFER);
  const visibleChapters = chapters.slice(visibleStartIndex, visibleEndIndex);
  const totalHeight = chapters.length * ROW_H;
  const offsetY = visibleStartIndex * ROW_H;

  useEffect(() => {
    if (showToc && tocContainerRef.current) {
      const el = tocContainerRef.current;
      el.scrollTop = Math.max(0, currentChapterIndex * ROW_H - el.clientHeight / 2 + ROW_H / 2);
      setTocScrollTop(el.scrollTop);
      setTocViewportH(el.clientHeight);
    }
  }, [showToc]);

  useEffect(() => {
    const urlSource = searchParams.get('sourceUrl') || '';
    const urlBookUrl = searchParams.get('bookUrl') || '';
    const urlTocUrl = searchParams.get('tocUrl') || '';
    const chapterIdx = parseInt(searchParams.get('chapterIndex') || '0', 10);
    setSourceUrl(urlSource);
    setBookUrl(urlBookUrl);
    setTocUrl(urlTocUrl);
    setCurrentChapterIndex(chapterIdx);

    const readerCache = loadReaderCache(urlSource, urlBookUrl);
    if (readerCache) {
      setBookData(readerCache.bookData);
      if (readerCache.chapters && readerCache.chapters.length > 0) {
        const cacheKey = simpleHash(urlSource + '_' + urlBookUrl);
        cache.setChapters(cacheKey, readerCache.chapters);
      }
    }

    const restoreBackendProgress = async () => {
      const token = localStorage.getItem('zifeng_token');
      if (token && urlBookUrl && chapterIdx === 0) {
        try {
          const progress = await apiGetReadingProgress(urlBookUrl);
          if (progress && typeof progress.chapterIndex === 'number' && progress.chapterIndex > 0) {
            setCurrentChapterIndex(progress.chapterIndex);
          }
        } catch (e) {
          console.error('从服务器恢复阅读进度失败:', e);
        }
      }
    };
    restoreBackendProgress();
  }, [searchParams]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(readerSettings));
    } catch (e) { console.warn('Failed to save reader settings:', e); }
  }, [readerSettings]);

  /* 深浅色切换时同步阅读底色。
     必须跳过首帧：本 effect 原先在挂载时就无条件执行，把 localStorage
     里恢复出来的阅读主题（含自定义背景图）直接覆盖掉 —— 用户自选的
     主题一刷新就复原。只有真正的「切换」才该改色。 */
  const darkModeBaselineRef = useRef(isDarkMode);
  useEffect(() => {
    if (darkModeBaselineRef.current === isDarkMode) return;
    darkModeBaselineRef.current = isDarkMode;
    setReaderSettings((prev) => ({
      ...prev,
      themeId: themeIdForMode(isDarkMode ? 'dark' : 'light'),
      bgImage: '',
    }));
  }, [isDarkMode]);

  /* 滚动浮标：订阅全站单例 rAF 广播，不再自挂一份 window scroll 监听 */
  useTicker({
    onFrame: (_now, state) => setShowScrollButtons(state.scrollY > FLOAT_BUTTON_AT),
  });

  /* 超时兜底：书源卡住时给错误态，而不是让骨架一直亮着 */
  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return undefined;
    }
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  const scrollToTop = () => { window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const scrollToBottom = () => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); };

  const getSource = useCallback(() => {
    if (sourceUrl && isDefaultSource(sourceUrl)) {
      return getDefaultSourceFromManager();
    }
    if (sourceUrl) {
      const allSources = getBookSources();
      const found = allSources.find(s => s.bookSourceUrl === sourceUrl);
      if (found) return normalizeSource(found);
    }
    return getDefaultSourceFromManager();
  }, [sourceUrl]);

  /**
   * 从 bookUrl 构造正确的 tocUrl
   * 当 tocUrl 未传递或与 bookUrl 相同时，通过书源的 ruleBookInfo.tocUrl 模板构造
   * 逻辑与 Shelf.jsx 中的 tocUrl 构造保持一致
   */
  const constructTocUrl = useCallback((source, url) => {
    if (!source || !url) return url;
    const tocUrlTemplate = source.ruleBookInfo?.tocUrl || '';
    if (!tocUrlTemplate || !tocUrlTemplate.includes('{{')) return url;

    // 尝试从 bookUrl 中提取 ID
    let extractedId = url;
    const bookUrlTemplate = source.ruleSearch?.bookUrl || '';
    if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
      const templatePattern = bookUrlTemplate.replace(/\{\{[^}]+\}\}/g, '([^/?#]+)');
      const regex = new RegExp('^' + templatePattern + '$');
      const match = url.match(regex);
      if (match && match[1]) {
        extractedId = match[1];
      }
    }
    // 如果正则匹配失败，尝试从 URL 路径中提取最后一段作为 ID
    if (extractedId === url) {
      try {
        const urlPath = new URL(url.startsWith('http') ? url : 'http://dummy' + url).pathname;
        const segments = urlPath.split('/').filter(Boolean);
        if (segments.length > 0) {
          extractedId = segments[segments.length - 1];
        }
      } catch {
        /* 连伪域名都解析不动时，沿用整串 bookUrl 作为 ID 继续拼模板 */
      }
    }
    return tocUrlTemplate.replace(/\{\{[^}]+\}\}/g, extractedId);
  }, []);

  /**
   * 将相对 tocUrl 转为绝对 URL
   * 书源模板中的 tocUrl 可能是相对路径（如 /novel/{{$.novelId}}/chapters?readNum=1）
   * 解析器无法处理相对 URL，需要拼接 bookSourceUrl
   */
  const toAbsoluteUrl = useCallback((url, source) => {
    if (url && !url.startsWith('http')) {
      const baseUrl = source?.bookSourceUrl;
      if (baseUrl) {
        return url.startsWith('/') ? baseUrl + url : baseUrl + '/' + url;
      }
    }
    return url;
  }, []);

  const fetchChapterContent = useCallback(async (chapter, retryCount = 0) => {
    if (!chapter) return;
    setLoading(true);
    try {
      const chapterUrl = chapter.chapterUrl || chapter.url || chapter.path || '';
      const cachedContent = cache.getContent(chapterUrl);
      if (cachedContent && retryCount === 0) {
        setContent(cachedContent);
      } else {
        const source = getSource();
        let result;
        try {
          result = await getContentAPI(source, chapterUrl, bookData, {
            index: chapter.index,
            title: chapter.chapterName,
            url: chapterUrl,
          });
        } catch (firstError) {
          console.warn(`获取章节内容失败(第1次):`, firstError.message);
          if (retryCount < 2) {
            const delay = Math.pow(2, retryCount) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchChapterContent(chapter, retryCount + 1);
          }
          if (retryCount < 3) {
            const allSources = getBookSources().filter(s => s.enabled && s.bookSourceUrl !== sourceUrl);
            if (allSources.length > 0) {
              console.warn(`尝试从备选书源 "${allSources[0].bookSourceName}" 获取内容...`);
              try {
                result = await getContentAPI(allSources[0], chapterUrl, bookData, {
                  index: chapter.index,
                  title: chapter.chapterName,
                  url: chapterUrl,
                });
                if (result && result.success) {
                  message.info(`已自动切换到书源: ${allSources[0].bookSourceName}`);
                }
              } catch (secondError) {
                console.warn('备选书源也失败:', secondError.message);
              }
            }
          }
          if (!result || !result.success) {
            setContent('获取章节内容失败，已尝试多次。点击重试可重新加载。');
            return;
          }
        }

        if (result.success && result.content) {
          const chapterContent = String(result.content);
          cache.setContent(chapterUrl, chapterContent);
          setContent(chapterContent);

          const nextIdx = chapter.index + 1;
          if (nextIdx < chapters.length) {
            const nextChapter = chapters[nextIdx];
            const nextUrl = nextChapter.chapterUrl || nextChapter.url || '';
            if (nextUrl && !cache.getContent(nextUrl)) {
              setTimeout(() => {
                const src = getSource();
                getContentAPI(src, nextUrl, bookData, {
                  index: nextIdx,
                  title: nextChapter.chapterName,
                  url: nextUrl,
                }).then(res => {
                  if (res.success && res.content) {
                    cache.setContent(nextUrl, String(res.content));
                  }
                }).catch(() => {});
              }, PREFETCH_DELAY_MS);
            }
          }
        } else {
          const fallback = result.message || '获取章节内容失败，内容为空！';
          setContent(fallback);
        }
      }
    } catch (err) {
      console.error('获取章节内容失败:', err);
      setContent('获取章节内容失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, [sourceUrl, bookData, getSource, chapters]);

  useEffect(() => {
    const fetchChapters = async () => {
      if (!sourceUrl && !bookUrl) return;
      if (isSwitchingChapterRef.current) {
        isSwitchingChapterRef.current = false;
        return;
      }
      setLoading(true);
      try {
        const cacheKey = simpleHash(sourceUrl + '_' + bookUrl);
        const cachedChapters = cache.getChapters(cacheKey);
        if (cachedChapters) {
          const chapterList = cachedChapters.map((ch, i) => ({
            ...ch,
            index: i,
            chapterName: ch.chapterName || ch.name || ch.title || `第${i + 1}章`,
            chapterUrl: ch.chapterUrl || ch.url || ch.path || '',
          }));
          setChapters(chapterList);
          const idx = Math.min(currentChapterIndex, chapterList.length - 1);
          setCurrentChapterIndex(idx);
          setCurrentChapter(chapterList[idx]);
          await fetchChapterContent(chapterList[idx]);
        } else {
          const source = getSource();
          // 当 tocUrl 未传递或与 bookUrl 相同时，从 bookUrl 构造正确的 tocUrl
          let effectiveTocUrl = tocUrl;
          if (!effectiveTocUrl || effectiveTocUrl === bookUrl) {
            effectiveTocUrl = constructTocUrl(source, bookUrl);
          }
          // 确保 tocUrl 是绝对 URL，解析器无法处理相对路径
          effectiveTocUrl = toAbsoluteUrl(effectiveTocUrl, source);
          let result;
          try {
            result = await getTocAPI(source, effectiveTocUrl, bookData);
          } catch (tocError) {
            console.warn('获取章节列表失败:', tocError.message);
            const fallbackSources = getBookSources().filter(s => s.enabled && s.bookSourceUrl !== sourceUrl);
            if (fallbackSources.length > 0) {
              try {
                result = await getTocAPI(fallbackSources[0], effectiveTocUrl, bookData);
                if (result.success) {
                  message.info(`已自动切换到书源获取目录: ${fallbackSources[0].bookSourceName}`);
                }
              } catch (fbError) {
                console.warn('备选书源目录获取也失败:', fbError.message);
              }
            }
          }

          if (result?.success && result.chapters && result.chapters.length > 0) {
            const chapterList = result.chapters.map((ch, i) => ({
              ...ch,
              index: i,
              chapterName: ch.name || ch.chapterName || ch.title || `第${i + 1}章`,
              chapterUrl: ch.url || ch.chapterUrl || ch.path || '',
            }));
            cache.setChapters(cacheKey, chapterList);
            setChapters(chapterList);
            const idx = Math.min(currentChapterIndex, chapterList.length - 1);
            setCurrentChapterIndex(idx);
            setCurrentChapter(chapterList[idx]);
            await fetchChapterContent(chapterList[idx]);
          } else {
            setError('获取章节列表失败');
          }
        }
      } catch (err) {
        console.error('获取章节列表失败:', err);
        setError('获取章节列表失败');
      } finally {
        setLoading(false);
      }
    };
    fetchChapters();
    // 依赖表沿用迁移前原样：fetchChapterContent 依赖 chapters，
    // 把它写进来会形成 setChapters → 重新拉取 的死循环。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, bookUrl, tocUrl, currentChapterIndex, getSource, bookData, constructTocUrl, reloadKey]);

  const saveProgress = useCallback(() => {
    if (!isLoggedIn || !userInfo || !currentChapter || chapters.length === 0) return;
    const progress = (currentChapterIndex + 1) / chapters.length;

    const token = localStorage.getItem('zifeng_token');
    if (token && bookUrl) {
      apiSaveReadingProgress({
        bookUrl: bookUrl,
        bookName: bookData?.name || null,
        author: bookData?.author || null,
        coverUrl: bookData?.cover || null,
        summary: bookData?.summary || null,
        lastChapter: bookData?.lastChapter || null,
        sourceUrl: sourceUrl || null,
        sourceName: bookData?.sourceName || null,
        chapterIndex: currentChapterIndex,
        chapterName: currentChapter?.chapterName || null,
        chapterUrl: currentChapter?.chapterUrl || null,
        progress: progress,
      }).catch(e => {
        console.error('保存阅读进度到服务器失败:', e);
      });
    }
  }, [isLoggedIn, userInfo, currentChapter, chapters.length, bookUrl, currentChapterIndex, bookData, sourceUrl]);

  const autoSaveRef = useRef(null);
  useEffect(() => {
    if (!isLoggedIn || !userInfo || !currentChapter || chapters.length === 0) return;
    if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    autoSaveRef.current = setInterval(() => {
      saveProgress();
    }, AUTO_SAVE_INTERVAL_MS);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [isLoggedIn, userInfo, currentChapter, chapters.length, saveProgress]);

  const switchChapter = (index) => {
    if (index >= 0 && index < chapters.length) {
      saveProgress();

      isSwitchingChapterRef.current = true;
      setError(null);
      setCurrentChapterIndex(index);
      const chapter = chapters[index];
      setCurrentChapter(chapter);
      fetchChapterContent(chapter);

      const readerParams = new URLSearchParams(searchParams);
      readerParams.set('chapterIndex', String(index));
      navigate(`/reader/${novelId}?${readerParams.toString()}`, { replace: true });
      window.scrollTo({ top: 0 });
    }
  };

  const handleBack = () => {
    saveProgress();

    const from = searchParams.get('from');
    if (from === 'shelf') {
      navigate('/shelf');
    } else {
      navigate(-1);
    }
  };

  const retry = () => {
    setError(null);
    setTimedOut(false);
    setReloadKey((k) => k + 1);
  };

  const handleBgImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.error('请选择图片文件');
      return;
    }
    if (file.size > MAX_BG_IMAGE_BYTES) {
      message.error('图片大小不能超过2MB');
      return;
    }
    const fileReader = new FileReader();
    fileReader.onload = (ev) => {
      setReaderSettings(prev => ({ ...prev, bgImage: ev.target.result }));
    };
    fileReader.readAsDataURL(file);
  };

  /* ---- 配色：预设 id + 取色器自定义，统一经 readerVars 出口 ---- */
  const activeTheme = useMemo(() => (
    readerSettings.themeId === CUSTOM_THEME_ID
      ? { id: CUSTOM_THEME_ID, name: '自定义', ...readerSettings.custom }
      : themeById(readerSettings.themeId)
  ), [readerSettings.themeId, readerSettings.custom]);

  const shownTheme = useMemo(
    () => (draftColors ? { ...activeTheme, ...draftColors } : activeTheme),
    [activeTheme, draftColors],
  );

  const choosePreset = (theme) => {
    setDraftColors(null);
    setReaderSettings((prev) => ({
      ...prev,
      themeId: theme.id,
      custom: { bg: theme.bg, text: theme.text },
      bgImage: '',
    }));
  };

  const commitDraftColors = () => {
    if (!draftColors) return;
    /* 以「屏幕上正在显示的这套」为基准合并，不能拿 prev.custom ——
       它可能还是很久以前另存过的颜色，只改字色会把底色跳回去。 */
    const base = activeTheme;
    setReaderSettings((prev) => ({
      ...prev,
      themeId: CUSTOM_THEME_ID,
      custom: {
        bg: toFullHex(draftColors.bg ?? base.bg, base.bg),
        text: toFullHex(draftColors.text ?? base.text, base.text),
      },
      bgImage: '',
    }));
    setDraftColors(null);
  };

  const resetSettings = () => {
    const id = themeIdForMode(isDarkMode ? 'dark' : 'light');
    const theme = themeById(id);
    setDraftColors(null);
    setReaderSettings({
      ...DEFAULT_SETTINGS,
      themeId: id,
      custom: { bg: theme.bg, text: theme.text },
      bgImage: '',
    });
    message.success('已恢复默认设置');
  };

  const bodyPhase = error || (timedOut && !content)
    ? 'error'
    : (loading && !content ? 'loading' : 'content');

  const shellStyle = useMemo(
    () => ({
      ...SHELL_STYLE,
      ...(bodyPhase === 'content'
        ? readerVars(shownTheme, readerSettings.bgImage)
        : chromeVars),
    }),
    [bodyPhase, shownTheme, readerSettings.bgImage],
  );

  /** 用户可调的正文排版落成 --rd-*，由 PARA_STYLE 带令牌兜底地消费 */
  const stageStyle = useMemo(() => ({
    ...(bodyPhase === 'content' ? STAGE_STYLE : SKELETON_STAGE_STYLE),
    '--rd-fs': `${readerSettings.fontSize}px`,
    '--rd-weight': String(readerSettings.fontWeight),
    '--rd-lh': String(readerSettings.lineHeight),
    '--rd-indent': `${readerSettings.indent}em`,
    '--rd-gap': `${readerSettings.paragraphSpacing}px`,
    '--rd-ls': `${readerSettings.letterSpacing}px`,
    '--rd-measure': `${readerSettings.measure}em`,
    fontSize: 'var(--rd-fs, var(--zf-fs-lg))',
  }), [bodyPhase, readerSettings]);

  const paragraphs = useMemo(() => (
    content ? content.split('\n').map((paragraph, index) => (
      <p key={index} style={PARA_STYLE}>{paragraph}</p>
    )) : null
  ), [content]);

  const sideBySide = up('xl');
  const mdLayout = up('md');
  const modalWidth = sideBySide ? container.sm : mdLayout ? 520 : 'min(400px, 92vw)';

  const errorTitle = error ? '章节获取失败' : '内容获取超时';
  const errorDescription = error
    ? `${error}，重试即可重新加载；若持续失败请检查书源是否可用。`
    : `该书源在 ${LOAD_TIMEOUT_MS / 1000} 秒内没有返回目录或正文，可重试，或到书源管理换一个可用书源。`;

  return (
    <ZfPageShell
      bare
      style={shellStyle}
      header={(
        <ReaderTopBar
          title={bodyPhase === 'content' ? currentChapter?.chapterName : null}
          meta={bodyPhase === 'content' && chapters.length ? (() => {
            const progressVal = Math.round((currentChapterIndex + 1) / chapters.length * 1000) / 10;
            const prevVal = prevProgressRef.current;
            prevProgressRef.current = progressVal;
            return (
              <span style={TOPBAR_META_STYLE} className="zf-num">
                <ReactBitsErrorBoundary fallback={`${progressVal}%`}>
                  <CountUp to={progressVal} from={prevVal} duration={0.8} />%
                </ReactBitsErrorBoundary>
              </span>
            );
          })() : null}
          onBack={handleBack}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}
    >
      <div style={stageStyle}>
        {bodyPhase === 'error' ? (
          <ZfErrorState
            title={errorTitle}
            description={errorDescription}
            onRetry={retry}
            style={{ padding: 'var(--zf-s16) var(--zf-s0)' }}
          />
        ) : bodyPhase === 'loading' ? (
          <ZfSkeleton variant="reader" count={2} />
        ) : (
          <>
            <ChapterNav
              chapters={chapters}
              index={currentChapterIndex}
              onSwitch={switchChapter}
              onOpenToc={() => setShowToc(true)}
            />

            <AnimatePresence mode="wait">
              <motion.article
                key={currentChapterIndex}
                variants={CHAPTER_MOTION}
                initial="initial"
                animate="animate"
                exit="exit"
                style={ARTICLE_STYLE}
              >
                {paragraphs ?? <div style={BLANK_STYLE}>正文内容为空，无法显示。</div>}
              </motion.article>
            </AnimatePresence>

            <div style={HAIRLINE_STYLE} />

            <ChapterNav
              chapters={chapters}
              index={currentChapterIndex}
              onSwitch={switchChapter}
              onOpenToc={() => setShowToc(true)}
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {showScrollButtons && bodyPhase === 'content' ? (
          <motion.div
            variants={FLOATER_MOTION}
            initial="initial"
            animate="animate"
            exit="exit"
            style={FLOATER_STYLE}
          >
            <motion.button
              type="button"
              onClick={scrollToTop}
              aria-label="回到顶部"
              whileHover={{ scale: 1.08 }}
              whileTap={variants.hoverPress}
              style={FLOAT_BTN_STYLE}
            >
              <ArrowUpOutlined style={FLOAT_ICON_STYLE} />
            </motion.button>
            <motion.button
              type="button"
              onClick={scrollToBottom}
              aria-label="跳到底部"
              whileHover={{ scale: 1.08 }}
              whileTap={variants.hoverPress}
              style={FLOAT_BTN_STYLE}
            >
              <ArrowDownOutlined style={FLOAT_ICON_STYLE} />
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ReaderSettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={readerSettings}
        onPatch={setReaderSettings}
        sideBySide={sideBySide}
        mdLayout={mdLayout}
        modalWidth={modalWidth}
        activeTheme={shownTheme}
        setDraftColors={setDraftColors}
        commitDraftColors={commitDraftColors}
        choosePreset={choosePreset}
        onBgImageUpload={handleBgImageUpload}
        onReset={resetSettings}
      />

      <TocDrawer
        open={showToc}
        onClose={() => setShowToc(false)}
        currentIndex={currentChapterIndex}
        width={isXs ? '100%' : isMobile ? 280 : 300}
        onPick={switchChapter}
        scrollerRef={tocContainerRef}
        onScroll={handleTocScroll}
        visibleStartIndex={visibleStartIndex}
        visibleChapters={visibleChapters}
        totalHeight={totalHeight}
        offsetY={offsetY}
      />
    </ZfPageShell>
  );
};

export default Reader;
