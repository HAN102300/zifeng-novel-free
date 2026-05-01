import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Space, Empty, Button, Tag, message, Badge, Spin, Segmented } from 'antd';
import { BookOutlined, PlusOutlined, ClockCircleOutlined, StarOutlined, DeleteOutlined, UserOutlined, HeartOutlined, ReadOutlined, AppstoreOutlined, OrderedListOutlined } from '@ant-design/icons';
import { ThemeContext } from '../App';
import { AuthContext } from '../App';
import { getTocAPI, getBookshelf, removeFromBookshelf, getReadingHistory, getReadingProgress, deleteReadingHistory } from '../utils/apiClient';
import SummaryText from '../components/SummaryText';
import { getDefaultSource, saveReaderCache, simpleHash } from '../utils/novelConfig';
import { getBookSources } from '../utils/bookSourceManager';

const { Title, Text } = Typography;

const formatProgress = (val) => {
  if (val == null || val === 0) return '0.000%';
  const p = val <= 1 ? val * 100 : val;
  return `${p.toFixed(3)}%`;
};

const ProgressBar = ({ progress, primaryColor, isDarkMode, style }) => {
  const [hovered, setHovered] = useState(false);
  const percent = progress != null ? (progress <= 1 ? progress * 100 : progress) : 0;
  const clampedPercent = Math.min(percent, 100);
  const trackBg = isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const glowColor = isDarkMode ? `${primaryColor}cc` : `${primaryColor}ee`;
  const trackHeight = style?.height || 5;
  const isAbsolutePosition = style?.position === 'absolute';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'relative', width: '100%', cursor: 'pointer', zIndex: hovered ? 30 : (isAbsolutePosition ? 5 : 'auto'), ...style }}
    >
      <div style={{ position: 'relative', width: '100%', height: trackHeight, borderRadius: trackHeight / 2, background: trackBg }}>
        <div style={{
          height: '100%',
          borderRadius: trackHeight / 2,
          width: `${clampedPercent}%`,
          background: `linear-gradient(90deg, ${primaryColor}, ${glowColor})`,
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: clampedPercent > 0 ? `0 0 6px ${primaryColor}66` : 'none',
        }} />
      </div>
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: `calc(${typeof trackHeight === 'number' ? trackHeight : 5}px + 10px)`,
          left: '50%',
          transform: 'translateX(-50%)',
          background: isDarkMode ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.96)',
          color: isDarkMode ? '#fff' : '#333',
          padding: '5px 12px',
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: isDarkMode ? '0 4px 16px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.18)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
          pointerEvents: 'none',
          zIndex: 50,
        }}>
          {formatProgress(progress)}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '5px solid transparent',
            borderRight: '5px solid transparent',
            borderTop: `5px solid ${isDarkMode ? 'rgba(0,0,0,0.88)' : 'rgba(255,255,255,0.96)'}`,
          }} />
        </div>
      )}
    </div>
  );
};

