/* ============================================================
   紫枫 · 小说详情（P2 迁移，写法依据 zifeng-ui/MIGRATION.md）
     · 容器宽度交给 ZfPageShell(size=lg)；栅格用令牌 grid + ZfGrid，删掉 antd Row/Col。
     · 页面不再自带一层 NovelBackground —— App.jsx 的 Content 已为非阅读/搜索页渲染
       同款氛围层（/novel 路由的 char 正是「墨」），页面再叠一份等于双份 infinite
       墨团，而且那份没挂 --zf-fx-loop 总闸。
     · 四格元信息从「1px 实线网格」改为玻璃面板内的令牌栅格（META_* 常量），
       不再与玻璃语言打架。
     · 「简介」的 Divider（线穿过文字 + 左侧多出一截短线）改为 ZfSectionTitle ink。
     · 标签走 toCategoryList（评分/更新时间这类元数据不再混进标签），评分只出现一次。
     · 补「章节目录」与「相关推荐」：目录数据来自页面自取的 toc，与「开始阅读」
       共用同一次请求；推荐数据来自站内榜单 NovelContext，无数据则整块不渲染。
     · react-bits 原先每个调用点手工套一层边界，统一收进 <Bits>（共享 ZfErrorBoundary）。
     · 封面只统一圆角/比例（3:4，与 ZfCoverCard 同比例）；水印属数据源问题，不做处理。
   ============================================================ */

import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Button, message } from 'antd';
import { CheckOutlined, LeftOutlined, ReadOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
  ZfPageShell, ZfGrid, ZfGlassSurface, ZfSectionTitle, ZfPill, ZfCoverCard,
  ZfSkeleton, ZfEmptyState, ZfErrorState, ZfErrorBoundary,
} from '@zifeng/ui/components';
import { variants, SPRING } from '@zifeng/ui/motion';
import { useFx } from '@zifeng/ui/motion/FxContext';
import { useBreakpoint } from '@zifeng/ui/hooks';
import { fontWeight as FW } from '@zifeng/ui/tokens';
import {
  toCategoryList, parseNumericValue, hasScore, formatScore, cleanChapterName,
} from '@zifeng/ui/format';
import { NovelContext } from '../App';
import { addToBookShelf, addToReadHistory, getUserInfo, getBookShelf } from '../utils/storage';
import {
  getBookInfoAPI, getTocAPI, addToBookshelf as apiAddToBookshelf,
  checkBookInShelf, unifiedBookInfoAPI, proxyImageUrl,
} from '../utils/apiClient';
import {
  getBookSources, getDefaultSource as getDefaultSourceFromManager, normalizeSource,
} from '../utils/bookSourceManager';
import {
  loadNovelCache, saveNovelCache, loadReaderCache, saveReaderCache, simpleHash,
  getDefaultSource, isDefaultSource,
} from '../utils/novelConfig';
import { adaptBookInfo, computeCompleteness } from '../utils/bookAdapter';
import { ShinyText, CountUp } from '../components/react-bits';
import { numberToChinese } from '../utils/numberToChinese';

/* 目录默认只渲染前 N 章，展开后仍设上限 —— 三千章一次性上屏会卡住首帧 */
const TOC_PREVIEW = 24;
const TOC_MAX = 200;
const RELATED_MAX = 8;

/* ============================================================
   样式常量：一处定义，多处引用（MIGRATION §6.2 的「样式并入令牌」）
   ============================================================ */

const HEADER_ROW_STYLE = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 'var(--zf-s4)',
  flexWrap: 'wrap',
};

const HEADER_TITLE_BLOCK_STYLE = { minWidth: 0 };

const BOOK_TITLE_STYLE = { minWidth: 0, margin: 0 };

/* 中文长数字用展示衬线体，与 --zf-font-display 同一诉求的第二处用法 */
const SERIF_NUM_STYLE = { fontFamily: 'var(--zf-font-display)' };

const STACK_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s2)' };

const BOOK_SUB_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  flexWrap: 'wrap',
  fontSize: 'var(--zf-fs-sm)',
  color: 'var(--zf-text-secondary)',
};

/* 只有封面与内容两列都够宽时才分栏；alignItems: start 让封面列自然收缩，
   不再被右栏撑出下方死白 */
const HERO_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  alignItems: 'start',
  gap: 'var(--zf-s6)',
  padding: 'var(--zf-s6)',
};

const HERO_STYLE_WIDE = {
  ...HERO_STYLE,
  gridTemplateColumns: '240px minmax(0, 1fr)',
  gap: 'var(--zf-s8)',
  padding: 'var(--zf-s8)',
};

const COVER_COL_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--zf-s3)',
  perspective: '1000px',
  minWidth: 0,
};

