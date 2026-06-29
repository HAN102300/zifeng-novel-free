import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Typography, Space, Empty, Button, Tag, Spin, Segmented, Select, Progress, Skeleton } from 'antd';
import { SearchOutlined, AppstoreOutlined, OrderedListOutlined, BookOutlined, LoadingOutlined, SwapOutlined, CloseCircleOutlined, SyncOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import SummaryText from '../components/SummaryText';
import { ThemeContext } from '../App';
import {
  getBookSources, getActiveSource, setActiveSource as saveActiveSource
} from '../utils/bookSourceManager';
import { searchBooksAPI, getAllEnabledSources } from '../utils/apiClient';
import { saveNovelCache, simpleHash } from '../utils/novelConfig';
import { adaptSearchResult, computeCompleteness } from '../utils/bookAdapter';
import { BatchSearchController } from '../utils/batchSearch';
import { CountUp, ShinyText, ReactBitsErrorBoundary } from '../components/react-bits';
import { glassCardStyle, glassItemStyle } from '../utils/glassStyle';

const { Text } = Typography;

const SearchResult = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  const { themeConfigs, currentTheme, isDarkMode, glassMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].primaryColor;
  const colors = themeConfigs[currentTheme].colors;

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);
  const [layout, setLayout] = useState(() => {
    const saved = localStorage.getItem('search_layout');
    return saved || 'list';
  });
  const [activeSource, setActiveSourceState] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [sourcesLoaded, setSourcesLoaded] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchCancelled, setSearchCancelled] = useState(false);

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

  useEffect(() => {
    const loadSources = async () => {
      let enabled = [];
      try {
        const res = await getAllEnabledSources();
        const backendSources = res.data?.data;
        if (backendSources && backendSources.length > 0) {
          enabled = backendSources.filter(s => s.enabled);
        }
      } catch {}

      if (enabled.length === 0) {
        enabled = getBookSources().filter(s => s.enabled);
      }
      setAvailableSources(enabled);

      let activeUrl = '';
      try {
        activeUrl = localStorage.getItem('zifeng_active_source') || '';
      } catch {}

      const normalizeUrl = (url) => (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();

      let matchedSource = null;

      if (activeUrl) {
        matchedSource = enabled.find(s => s.bookSourceUrl === activeUrl);
        if (!matchedSource) {
          const norm = normalizeUrl(activeUrl);
          matchedSource = enabled.find(s => normalizeUrl(s.bookSourceUrl) === norm);
        }
      }

      if (!matchedSource) {
        const localActive = getActiveSource();
        if (localActive && localActive.bookSourceUrl) {
          matchedSource = enabled.find(s => s.bookSourceUrl === localActive.bookSourceUrl);
          if (!matchedSource) {
            const norm = normalizeUrl(localActive.bookSourceUrl);
            matchedSource = enabled.find(s => normalizeUrl(s.bookSourceUrl) === norm);
          }
          if (!matchedSource) {
            matchedSource = enabled.find(s => s.bookSourceName === localActive.bookSourceName);
          }
        }
      }

      if (!matchedSource && enabled.length > 0) {
        matchedSource = enabled[0];
      }

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      setSearchCancelled(false);
      setSearchProgress(0);
      setLoading(true);

      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      let elapsed = 0;
      searchTimerRef.current = setInterval(() => {
        elapsed += 100;
        const progress = Math.min(90, (elapsed / 15000) * 90);
        setSearchProgress(progress);
      }, 100);
    }

    try {
      let list = null;

      try {
        const result = await searchBooksAPI(source, searchKeyword, pageNum);
        if (result.success) {
          list = result.results || [];
        }
      } catch (e) {
        if (e.name === 'AbortError' || e.code === 'ERR_CANCELED') {
          return;
        }
        console.warn('搜索失败:', e.message);
      }

      if (searchCancelled) return;

      if (list === null) {
        list = [];
      }

      const adapted = list.map(item => {
        const unified = adaptSearchResult(item, source);
        return unified || item;
      });

      if (adapted.length > 0) {
        if (isLoadMore) {
          setResults(prev => [...prev, ...adapted]);
        } else {
          setResults(adapted);
        }

        if (adapted.length < 10) {
          setHasMore(false);
          hasMoreRef.current = false;
          setAllLoaded(true);
        } else {
          setHasMore(true);
          hasMoreRef.current = true;
          setAllLoaded(false);
        }
      } else {
        if (isLoadMore) {
          setHasMore(false);
          hasMoreRef.current = false;
          setAllLoaded(true);
        } else {
          setResults([]);
          setHasMore(false);
          hasMoreRef.current = false;
          setAllLoaded(true);
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('搜索失败:', error);
      if (!isLoadMore) {
        setResults([]);
      }
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
      if (totalSources <= 10) {
        setSearchProgress(Math.min(90, (elapsed / 10000) * 90));
      } else {
        setSearchProgress(Math.min(70, (elapsed / 20000) * 70));
      }
    }, 200);

    try {
      let firstDone = false;

      for await (const progress of controller.execute()) {
        if (searchCancelled || controller.aborted) break;

        setResults(prev => {
          const existingKeys = new Set(prev.map(b => `${b.name}__${b.author}`));
          const newBooks = progress.books.filter(b => !existingKeys.has(`${b.name}__${b.author}`));
          if (newBooks.length > 0) {
            return [...prev, ...newBooks];
          }
          const merged = prev.map(existing => {
            const match = progress.books.find(b => b.name === existing.name && b.author === existing.author);
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
      }

      batchControllerRef.current = null;
    }
  }, [searchCancelled, cancelSearch]);

  useEffect(() => {
    if (keyword && sourcesLoaded) {
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
        const enabledSources = availableSources.filter(s => s.enabled !== false);
        startBatchSearch(keyword, enabledSources);
      } else if (activeSource) {
        fetchSearchResults(keyword, 1);
      }
    }
    return () => {
      if (batchControllerRef.current) {
        batchControllerRef.current.abort();
        batchControllerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
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

  const handleSourceChange = (url) => {
    const source = availableSources.find(s => s.bookSourceUrl === url);
    if (source) {
      setActiveSourceState(source);
      saveActiveSource(url);
    }
  };

  const toggleLayout = (val) => {
    setLayout(val);
    localStorage.setItem('search_layout', val);
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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    navigate(-1);
  };

  return (
    <div style={{ position: 'relative', padding: '0', maxWidth: 1400, margin: '0 auto', minHeight: '100vh' }}>
      {glassMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 0,
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '10%',
            right: '-5%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
            filter: 'blur(60px)'
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '-5%',
            width: 350,
            height: 350,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors ? colors[2] + '12' : color + '10'} 0%, transparent 70%)`,
            filter: 'blur(60px)'
          }} />
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            padding: '12px 20px 0',
            background: isDarkMode
              ? (glassMode ? 'rgba(0,0,0,0.5)' : 'linear-gradient(180deg, #000000 85%, transparent)')
              : (glassMode ? 'rgba(240,242,245,0.6)' : 'linear-gradient(180deg, #f0f2f5 85%, transparent)'),
            backdropFilter: glassMode ? 'blur(20px)' : 'none',
            WebkitBackdropFilter: glassMode ? 'blur(20px)' : 'none'
          }}
        >
          <Card style={{ borderRadius: 16, ...glassCardStyle(glassMode, isDarkMode) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 auto', minWidth: 0 }}>
                <BackButton onClick={handleBack} />
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SearchOutlined style={{ color, fontSize: 18, flexShrink: 0 }} />
                    <Text strong style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      搜索：{keyword}
                    </Text>
                    {searchMode === 'aggregated' && (
                      <Tag color="processing" style={{ marginLeft: 8, fontSize: 12, padding: '0 8px', borderRadius: 4 }}>
                        <ReactBitsErrorBoundary fallback="聚合搜索">
                          <ShinyText text="聚合搜索" speed={3} color="#ffffff" shineColor="#ffffffcc" />
                        </ReactBitsErrorBoundary>
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <Segmented
                  value={searchMode}
                  onChange={(val) => {
                    setSearchMode(val);
                    localStorage.setItem('zifeng_search_mode', val);
                  }}
                  size="small"
                  options={[
                    { value: 'aggregated', label: '全部书源' },
                    { value: 'single', label: '单书源' }
                  ]}
                  style={{
                    background: isDarkMode ? '#333' : '#f0f0f0',
                    borderRadius: 8
                  }}
                />
                {sourcesLoaded && activeSource && searchMode === 'single' && (
                  <Select
                    value={activeSource.bookSourceUrl}
                    onChange={handleSourceChange}
                    size="small"
                    style={{ minWidth: 120 }}
                    suffixIcon={<SwapOutlined />}
                    options={availableSources.map(s => ({
                      value: s.bookSourceUrl,
                      label: s.bookSourceName
                    }))}
                  />
                )}
                <Segmented
                  value={layout}
                  onChange={toggleLayout}
                  options={[
                    { value: 'list', icon: <OrderedListOutlined /> },
                    { value: 'grid', icon: <AppstoreOutlined /> }
                  ]}
                  style={{
                    background: isDarkMode ? '#333' : '#f0f0f0',
                    borderRadius: 8
                  }}
                />
              </div>
            </div>
          </Card>
        </div>

        <AnimatePresence mode="wait">
          {loading && results.length === 0 ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '20px 20px' }}
            >
              {/* —— 骨架屏（跟随当前布局） —— */}
              <div style={layout === 'list'
                ? { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }
                : { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--zf-s4)' }
              }>
                {Array.from({ length: layout === 'grid' ? 9 : 4 }).map((_, i) => (
                  <Card
                    key={i}
                    style={{ borderRadius: 'var(--zf-r-md)', overflow: 'hidden', ...glassItemStyle(glassMode, isDarkMode) }}
                    styles={{ body: { padding: 0 } }}
                  >
                    {layout === 'list' ? (
                      <div style={{ display: 'flex', gap: 'var(--zf-s4)', padding: 'var(--zf-s4)' }}>
                        <Skeleton.Image active style={{ width: 100, height: 140, borderRadius: 'var(--zf-r-sm)' }} />
                        <div style={{ flex: 1 }}>
                          <Skeleton active paragraph={{ rows: 3 }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Skeleton.Image active style={{ width: '100%', height: 200 }} />
                        <div style={{ padding: '10px 12px 12px' }}>
                          <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
                        </div>
                      </>
                    )}
                  </Card>
                ))}
              </div>

              {/* —— 进度 / 取消 —— */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--zf-s3)', marginTop: 'var(--zf-s6)' }}>
                <div style={{ width: 200 }}>
                  <Progress
                    percent={Math.round(searchProgress)}
                    showInfo={false}
                    strokeColor={color}
                    trailColor={isDarkMode ? '#333' : '#f0f0f0'}
                    size="small"
                  />
                </div>
                <Text style={{ color: isDarkMode ? '#888' : '#999' }}>
                  {searchMode === 'aggregated'
                    ? (batchProgress
                      ? `正在搜索书源... 已搜索 ${batchProgress.completedSources}/${batchProgress.totalSources} 个书源（${batchProgress.succeededSources} 个成功，${batchProgress.failedSources} 个失败）`
                      : `正在准备搜索「${availableSources.length}」个书源...`)
                    : `正在从「${activeSource?.bookSourceName || '书源'}」搜索...`}
                </Text>
                {searchMode === 'aggregated' && sourceDetails.length > 0 && (
                  <div style={{ maxWidth: 600, width: '100%' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                      {sourceDetails.slice(-20).map((sd, i) => (
                        <Tag
                          key={i}
                          color={sd.success ? (sd.resultCount > 0 ? 'green' : 'orange') : 'red'}
                          style={{ fontSize: 11 }}
                        >
                          {sd.sourceName} {sd.success ? (sd.resultCount > 0 ? `(${sd.resultCount})` : '无结果') : '✗'}
                        </Tag>
                      ))}
                      {sourceDetails.length > 20 && (
                        <Tag style={{ fontSize: 11, color: isDarkMode ? '#888' : '#999' }}>
                          ...等 {sourceDetails.length} 个书源
                        </Tag>
                      )}
                    </div>
                  </div>
                )}
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  onClick={cancelSearch}
                  style={{ color: isDarkMode ? '#888' : '#999' }}
                >
                  取消搜索
                </Button>
              </div>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '20px 20px' }}
            >

              {searchMode === 'aggregated' && aggregatedMeta && (
                <div style={{ marginBottom: 16 }}>
                  <Card size="small" style={{ borderRadius: 12, ...glassItemStyle(glassMode, isDarkMode), marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text strong>
                          {batchRunning
                            ? <>正在搜索 <ReactBitsErrorBoundary fallback={aggregatedMeta.deduplicatedResults}><CountUp to={aggregatedMeta.deduplicatedResults} from={prevResultCountRef.current} duration={0.6} /></ReactBitsErrorBoundary> 条结果（已去重）</>
                            : <>搜索完成，共 <ReactBitsErrorBoundary fallback={aggregatedMeta.deduplicatedResults}><CountUp to={aggregatedMeta.deduplicatedResults} from={0} duration={1.2} /></ReactBitsErrorBoundary> 条结果（去重前 <ReactBitsErrorBoundary fallback={aggregatedMeta.totalResults}><CountUp to={aggregatedMeta.totalResults} from={0} duration={1.2} /></ReactBitsErrorBoundary> 条）</>}
                        </Text>
                        {batchRunning && (
                          <Tag color="processing" style={{ fontSize: 11 }}>
                            <SyncOutlined spin style={{ marginRight: 4 }} />
                            {batchProgress
                              ? `已搜索 ${batchProgress.completedSources}/${batchProgress.totalSources}`
                              : '搜索中...'}
                          </Tag>
                        )}
                      </div>
                      <Text style={{ color: isDarkMode ? '#888' : '#999' }}>
                        {aggregatedMeta.succeededSources}/{aggregatedMeta.totalSources} 个书源{batchRunning ? '已' : '成功'}，耗时 {aggregatedMeta.elapsedMs}ms
                        {batchRunning && `（更多结果载入中...）`}
                      </Text>
                    </div>
                  </Card>
                  {sourceDetails.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {sourceDetails.map((sd, i) => (
                        <Tag
                          key={i}
                          color={sd.success ? (sd.resultCount > 0 ? 'green' : 'orange') : 'red'}
                          style={{ cursor: 'pointer' }}
                        >
                          {sd.sourceName} {sd.success ? (sd.resultCount > 0 ? `(${sd.resultCount})` : '无结果') : '✗'} {sd.latencyMs}ms
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {layout === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.map((book, index) => (
                    <motion.div
                      key={`${book.id}-${index}`}
                      initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.4, delay: Math.min((index % 15) * 0.04, 0.6), ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
                    >
                      <Card
                        hoverable
                        style={{ borderRadius: 12, ...glassItemStyle(glassMode, isDarkMode), transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', overflow: 'hidden' }}
                        styles={{ body: { padding: 0 } }}
                        onClick={() => navigateToDetail(book)}
                      >
                        <div style={{ display: 'flex', alignItems: 'stretch', padding: 16, gap: 16 }}>
                          <div style={{
                            width: 100,
                            height: 140,
                            borderRadius: 8,
                            overflow: 'hidden',
                            flexShrink: 0,
                            position: 'relative',
                            boxShadow: 'var(--zf-shadow-sm)'
                          }}>
                            <img
                              alt={book.name}
                              src={book.coverUrl || book.cover || `https://placehold.co/90x120/${colors[index % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              loading="lazy"
                            />
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: `linear-gradient(135deg, ${color}12 0%, transparent 60%)`,
                              pointerEvents: 'none'
                            }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {book.name}
                                </Text>
                                {(book.sourceTag || book.sourceName) && (
                                  <Tag
                                    style={{
                                      fontSize: 10,
                                      padding: '0 5px',
                                      lineHeight: '18px',
                                      borderRadius: 4,
                                      flexShrink: 0,
                                      maxWidth: 160,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                                      borderColor: `${color}60`,
                                      color,
                                    }}
                                  >
                                    {book.sourceTag || book.sourceName}
                                  </Tag>
                                )}
                                {book.score > 0 && (
                                  <Tag color={color} style={{ fontSize: 11, padding: '0 6px', lineHeight: '20px', borderRadius: 4, flexShrink: 0 }}>
                                    {book.score}分
                                  </Tag>
                                )}
                              </div>
                              <Text style={{ fontSize: 14, display: 'block', marginBottom: 6, color: isDarkMode ? '#a0a0a0' : '#666' }}>
                                {book.author}
                              </Text>
                              {(book.intro || book.summary) && <SummaryText text={book.intro || book.summary} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {(book.kind || book.category) && (
                                  <Tag style={{ fontSize: 11, padding: '0 6px', lineHeight: '20px', borderRadius: 4, borderColor: `${color}40`, color }}>
                                    {book.kind || book.category}
                                  </Tag>
                                )}
                                {book.lastChapter && (
                                  <Text style={{ fontSize: 11, color: isDarkMode ? '#8a8a8a' : '#aaa' }} ellipsis>
                                    {book.lastChapter}
                                  </Text>
                                )}
                              </div>
                              <Tag
                                icon={<BookOutlined />}
                                color={color}
                                style={{ fontSize: 11, padding: '0 8px', lineHeight: '22px', borderRadius: 4 }}
                              >
                                查看详情
                              </Tag>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: 16
                }}>
                  {results.map((book, index) => (
                    <motion.div
                      key={`${book.id}-${index}`}
                      initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      transition={{ duration: 0.35, delay: Math.min((index % 15) * 0.04, 0.6), ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{
                        y: -6,
                        transition: { duration: 0.2 }
                      }}
                    >
                      <Card
                        hoverable
                        style={{ borderRadius: 12, ...glassItemStyle(glassMode, isDarkMode), transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'pointer', overflow: 'hidden' }}
                        styles={{ body: { padding: 0 } }}
                        onClick={() => navigateToDetail(book)}
                      >
                        <div style={{
                          position: 'relative',
                          height: 200,
                          overflow: 'hidden',
                          backgroundColor: colors[index % colors.length] + '20'
                        }}>
                          <img
                            alt={book.name}
                            src={book.coverUrl || book.cover || `https://placehold.co/200x300/${colors[index % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
                            }}
                            loading="lazy"
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.06)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          />
                          {book.score > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              backgroundColor: color,
                              color: '#fff',
                              padding: '2px 8px',
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 500,
                              boxShadow: `0 2px 8px ${color}60`
                            }}>
                              {book.score}分
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            height: 60,
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                            pointerEvents: 'none'
                          }} />
                        </div>
                        <div style={{ padding: '10px 12px 12px' }}>
                          <Text strong style={{
                            fontSize: 13,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            display: 'block',
                            marginBottom: 4
                          }}>
                            {book.name}
                          </Text>
                          <Text style={{
                            fontSize: 12,
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginBottom: 6,
                            color: isDarkMode ? '#a0a0a0' : '#666'
                          }}>
                            {book.author}
                          </Text>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {(book.kind || book.category) ? (
                              <Tag style={{ fontSize: 11, padding: '0 6px', lineHeight: '18px', borderRadius: 4, borderColor: `${color}40`, color }}>
                                {book.kind || book.category}
                              </Tag>
                            ) : <span />}
                            <Tag icon={<BookOutlined />} color={color} style={{ fontSize: 10, padding: '0 6px', lineHeight: '18px', borderRadius: 4 }}>
                              详情
                            </Tag>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}

              {loadingMore && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '32px 0' }}>
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 24, color }} spin />} />
                  <Text style={{ marginLeft: 12, color: isDarkMode ? '#888' : '#999' }}>加载中...</Text>
                </div>
              )}

              {batchRunning && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '24px 0', gap: 8 }}>
                  <SyncOutlined spin style={{ color, fontSize: 16 }} />
                  <Text style={{ color: isDarkMode ? '#888' : '#999' }}>
                    正在搜索更多书源... ({batchProgress ? `${batchProgress.completedSources}/${batchProgress.totalSources}` : ''})
                  </Text>
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseCircleOutlined />}
                    onClick={cancelSearch}
                    style={{ color: isDarkMode ? '#888' : '#999', fontSize: 12 }}
                  >
                    停止
                  </Button>
                </div>
              )}

              {allLoaded && !loadingMore && !batchRunning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px 20px',
                    marginTop: 16
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '12px 24px',
                    background: glassMode
                      ? (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                      : (isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    backdropFilter: glassMode ? 'blur(10px)' : 'none',
                    borderRadius: 24,
                    border: `1px solid ${isDarkMode ? (glassMode ? 'rgba(255,255,255,0.06)' : '#333') : (glassMode ? 'rgba(0,0,0,0.04)' : '#e8e8e8')}`
                  }}>
                    <Text style={{ fontSize: 14, color: isDarkMode ? '#888' : '#999' }}>
                      — 已加载全部 {results.length} 条结果 —
                    </Text>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : keyword && !batchRunning ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '0 20px' }}
            >
              <Card style={{ borderRadius: 'var(--zf-r-xl)', ...glassCardStyle(glassMode, isDarkMode) }}>
                <Empty
                  image={
                    <div style={{
                      width: 84,
                      height: 84,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 8px',
                      background: 'linear-gradient(135deg, var(--zf-primary-600), var(--zf-primary-500))',
                      boxShadow: 'var(--zf-glow-primary)',
                    }}>
                      <SearchOutlined style={{ fontSize: 34, color: '#fff' }} />
                    </div>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <motion.span
                          initial={{ opacity: 0, filter: 'blur(6px)' }}
                          animate={{ opacity: 1, filter: 'blur(0px)' }}
                          transition={{ duration: 0.5 }}
                        >
                          {`未找到与「${keyword}」相关的小说`}
                        </motion.span>
                      <Text style={{ fontSize: 13, color: isDarkMode ? '#888' : '#999' }}>
                        试试换个关键词或切换书源搜索
                      </Text>
                    </Space>
                  }
                >
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    style={{
                      border: 'none',
                      borderRadius: 'var(--zf-r-full)',
                      backgroundImage: `linear-gradient(135deg, ${color}, ${color}cc)`,
                      boxShadow: `0 6px 22px ${color}66, var(--zf-glow-primary)`
                    }}
                    onClick={handleBack}
                  >
                    重新搜索
                  </Button>
                </Empty>
              </Card>
              {searchMode === 'aggregated' && sourceDetails.length > 0 && (
                <Card size="small" style={{ borderRadius: 16, ...glassCardStyle(glassMode, isDarkMode), marginTop: 12 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 13 }}>
                      书源搜索状态
                    </Text>
                    {aggregatedMeta && (
                      <Text style={{ fontSize: 12, color: isDarkMode ? '#888' : '#999', marginLeft: 8 }}>
                        {aggregatedMeta.succeededSources} 个成功（其中 {sourceDetails.filter(sd => sd.success && sd.resultCount > 0).length} 个有结果），{aggregatedMeta.failedSources} 个失败，耗时 {aggregatedMeta.elapsedMs}ms
                      </Text>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sourceDetails.map((sd, i) => (
                      <Tag
                        key={i}
                        color={sd.success ? (sd.resultCount > 0 ? 'green' : 'orange') : 'red'}
                        style={{ fontSize: 11, cursor: 'default' }}
                        title={sd.error ? `${sd.sourceName}: ${sd.error}` : undefined}
                      >
                        {sd.sourceName} {sd.success ? (sd.resultCount > 0 ? `(${sd.resultCount})` : '无结果') : `✗ ${sd.error || ''}`}
                      </Tag>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="no-keyword"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '0 20px' }}
            >
              <Card style={{ borderRadius: 16, ...glassCardStyle(glassMode, isDarkMode) }}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={<Text style={{ fontSize: 16, color: isDarkMode ? '#ccc' : '#666' }}>请输入搜索关键词</Text>}
                />
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchResult;
