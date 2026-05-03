import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Typography, Space, Empty, Button, Tag, Spin, Segmented, Select } from 'antd';
import { SearchOutlined, AppstoreOutlined, OrderedListOutlined, BookOutlined, LoadingOutlined, SwapOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import SummaryText from '../components/SummaryText';
import { ThemeContext } from '../App';
import {
  getBookSources, getActiveSource, setActiveSource as saveActiveSource
} from '../utils/bookSourceManager';
import { searchBooksAPI, getAllEnabledSources } from '../utils/apiClient';
import { saveNovelCache, simpleHash } from '../utils/novelConfig';

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

  useEffect(() => {
    const loadSources = async () => {
      let enabled = [];
      try {
        const res = await getAllEnabledSources();
        const backendSources = res.data?.data;
        if (backendSources && backendSources.length > 0) {
          const parsed = backendSources.map(s => {
            const result = { ...s };
            try { if (typeof s.ruleSearch === 'string') result.ruleSearch = JSON.parse(s.ruleSearch); } catch {}
            try { if (typeof s.ruleBookInfo === 'string') result.ruleBookInfo = JSON.parse(s.ruleBookInfo); } catch {}
            try { if (typeof s.ruleToc === 'string') result.ruleToc = JSON.parse(s.ruleToc); } catch {}
            try { if (typeof s.ruleContent === 'string') result.ruleContent = JSON.parse(s.ruleContent); } catch {}
            return result;
          });
          enabled = parsed.filter(s => s.enabled);
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

  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(1);

  const handleSourceChange = (url) => {
    const source = availableSources.find(s => s.bookSourceUrl === url);
    if (source) {
      setActiveSourceState(source);
      saveActiveSource(url);
      setResults([]);
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      hasMoreRef.current = true;
      setAllLoaded(false);
      fetchSearchResults(keyword, 1, false, source);
    }
  };

  const fetchSearchResults = useCallback(async (searchKeyword, pageNum, isLoadMore = false, sourceOverride = null) => {
    if (!searchKeyword.trim()) return;
    if (isLoadMore && loadingMoreRef.current) return;

    const source = sourceOverride || activeSource;
    if (!source) return;

    if (isLoadMore) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let list = null;

      try {
        const result = await searchBooksAPI(source, searchKeyword, pageNum);
        if (result.success) {
          list = result.results || [];
        }
      } catch (e) {
        console.warn('服务端搜索失败，尝试前端回退:', e.message);
      }

      if (list === null) {
        list = [];
      }

      if (list.length > 0) {
        if (isLoadMore) {
          setResults(prev => [...prev, ...list]);
        } else {
          setResults(list);
        }

        if (list.length < 10) {
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
      console.error('搜索失败:', error);
      if (!isLoadMore) {
        setResults([]);
      }
      setHasMore(false);
      hasMoreRef.current = false;
      setAllLoaded(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  }, [activeSource]);

  useEffect(() => {
    if (keyword && sourcesLoaded) {
      setPage(1);
      pageRef.current = 1;
      setHasMore(true);
      hasMoreRef.current = true;
      setAllLoaded(false);
      setResults([]);
      fetchSearchResults(keyword, 1);
    }
  }, [keyword, fetchSearchResults, sourcesLoaded]);

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

  const toggleLayout = (val) => {
    setLayout(val);
    localStorage.setItem('search_layout', val);
  };

  const navigateToDetail = (book) => {
    if (!activeSource) return;
    const sourceUrl = activeSource.bookSourceUrl;
    const bookUrl = book._sourceUrl || book.bookUrl || book.url || String(book.id || '');
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
    navigate(-1);
  };

  const glassCardStyle = (extra = {}) => ({
    borderRadius: 16,
    background: glassMode
      ? (isDarkMode ? 'rgba(20,20,20,0.65)' : 'rgba(255,255,255,0.6)')
      : (isDarkMode ? '#141414' : '#ffffff'),
    backdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
    WebkitBackdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
    border: glassMode
      ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
      : `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`,
    boxShadow: glassMode
      ? `0 8px 32px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`
      : '0 8px 32px rgba(0,0,0,0.1)',
    ...extra
  });

  const itemCardStyle = (extra = {}) => ({
    borderRadius: 12,
    background: glassMode
      ? (isDarkMode ? 'rgba(25,25,25,0.55)' : 'rgba(255,255,255,0.5)')
      : (isDarkMode ? '#141414' : '#ffffff'),
    backdropFilter: glassMode ? 'blur(16px) saturate(1.1)' : 'none',
    WebkitBackdropFilter: glassMode ? 'blur(16px) saturate(1.1)' : 'none',
    border: glassMode
      ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`
      : `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`,
    boxShadow: glassMode
      ? `0 4px 16px ${isDarkMode ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)'}`
      : '0 4px 16px rgba(0,0,0,0.08)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    overflow: 'hidden',
    ...extra
  });

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
          <Card style={glassCardStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: '1 1 auto', minWidth: 0 }}>
                <BackButton onClick={handleBack} />
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <SearchOutlined style={{ color, fontSize: 18, flexShrink: 0 }} />
                    <Text strong style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      搜索：{keyword}
                    </Text>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {sourcesLoaded && activeSource && (
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
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 300, gap: 16 }}
            >
              <Spin size="large" indicator={<LoadingOutlined style={{ fontSize: 32, color }} spin />} />
              <Text style={{ color: isDarkMode ? '#888' : '#999' }}>正在搜索中...</Text>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '20px 20px' }}
            >
              {layout === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {results.map((book, index) => (
                    <motion.div
                      key={`${book.id}-${index}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min((index % 15) * 0.04, 0.6), ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ scale: 1.005, transition: { duration: 0.2 } }}
                    >
                      <Card
                        hoverable
                        style={itemCardStyle()}
                        bodyStyle={{ padding: 0 }}
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
                            boxShadow: `0 4px 12px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.12)'}`
                          }}>
                            <img
                              alt={book.name}
                              src={book.cover || `https://placehold.co/90x120/${colors[index % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
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
                                {book.score > 0 && (
                                  <Tag color={color} style={{ fontSize: 11, padding: '0 6px', lineHeight: '20px', borderRadius: 4, flexShrink: 0 }}>
                                    {book.score}分
                                  </Tag>
                                )}
                              </div>
                              <Text style={{ fontSize: 14, display: 'block', marginBottom: 6, color: isDarkMode ? '#a0a0a0' : '#666' }}>
                                {book.author}
                              </Text>
                              {book.summary && <SummaryText text={book.summary} />}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                {book.category && (
                                  <Tag style={{ fontSize: 11, padding: '0 6px', lineHeight: '20px', borderRadius: 4, borderColor: `${color}40`, color }}>
                                    {book.category}
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
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: Math.min((index % 15) * 0.04, 0.6), ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{
                        y: -6,
                        transition: { duration: 0.2 }
                      }}
                    >
                      <Card
                        hoverable
                        style={itemCardStyle()}
                        bodyStyle={{ padding: 0 }}
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
                            src={book.cover || `https://placehold.co/200x300/${colors[index % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)'
                            }}
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
                            {book.category ? (
                              <Tag style={{ fontSize: 11, padding: '0 6px', lineHeight: '18px', borderRadius: 4, borderColor: `${color}40`, color }}>
                                {book.category}
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

              {allLoaded && !loadingMore && (
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
          ) : keyword ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '0 20px' }}
            >
              <Card style={glassCardStyle()}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Space direction="vertical" size={4}>
                      <Text style={{ fontSize: 16, color: isDarkMode ? '#ccc' : '#666' }}>
                        未找到与「{keyword}」相关的小说
                      </Text>
                      <Text style={{ fontSize: 13, color: isDarkMode ? '#888' : '#999' }}>
                        试试换个关键词搜索吧
                      </Text>
                    </Space>
                  }
                >
                  <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    style={{ backgroundColor: color, borderColor: color, borderRadius: 8 }}
                    onClick={handleBack}
                  >
                    重新搜索
                  </Button>
                </Empty>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="no-keyword"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: '0 20px' }}
            >
              <Card style={glassCardStyle()}>
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