/* 比例约束交给容器：aspectRatio 3/4 与 ZfCoverCard 一致，封面再不是固定 200×280 */
const COVER_STYLE = {
  position: 'relative',
  width: '100%',
  maxWidth: 240,
  aspectRatio: '3 / 4',
  borderRadius: 'var(--zf-r-lg)',
  overflow: 'hidden',
  border: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
  boxShadow: 'var(--zf-shadow-2), var(--zf-glass-edge-top)',
  transformStyle: 'preserve-3d',
  background: 'var(--zf-glass-1)',
};

const COVER_IMG_STYLE = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' };

const COVER_FALLBACK_STYLE = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--zf-font-display)',
  fontSize: 'var(--zf-fs-3xl)',
  letterSpacing: 'var(--zf-ls-display)',
  color: 'var(--zf-text-faint)',
  background: 'var(--zf-tint-brand-08)',
  textAlign: 'center',
  padding: 'var(--zf-s3)',
};

const PILL_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  flexWrap: 'wrap',
};

const HERO_MAIN_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s5)',
  minWidth: 0,
};

const META_STYLE = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
  gap: 'var(--zf-s3)',
};

const META_CELL_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s1)',
  padding: 'var(--zf-s4)',
  minWidth: 0,
  borderRadius: 'var(--zf-r-md)',
  background: 'var(--zf-glass-1)',
  border: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
};

const META_LABEL_STYLE = {
  fontSize: 'var(--zf-fs-2xs)',
  letterSpacing: 'var(--zf-ls-wide)',
  color: 'var(--zf-text-muted)',
};

const META_VALUE_STYLE = {
  fontSize: 'var(--zf-fs-md)',
  fontWeight: FW.strong,
  lineHeight: 'var(--zf-lh-snug)',
  color: 'var(--zf-text-primary)',
  fontVariantNumeric: 'tabular-nums',
  minWidth: 0,
};

/* 简介正文：衬线 + reader 行高 + 行长约束，与正文阅读体验同一套语言 */
const SUMMARY_STYLE = {
  margin: 0,
  fontFamily: 'var(--zf-font-reader)',
  fontSize: 'var(--zf-fs-base)',
  lineHeight: 'var(--zf-lh-reader)',
  color: 'var(--zf-text-secondary)',
  whiteSpace: 'pre-wrap',
  maxWidth: 'var(--zf-measure-text)',
};

const ACTION_ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s4)',
  flexWrap: 'wrap',
};

const SECTION_STYLE = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)' };

const SURFACE_PAD_STYLE = { padding: 'var(--zf-s6)' };

const CHAPTER_CELL_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  width: '100%',
  padding: 'var(--zf-s2) var(--zf-s3)',
  textAlign: 'left',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'var(--zf-fs-sm)',
  color: 'var(--zf-text-secondary)',
  background: 'var(--zf-glass-1)',
  border: 'var(--zf-bw-thin) solid var(--zf-glass-border)',
  borderRadius: 'var(--zf-r-sm)',
  minWidth: 0,
  transition: 'background-color var(--zf-dur-fast) var(--zf-ease-out), '
    + 'color var(--zf-dur-fast) var(--zf-ease-out), '
    + 'border-color var(--zf-dur-fast) var(--zf-ease-out)',
};

const CHAPTER_NO_STYLE = {
  flexShrink: 0,
  fontSize: 'var(--zf-fs-2xs)',
  color: 'var(--zf-text-faint)',
  fontVariantNumeric: 'tabular-nums',
  minWidth: 30,
};

const TAIL_NOTE_STYLE = {
  fontSize: 'var(--zf-fs-xs)',
  color: 'var(--zf-text-faint)',
  textAlign: 'center',
};

/* ============================================================
   纯函数
   ============================================================ */

