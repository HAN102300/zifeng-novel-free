/* ============================================================
   紫枫 · 聚合搜索结果（P2 迁移，写法依据 zifeng-ui/MIGRATION.md）
   这一页是全仓库内联样式最重的页面，迁移面较大：
     · 容器交给 ZfPageShell(size=1420)；原先「sticky 头部 Card + 内容 Card」两块面板
       之间的接缝去掉，合并为单一 ZfGlassSurface 控制台（工具条 + 聚合状态 + 三态），
       结果卡直接落在页面栅格里，不再套第二个空面板。
     · 结果项改用共享书籍卡：grid 视图 = ZfCoverCard，list 视图 = 本文件 ResultRow，
       两者读同一个 toCardModel() 归一化结果，信息结构完全一致。
     · 头部原来一行塞了四种控件风格（圆形返回钮 / 放大镜图标 / 渐变衬线「搜索:」/
       蓝色「聚合搜索」胶囊 / 分段控件 / 纯图标视图切换）→ 统一为
       ZfPageHeader + ZfPill + antd Segmented（形状走 ConfigProvider 组件级 token）。
       「聚合搜索」的蓝色换成品牌 tint + --zf-on-tint。
     · ShinyText 不再依赖它的默认灰、也不再由调用处传纯白覆盖（浅色主题下白字
       落浅底不可见），改 --zf-on-tint / --zf-text-primary，并且只在 tier ≥ 1 时挂载。
     · 书源状态胶囊、数据来源胶囊统一 ZfPill 的 tone 变体；空态 ZfEmptyState /
       错误态 ZfErrorState；加载态 ZfSkeleton + ZfSkeletonGrid；取消 antd Spin/Skeleton。
     · 补搜索历史（localStorage，有则渲染）与站内搜索榜热词（NovelContext，有则渲染）。
     · 氛围光球改 .zf-ambient/.zf-ambient__orb + .zf-anim-drift-*：仍是玻璃卡的兄弟层，
       并挂上 --zf-fx-loop 与 [data-fx] 预算，不再是 filter:blur(60px) 的双份写死色。
   已由主 agent 修好且本次保留：?kw= 别名归一化回写、搜索页恢复全局导航栏。
   ============================================================ */

import React, { useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Segmented, Select, Progress } from 'antd';
import {
  AppstoreOutlined, OrderedListOutlined, BookOutlined, SwapOutlined,
  CloseCircleOutlined, SearchOutlined, SyncOutlined,
} from '@ant-design/icons';
import {
  ZfPageShell, ZfGrid, ZfGlassSurface, ZfPageHeader, ZfSectionTitle, ZfPill,
  ZfCoverCard, ZfSkeleton, ZfSkeletonGrid, ZfEmptyState, ZfErrorState, ZfErrorBoundary,
} from '@zifeng/ui/components';
import { variants, SPRING, DUR } from '@zifeng/ui/motion';
import { useFx } from '@zifeng/ui/motion/FxContext';
import { splitTags, hasScore } from '@zifeng/ui/format';
import { NovelContext } from '../App';
import {
  getBookSources, getActiveSource, setActiveSource as saveActiveSource, normalizeSources,
} from '../utils/bookSourceManager';
import { searchBooksAPI, getAllEnabledSources, proxyImageUrl } from '../utils/apiClient';
import { saveNovelCache, simpleHash } from '../utils/novelConfig';
import { adaptSearchResult } from '../utils/bookAdapter';
import { BatchSearchController } from '../utils/batchSearch';
import { CountUp, ShinyText } from '../components/react-bits';

const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000; // 10 分钟
const HISTORY_KEY = 'zifeng_search_history';
const HISTORY_MAX = 10;
const HOT_WORDS_MAX = 10;
const SOURCE_STRIP_MAX = 20;

/* ============================================================
   样式常量（原本 96 处逐处内联的重复串，收在此处一份）
   ============================================================ */

const PANEL_STYLE = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s5)',
  padding: 'var(--zf-s6)',
};

const HAIRLINE_STYLE = {
  height: 0,
  borderTop: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
};

const TOOLBAR_SUB_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  flexWrap: 'wrap',
};

const PILL_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  flexWrap: 'wrap',
  minWidth: 0,
};

/* 书源状态胶囊条：限高滚动，避免几十个书源把面板撑爆 */
const SOURCE_STRIP_STYLE = {
  ...PILL_ROW_STYLE,
  gap: 'var(--zf-s1)',
  maxHeight: 88,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: 'var(--zf-s1)',
};

const STATUS_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--zf-s4)',
  flexWrap: 'wrap',
};

const STATUS_TEXT_STYLE = {
  fontSize: 'var(--zf-fs-base)',
  fontWeight: 600,
  color: 'var(--zf-text-primary)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  flexWrap: 'wrap',
  minWidth: 0,
};

const PROGRESS_BLOCK_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--zf-s3)',
};

const PROGRESS_BAR_STYLE = { width: 'min(240px, 100%)' };

const CAPTION_STYLE = {
  fontSize: 'var(--zf-fs-xs)',
  color: 'var(--zf-text-muted)',
};

const FOOT_TIP_STYLE = {
  textAlign: 'center',
  fontSize: 'var(--zf-fs-sm)',
  color: 'var(--zf-text-faint)',
  paddingBlock: 'var(--zf-s6)',
};

const SUGGESTION_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s3)',
};

const SELECT_STYLE = { minWidth: 120 };