const Shelf = () => {
  const navigate = useNavigate();
  const { themeConfigs, currentTheme, isDarkMode } = useContext(ThemeContext);
  const { isLoggedIn, userInfo } = useContext(AuthContext);
  const colors = themeConfigs[currentTheme].colors;
  const [readingBooks, setReadingBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [navigatingBookId, setNavigatingBookId] = useState(null);
  const [shelfLayout, setShelfLayout] = useState(() => {
    const saved = localStorage.getItem('shelf_layout');
    return saved || 'grid';
  });
  const [historyLayout, setHistoryLayout] = useState(() => {
    const saved = localStorage.getItem('history_layout');
    return saved || 'grid';
  });

  useEffect(() => {
    let cancelled = false;
    const loadUserData = async () => {
      if (isLoggedIn && userInfo) {
        try {
          const token = localStorage.getItem('zifeng_token');
          if (!token) return;

          const serverShelf = await getBookshelf();
          const serverHistory = await getReadingHistory();

          const mappedShelf = serverShelf.map(item => ({
            id: item.bookUrl,
            name: item.bookName,
            author: item.author,
            cover: item.coverUrl,
            summary: item.summary,
            lastChapter: item.lastChapter,
            sourceUrl: item.sourceUrl,
            sourceName: item.sourceName,
            bookUrl: item.bookUrl,
            category: item.category,
            progress: item.progress || 0,
          }));

          const mappedHistory = serverHistory.map(item => ({
            id: item.bookUrl,
            name: item.bookName,
            author: item.author,
            cover: item.coverUrl,
            summary: item.summary,
            lastChapter: item.lastChapter,
            sourceUrl: item.sourceUrl,
            sourceName: item.sourceName,
            bookUrl: item.bookUrl,
            chapterIndex: item.chapterIndex,
            chapterName: item.chapterName,
            progress: item.progress || 0,
            lastRead: item.lastRead,
          }));

          if (!cancelled) {
            setFavoriteBooks(mappedShelf);
            setReadingBooks(mappedHistory);
          }
        } catch (error) {
          console.error('加载用户数据失败:', error);
          if (!cancelled) {
            setFavoriteBooks([]);
            setReadingBooks([]);
          }
        }
      } else {
        setFavoriteBooks([]);
        setReadingBooks([]);
      }
    };
    
    loadUserData();
    return () => { cancelled = true; };
  }, [isLoggedIn, userInfo]);

  const handleRemoveBook = async (bookId, type) => {
    if (!isLoggedIn || !userInfo) return;
    
    try {
      if (type === 'shelf') {
        const book = favoriteBooks.find(b => b.id === bookId);
        if (book && book.bookUrl) {
          await removeFromBookshelf(book.bookUrl);
        }
        setFavoriteBooks(prev => prev.filter(book => book.id !== bookId));
        message.success('移除成功');
      } else if (type === 'history') {
        await deleteReadingHistory();
        setReadingBooks([]);
        message.success('清空历史记录成功');
      } else if (type === 'singleHistory') {
        const book = readingBooks.find(b => b.id === bookId);
        if (book && book.bookUrl) {
          await deleteReadingHistory(book.bookUrl);
        }
        setReadingBooks(prev => prev.filter(book => book.id !== bookId));
        message.success('删除成功');
      }
    } catch (error) {
      console.error('移除书籍失败:', error);
      message.error('移除失败，请稍后重试');
    }
  };

  const navigateToReader = async (bookId) => {
    setNavigatingBookId(bookId);
    try {
      const novelId = String(bookId);

      let sourceUrl = '';
      let bookUrl = novelId;
      let sourceName = '';
      let matchedBook = null;

      const shelfBook = favoriteBooks.find(b => String(b.id) === novelId);
      if (shelfBook) {
        matchedBook = shelfBook;
      } else {
        const historyBook = readingBooks.find(b => String(b.id) === novelId);
        if (historyBook) {
          matchedBook = historyBook;
        }
      }

      if (matchedBook) {
        sourceUrl = matchedBook.sourceUrl || '';
        bookUrl = matchedBook.bookUrl || novelId;
        sourceName = matchedBook.sourceName || '';
      }

      let effectiveSource = null;
      if (sourceUrl) {
        const allSources = getBookSources();
        effectiveSource = allSources.find(s => s.bookSourceUrl === sourceUrl);
      }
      if (!effectiveSource) {
        const ds = getDefaultSource();
        effectiveSource = ds;
        sourceUrl = ds.bookSourceUrl;
      }

      const tocUrlTemplate = effectiveSource.ruleBookInfo?.tocUrl || '';
      let tocUrl = bookUrl;
      if (tocUrlTemplate && tocUrlTemplate.includes('{{')) {
        let extractedId = bookUrl;
        const bookUrlTemplate = effectiveSource.ruleSearch?.bookUrl || '';
        if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
          const templatePattern = bookUrlTemplate.replace(/\{\{[^}]+\}\}/g, '([^/?#]+)');
          const regex = new RegExp('^' + templatePattern + '$');
          const match = bookUrl.match(regex);
          if (match && match[1]) {
            extractedId = match[1];
          }
        }
        if (extractedId === bookUrl) {
          try {
            const urlPath = new URL(bookUrl.startsWith('http') ? bookUrl : 'http://dummy' + bookUrl).pathname;
            const segments = urlPath.split('/').filter(Boolean);
            if (segments.length > 0) {
              extractedId = segments[segments.length - 1];
            }
          } catch {}
        }
        tocUrl = tocUrlTemplate.replace(/\{\{[^}]+\}\}/g, extractedId);
      }

      const bookData = { id: bookId, novelId: bookId, name: matchedBook?.name || '', author: matchedBook?.author || '', cover: matchedBook?.cover || '', summary: matchedBook?.summary || '', lastChapter: matchedBook?.lastChapter || '', sourceUrl, sourceName, bookUrl };

      let savedChapterIndex = 0;
      if (isLoggedIn && userInfo) {
        const token = localStorage.getItem('zifeng_token');
        if (token && bookUrl) {
          try {
            const serverProgress = await getReadingProgress(bookUrl);
            if (serverProgress && typeof serverProgress.chapterIndex === 'number') {
              savedChapterIndex = serverProgress.chapterIndex;
            }
          } catch {}
        }
      }

      const result = await getTocAPI(effectiveSource, tocUrl, bookData);
      if (result.success && result.chapters && result.chapters.length > 0) {
        const chapters = result.chapters;
        if (savedChapterIndex >= chapters.length) {
          savedChapterIndex = chapters.length - 1;
        }
        saveReaderCache(bookData, sourceUrl, bookUrl, tocUrl, chapters);

        const readerParams = new URLSearchParams();
        readerParams.set('sourceUrl', sourceUrl);
        readerParams.set('bookUrl', bookUrl);
        readerParams.set('tocUrl', tocUrl);
        readerParams.set('chapterIndex', String(savedChapterIndex));
        readerParams.set('from', 'shelf');

        const bookKey = simpleHash(sourceUrl + '_' + bookUrl);
        navigate(`/reader/${bookKey}?${readerParams.toString()}`);
      } else {
        message.error('获取章节列表失败');
      }
    } catch (error) {
      console.error('获取章节列表失败:', error);
      message.error('获取章节列表失败，请稍后重试');
    } finally {
      setNavigatingBookId(null);
    }
  };

  const navigateToHome = () => {
    navigate('/');
  };

  const toggleShelfLayout = (val) => {
    setShelfLayout(val);
    localStorage.setItem('shelf_layout', val);
  };

  const toggleHistoryLayout = (val) => {
    setHistoryLayout(val);
    localStorage.setItem('history_layout', val);
  };

  const layoutSwitcher = (layout, onChange) => (
    <Segmented
      value={layout}
      onChange={onChange}
      options={[
        { value: 'grid', icon: <AppstoreOutlined />, label: '网格模式' },
        { value: 'list', icon: <OrderedListOutlined />, label: '列表模式' }
      ]}
      style={{
        background: isDarkMode ? '#333' : '#f0f0f0',
        borderRadius: 8
      }}
    />
  );

  if (!isLoggedIn || !userInfo) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '80vh',
        flexDirection: 'column',
        gap: 20
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              textAlign: 'center',
              background: isDarkMode ? '#141414' : '#ffffff'
            }}
          >
          <div style={{ padding: '40px 20px' }}>
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: `${themeConfigs[currentTheme].primaryColor}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px'
              }}
            >
              <UserOutlined style={{ fontSize: 40, color: themeConfigs[currentTheme].primaryColor }} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Title level={4} style={{ margin: 0, marginBottom: 12 }}>请先登录</Title>
              <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
                登录后可以查看您的书架和阅读历史
              </Text>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Button 
                type="primary" 
                size="large" 
                style={{ 
                  width: '100%', 
                  height: 48, 
                  borderRadius: 8,
                  backgroundColor: themeConfigs[currentTheme].primaryColor,
                  borderColor: themeConfigs[currentTheme].primaryColor
                }}
                onClick={() => navigate('/login', { state: { from: '/shelf' } })}
              >
                去登录
              </Button>
            </motion.div>
          </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 0 40px 0' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          marginBottom: 24,
          padding: '0 20px'
        }}
      >
        <Space align="center">
          <Title level={4} style={{ 
            margin: 0, 
            color: themeConfigs[currentTheme].primaryColor 
          }}>
            欢迎回来，{userInfo.username}！
          </Title>
          <Badge 
            count={favoriteBooks.length} 
            style={{ 
              backgroundColor: themeConfigs[currentTheme].primaryColor,
              fontSize: 12,
              padding: '0 5px',
              height: 20
            }}
          />
        </Space>
        <Text type="secondary" style={{ marginTop: 4, display: 'block' }}>
          您的书架中有 {favoriteBooks.length} 本书籍，{readingBooks.length} 条阅读记录
        </Text>
      </motion.div>

      <Row gutter={[24, 24]} style={{ padding: '0 20px' }}>
        {/* 我的收藏 */}
        <Col xs={24}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space align="center">
                    <StarOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />
                    <Title level={5} style={{ margin: 0 }}>我的收藏</Title>
                    <Badge 
                      count={favoriteBooks.length} 
                      style={{ 
                        backgroundColor: themeConfigs[currentTheme].primaryColor,
                        fontSize: 12
                      }}
                    />
                  </Space>
                  {layoutSwitcher(shelfLayout, toggleShelfLayout)}
                </div>
              }
              style={{ 
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                background: isDarkMode ? '#141414' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`
              }}
            >
            {favoriteBooks.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: shelfLayout === 'grid'
                  ? 'repeat(auto-fill, minmax(170px, 1fr))'
                  : 'repeat(auto-fill, minmax(450px, 1fr))',
                gap: 16
              }}>
                {favoriteBooks.map((book, index) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={shelfLayout === 'grid' ? { 
                        y: -5, 
                        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                        transition: { duration: 0.2 }
                      } : {}}
                    >
                      <Card
                        hoverable
                        style={{
                          borderRadius: 12,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                          border: `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`,
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                        bodyStyle={shelfLayout === 'grid' ? { padding: 0 } : { padding: 0 }}
                        onClick={() => navigateToReader(book.id)}
                      >
                        {shelfLayout === 'grid' ? (
                          <>
                            <div style={{ 
                              position: 'relative', 
                              height: 220,
                              overflow: 'hidden',
                              backgroundColor: colors[(index + 3) % colors.length] + '20'
                            }}>
                              {navigatingBookId === book.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: 0, left: 0, right: 0, bottom: 0,
                                  background: 'rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 10
                                }}>
                                  <Spin size="small" />
                                </div>
                              )}
                              <img
                                alt={book.name}
                                src={book.cover || `https://placehold.co/200x300/${colors[(index + 3) % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover',
                                  transition: 'transform 0.5s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                              />
                              <Button
                                icon={<DeleteOutlined />}
                                type="text"
                                size="small"
                                style={{
                                  position: 'absolute',
                                  top: 6,
                                  right: 6,
                                  backgroundColor: 'rgba(0,0,0,0.45)',
                                  color: '#fff',
                                  width: 28,
                                  height: 28,
                                  padding: 0,
                                  borderRadius: 14,
                                  zIndex: 5,
                                  opacity: 0.7,
                                  transition: 'opacity 0.3s ease'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.backgroundColor = 'rgba(255,77,79,0.85)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)'; }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBook(book.id, 'shelf');
                                }}
                              />
                            </div>
                            <ProgressBar progress={book.progress} primaryColor={themeConfigs[currentTheme].primaryColor} isDarkMode={isDarkMode} style={{ height: 5 }} />
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
                              <Text type="secondary" style={{ 
                                fontSize: 12, 
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginBottom: 6
                              }}>{book.author}</Text>
                              <Tag 
                                icon={<HeartOutlined />} 
                                color={themeConfigs[currentTheme].primaryColor} 
                                style={{ fontSize: 11, padding: '2px 8px' }}
                              >
                                已收藏
                              </Tag>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'stretch', padding: 10, gap: 10 }}>
                            <div style={{ 
                              width: 120,
                              height: 160,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative'
                            }}>
                              {navigatingBookId === book.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: 0, left: 0, right: 0, bottom: 0,
                                  background: 'rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 10
                                }}>
                                  <Spin size="large" />
                                </div>
                              )}
                              <img
                                alt={book.name}
                                src={book.cover || `https://placehold.co/200x300/${colors[(index + 3) % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div>
                                <Text strong style={{ 
                                  fontSize: 18,
                                  display: 'block',
                                  marginBottom: 2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {book.name}
                                </Text>
                                <Text style={{ fontSize: 14, display: 'block', marginBottom: 6, color: isDarkMode ? '#a0a0a0' : '#666' }}>
                                  {book.author}
                                </Text>
                                {book.summary && (
                                  <SummaryText text={book.summary} style={{ marginBottom: 6 }} />
                                )}
                                {book.lastChapter && (
                                  <div style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    marginBottom: 2
                                  }}>
                                    <Text style={{ fontSize: 12, color: isDarkMode ? '#8a8a8a' : '#aaa' }}>最近更新</Text>
                                    <Text style={{ fontSize: 12, color: themeConfigs[currentTheme].primaryColor, fontWeight: 500 }}>{book.lastChapter}</Text>
                                  </div>
                                )}
                              </div>
                              <ProgressBar progress={book.progress} primaryColor={themeConfigs[currentTheme].primaryColor} isDarkMode={isDarkMode} style={{ height: 5, marginTop: 6 }} />
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                                <Tag 
                                  icon={<HeartOutlined />} 
                                  color={themeConfigs[currentTheme].primaryColor} 
                                  style={{ fontSize: 11, padding: '1px 6px' }}
                                >
                                  已收藏
                                </Tag>
                                <Button
                                  icon={<DeleteOutlined />}
                                  type="text"
                                  danger
                                  size="small"
                                  style={{ fontSize: 12 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveBook(book.id, 'shelf');
                                  }}
                                >
                                  移出
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text style={{ fontSize: 16, color: isDarkMode ? '#ccc' : '#666' }}>
                      暂无收藏书籍
                    </Text>
                  }
                >
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    style={{ 
                      backgroundColor: themeConfigs[currentTheme].primaryColor, 
                      borderColor: themeConfigs[currentTheme].primaryColor,
                      padding: '6px 24px',
                      borderRadius: 8
                    }}
                    onClick={navigateToHome}
                  >
                    去添加收藏
                  </Button>
                </Empty>
              </motion.div>
            )}
            </Card>
          </motion.div>
        </Col>

        {/* 最近阅读 */}
        <Col xs={24}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <Space align="center">
                    <ClockCircleOutlined style={{ color: themeConfigs[currentTheme].primaryColor }} />
                    <Title level={5} style={{ margin: 0 }}>最近阅读</Title>
                    {readingBooks.length > 0 && (
                      <Space>
                        <Badge 
                          count={readingBooks.length} 
                          style={{ 
                            backgroundColor: themeConfigs[currentTheme].primaryColor,
                            fontSize: 11
                          }}
                        />
                        <Button 
                          type="text" 
                          icon={<DeleteOutlined />} 
                          style={{ color: '#ff4d4f' }}
                          onClick={() => handleRemoveBook(null, 'history')}
                        >
                          清空历史
                        </Button>
                      </Space>
                    )}
                  </Space>
                  {layoutSwitcher(historyLayout, toggleHistoryLayout)}
                </div>
              }
              style={{ 
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                background: isDarkMode ? '#141414' : '#ffffff',
                border: `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`
              }}
            >
            {readingBooks.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: historyLayout === 'grid'
                  ? 'repeat(auto-fill, minmax(170px, 1fr))'
                  : 'repeat(auto-fill, minmax(450px, 1fr))',
                gap: 16
              }}>
                {readingBooks.map((book, index) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={historyLayout === 'grid' ? { 
                        y: -5, 
                        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
                        transition: { duration: 0.2 }
                      } : {}}
                    >
                      <Card
                        hoverable
                        style={{
                          borderRadius: 12,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                          border: `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`,
                          transition: 'all 0.3s ease',
                          cursor: 'pointer',
                          overflow: 'hidden'
                        }}
                        bodyStyle={historyLayout === 'grid' ? { padding: 0 } : { padding: 0 }}
                        onClick={() => navigateToReader(book.id)}
                      >
                        {historyLayout === 'grid' ? (
                          <>
                            <div style={{ 
                              position: 'relative',
                              height: 220,
                              overflow: 'hidden',
                              backgroundColor: colors[index % colors.length] + '20'
                            }}>
                              {navigatingBookId === book.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: 0, left: 0, right: 0, bottom: 0,
                                  background: 'rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 10
                                }}>
                                  <Spin size="large" />
                                </div>
                              )}
                              <img
                                alt={book.name}
                                src={book.cover || `https://placehold.co/200x300/${colors[index % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                                style={{ 
                                  width: '100%', 
                                  height: '100%', 
                                  objectFit: 'cover',
                                  transition: 'transform 0.5s ease'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                              />
                              <div style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                display: 'flex',
                                gap: 4,
                                alignItems: 'center'
                              }}>
                                <div style={{
                                  backgroundColor: 'rgba(0,0,0,0.6)',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  fontSize: 11
                                }}>
                                  {book.lastRead ? new Date(book.lastRead).toLocaleDateString() : '未知时间'}
                                </div>
                                <Button
                                  icon={<DeleteOutlined />}
                                  type="text"
                                  size="small"
                                  style={{
                                    backgroundColor: 'rgba(0,0,0,0.45)',
                                    color: '#fff',
                                    width: 24,
                                    height: 24,
                                    padding: 0,
                                    borderRadius: 12,
                                    opacity: 0.7,
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.opacity = 1; e.currentTarget.style.backgroundColor = 'rgba(255,77,79,0.85)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.45)'; }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveBook(book.id, 'singleHistory');
                                  }}
                                />
                              </div>
                            </div>
                            <ProgressBar progress={book.progress} primaryColor={themeConfigs[currentTheme].primaryColor} isDarkMode={isDarkMode} style={{ height: 5 }} />
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
                              <Text type="secondary" style={{ 
                                fontSize: 12, 
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                marginBottom: 6
                              }}>{book.author}</Text>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Tag color={colors[index % colors.length]} style={{ fontSize: 11 }}>
                                  继续阅读
                                </Tag>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'stretch', padding: 10, gap: 10 }}>
                            <div style={{ 
                              width: 120,
                              height: 160,
                              borderRadius: 6,
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative'
                            }}>
                              {navigatingBookId === book.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: 0, left: 0, right: 0, bottom: 0,
                                  background: 'rgba(0,0,0,0.5)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  zIndex: 10
                                }}>
                                  <Spin size="small" />
                                </div>
                              )}
                              <img
                                alt={book.name}
                                src={book.cover || `https://placehold.co/200x300/${colors[index % colors.length].replace('#', '')}/white?text=${encodeURIComponent(book.name.slice(0, 2))}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div>
                                <Text strong style={{ 
                                  fontSize: 18,
                                  display: 'block',
                                  marginBottom: 2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {book.name}
                                </Text>
                                <Text style={{ fontSize: 14, display: 'block', marginBottom: 6, color: isDarkMode ? '#a0a0a0' : '#666' }}>
                                  {book.author}
                                </Text>
                                {book.summary && (
                                  <SummaryText text={book.summary} style={{ marginBottom: 6 }} />
                                )}
                                {book.lastChapter && (
                                  <div style={{ 
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    marginBottom: 2
                                  }}>
                                    <Text style={{ fontSize: 12, color: isDarkMode ? '#8a8a8a' : '#aaa' }}>最近更新</Text>
                                    <Text style={{ fontSize: 12, color: themeConfigs[currentTheme].primaryColor, fontWeight: 500 }}>{book.lastChapter}</Text>
                                  </div>
                                )}
                              </div>
                              <ProgressBar progress={book.progress} primaryColor={themeConfigs[currentTheme].primaryColor} isDarkMode={isDarkMode} style={{ height: 5, marginTop: 6 }} />
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                                <Tag color={colors[index % colors.length]} style={{ fontSize: 11, padding: '1px 6px' }}>
                                  继续阅读
                                </Tag>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Text type="secondary" style={{ fontSize: 13 }}>
                                    {book.lastRead ? new Date(book.lastRead).toLocaleDateString() : '未知时间'}
                                  </Text>
                                  <Button
                                    icon={<DeleteOutlined />}
                                    type="text"
                                    danger
                                    size="small"
                                    style={{ fontSize: 12, padding: '0 4px' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveBook(book.id, 'singleHistory');
                                    }}
                                  >
                                    删除
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <Text style={{ fontSize: 16, color: isDarkMode ? '#ccc' : '#666' }}>
                      暂无阅读记录
                    </Text>
                  }
                >
                  <Button 
                    type="primary" 
                    icon={<PlusOutlined />} 
                    style={{ 
                      backgroundColor: themeConfigs[currentTheme].primaryColor, 
                      borderColor: themeConfigs[currentTheme].primaryColor,
                      padding: '6px 24px',
                      borderRadius: 8
                    }}
                    onClick={navigateToHome}
                  >
                    去发现好书
                  </Button>
                </Empty>
              </motion.div>
            )}
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
};

export default Shelf;
