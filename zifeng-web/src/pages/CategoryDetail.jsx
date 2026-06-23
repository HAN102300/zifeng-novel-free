import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Tag, Space, Spin, Pagination, Badge, Button } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import axios from 'axios';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import { proxyImageUrl } from '../utils/apiClient';
import { glassCardStyle, glassItemStyle } from '../utils/glassStyle';
import { BlurText, ReactBitsErrorBoundary } from '../components/react-bits';
import NovelCard from '../components/NovelCard';
import { parseHeaders } from '../utils/headers';

const categoryCache = new Map();

const getCacheKey = (categoryId, sort, page) =>
  `category_${categoryId}_sort${sort}_page${page}`;

const getPageSessionKey = (categoryId, sortNum) =>
  `category_page_${categoryId}_${sortNum}`;

const getSavedPage = (categoryId, sortNum) => {
  try {
    const saved = sessionStorage.getItem(getPageSessionKey(categoryId, sortNum));
    return saved ? Number(saved) : 1;
  } catch {
    return 1;
  }
};

const savePageToSession = (categoryId, sortNum, page) => {
  try {
    sessionStorage.setItem(getPageSessionKey(categoryId, sortNum), String(page));
  } catch {
    // ignore
  }
};

const clearPageSession = (categoryId, sortNum) => {
  try {
    sessionStorage.removeItem(getPageSessionKey(categoryId, sortNum));
  } catch {
    // ignore
  }
};

const { Title, Text } = Typography;

const MAX_PAGES = 10;
const PAGE_SIZE = 15;

const CategoryDetail = () => {
  const { channel, sort, categoryId, categoryName } = useParams();
  const navigate = useNavigate();
  const { currentTheme, themeConfigs, isDarkMode, glassMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].colors[0];

  const sortNum = Number(sort);

  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => getSavedPage(categoryId, sortNum));
  const [total, setTotal] = useState(0);
  const [maxKnownPage, setMaxKnownPage] = useState(1);

  const fetchingRef = useRef(false);
  const isInitialMount = useRef(true);

  const goToPage = (page) => {
    setCurrentPage(page);
    savePageToSession(categoryId, sortNum, page);
  };

  const fetchCategoryData = useCallback(async (page) => {
    if (fetchingRef.current) return;
    
    const cacheKey = getCacheKey(categoryId, sortNum, page);

    if (categoryCache.has(cacheKey)) {
      const cachedData = categoryCache.get(cacheKey);
      setNovels(cachedData.novels);
      setTotal(cachedData.total);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    try {
      const ds = getDefaultSource();
      let targetUrl = `${ds.bookSourceUrl}/novel?sort=1&page=${page}&categoryId=${categoryId}`;
      if (sortNum === 2) {
        targetUrl += '&isComplete=1';
      } else if (sortNum === 3) {
        targetUrl += '&isComplete=0';
      }

      const sourceHeaders = parseHeaders(ds.header);
      const response = await axios.get('/api/proxy', {
        params: {
          url: targetUrl,
          headers: JSON.stringify(sourceHeaders)
        }
      });

      if (response.data && response.data.code === 200 && response.data.data) {
        const rawData = response.data.data;
        const data = rawData.map((novel, index) => {
          let coverUrl = novel.cover || '';
          if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('data:') && !coverUrl.startsWith('//')) {
            coverUrl = `${ds.bookSourceUrl}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`;
          }
          return {
            id: novel.novelId || index + 1,
            name: novel.novelName || '未知标题',
            author: novel.authorName || '未知作者',
            cover: coverUrl,
            category: novel.categoryNames && novel.categoryNames.length > 0
              ? novel.categoryNames[0].className
              : '未知分类',
            score: novel.averageScore || 0,
            rankInfo: novel.rankInfo || '',
          };
        });

        setNovels(data);

        let newTotal;
        if (data.length === 0) {
          newTotal = (page - 1) * PAGE_SIZE;
        } else if (page >= MAX_PAGES) {
          newTotal = MAX_PAGES * PAGE_SIZE;
        } else {
          newTotal = page * PAGE_SIZE + 1;
        }
        newTotal = Math.min(newTotal, MAX_PAGES * PAGE_SIZE);

        setTotal(newTotal);
        if (data.length > 0 && page > maxKnownPage) {
          setMaxKnownPage(page);
        }

        categoryCache.set(cacheKey, { novels: data, total: newTotal });
      } else {
        setNovels([]);
        const newTotal = (page - 1) * PAGE_SIZE;
        setTotal(newTotal);
        categoryCache.set(cacheKey, { novels: [], total: newTotal });
      }
    } catch (error) {
      console.error('获取分类数据失败:', error);
      setNovels([]);
      setTotal((page - 1) * PAGE_SIZE);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [categoryId, sortNum, maxKnownPage]);

  useEffect(() => {
    fetchCategoryData(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // 首次挂载时跳过重置，使用 sessionStorage 中保存的页码
    }
    goToPage(1);
    setMaxKnownPage(1);
    setTotal(0);
    setNovels([]);
    categoryCache.clear();
  }, [categoryId, sortNum]);

  const getSortLabel = () => {
    if (sortNum === 2) return '完结';
    if (sortNum === 3) return '连载';
    return '全部';
  };



  if (loading && novels.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <BackButton onClick={() => navigate('/category')} text="返回分类" style={{ marginBottom: 20 }} />

      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden',
          marginBottom: 20,
          ...glassCardStyle(glassMode, isDarkMode)
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            padding: '16px 20px',
            background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
            borderRadius: 12,
            borderLeft: `4px solid ${color}`
          }}
        >
          <Space align="center">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: `${color}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <StarOutlined style={{ fontSize: 20, color: color }} />
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: color }}>
              <ReactBitsErrorBoundary fallback={decodeURIComponent(categoryName)}>
                <BlurText text={decodeURIComponent(categoryName)} animateBy="words" delay={100} tag="span" style={{ display: 'inline-flex' }} />
              </ReactBitsErrorBoundary>
            </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {Number(channel) === 1 ? '男生频道' : '女生频道'} · {getSortLabel()}
              </Text>
            </div>
          </Space>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : novels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <motion.span
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.5 }}
                style={{ fontSize: 16, color: isDarkMode ? '#888' : '#999' }}
              >
                暂无小说数据
              </motion.span>
            </div>
        ) : (
          <Row gutter={[16, 16]}>
            {novels.map((novel, index) => (
              <Col key={novel.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                <NovelCard novel={novel} index={index} color={color} glassMode={glassMode} isDarkMode={isDarkMode} rankBadge={(currentPage - 1) * PAGE_SIZE + index + 1} />
              </Col>
            ))}
          </Row>
        )}

        {total > 0 && (
          <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              current={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={(page) => goToPage(page)}
              showSizeChanger={false}
              showQuickJumper={false}
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export default CategoryDetail;
