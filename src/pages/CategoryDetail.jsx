import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Tag, Space, Spin, Pagination, Badge, Button } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import axios from 'axios';

const categoryCache = new Map();

const getCacheKey = (categoryId, sort, page) =>
  `category_${categoryId}_sort${sort}_page${page}`;

const { Title, Text } = Typography;

const bookSource = {
  url: 'http://api.jmlldsc.com',
  headers: {
    'User-Agent': 'okhttp/4.9.2',
    'client-device': '2d37f6b5b6b2605373092c3dc65a3b39',
    'client-brand': 'Redmi',
    'client-version': '2.3.0',
    'client-name': 'app.maoyankanshu.novel',
    'client-source': 'android',
    'Authorization': 'bearereyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwOlwvXC9hcGkuanhndHp4Yy5jb21cL2F1dGhcL3RoaXJkIiwiaWF0IjoxNjgzODkxNjUyLCJleHAiOjE3NzcyMDM2NTIsIm5iZiI6MTY4Mzg5MTY1MiwianRpIjoiR2JxWmI4bGZkbTVLYzBIViIsInN1YiI6Njg3ODYyLCJwcnYiOiJhMWNiMDM3MTgwMjk2YzZhMTkzOGVmMzBiNDM3OTQ2NzJkZDAxNmM1In0.mMxaC2SVyZKyjC6rdUqFVv5d9w_X36o0AdKD7szvE_Q'
  }
};

const MAX_PAGES = 10;
const PAGE_SIZE = 15;

const CategoryDetail = () => {
  const { channel, sort, categoryId, categoryName } = useParams();
  const navigate = useNavigate();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].colors[0];

  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [maxKnownPage, setMaxKnownPage] = useState(1);

  const fetchingRef = useRef(false);
  const sortNum = Number(sort);

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
      let url = `${bookSource.url}/novel?sort=1&page=${page}&categoryId=${categoryId}`;
      if (sortNum === 2) {
        url += '&isComplete=1';
      } else if (sortNum === 3) {
        url += '&isComplete=0';
      }

      const response = await axios.get(url, { headers: bookSource.headers });

      if (response.data && response.data.code === 200 && response.data.data) {
        const rawData = response.data.data;
        const data = rawData.map((novel, index) => ({
          id: novel.novelId || index + 1,
          name: novel.novelName || '未知标题',
          author: novel.authorName || '未知作者',
          cover: novel.cover || '',
          category: novel.categoryNames && novel.categoryNames.length > 0
            ? novel.categoryNames[0].className
            : '未知分类',
          score: novel.averageScore || 0,
          rankInfo: novel.rankInfo || '',
        }));

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
    setCurrentPage(1);
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

  const NovelCard = ({ novel, index }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
      <motion.div
        whileHover={{ scale: 1.03, y: -5 }}
        transition={{ duration: 0.2 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => navigate(`/novel/${novel.id}?from=category`)}
        style={{ cursor: 'pointer' }}
      >
        <Card
          hoverable
          cover={
            <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
              <img
                alt={novel.name}
                src={novel.cover || `https://placehold.co/200x300/${color.replace('#', '')}/white?text=${encodeURIComponent(novel.name.slice(0, 2))}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.3s ease'
                }}
              />
              <Badge
                count={(currentPage - 1) * PAGE_SIZE + index + 1}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: color,
                  border: 'none'
                }}
              />
              {novel.rankInfo && (
                <div style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 'bold'
                }}>
                  {novel.rankInfo}
                </div>
              )}
            </div>
          }
          bodyStyle={{ padding: 12 }}
        >
          <div style={{ height: 80, display: 'flex', flexDirection: 'column' }}>
            <Text strong style={{
              fontSize: 14,
              marginBottom: 4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {novel.name}
            </Text>
            <Text type="secondary" style={{
              fontSize: 12,
              marginBottom: 8,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {novel.author}
            </Text>
            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Tag color={color} style={{ fontSize: 11 }}>{novel.category}</Tag>
              <Space size={4}>
                <StarOutlined style={{ color: '#faad14', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#faad14' }}>{novel.score}</Text>
              </Space>
            </div>
          </div>
        </Card>
      </motion.div>
    );
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
          marginBottom: 20
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
              <Title level={3} style={{ margin: 0, color: color }}>{decodeURIComponent(categoryName)}</Title>
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
            <Text type="secondary" style={{ fontSize: 16 }}>暂无小说数据</Text>
          </div>
        ) : (
          <Row gutter={[16, 16]}>
            {novels.map((novel, index) => (
              <Col key={novel.id} xs={12} sm={8} md={6} lg={4} xl={4}>
                <NovelCard novel={novel} index={index} />
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
              onChange={(page) => setCurrentPage(page)}
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