/* —— list 视图行卡：与 ZfCoverCard 同一信息结构，只是横排 —— */
const ROW_STYLE = {
  position: 'relative',
  display: 'flex',
  alignItems: 'stretch',
  gap: 'var(--zf-s4)',
  padding: 'var(--zf-s4)',
  minWidth: 0,
  borderRadius: 'var(--zf-r-lg)',
  background: 'var(--zf-glass-2)',
  backdropFilter: 'var(--zf-blur-glass)',
  WebkitBackdropFilter: 'var(--zf-blur-glass)',
  border: '1px solid var(--zf-glass-border)',
  boxShadow: 'var(--zf-shadow-1), var(--zf-glass-edge-top)',
  cursor: 'pointer',
  transition: 'background-color var(--zf-dur-fast) var(--zf-ease-out), '
    + 'border-color var(--zf-dur-fast) var(--zf-ease-out)',
};

const ROW_HOVER_STYLE = { y: -3 };

const ROW_COVER_STYLE = {
  position: 'relative',
  width: 92,
  aspectRatio: '3 / 4',
  flexShrink: 0,
  borderRadius: 'var(--zf-r-md)',
  overflow: 'hidden',
  background: 'var(--zf-glass-1)',
};

const ROW_COVER_IMG_STYLE = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };

const ROW_COVER_FALLBACK_STYLE = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--zf-font-display)',
  fontSize: 'var(--zf-fs-xl)',
  color: 'var(--zf-text-faint)',
};

const ROW_INFO_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s1)',
  flex: 1,
  minWidth: 0,
};

const ROW_HEAD_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  minWidth: 0,
  flexWrap: 'wrap',
};

const ROW_TITLE_STYLE = {
  fontSize: 'var(--zf-fs-md)',
  fontWeight: 600,
  lineHeight: 'var(--zf-lh-snug)',
  color: 'var(--zf-text-primary)',
  margin: 0,
  minWidth: 0,
};

const ROW_INTRO_STYLE = {
  margin: 0,
  fontSize: 'var(--zf-fs-sm)',
  lineHeight: 'var(--zf-lh-body)',
  color: 'var(--zf-text-muted)',
};

const ROW_FOOT_STYLE = {
  ...ROW_HEAD_STYLE,
  marginTop: 'auto',
  paddingTop: 'var(--zf-s2)',
  justifyContent: 'space-between',
};

const ROW_LATEST_STYLE = {
  fontSize: 'var(--zf-fs-2xs)',
  color: 'var(--zf-text-faint)',
  minWidth: 0,
  flex: '1 1 auto',
};

/* —— 结果进入场：单一变体，grid/list 共用 —— */
const ITEM_MOTION = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: SPRING.snappy },
  exit: { opacity: 0, y: 8, transition: { duration: DUR.fastest / 1000 } },
};

const LIST_STACK_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' };

const LOAD_MORE_STYLE = { paddingBlock: 'var(--zf-s6)' };

/* 建议区里可点击的胶囊：ZfPill 本身是 span，这里补回按钮语义该有的指针 */
const CHIP_STYLE = { cursor: 'pointer' };
const HOT_CHIP_STYLE = { cursor: 'pointer', justifyContent: 'flex-start' };
const SOURCE_PILL_STYLE = { maxWidth: 200 };
const LATENCY_STYLE = { opacity: 0.7 };
const FAB_ICON_STYLE = { fontSize: 'var(--zf-fs-xl)' };
const FAB_LABEL_STYLE = { fontSize: 'var(--zf-fs-2xs)' };
const FOOTER_PILL_STYLE = { alignSelf: 'flex-start' };

const FAB_STYLE = {
  position: 'fixed',
  right: 'var(--zf-s6)',
  bottom: 'var(--zf-s16)',
  zIndex: 'var(--zf-z-toast)',
  width: 56,
  height: 56,
  borderRadius: 'var(--zf-r-full)',
  border: 'none',
  background: 'var(--zf-grad-brand)',
  color: 'var(--zf-on-accent)',
  boxShadow: 'var(--zf-shadow-2), var(--zf-glow-brand)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  cursor: 'pointer',
  padding: 0,
};

const FAB_MOTION = {
  initial: { opacity: 0, scale: 0.82 },
  animate: { opacity: 1, scale: 1, transition: SPRING.magnetic },
  exit: { opacity: 0, scale: 0.82, transition: { duration: DUR.fastest / 1000 } },
};

/* 光球：尺寸/位置在这里，圆角 + filter:blur + animation-play-state 由
   .zf-ambient__orb / .zf-anim-drift-* 提供（含 --zf-fx-loop 与 [data-fx] 预算） */
const ORB_A_STYLE = {
  top: '8%',
  right: '-6%',
  width: 380,
  height: 380,
  background: 'radial-gradient(circle, rgb(var(--zf-brand-rgb-500) / 0.16) 0%, transparent 68%)',
};

const ORB_B_STYLE = {
  bottom: '18%',
  left: '-6%',
  width: 320,
  height: 320,
  background: 'radial-gradient(circle, rgb(var(--zf-brand-rgb-400) / 0.13) 0%, transparent 68%)',
};

/* ============================================================
   纯函数与最小组件
   ============================================================ */

/** react-bits 每个调用点都要一层边界，统一收进共享 ZfErrorBoundary */
function Bits({ fallback, children }) {
  return <ZfErrorBoundary fallback={fallback}>{children}</ZfErrorBoundary>;
}

const getSearchCacheKey = (keyword, searchMode) => `search_results_${keyword}_${searchMode}`;

const saveSearchResultsToSession = (keyword, searchMode, data) => {
  try {
    sessionStorage.setItem(getSearchCacheKey(keyword, searchMode), JSON.stringify({ ...data, timestamp: Date.now() }));
  } catch {
    /* 配额满就不缓存 */
  }
};

