import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Tag, Space, Divider, Spin, Button, Descriptions, message } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import { addToBookShelf, addToReadHistory, getUserInfo, getBookShelf } from '../utils/storage';
import { getBookInfoAPI, getTocAPI, addToBookshelf as apiAddToBookshelf, checkBookInShelf } from '../utils/apiClient';
import { getBookSources, getDefaultSource as getDefaultSourceFromManager } from '../utils/bookSourceManager';
import { loadNovelCache, saveReaderCache, simpleHash, getDefaultSource, isDefaultSource } from '../utils/novelConfig';
import { adaptBookInfo } from '../utils/bookAdapter';

const { Title, Text, Paragraph } = Typography;

function cleanUrl(url) {
  if (!url || typeof url !== 'string') return url;
  return url.replace(/[`\s]/g, '').trim();
}

const NovelDetail = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isInShelf, setIsInShelf] = useState(false);

  const color = themeConfigs[currentTheme].colors[0];

  useEffect(() => {
    const loadUser = async () => {
      const user = await getUserInfo();
      setUserInfo(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const checkShelf = async () => {
      if (userInfo && userInfo.username && novelId) {
        try {
          const shelf = await getBookShelf(userInfo.username);
          setIsInShelf(shelf.some(book => book.id === novelId));
        } catch {}
      }
      const token = localStorage.getItem('zifeng_token');
      const bookUrlParam = searchParams.get('bookUrl') || '';
      if (token && bookUrlParam) {
        try {
          const inShelf = await checkBookInShelf(bookUrlParam);
          if (inShelf) setIsInShelf(true);
        } catch {}
      }
    };
    checkShelf();
  }, [userInfo, novelId]);

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

        let source;
        if (effectiveSourceUrl && isDefaultSource(effectiveSourceUrl)) {
          source = getDefaultSourceFromManager();
        } else if (effectiveSourceUrl) {
          const allSources = getBookSources();
          source = allSources.find(s => s.bookSourceUrl === effectiveSourceUrl);
        }
        if (!source) {
          source = getDefaultSourceFromManager();
        }

        let bookInfo;
        if (effectiveBookUrl && source) {
          const result = await getBookInfoAPI(source, effectiveBookUrl, cachedBookData);
          if (result.success && result.bookInfo) {
            bookInfo = result.bookInfo;
          }
        }

        if (bookInfo) {
          const adapted = adaptBookInfo(bookInfo, { bookSourceUrl: effectiveSourceUrl, bookSourceName: source?.bookSourceName }) || {};
          const coverUrl = cleanUrl(adapted.coverUrl || bookInfo.coverUrl || bookInfo.cover || '');
          const tocUrl = cleanUrl(adapted.tocUrl || bookInfo.tocUrl || '');
          const mapped = {
            novelId: adapted.id || bookInfo.id || bookInfo.novelId || novelId,
            novelName: adapted.name || cachedBookData?.name || '',
            authorName: adapted.author || cachedBookData?.author || '',
            cover: coverUrl || cachedBookData?.cover || '',
            summary: adapted.intro || cachedBookData?.summary || '',
            categoryNames: adapted.kind ? [{ className: adapted.kind }] : (cachedBookData?.category ? [{ className: cachedBookData.category }] : []),
            averageScore: parseFloat(adapted.score) || cachedBookData?.score || 0,
            tagNames: [],
            wordNum: adapted.wordCount || '未知',
            chapterNum: adapted.chapterCount || bookInfo.chapterCount || '未知',
            lastUpdatedAt: adapted.updateTime || bookInfo.lastUpdateTime || '未知',
            lastChapter: adapted.lastChapter ? { chapterName: adapted.lastChapter } : null,
            _tocUrl: tocUrl || effectiveBookUrl,
            _sourceUrl: effectiveSourceUrl,
          };
          setNovel(mapped);
        } else if (cachedBookData) {
          const mapped = {
            novelId: cachedBookData.id || novelId,
            novelName: cachedBookData.name || cachedBookData.novelName || '',
            authorName: cachedBookData.author || cachedBookData.authorName || '',
            cover: cachedBookData.cover || cachedBookData.coverUrl || '',
            summary: cachedBookData.summary || cachedBookData.intro || '',
            categoryNames: cachedBookData.category ? [{ className: cachedBookData.category }] : [],
            averageScore: cachedBookData.score || 0,
            tagNames: [],
            wordNum: '未知',
            chapterNum: '未知',
            lastUpdatedAt: '未知',
            lastChapter: cachedBookData.lastChapter ? { chapterName: cachedBookData.lastChapter } : null,
            _tocUrl: effectiveBookUrl,
            _sourceUrl: effectiveSourceUrl,
          };
          setNovel(mapped);
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
  }, [searchParams, novelId]);

  const getUrlParam = (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  const handleBack = () => {
    const from = getUrlParam('from');
    if (from === 'shelf') navigate('/shelf');
    else navigate(-1);
  };

  const handleStartReading = async () => {
    if (!userInfo) {
      message.info('请先登录');
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }

    const sourceUrl = searchParams.get('sourceUrl') || '';
    const bookUrl = searchParams.get('bookUrl') || '';

    let sourceName = '';
    if (sourceUrl) {
      const allSources = getBookSources();
      const found = allSources.find(s => s.bookSourceUrl === sourceUrl);
      sourceName = found ? found.bookSourceName : '';
    }

    const bookData = {
      id: novel.novelId,
      name: novel.novelName,
      author: novel.authorName,
      cover: novel.cover,
      summary: novel.summary || '',
      lastChapter: novel.lastChapter?.chapterName || '',
      sourceUrl: sourceUrl,
      sourceName: sourceName,
      bookUrl: bookUrl,
      progress: 0,
      lastRead: new Date().toISOString(),
    };

    try {
      await addToReadHistory(userInfo.username, bookData);
    } catch {}

    try {
      let source;
      const sourceUrl = novel._sourceUrl;
      if (sourceUrl && isDefaultSource(sourceUrl)) {
        source = getDefaultSourceFromManager();
      } else if (sourceUrl) {
        const allSources = getBookSources();
        source = allSources.find(s => s.bookSourceUrl === sourceUrl);
      }
      if (!source) source = getDefaultSourceFromManager();

      const tocUrl = novel._tocUrl || searchParams.get('bookUrl') || '';
      const result = await getTocAPI(source, tocUrl, bookData);

      if (result.success && result.chapters && result.chapters.length > 0) {
        const chapters = result.chapters;
        saveReaderCache(bookData, sourceUrl, searchParams.get('bookUrl') || '', tocUrl, chapters);

        const readerParams = new URLSearchParams();
        readerParams.set('sourceUrl', sourceUrl || '');
        readerParams.set('bookUrl', searchParams.get('bookUrl') || '');
        readerParams.set('tocUrl', tocUrl || '');
        readerParams.set('chapterIndex', '0');
        const from = getUrlParam('from');
        if (from) readerParams.set('from', from);

        const bookKey = simpleHash((sourceUrl || '') + '_' + (searchParams.get('bookUrl') || ''));
        navigate(`/reader/${bookKey}?${readerParams.toString()}`);
      } else {
        message.error('获取章节列表失败');
      }
    } catch (error) {
      console.error('获取章节列表失败:', error);
      message.error('获取章节列表失败');
    }
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

    let sourceName = '';
    if (sourceUrl) {
      const allSources = getBookSources();
      const found = allSources.find(s => s.bookSourceUrl === sourceUrl);
      sourceName = found ? found.bookSourceName : '';
    }

    const bookData = {
      id: novel.novelId,
      name: novel.novelName,
      author: novel.authorName,
      cover: novel.cover,
      summary: novel.summary || '',
      lastChapter: novel.lastChapter?.chapterName || '',
      sourceUrl: sourceUrl,
      sourceName: sourceName,
      bookUrl: bookUrl,
      category: novel.categoryNames?.[0]?.className || '',
    };

    try {
      const success = await addToBookShelf(userInfo.username, bookData);

      const token = localStorage.getItem('zifeng_token');
      if (token) {
        try {
          await apiAddToBookshelf({
            bookName: novel.novelName,
            author: novel.authorName,
            bookUrl: bookUrl,
            coverUrl: novel.cover,
            summary: novel.summary || '',
            lastChapter: novel.lastChapter?.chapterName || '',
            sourceUrl: sourceUrl,
            sourceName: sourceName,
            category: novel.categoryNames?.[0]?.className || '',
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Text type="danger">{error}</Text>
      </div>
    );
  }

  if (!novel) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Text>小说不存在</Text>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ padding: '20px 0' }}
    >
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <BackButton onClick={handleBack} text="返回" style={{ marginBottom: 24 }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card
          style={{
            borderRadius: 16,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            background: isDarkMode ? '#141414' : '#ffffff',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Row gutter={[24, 24]} style={{ padding: '32px 24px' }}>
            <Col xs={24} md={6}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <div style={{
                  width: 200,
                  height: 280,
                  overflow: 'hidden',
                  borderRadius: 12,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}>
                  <img
                    alt={novel.novelName}
                    src={novel.cover || `https://placehold.co/200x300/${color.replace('#', '')}/white?text=${encodeURIComponent(novel.novelName.slice(0, 2))}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              </motion.div>
            </Col>

            <Col xs={24} md={18}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Title level={3} style={{ margin: 0, color, marginBottom: 12 }}>{novel.novelName}</Title>
                <Text type="secondary" style={{ fontSize: 16, marginBottom: 20, display: 'block' }}>作者：{novel.authorName}</Text>

                <Space wrap style={{ marginBottom: 24 }}>
                  {novel.categoryNames && novel.categoryNames.map((category, index) => (
                    <Tag key={index} color={color} style={{ fontSize: 12, padding: '4px 12px' }}>{category.className}</Tag>
                  ))}
                  {novel.averageScore > 0 && (
                    <Tag color="orange" style={{ fontSize: 12, padding: '4px 12px' }}>{novel.averageScore}分</Tag>
                  )}
                </Space>

                <Descriptions column={2} bordered style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
                  <Descriptions.Item label="字数">{novel.wordNum || '未知'}</Descriptions.Item>
                  <Descriptions.Item label="章节数">{novel.chapterNum || '未知'}</Descriptions.Item>
                  <Descriptions.Item label="最后更新">{novel.lastUpdatedAt || '未知'}</Descriptions.Item>
                  <Descriptions.Item label="最后章节">{novel.lastChapter?.chapterName || '未知'}</Descriptions.Item>
                </Descriptions>

                <Divider orientation="left" style={{ fontWeight: 'bold', color }}>简介</Divider>
                <Card
                  style={{ borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)', background: isDarkMode ? '#1e1e1e' : '#f9f9f9' }}
                  bodyStyle={{ padding: 20 }}
                >
                  <Paragraph style={{ lineHeight: 1.8, margin: 0 }}>
                    {novel.summary || '暂无简介'}
                  </Paragraph>
                </Card>

                <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
                  <Button
                    type="primary"
                    size="large"
                    style={{ backgroundColor: color, borderColor: color, padding: '0 32px', fontSize: 16, height: 48 }}
                    onClick={handleStartReading}
                  >
                    开始阅读
                  </Button>
                  <Button
                    size="large"
                    style={{ padding: '0 32px', fontSize: 16, height: 48 }}
                    onClick={handleAddToShelf}
                  >
                    {isInShelf ? <Space><CheckOutlined /> 已加入书架</Space> : '加入书架'}
                  </Button>
                </div>
              </motion.div>
            </Col>
          </Row>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default NovelDetail;