/** react-bits 的组件每个调用点都要一层边界；统一收进共享的 ZfErrorBoundary */
function Bits({ fallback, children }) {
  return <ZfErrorBoundary fallback={fallback}>{children}</ZfErrorBoundary>;
}

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/[`\s]/g, '').trim();
}

/** 按书源 URL 取归一化后的书源对象（原先在 3 处逐字复制） */
function resolveSource(sourceUrl) {
  if (sourceUrl && isDefaultSource(sourceUrl)) return getDefaultSourceFromManager();
  if (sourceUrl) {
    const found = getBookSources().find((s) => s.bookSourceUrl === sourceUrl);
    if (found) return normalizeSource(found);
  }
  return getDefaultSourceFromManager();
}

/**
 * 当 _tocUrl 未取到、或与 bookUrl 相同时，用书源的 ruleBookInfo.tocUrl 模板反推。
 * 逻辑与迁移前逐字一致，只是从 handleStartReading 里提出来给目录区块复用。
 */
function resolveTocUrl(source, rawBookUrl, currentTocUrl) {
  let tocUrl = currentTocUrl || '';
  if (tocUrl && tocUrl !== rawBookUrl) return tocUrl;

  const template = source?.ruleBookInfo?.tocUrl || '';
  if (template && template.includes('{{') && rawBookUrl) {
    let extractedId = rawBookUrl;
    const bookUrlTemplate = source?.ruleSearch?.bookUrl || '';
    if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
      const templatePattern = bookUrlTemplate.replace(/\{\{[^}]+\}\}/g, '([^/?#]+)');
      const match = rawBookUrl.match(new RegExp('^' + templatePattern + '$'));
      if (match && match[1]) extractedId = match[1];
    }
    if (extractedId === rawBookUrl) {
      try {
        const urlPath = new URL(
          rawBookUrl.startsWith('http') ? rawBookUrl : 'http://dummy' + rawBookUrl,
        ).pathname;
        const segments = urlPath.split('/').filter(Boolean);
        if (segments.length > 0) extractedId = segments[segments.length - 1];
      } catch {
        /* URL 解析不了就退回整条 bookUrl */
      }
    }
    tocUrl = template.replace(/\{\{[^}]+\}\}/g, extractedId);
  } else {
    tocUrl = tocUrl || rawBookUrl;
  }

  // 书源模板里的 tocUrl 可能是相对路径，解析器处理不了，需要拼成绝对 URL
  if (tocUrl && !tocUrl.startsWith('http')) {
    const baseUrl = source?.bookSourceUrl;
    if (baseUrl) tocUrl = tocUrl.startsWith('/') ? baseUrl + tocUrl : `${baseUrl}/${tocUrl}`;
  }
  return tocUrl;
}

/** 源站章节对象形态不一，归一到 Reader 认得的 { chapterName, chapterUrl, index } */
function normalizeChapters(list) {
  return list.map((ch, i) => ({
    ...ch,
    index: i,
    chapterName: cleanChapterName(ch.chapterName || ch.name || ch.title) || `第${i + 1}章`,
    chapterUrl: ch.chapterUrl || ch.url || ch.path || '',
  }));
}

const NovelDetail = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { novels: rankBooks } = useContext(NovelContext) || {};
  const { up } = useBreakpoint();
  const { enabled } = useFx();

  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isInShelf, setIsInShelf] = useState(false);
  const [fieldSources, setFieldSources] = useState({});
  const [completeness, setCompleteness] = useState(0);
  const [coverBroken, setCoverBroken] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [chapters, setChapters] = useState(null);
  const [tocLoading, setTocLoading] = useState(false);
  const [tocFailed, setTocFailed] = useState(false);
  const [tocExpanded, setTocExpanded] = useState(false);
  const chaptersRef = useRef(null);
  const tocPromiseRef = useRef(null);
  const tocMetaRef = useRef({ sourceUrl: '', bookUrl: '', tocUrl: '' });

  /* —— 封面 3D 倾斜：改用 motion value + useTransform，
        不再用 onMouseMove 逐帧 setState 改 transform —— */
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const coverRotateX = useTransform(tiltY, [-0.5, 0.5], [9, -9]);
  const coverRotateY = useTransform(tiltX, [-0.5, 0.5], [-9, 9]);
  const canTilt = enabled('tilt') && up('lg');

  const onCoverPointerMove = (e) => {
    if (!canTilt) return;
    const rect = e.currentTarget.getBoundingClientRect();
    tiltX.set((e.clientX - rect.left) / rect.width - 0.5);
    tiltY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const onCoverPointerLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  /* 分栏 768（--zf-bp-md）起；中文长数字要 992（--zf-bp-lg）起才有可读列宽 */
  const twoCol = up('md');
  const serifNumbers = up('lg');

  const getUrlParam = (name) => new URLSearchParams(window.location.search).get(name);

  const handleBack = () => {
    if (getUrlParam('from') === 'shelf') navigate('/shelf');
    else navigate(-1);
  };

  useEffect(() => {
    getUserInfo().then(setUserInfo);
  }, []);

  useEffect(() => {
    const checkShelf = async () => {
      if (userInfo?.username && novelId) {
        try {
          const shelf = await getBookShelf(userInfo.username);
          setIsInShelf(shelf.some((book) => book.id === novelId));
        } catch {
          /* 本地书架读不到就当不在架 */
        }
      }
      const token = localStorage.getItem('zifeng_token');
      const bookUrlParam = searchParams.get('bookUrl') || '';
      if (token && bookUrlParam) {
        try {
          const inShelf = await checkBookInShelf(bookUrlParam);
          if (inShelf) setIsInShelf(true);
        } catch {
          /* 服务端未确认不覆盖本地结论 */
        }
      }
    };
    checkShelf();
  }, [userInfo, novelId, searchParams]);

  useEffect(() => {
    const fetchNovelDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const urlSource = searchParams.get('sourceUrl') || '';
        const urlBookUrl = searchParams.get('bookUrl') || '';

        let effectiveSourceUrl = urlSource;
        let effectiveBookUrl = urlBookUrl;

        if (!effectiveSourceUrl) {
          const ds = getDefaultSource();
          effectiveSourceUrl = ds.bookSourceUrl;
          effectiveBookUrl = effectiveBookUrl || String(novelId || '');
        }

        const cache = loadNovelCache(effectiveSourceUrl, effectiveBookUrl);
        const cachedBookData = cache ? cache.bookData : null;
        const source = resolveSource(effectiveSourceUrl);
        let bookInfo = null;
        let unifiedResult = null;
        const sourceName = source?.bookSourceName || '';

        if (effectiveBookUrl && source) {
          try {
            const unifiedRes = await unifiedBookInfoAPI(source, effectiveBookUrl, cachedBookData);
            if (unifiedRes && unifiedRes.success !== false) {
              unifiedResult = unifiedRes;
              bookInfo = unifiedRes.bookInfo || unifiedRes;
            } else {
              const result = await getBookInfoAPI(source, effectiveBookUrl, cachedBookData);
              if (result.success && result.bookInfo) bookInfo = result.bookInfo;
            }
          } catch {
            try {
              const result = await getBookInfoAPI(source, effectiveBookUrl, cachedBookData);
              if (result.success && result.bookInfo) bookInfo = result.bookInfo;
            } catch {
              /* 两条路都不通时落到下方 cachedBookData 分支 */
            }
          }
        }

        if (bookInfo) {
          const adapted = adaptBookInfo(bookInfo, {
            bookSourceUrl: effectiveSourceUrl,
            bookSourceName: source?.bookSourceName,
          }) || {};
          const coverUrl = cleanUrl(adapted.coverUrl || bookInfo.coverUrl || bookInfo.cover || '');
          const tocUrl = cleanUrl(adapted.tocUrl || bookInfo.tocUrl || '');
          /* 书源返回的 kind 是一条逗号串，且把「8个月前」「7.8分」这类已在别处
             单独展示的元数据混在题材里、还带空项。走 toCategoryList 拆分并剔除，
             于是不再出现「一整串渲染成一个标签」和评分重复。 */
          const categories = toCategoryList(adapted.kind).length
            ? toCategoryList(adapted.kind)
            : toCategoryList(cachedBookData?.category);

          setNovel({
            novelId: adapted.id || bookInfo.id || bookInfo.novelId || novelId,
            novelName: adapted.name || cachedBookData?.name || '',
            authorName: adapted.author || cachedBookData?.author || '',
            cover: coverUrl || cachedBookData?.cover || '',
            summary: adapted.intro || cachedBookData?.summary || '',
            categoryNames: categories,
            averageScore: parseFloat(adapted.score) || cachedBookData?.score || 0,
            wordNum: adapted.wordCount || bookInfo.wordCount || '未知',
            chapterNum: adapted.chapterCount || bookInfo.chapterCount || '未知',
            lastUpdatedAt: adapted.updateTime || bookInfo.lastUpdateTime || '未知',
            lastChapter: adapted.lastChapter ? { chapterName: adapted.lastChapter } : null,
            _tocUrl: tocUrl || effectiveBookUrl,
            _sourceUrl: effectiveSourceUrl,
            sourceName: sourceName || adapted.sourceName || bookInfo.sourceName,
          });

          setCompleteness(bookInfo.completeness || computeCompleteness(adapted));

          const sources = {};
          if (unifiedResult?.availableSourceNames?.length > 1) {
            sources.sourceName = unifiedResult.availableSourceNames.join('、');
          }
          if (unifiedResult?.extra?.coverUrl_source) sources.cover = unifiedResult.extra.coverUrl_source;
          if (unifiedResult?.extra?.intro_source) sources.intro = unifiedResult.extra.intro_source;
          setFieldSources(sources);
        } else if (cachedBookData) {
          setNovel({
            novelId: cachedBookData.id || novelId,
            novelName: cachedBookData.name || cachedBookData.novelName || '',
            authorName: cachedBookData.author || cachedBookData.authorName || '',
            cover: cachedBookData.cover || cachedBookData.coverUrl || '',
            summary: cachedBookData.summary || cachedBookData.intro || '',
            categoryNames: toCategoryList(cachedBookData.category),
            averageScore: cachedBookData.score || 0,
            wordNum: '未知',
            chapterNum: '未知',
            lastUpdatedAt: '未知',
            lastChapter: cachedBookData.lastChapter ? { chapterName: cachedBookData.lastChapter } : null,
            _tocUrl: effectiveBookUrl,
            _sourceUrl: effectiveSourceUrl,
          });
        } else {
          setError('未找到小说信息');
        }
      } catch (err) {
        console.error('获取小说详情失败:', err);
        setError('获取小说详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNovelDetail();
  }, [searchParams, novelId, attempt]);

  /* —— 章节目录：原先只在「开始阅读」里临时拉取，现在页面自己持有，
        并与开始阅读共用同一次请求（in-flight 去重 + reader 缓存优先） —— */
  const ensureChapters = useCallback(async () => {
    if (!novel) return null;
    if (chaptersRef.current?.length) return chaptersRef.current;
    if (tocPromiseRef.current) return tocPromiseRef.current;

    const run = (async () => {
      const paramSourceUrl = searchParams.get('sourceUrl') || '';
      const bookUrl = searchParams.get('bookUrl') || '';

      const cached = loadReaderCache(paramSourceUrl, bookUrl);
      const cachedTocUrl = cached?.tocUrl || '';
      if (cached?.chapters?.length) {
        const list = normalizeChapters(cached.chapters);
        chaptersRef.current = list;
        tocMetaRef.current = { sourceUrl: paramSourceUrl, bookUrl, tocUrl: cachedTocUrl };
        setChapters(list);
        setTocFailed(false);
        return list;
      }

      setTocLoading(true);
      setTocFailed(false);
      try {
        const source = resolveSource(novel._sourceUrl);
        const tocUrl = resolveTocUrl(source, bookUrl, novel._tocUrl);
        const bookData = {
          id: novel.novelId,
          name: novel.novelName,
          author: novel.authorName,
          cover: novel.cover,
          summary: novel.summary || '',
          lastChapter: novel.lastChapter?.chapterName || '',
          sourceUrl: paramSourceUrl,
          sourceName: novel.sourceName || source?.bookSourceName || '',
          bookUrl,
          progress: 0,
          lastRead: new Date().toISOString(),
        };
        const result = await getTocAPI(source, tocUrl, bookData);
        if (result?.success && result.chapters?.length) {
          const list = normalizeChapters(result.chapters);
          chaptersRef.current = list;
          tocMetaRef.current = { sourceUrl: paramSourceUrl, bookUrl, tocUrl };
          setChapters(list);
          saveReaderCache(bookData, paramSourceUrl, bookUrl, tocUrl, list);
          return list;
        }
        setTocFailed(true);
        return null;
      } catch (err) {
        console.error('获取章节列表失败:', err);
        setTocFailed(true);
        return null;
      } finally {
        setTocLoading(false);
        tocPromiseRef.current = null;
      }
    })();

    tocPromiseRef.current = run;
    return run;
  }, [novel, searchParams]);

  useEffect(() => {
    if (!novel) return;
    chaptersRef.current = null;
    /* 同一路由换书（/novel/A → /novel/B）组件不卸载：在途/已完成的 promise
       必须一起丢掉，否则命中 reader 缓存那条同步快路径会把上一本的目录留下。 */
    tocPromiseRef.current = null;
    tocMetaRef.current = { sourceUrl: '', bookUrl: '', tocUrl: '' };
    setChapters(null);
    setTocExpanded(false);
    ensureChapters();
  }, [novel, ensureChapters]);

  const readerPath = (index) => {
    const { sourceUrl, bookUrl, tocUrl } = tocMetaRef.current;
    const params = new URLSearchParams();
    params.set('sourceUrl', sourceUrl || '');
    params.set('bookUrl', bookUrl || '');
    params.set('tocUrl', tocUrl || '');
    params.set('chapterIndex', String(index));
    const from = getUrlParam('from');
    if (from) params.set('from', from);
    return `/reader/${simpleHash(`${sourceUrl || ''}_${bookUrl || ''}`)}?${params.toString()}`;
  };

  const openChapter = async (index) => {
    const list = await ensureChapters();
    if (!list?.length) {
      message.error('获取章节列表失败');
      return;
    }
    navigate(readerPath(index));
  };

  const handleStartReading = async () => {
    if (!userInfo) {
      message.info('请先登录');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }

    const sourceUrl = searchParams.get('sourceUrl') || '';
    const bookUrl = searchParams.get('bookUrl') || '';
    const found = sourceUrl ? getBookSources().find((s) => s.bookSourceUrl === sourceUrl) : null;

    try {
      await addToReadHistory(userInfo.username, {
        id: novel.novelId,
        name: novel.novelName,
        author: novel.authorName,
        cover: novel.cover,
        summary: novel.summary || '',
        lastChapter: novel.lastChapter?.chapterName || '',
        sourceUrl,
        sourceName: found?.bookSourceName || '',
        bookUrl,
        progress: 0,
        lastRead: new Date().toISOString(),
      });
    } catch {
      /* 历史写失败不挡阅读 */
    }

    await openChapter(0);
  };

  const handleAddToShelf = async () => {
    if (!userInfo) {
      message.info('请先登录');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    if (isInShelf) {
      message.info('书籍已在书架中');
      return;
    }

    const sourceUrl = searchParams.get('sourceUrl') || '';
    const bookUrl = searchParams.get('bookUrl') || '';
    const found = sourceUrl ? getBookSources().find((s) => s.bookSourceUrl === sourceUrl) : null;
    const sourceName = found?.bookSourceName || '';
    const category = novel.categoryNames?.[0]?.className || '';

    try {
      const success = await addToBookShelf(userInfo.username, {
        id: novel.novelId,
        name: novel.novelName,
        author: novel.authorName,
        cover: novel.cover,
        summary: novel.summary || '',
        lastChapter: novel.lastChapter?.chapterName || '',
        sourceUrl,
        sourceName,
        bookUrl,
        category,
      });

      if (localStorage.getItem('zifeng_token')) {
        try {
          await apiAddToBookshelf({
            bookName: novel.novelName,
            author: novel.authorName,
            bookUrl,
            coverUrl: novel.cover,
            summary: novel.summary || '',
            lastChapter: novel.lastChapter?.chapterName || '',
            sourceUrl,
            sourceName,
            category,
          });
        } catch (e) {
          console.error('同步到服务器失败:', e);
        }
      }

      if (success) {
        message.success('已加入书架');
        setIsInShelf(true);
      } else {
        message.info('书籍已在书架中');
        setIsInShelf(true);
      }
    } catch {
      message.error('加入书架失败，请稍后重试');
    }
  };

  /* —— 相关推荐：数据源是站内榜单（App 的 NovelContext，已在内存，不再打接口）。
        同分类 / 同作者优先，其余按榜单原序补位；一条都没有就整块不渲染。 —— */
  const related = useMemo(() => {
    if (!novel || !rankBooks) return [];
    const pool = [];
    const seen = new Set();
    Object.values(rankBooks).forEach((list) => {
      (Array.isArray(list) ? list : []).forEach((item) => {
        if (!item?.name) return;
        const key = `${item.name}__${item.author}`;
        if (seen.has(key)) return;
        seen.add(key);
        if (item.name === novel.novelName && item.author === novel.authorName) return;
        pool.push(item);
      });
    });

    const cats = new Set((novel.categoryNames || []).map((c) => c.className));
    const isRelated = (b) => (cats.has(b.category) || (b.author && b.author === novel.authorName)) ? 0 : 1;
    const order = pool.slice().sort((a, b) => isRelated(a) - isRelated(b));

    return order.slice(0, RELATED_MAX).map((b) => ({
      ...b,
      cover: proxyImageUrl(b.cover),
    }));
  }, [novel, rankBooks]);

  const openRelated = (book) => {
    const ds = getDefaultSource();
    const sourceUrl = ds.bookSourceUrl;
    const id = String(book.id ?? '');
    const template = ds.ruleSearch?.bookUrl || '';
    const bookUrl = template.includes('{{')
      ? template.replace(/\{\{\$?\.?novelId\}\}/g, id)
      : (template || id);
    saveNovelCache(book, sourceUrl, bookUrl);

    const params = new URLSearchParams();
    params.set('sourceUrl', sourceUrl);
    params.set('bookUrl', bookUrl);
    navigate(`/novel/${id}?${params.toString()}`);
  };

  /* —— 三态：加载 / 出错 / 无数据 —— */
  if (loading) {
    return (
      <ZfPageShell size="lg">
        <ZfGlassSurface level={2} style={SURFACE_PAD_STYLE}>
          <ZfSkeleton variant="detail" />
        </ZfGlassSurface>
      </ZfPageShell>
    );
  }

  if (error || !novel) {
    return (
      <ZfPageShell size="lg">
        <ZfGlassSurface level={2} style={SURFACE_PAD_STYLE}>
          <ZfErrorState
            title={error || '小说不存在'}
            description="书源没有返回这本书的信息，可能是源站结构变动或该书已被下架。"
            action={
              <div style={ACTION_ROW_STYLE}>
                <Button
                  type="primary"
                  classNames={{ root: 'zf-btn zf-btn--brand' }}
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  重新获取
                </Button>
                <Button classNames={{ root: 'zf-btn zf-btn--glass' }} onClick={handleBack}>
                  返回
                </Button>
              </div>
            }
          />
        </ZfGlassSurface>
      </ZfPageShell>
    );
  }

  const coverSrc = coverBroken ? '' : proxyImageUrl(novel.cover);
  const categories = novel.categoryNames || [];
  const shownChapters = chapters
    ? chapters.slice(0, tocExpanded ? TOC_MAX : TOC_PREVIEW)
    : [];
  const hiddenCount = chapters ? chapters.length - shownChapters.length : 0;

  return (
    <ZfPageShell
      size="lg"
      header={
        <div style={HEADER_ROW_STYLE}>
          <div style={HEADER_TITLE_BLOCK_STYLE}>
            <h1 className="zf-h2 zf-h2--fluid" style={BOOK_TITLE_STYLE}>
              <Bits fallback={novel.novelName}>
                {enabled('shimmer') ? (
                  <ShinyText
                    text={novel.novelName}
                    speed={3}
                    color="var(--zf-text-primary)"
                    shineColor="var(--zf-brand-300)"
                    spread={120}
                  />
                ) : novel.novelName}
              </Bits>
            </h1>
            <div style={BOOK_SUB_STYLE}>
              <span>作者：{novel.authorName || '未知'}</span>
              {novel.sourceName ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{novel.sourceName}</span>
                </>
              ) : null}
              {hasScore(novel.averageScore) ? (
                <>
                  <span aria-hidden="true">·</span>
                  <ZfPill tone="warning" size="sm">
                    <Bits fallback={formatScore(novel.averageScore)}>
                      <CountUp to={Number(novel.averageScore)} from={0} duration={1.5} />
                    </Bits>
                    分
                  </ZfPill>
                </>
              ) : null}
            </div>
          </div>
          <Button
            classNames={{ root: 'zf-btn zf-btn--glass' }}
            icon={<LeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
        </div>
      }
    >
      {/* ============== 详情主卡 ============== */}
      <ZfGlassSurface level={2} sheen style={twoCol ? HERO_STYLE_WIDE : HERO_STYLE}>
        <div style={COVER_COL_STYLE}>
          <motion.div
            onPointerMove={onCoverPointerMove}
            onPointerLeave={onCoverPointerLeave}
            style={{ rotateX: coverRotateX, rotateY: coverRotateY, ...COVER_STYLE }}
            whileHover={canTilt ? { scale: 1.03 } : undefined}
            transition={SPRING.soft}
          >
            {coverSrc ? (
              <img
                alt={novel.novelName}
                src={coverSrc}
                onError={() => setCoverBroken(true)}
                style={COVER_IMG_STYLE}
              />
            ) : (
              <span aria-hidden="true" style={COVER_FALLBACK_STYLE}>
                {novel.novelName.slice(0, 2)}
              </span>
            )}
          </motion.div>

          {fieldSources.cover ? (
            <ZfPill size="xs" tone="neutral">封面源 · {fieldSources.cover}</ZfPill>
          ) : null}
          <ZfPill size="xs" tone={completeness >= 70 ? 'success' : completeness >= 40 ? 'warning' : 'error'}>
            完整性 <Bits fallback={`${completeness}%`}><CountUp to={completeness} from={0} duration={1.5} /></Bits>%
          </ZfPill>
        </div>

        <div style={HERO_MAIN_STYLE}>
          {categories.length || fieldSources.sourceName ? (
            <div style={PILL_ROW_STYLE}>
              {fieldSources.sourceName ? (
                <ZfPill size="sm">数据来源 · {fieldSources.sourceName}</ZfPill>
              ) : null}
              {categories.map((category) => (
                <ZfPill key={category.className} tone="brand" size="md">
                  {category.className}
                </ZfPill>
              ))}
            </div>
          ) : null}

          <div style={META_STYLE}>
            <div style={META_CELL_STYLE}>
              <span style={META_LABEL_STYLE}>字数</span>
              <span style={META_VALUE_STYLE} className="zf-truncate">
                {(() => {
                  const parsed = parseNumericValue(novel.wordNum);
                  if (!parsed) return novel.wordNum || '未知';
                  const unit = `${parsed.suffix || ''}字`;
                  if (serifNumbers) {
                    return (
                      <Bits fallback={novel.wordNum}>
                        <span style={SERIF_NUM_STYLE}>
                          {numberToChinese(parsed.number, { simplified: true, unit })}
                        </span>
                      </Bits>
                    );
                  }
                  return (
                    <Bits fallback={novel.wordNum}>
                      <CountUp to={parsed.number} from={0} duration={1.5} separator="," />
                      {unit}
                    </Bits>
                  );
                })()}
              </span>
            </div>

            <div style={META_CELL_STYLE}>
              <span style={META_LABEL_STYLE}>章节数</span>
              <span style={META_VALUE_STYLE} className="zf-truncate">
                {(() => {
                  const parsed = parseNumericValue(novel.chapterNum);
                  if (!parsed) return novel.chapterNum || '未知';
                  const unit = `${parsed.suffix || ''}章`;
                  if (serifNumbers) {
                    return (
                      <Bits fallback={novel.chapterNum}>
                        <span style={SERIF_NUM_STYLE}>
                          {numberToChinese(parsed.number, { unit })}
                        </span>
                      </Bits>
                    );
                  }
                  return (
                    <Bits fallback={novel.chapterNum}>
                      <CountUp to={parsed.number} from={0} duration={1.5} separator="," />
                      {unit}
                    </Bits>
                  );
                })()}
              </span>
            </div>

            <div style={META_CELL_STYLE}>
              <span style={META_LABEL_STYLE}>最后更新</span>
              <span style={META_VALUE_STYLE} className="zf-truncate">
                {novel.lastUpdatedAt || '未知'}
              </span>
            </div>

            <div style={META_CELL_STYLE}>
              <span style={META_LABEL_STYLE}>最后章节</span>
              <span style={META_VALUE_STYLE} className="zf-truncate" title={novel.lastChapter?.chapterName || ''}>
                {novel.lastChapter?.chapterName || '未知'}
              </span>
            </div>
          </div>

          <div style={SECTION_STYLE}>
            <ZfSectionTitle
              title="简介"
              variant="ink"
              animated={false}
              extra={fieldSources.intro ? <ZfPill size="xs">文案源 · {fieldSources.intro}</ZfPill> : null}
            />
            <p style={SUMMARY_STYLE}>{novel.summary || '暂无简介'}</p>
          </div>

          <div style={ACTION_ROW_STYLE}>
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} transition={SPRING.snappy}>
              <Button
                type="primary"
                size="large"
                classNames={{ root: 'zf-btn zf-btn--brand' }}
                icon={<ReadOutlined />}
                onClick={handleStartReading}
              >
                开始阅读
              </Button>
            </motion.div>
            <motion.div whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} transition={SPRING.snappy}>
              <Button
                size="large"
                classNames={{ root: 'zf-btn zf-btn--glass' }}
                icon={isInShelf ? <CheckOutlined /> : undefined}
                onClick={handleAddToShelf}
              >
                {isInShelf ? '已加入书架' : '加入书架'}
              </Button>
            </motion.div>
          </div>
        </div>
      </ZfGlassSurface>

      {/* ============== 章节目录 ============== */}
      {tocLoading || chapters || tocFailed ? (
        <section style={SECTION_STYLE}>
          <ZfSectionTitle
            title="章节目录"
            variant="line"
            icon={<UnorderedListOutlined />}
            animated={false}
            sub={chapters?.length
              ? `共 ${chapters.length} 章 · 点击任意章节直接打开阅读器`
              : '正在读取书源目录'}
            extra={chapters?.length ? <ZfPill tone="brand">{chapters.length} 章</ZfPill> : null}
          />

          {tocLoading && !chapters ? <ZfSkeleton variant="row" count={3} /> : null}

          {tocFailed && !chapters ? (
            <ZfGlassSurface level={1} style={SURFACE_PAD_STYLE}>
              <ZfEmptyState
                compact
                icon="◈"
                title="目录获取失败"
                description="该书源没有返回可用章节。可重试一次；若持续失败，说明源的目录规则已失效，换本书源或稍后再试。"
                action={
                  <Button
                    type="primary"
                    classNames={{ root: 'zf-btn zf-btn--brand' }}
                    onClick={() => ensureChapters()}
                  >
                    重新加载目录
                  </Button>
                }
              />
            </ZfGlassSurface>
          ) : null}

          {chapters?.length ? (
            <>
              <ZfGrid min={200} gap="var(--zf-s2)">
                {shownChapters.map((chapter, i) => (
                  <motion.button
                    key={`${i}-${chapter.chapterName}`}
                    type="button"
                    style={CHAPTER_CELL_STYLE}
                    whileHover={{ backgroundColor: 'var(--zf-tint-brand-16)', color: 'var(--zf-on-tint)' }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING.snappy}
                    title={chapter.chapterName}
                    onClick={() => openChapter(i)}
                  >
                    <span style={CHAPTER_NO_STYLE} className="zf-num">{i + 1}</span>
                    <span className="zf-truncate">{chapter.chapterName}</span>
                  </motion.button>
                ))}
              </ZfGrid>

              <div style={STACK_STYLE}>
                {chapters.length > TOC_PREVIEW ? (
                  <Button
                    classNames={{ root: 'zf-btn zf-btn--ghost' }}
                    onClick={() => setTocExpanded((v) => !v)}
                  >
                    {tocExpanded ? '收起目录' : `展开全部 ${chapters.length} 章`}
                  </Button>
                ) : null}
                {tocExpanded && hiddenCount > 0 ? (
                  <p style={TAIL_NOTE_STYLE}>
                    为保证首帧性能只渲染前 {TOC_MAX} 章，其余 {hiddenCount} 章可在阅读器目录内跳转。
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* ============== 相关推荐（无真实数据则整块不渲染） ============== */}
      {related.length > 0 ? (
        <motion.section variants={variants.reveal} initial="hidden" whileInView="visible"
          viewport={{ once: true, margin: '-40px' }} style={SECTION_STYLE}>
          <ZfSectionTitle
            title="相关推荐"
            variant="line"
            animated={false}
            sub="同分类 / 同作者优先，取自站内榜单数据；默认书源未返回榜单时这一区块不显示。"
          />
          <ZfGrid min={168} gap="var(--zf-s4)">
            {related.map((book) => (
              <ZfCoverCard key={`${book.name}-${book.author}`} novel={book} onOpen={openRelated} />
            ))}
          </ZfGrid>
        </motion.section>
      ) : null}
    </ZfPageShell>
  );
};

export default NovelDetail;