const loadSearchResultsFromSession = (keyword, searchMode) => {
  try {
    const raw = sessionStorage.getItem(getSearchCacheKey(keyword, searchMode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > SEARCH_CACHE_TTL_MS) {
      sessionStorage.removeItem(getSearchCacheKey(keyword, searchMode));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const clearSearchResultsSession = (keyword, searchMode) => {
  try {
    sessionStorage.removeItem(getSearchCacheKey(keyword, searchMode));
  } catch {
    /* 清不掉就算了 */
  }
};

/* —— 搜索历史：站内目前只有这一处会写它，键不存在时建议区整块不渲染 —— */
function loadSearchHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((k) => typeof k === 'string' && k.trim()).slice(0, HISTORY_MAX) : [];
  } catch {
    return [];
  }
}

function pushSearchHistory(keyword) {
  const kw = String(keyword || '').trim();
  if (!kw) return;
  try {
    const next = [kw, ...loadSearchHistory().filter((k) => k !== kw)].slice(0, HISTORY_MAX);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadSearchHistory();
  }
}

/**
 * 结果项归一化：grid 的 ZfCoverCard 与 list 的 ResultRow 读同一个模型，
 * 保证两种视图信息结构一致（书名/作者/分类/评分/最新章/来源）。
 */
function toCardModel(book) {
  const name = book.name || book.novelName || '未命名';
  const kind = book.kind || book.category || '';
  return {
    ...book,
    name,
    author: book.author || book.authorName || '未知作者',
    cover: proxyImageUrl(book.coverUrl || book.cover),
    category: splitTags(kind, { limit: 1 })[0] || '',
    latestChapterTitle: book.lastChapter || '',
    sourceTag: book.sourceTag || book.sourceName || '',
  };
}

/** list 视图行卡 —— 结构与 ZfCoverCard 对齐，只是封面在左 */
function ResultRow({ book, onOpen }) {
  const { enabled } = useFx();
  const interactive = typeof onOpen === 'function';
  const open = () => onOpen(book);

  return (
    <motion.article
      layout
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? open : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
              }
            }
          : undefined
      }
      whileHover={enabled('tilt') && interactive ? ROW_HOVER_STYLE : undefined}
      whileTap={interactive ? { scale: 0.995 } : undefined}
      transition={SPRING.snappy}
      className="zf-cover-card"
      style={ROW_STYLE}
    >
      <div style={ROW_COVER_STYLE}>
        {book.cover ? (
          <img src={book.cover} alt="" loading="lazy" style={ROW_COVER_IMG_STYLE} />
        ) : (
          <span aria-hidden="true" style={ROW_COVER_FALLBACK_STYLE}>
            {book.name.slice(0, 1)}
          </span>
        )}
      </div>

      <div style={ROW_INFO_STYLE}>
        <div style={ROW_HEAD_STYLE}>
          <h3 className="zf-truncate" style={ROW_TITLE_STYLE} title={book.name}>{book.name}</h3>
          {hasScore(book.score) ? <ZfPill size="xs" tone="warning">{Number(book.score).toFixed(1)}</ZfPill> : null}
          {book.sourceTag ? <ZfPill size="xs">{book.sourceTag}</ZfPill> : null}
        </div>

        <div className="zf-caption zf-truncate">{book.author}</div>

        {book.intro || book.summary ? (
          <p className="zf-clamp-2" style={ROW_INTRO_STYLE}>{book.intro || book.summary}</p>
        ) : null}

        <div style={ROW_FOOT_STYLE}>
          <div style={PILL_ROW_STYLE}>
            {book.category ? <ZfPill size="xs" tone="brand">{book.category}</ZfPill> : null}
            {book.latestChapterTitle ? (
              <span className="zf-truncate" style={ROW_LATEST_STYLE}>最新 · {book.latestChapterTitle}</span>
            ) : null}
          </div>
          <Button
            size="small"
            classNames={{ root: 'zf-btn zf-btn--ghost' }}
            icon={<BookOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            查看详情
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

/** 书源状态胶囊：success=有结果 / neutral=空结果 / error=失败，三档语义固定 */
function SourcePill({ detail }) {
  const tone = !detail.success ? 'error' : detail.resultCount > 0 ? 'success' : 'neutral';
  const tail = detail.success
    ? (detail.resultCount > 0 ? `${detail.resultCount} 条` : '无结果')
    : (detail.error || '失败');

  return (
    <ZfPill
      size="xs"
      tone={tone}
      title={detail.error ? `${detail.sourceName}：${detail.error}` : undefined}
      style={SOURCE_PILL_STYLE}
    >
      <span className="zf-truncate">{detail.sourceName}</span>
      <span className="zf-num">{tail}</span>
      {detail.success && Number.isFinite(detail.latencyMs) ? (
        <span className="zf-num" style={LATENCY_STYLE}>{detail.latencyMs}ms</span>
      ) : null}
    </ZfPill>
  );
}

const SearchResult = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  /* 站内跳转过来用 keyword，但历史/外链常用 ?kw=。
     原先只读 keyword，导致 ?kw=剑 进来显示「请输入搜索关键词」。
     这里兼容两种写法并归一化回写，地址栏只保留 keyword 一种。 */
  const kwAlias = searchParams.get('kw');
  const keyword = searchParams.get('keyword') || kwAlias || '';
  useEffect(() => {
    if (kwAlias && !searchParams.get('keyword')) {
      const next = new URLSearchParams(searchParams);
      next.delete('kw');
      next.set('keyword', kwAlias);
      setSearchParams(next, { replace: true });
    }
  }, [kwAlias, searchParams, setSearchParams]);

  const { enabled } = useFx();
  const { novels: rankBooks } = useContext(NovelContext) || {};

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);
  const [layout, setLayout] = useState(() => localStorage.getItem('search_layout') || 'list');
  const [activeSource, setActiveSourceState] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchCancelled, setSearchCancelled] = useState(false);
  const [history, setHistory] = useState(loadSearchHistory);

  const [searchMode, setSearchMode] = useState(() => {
    try { return localStorage.getItem('zifeng_search_mode') || 'aggregated'; }
    catch { return 'aggregated'; }
  });
  const [aggregatedMeta, setAggregatedMeta] = useState(null);
  const [sourceDetails, setSourceDetails] = useState([]);
  const [batchProgress, setBatchProgress] = useState(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const batchControllerRef = useRef(null);

  const abortControllerRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);
  const searchTimerRef = useRef(null);
  const prevResultCountRef = useRef(0);
  const resultsCacheRef = useRef({ aggregated: null, single: null });
  const lastKeywordRef = useRef('');

  useEffect(() => {
    const loadSources = async () => {
      let enabled2 = [];
      try {
        const res = await getAllEnabledSources();
        const backendSources = res.data?.data;
        if (backendSources && backendSources.length > 0) {
          enabled2 = normalizeSources(backendSources).filter((s) => s.enabled);
        }
      } catch {
        /* 后端不可用时退回本地书源 */
      }

      if (enabled2.length === 0) {
        enabled2 = getBookSources().filter((s) => s.enabled);
      }
      setAvailableSources(enabled2);

      let activeUrl = '';
      try {
        activeUrl = localStorage.getItem('zifeng_active_source') || '';
      } catch {
        /* 无记录 */
      }

      const normalizeUrl = (url) => (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();
      let matchedSource = null;

      if (activeUrl) {
        matchedSource = enabled2.find((s) => s.bookSourceUrl === activeUrl);
        if (!matchedSource) {
          const norm = normalizeUrl(activeUrl);
          matchedSource = enabled2.find((s) => normalizeUrl(s.bookSourceUrl) === norm);
        }
      }

      if (!matchedSource) {
        const localActive = getActiveSource();
        if (localActive && localActive.bookSourceUrl) {
          matchedSource = enabled2.find((s) => s.bookSourceUrl === localActive.bookSourceUrl);
          if (!matchedSource) {
            const norm = normalizeUrl(localActive.bookSourceUrl);
            matchedSource = enabled2.find((s) => normalizeUrl(s.bookSourceUrl) === norm);
          }
          if (!matchedSource) {
            matchedSource = enabled2.find((s) => s.bookSourceName === localActive.bookSourceName);
          }
        }
      }

      if (!matchedSource && enabled2.length > 0) matchedSource = enabled2[0];

      if (matchedSource) {
        setActiveSourceState(matchedSource);
        saveActiveSource(matchedSource.bookSourceUrl);
      }

      setSourcesLoaded(true);
    };
    loadSources();
  }, []);

  const cancelSearch = useCallback(() => {
    if (batchControllerRef.current) {
      batchControllerRef.current.abort();
      batchControllerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSearchCancelled(true);
    setLoading(false);
    setLoadingMore(false);
    loadingMoreRef.current = false;
    setBatchRunning(false);
    setBatchProgress(null);
    if (searchTimerRef.current) {
      clearInterval(searchTimerRef.current);
      searchTimerRef.current = null;
    }
  }, []);

  const fetchSearchResults = useCallback(async (searchKeyword, pageNum, isLoadMore = false, sourceOverride = null) => {
    if (!searchKeyword.trim()) return;
    if (isLoadMore && loadingMoreRef.current) return;

    const source = sourceOverride || activeSource;
    if (!source) return;

    if (isLoadMore) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      setSearchCancelled(false);
      setSearchProgress(0);
      setLoading(true);

      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      let elapsed = 0;
      searchTimerRef.current = setInterval(() => {
        elapsed += 100;
        setSearchProgress(Math.min(90, (elapsed / 15000) * 90));
      }, 100);
    }

    try {
      let list = null;

      try {
        const result = await searchBooksAPI(source, searchKeyword, pageNum);
        if (result.success) list = result.results || [];
      } catch (e) {
        if (e.name === 'AbortError' || e.code === 'ERR_CANCELED') return;
        console.warn('搜索失败:', e.message);
      }

      if (searchCancelled) return;
      if (list === null) list = [];

      const adapted = list.map((item) => adaptSearchResult(item, source) || item);

      if (adapted.length > 0) {
        setHistory(pushSearchHistory(searchKeyword));
        if (isLoadMore) setResults((prev) => [...prev, ...adapted]);
        else setResults(adapted);

        if (adapted.length < 10) {
          setHasMore(false);
          hasMoreRef.current = false;
          setAllLoaded(true);
        } else {
          setHasMore(true);
          hasMoreRef.current = true;
          setAllLoaded(false);
        }
      } else if (isLoadMore) {
        setHasMore(false);
        hasMoreRef.current = false;
        setAllLoaded(true);
      } else {
        setHistory(pushSearchHistory(searchKeyword));
        setResults([]);
        setHasMore(false);
        hasMoreRef.current = false;
        setAllLoaded(true);
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('搜索失败:', error);
      if (!isLoadMore) setResults([]);
      setHasMore(false);
      hasMoreRef.current = false;
      setAllLoaded(true);
    } finally {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setSearchProgress(100);
      abortControllerRef.current = null;
    }
  }, [activeSource, searchCancelled]);

  const startBatchSearch = useCallback(async (searchKeyword, availableSourceList) => {
    if (!searchKeyword.trim()) return;

    cancelSearch();

    setSearchCancelled(false);
    setLoading(true);
    setSearchProgress(0);
    setResults([]);
    setAggregatedMeta(null);
    setSourceDetails([]);
    setBatchProgress(null);
    setBatchRunning(true);
    setHasMore(false);
    hasMoreRef.current = false;
    setAllLoaded(true);

    const controller = new BatchSearchController(availableSourceList, searchKeyword);
    batchControllerRef.current = controller;

    const startTime = Date.now();
    const totalSources = availableSourceList.length;

    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (totalSources <= 10) setSearchProgress(Math.min(90, (elapsed / 10000) * 90));
      else setSearchProgress(Math.min(70, (elapsed / 20000) * 70));
    }, 200);

    try {
      let firstDone = false;

      for await (const progress of controller.execute()) {
        if (searchCancelled || controller.aborted) break;

        setResults((prev) => {
          const existingKeys = new Set(prev.map((b) => `${b.name}__${b.author}`));
          const newBooks = progress.books.filter((b) => !existingKeys.has(`${b.name}__${b.author}`));
          if (newBooks.length > 0) return [...prev, ...newBooks];
          const merged = prev.map((existing) => {
            const match = progress.books.find((b) => b.name === existing.name && b.author === existing.author);
            if (match && match.availableSourceNames?.length > existing.availableSourceNames?.length) {
              return { ...existing, ...match, sourceTag: match.sourceTag || existing.sourceTag };
            }
            return existing;
          });
          const hasChanges = merged.some((m, i) => m !== prev[i]);
          return hasChanges ? merged : prev;
        });
        prevResultCountRef.current = progress.books.length;
        setSourceDetails(progress.sourceDetails);
        setBatchProgress(progress);

        setAggregatedMeta({
          totalSources,
          succeededSources: progress.succeededSources,
          failedSources: progress.failedSources,
          totalResults: progress.totalResults,
          deduplicatedResults: progress.books.length,
          elapsedMs: progress.elapsedMs,
        });

        if (!firstDone && progress.books.length > 0) {
          firstDone = true;
          setLoading(false);
          setSearchProgress(100);
          setHistory(pushSearchHistory(searchKeyword));
        }

        if (progress.finished) break;
      }
    } catch (err) {
      console.error('分批搜索出错:', err);
    } finally {
      clearInterval(progressTimer);
      setLoading(false);
      setSearchProgress(100);
      setBatchRunning(false);

      if (!controller.aborted) {
        const final = controller.buildProgress();
        setBatchProgress(final);
        setResults(final.books);
        prevResultCountRef.current = final.books.length;
        setSourceDetails(final.sourceDetails);
        setAggregatedMeta({
          totalSources,
          succeededSources: final.succeededSources,
          failedSources: final.failedSources,
          totalResults: final.totalResults,
          deduplicatedResults: final.books.length,
          elapsedMs: final.elapsedMs,
        });
        if (final.books.length > 0) setHistory(pushSearchHistory(searchKeyword));
      }

      batchControllerRef.current = null;
    }
  }, [searchCancelled, cancelSearch]);

  useEffect(() => {
    // 关键词变化时清空缓存（通过 ref 比较）
    if (lastKeywordRef.current !== keyword) {
      if (lastKeywordRef.current) {
        clearSearchResultsSession(lastKeywordRef.current, 'aggregated');
        clearSearchResultsSession(lastKeywordRef.current, 'single');
      }
      resultsCacheRef.current = { aggregated: null, single: null };
      lastKeywordRef.current = keyword;
    }

    if (keyword && sourcesLoaded) {
      const cached = searchMode === 'aggregated' ? resultsCacheRef.current.aggregated : resultsCacheRef.current.single;
      if (cached && cached.results && cached.results.length > 0) {
        setResults(cached.results);
        if (searchMode === 'aggregated') {
          setAggregatedMeta(cached.aggregatedMeta);
          setSourceDetails(cached.sourceDetails || []);
        }
        return;
      }

      const sessionCache = loadSearchResultsFromSession(keyword, searchMode);
      if (sessionCache && sessionCache.results && sessionCache.results.length > 0) {
        setResults(sessionCache.results);
        if (searchMode === 'aggregated') {
          setAggregatedMeta(sessionCache.aggregatedMeta);
          setSourceDetails(sessionCache.sourceDetails || []);
          setBatchProgress(sessionCache.batchProgress);
          setHasMore(false);
          setAllLoaded(true);
        } else {
          setPage(sessionCache.page || 1);
          setHasMore(sessionCache.hasMore || false);
        }
        setBatchRunning(false);
        return; // 不触发搜索
      }

      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      hasMoreRef.current = true;
      setAllLoaded(false);
      setResults([]);
      setAggregatedMeta(null);
      setSourceDetails([]);
      setBatchProgress(null);
      if (searchMode === 'aggregated') {
        startBatchSearch(keyword, availableSources.filter((s) => s.enabled !== false));
      } else if (activeSource) {
        fetchSearchResults(keyword, 1);
      }
    }
    return () => {
      if (batchControllerRef.current) {
        batchControllerRef.current.abort();
        batchControllerRef.current = null;
      }
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [keyword, sourcesLoaded, searchMode]);

  useEffect(() => {
    if (!activeSource || !keyword) return;
    if (searchMode !== 'single') return;
    setPage(1);
    pageRef.current = 1;
    setHasMore(true);
    hasMoreRef.current = true;
    setAllLoaded(false);
    setResults([]);
    fetchSearchResults(keyword, 1);
  }, [activeSource]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreRef.current || loadingMoreRef.current || allLoaded) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      if (scrollTop + clientHeight >= scrollHeight - 200) {
        const nextPage = pageRef.current + 1;
        pageRef.current = nextPage;
        setPage(nextPage);
        fetchSearchResults(keyword, nextPage, true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [keyword, fetchSearchResults, allLoaded]);

  // 聚合结果变化时写入 sessionStorage
  useEffect(() => {
    if (searchMode === 'aggregated' && keyword && results.length > 0) {
      saveSearchResultsToSession(keyword, 'aggregated', {
        results, aggregatedMeta, sourceDetails, batchProgress,
      });
    }
  }, [results, aggregatedMeta, sourceDetails, batchProgress, searchMode, keyword]);

  // 单书源结果变化时写入 sessionStorage
  useEffect(() => {
    if (searchMode === 'single' && keyword && results.length > 0) {
      saveSearchResultsToSession(keyword, 'single', { results, page, hasMore });
    }
  }, [results, page, hasMore, searchMode, keyword]);

  const handleSourceChange = (url) => {
    const source = availableSources.find((s) => s.bookSourceUrl === url);
    if (source) {
      setActiveSourceState(source);
      saveActiveSource(url);
    }
  };

  const toggleLayout = (val) => {
    setLayout(val);
    localStorage.setItem('search_layout', val);
  };

  const switchMode = (val) => {
    // 缓存当前模式的结果
    if (searchMode === 'aggregated') {
      resultsCacheRef.current.aggregated = { results, aggregatedMeta, sourceDetails, batchProgress };
    } else {
      resultsCacheRef.current.single = { results, page, hasMore };
    }
    setSearchMode(val);
    localStorage.setItem('zifeng_search_mode', val);

    // 尝试从缓存恢复目标模式的结果
    const cached = val === 'aggregated' ? resultsCacheRef.current.aggregated : resultsCacheRef.current.single;
    if (cached && cached.results) {
      setResults(cached.results);
      if (val === 'aggregated') {
        setAggregatedMeta(cached.aggregatedMeta);
        setSourceDetails(cached.sourceDetails || []);
        setBatchProgress(cached.batchProgress);
        setHasMore(false);
        setAllLoaded(true);
      } else {
        setPage(cached.page || 1);
        setHasMore(cached.hasMore || false);
      }
      return;
    }
    // 无缓存则清空结果，触发重新搜索
    setResults([]);
    setAggregatedMeta(null);
    setSourceDetails([]);
  };

  const navigateToDetail = (book) => {
    if (!activeSource) return;
    const sourceUrl = activeSource.bookSourceUrl;
    const bookUrl = book.bookUrl || book._sourceUrl || book.url || String(book.id || '');
    saveNovelCache(book, sourceUrl, bookUrl);

    const searchQuery = new URLSearchParams();
    searchQuery.set('from', 'search');
    searchQuery.set('keyword', keyword);
    searchQuery.set('sourceUrl', sourceUrl);
    searchQuery.set('bookUrl', bookUrl);

    const bookKey = simpleHash(sourceUrl + '_' + bookUrl);
    navigate(`/novel/${bookKey}?${searchQuery.toString()}`);
  };

  const handleBack = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    navigate(-1);
  };

  const runSearch = (word) => {
    const kw = String(word || '').trim();
    if (!kw) return;
    const next = new URLSearchParams(searchParams);
    next.set('keyword', kw);
    next.delete('kw');
    navigate(`/search?${next.toString()}`);
  };

  /* —— 热词：站内搜索榜（App 已取好在内存，无数据就不渲染这一块） —— */
  const hotWords = useMemo(() => {
    const list = rankBooks?.search;
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const out = [];
    list.forEach((item) => {
      const word = String(item?.name || '').trim();
      if (!word || seen.has(word)) return;
      seen.add(word);
      out.push(word);
    });
    return out.slice(0, HOT_WORDS_MAX);
  }, [rankBooks]);

  const cards = useMemo(() => results.map(toCardModel), [results]);

  const running = loading || batchRunning;
  const noKeyword = !keyword;
  /* sourcesLoaded 之前不算「无结果」，否则书源还没读出来就闪一次空态 */
  const isEmpty = !running && sourcesLoaded && keyword && cards.length === 0;
  const allSourcesFailed = aggregatedMeta
    && aggregatedMeta.totalSources > 0
    && aggregatedMeta.succeededSources === 0;

  /* 面板标题右侧的操作位：返回 + 模式 + 书源 + 视图 */
  const toolbarActions = (
    <>
      <Button classNames={{ root: 'zf-btn zf-btn--glass' }} onClick={handleBack}>
        返回
      </Button>
      <Segmented
        value={searchMode}
        onChange={switchMode}
        size="small"
        options={[
          { value: 'aggregated', label: '全部书源' },
          { value: 'single', label: '单书源' },
        ]}
      />
      {sourcesLoaded && activeSource && searchMode === 'single' ? (
        <Select
          value={activeSource.bookSourceUrl}
          onChange={handleSourceChange}
          size="small"
          style={SELECT_STYLE}
          suffixIcon={<SwapOutlined />}
          options={availableSources.map((s) => ({ value: s.bookSourceUrl, label: s.bookSourceName }))}
        />
      ) : null}
      <Segmented
        value={layout}
        onChange={toggleLayout}
        aria-label="结果视图"
        options={[
          { value: 'list', icon: <OrderedListOutlined /> },
          { value: 'grid', icon: <AppstoreOutlined /> },
        ]}
      />
    </>
  );

  const showSuggestions = (noKeyword || isEmpty) && (history.length > 0 || hotWords.length > 0);

  return (
    <ZfPageShell size="xl">
      {/* 氛围光球：玻璃面板的兄弟层，动画与预算由 .zf-ambient__orb + .zf-anim-drift-* 承接 */}
      <div className="zf-ambient" aria-hidden="true">
        <span className="zf-ambient__orb zf-anim-drift" style={ORB_A_STYLE} />
        <span className="zf-ambient__orb zf-anim-drift-b" style={ORB_B_STYLE} />
      </div>

      {/* ============== 单一控制台面板：工具条 + 聚合状态 + 三态 ============== */}
      <ZfGlassSurface level={2} style={PANEL_STYLE}>
        <ZfPageHeader
          title={noKeyword ? '搜索' : `搜索：${keyword}`}
          icon={<SearchOutlined />}
          subtitle={
            <div style={TOOLBAR_SUB_STYLE}>
              {searchMode === 'aggregated' ? (
                <ZfPill tone="brand" size="sm">
                  <Bits fallback="聚合搜索">
                    {enabled('shimmer') ? (
                      <ShinyText
                        text="聚合搜索"
                        speed={3}
                        color="var(--zf-on-tint)"
                        shineColor="var(--zf-brand-300)"
                        spread={120}
                      />
                    ) : '聚合搜索'}
                  </Bits>
                </ZfPill>
              ) : null}
              <span style={CAPTION_STYLE}>
                {searchMode === 'aggregated'
                  ? `已启用 ${availableSources.length} 个书源`
                  : `当前书源：${activeSource?.bookSourceName || '未选择'}`}
              </span>
            </div>
          }
          extra={toolbarActions}
        />

        <div style={HAIRLINE_STYLE} />

        {/* —— 聚合统计 + 书源状态 —— */}
        {searchMode === 'aggregated' && aggregatedMeta && cards.length > 0 ? (
          (() => {
            /* 去重后的条数以实际渲染列表为唯一事实源。
               aggregatedMeta.deduplicatedResults 在缓存恢复 / 分批累积等路径下
               可能与 results 实际长度不一致（实测出现过「共 0 条结果」却渲染 40 张卡）。 */
            const dedupCount = cards.length;
            return (
          <div style={STATUS_ROW_STYLE}>
            <div style={STATUS_TEXT_STYLE}>
              {batchRunning ? (
                <>
                  正在搜索
                  <Bits fallback={dedupCount}>
                    <CountUp to={dedupCount} from={prevResultCountRef.current} duration={0.6} />
                  </Bits>
                  条结果（已去重）
                  <ZfPill tone="info" size="sm" icon={<SyncOutlined />}>
                    {batchProgress ? `${batchProgress.completedSources}/${batchProgress.totalSources} 个书源` : '搜索中'}
                  </ZfPill>
                </>
              ) : (
                <>
                  共
                  <Bits fallback={dedupCount}>
                    <CountUp to={dedupCount} from={0} duration={1.2} />
                  </Bits>
                  条结果
                  <span style={CAPTION_STYLE}>
                    （去重前 <Bits fallback={aggregatedMeta.totalResults}><CountUp to={aggregatedMeta.totalResults} from={0} duration={1.2} /></Bits> 条）
                  </span>
                </>
              )}
            </div>
            <span style={CAPTION_STYLE}>
              {aggregatedMeta.succeededSources}/{aggregatedMeta.totalSources} 个书源
              {batchRunning ? '已响应' : '成功'}，耗时 <span className="zf-num">{aggregatedMeta.elapsedMs}</span>ms
            </span>
          </div>
            );
          })()
        ) : null}

        {sourceDetails.length > 0 && (searchMode === 'aggregated') ? (
          <div style={SOURCE_STRIP_STYLE}>
            {(running ? sourceDetails.slice(-SOURCE_STRIP_MAX) : sourceDetails).map((sd, i) => (
              <SourcePill key={`${sd.sourceName}-${i}`} detail={sd} />
            ))}
            {running && sourceDetails.length > SOURCE_STRIP_MAX ? (
              <ZfPill size="xs">…共 {sourceDetails.length} 个书源</ZfPill>
            ) : null}
          </div>
        ) : null}

        {/* —— 加载态：进度 + 取消 —— */}
        {running && cards.length === 0 ? (
          <div style={PROGRESS_BLOCK_STYLE}>
            <div style={PROGRESS_BAR_STYLE}>
              <Progress percent={Math.round(searchProgress)} showInfo={false} size="small" />
            </div>
            <span style={CAPTION_STYLE}>
              {searchMode === 'aggregated'
                ? (batchProgress
                  ? `正在搜索书源… 已搜索 ${batchProgress.completedSources}/${batchProgress.totalSources} 个（${batchProgress.succeededSources} 成功，${batchProgress.failedSources} 失败）`
                  : `正在准备搜索 ${availableSources.length} 个书源…`)
                : `正在从「${activeSource?.bookSourceName || '书源'}」搜索…`}
            </span>
            <Button type="text" classNames={{ root: 'zf-btn' }} icon={<CloseCircleOutlined />} onClick={cancelSearch}>
              取消搜索
            </Button>
          </div>
        ) : null}

        {/* —— 空态 / 错误态 —— */}
        {isEmpty ? (
          <div style={SUGGESTION_STYLE}>
            {allSourcesFailed ? (
              <ZfErrorState
                title="所有书源都没有响应"
                description={`已尝试 ${aggregatedMeta.totalSources} 个书源，全部失败。多半是网络或源站变动，可稍后重试或换个书源。`}
                onRetry={() => startBatchSearch(keyword, availableSources.filter((s) => s.enabled !== false))}
              />
            ) : (
              <ZfEmptyState
                compact
                icon={<SearchOutlined />}
                title={aggregatedMeta && aggregatedMeta.totalResults > 0
                  ? `去重后 0 条结果（原始 ${aggregatedMeta.totalResults} 条）`
                  : `未找到与「${keyword}」相关的小说`}
                description="换个更短的关键词、或用书名里的核心词再试一次。"
                action={
                  <Button
                    type="primary"
                    classNames={{ root: 'zf-btn zf-btn--brand' }}
                    icon={<SearchOutlined />}
                    onClick={handleBack}
                  >
                    重新搜索
                  </Button>
                }
              />
            )}
          </div>
        ) : null}

        {noKeyword ? (
          <ZfEmptyState
            compact
            icon={<SearchOutlined />}
            title="请输入搜索关键词"
            description="书名或作者名都可以；聚合模式会同时问一遍已启用的书源。"
          />
        ) : null}

        {/* —— 搜索历史 / 热词建议：有数据才渲染 —— */}
        {showSuggestions ? (
          <>
            <div style={HAIRLINE_STYLE} />
            <div style={SUGGESTION_STYLE}>
              {history.length > 0 ? (
                <section style={SUGGESTION_STYLE}>
                  <ZfSectionTitle title="搜索历史" variant="bare" animated={false} />
                  <div style={PILL_ROW_STYLE}>
                    {history.map((word) => (
                      <ZfPill
                        key={word}
                        size="md"
                        role="button"
                        tabIndex={0}
                        style={CHIP_STYLE}
                        onClick={() => runSearch(word)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            runSearch(word);
                          }
                        }}
                      >
                        {word}
                      </ZfPill>
                    ))}
                    <Button
                      type="text"
                      size="small"
                      classNames={{ root: 'zf-btn' }}
                      onClick={() => {
                        localStorage.removeItem(HISTORY_KEY);
                        setHistory([]);
                      }}
                    >
                      清空
                    </Button>
                  </div>
                </section>
              ) : null}

              {hotWords.length > 0 ? (
                <section style={SUGGESTION_STYLE}>
                  <ZfSectionTitle title="热门搜索" variant="bare" animated={false} sub="取自站内搜索榜" />
                  <ZfGrid min={160} gap="var(--zf-s2)">
                    {hotWords.map((word, i) => (
                      <ZfPill
                        key={word}
                        size="md"
                        tone={i < 3 ? 'brand' : 'neutral'}
                        role="button"
                        tabIndex={0}
                        style={HOT_CHIP_STYLE}
                        onClick={() => runSearch(word)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            runSearch(word);
                          }
                        }}
                      >
                        <span className="zf-truncate">{word}</span>
                      </ZfPill>
                    ))}
                  </ZfGrid>
                </section>
              ) : null}
            </div>
          </>
        ) : null}
      </ZfGlassSurface>

      {/* ============== 结果区 ============== */}
      <AnimatePresence mode="wait">
        {running && cards.length === 0 ? (
          <motion.div key="skeleton" variants={variants.fadeIn} initial="initial" animate="animate" exit="exit">
            {layout === 'list'
              ? <ZfSkeleton variant="row" count={6} gap="var(--zf-s3)" />
              : <ZfSkeletonGrid count={9} />}
          </motion.div>
        ) : cards.length > 0 ? (
          <motion.div key="results" variants={variants.fadeIn} initial="initial" animate="animate" exit="exit">
            {layout === 'list' ? (
              <div style={LIST_STACK_STYLE}>
                {cards.map((book, index) => (
                  <motion.div
                    key={`${book.id || book.bookUrl}-${index}`}
                    variants={ITEM_MOTION}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <ResultRow book={book} onOpen={navigateToDetail} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <ZfGrid min={168} gap="var(--zf-s4)">
                {cards.map((book, index) => (
                  <motion.div
                    key={`${book.id || book.bookUrl}-${index}`}
                    variants={ITEM_MOTION}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <ZfCoverCard
                      novel={book}
                      onOpen={navigateToDetail}
                      footer={book.sourceTag ? (
                        <ZfPill size="xs" style={FOOTER_PILL_STYLE}>{book.sourceTag}</ZfPill>
                      ) : null}
                    />
                  </motion.div>
                ))}
              </ZfGrid>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loadingMore ? (
        <div style={LOAD_MORE_STYLE}>
          <ZfSkeleton variant="row" count={2} />
        </div>
      ) : null}

      {allLoaded && !loadingMore && !batchRunning && cards.length > 0 ? (
        <motion.p variants={variants.fadeUp} initial="initial" animate="animate" style={FOOT_TIP_STYLE}>
          已加载全部 <span className="zf-num">{cards.length}</span> 条结果
        </motion.p>
      ) : null}

      {/* —— 聚合进行中：常驻停止按钮 —— */}
      <AnimatePresence>
        {batchRunning ? (
          <motion.button type="button" {...FAB_MOTION} onClick={cancelSearch} style={FAB_STYLE} title="停止搜索">
            <CloseCircleOutlined style={FAB_ICON_STYLE} />
            <span style={FAB_LABEL_STYLE}>停止</span>
          </motion.button>
        ) : null}
      </AnimatePresence>
    </ZfPageShell>
  );
};

export default SearchResult;
