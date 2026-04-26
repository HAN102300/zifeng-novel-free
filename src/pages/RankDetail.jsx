import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Tag, Space, Divider, Spin, Button, Pagination } from 'antd';
import { FireOutlined, TrophyOutlined, RiseOutlined, CheckCircleOutlined, ClockCircleOutlined, EyeOutlined, CommentOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import axios from 'axios';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';

// 缓存机制
const rankCache = new Map();

const { Title, Text } = Typography;

const rankConfig = {
  mustRead: { title: '必读热门推荐', icon: TrophyOutlined, type: 1 },
  potential: { title: '潜力榜', icon: RiseOutlined, type: 5 },
  completed: { title: '完本榜', icon: CheckCircleOutlined, type: 2 },
  updated: { title: '更新榜', icon: ClockCircleOutlined, type: 3 },
  search: { title: '搜索榜', icon: EyeOutlined, type: 4 },
  comment: { title: '评论榜', icon: CommentOutlined, type: 6 }
};

const RankDetail = () => {
  const { rankType } = useParams();
  const navigate = useNavigate();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  
  const config = rankConfig[rankType];
  const color = themeConfigs[currentTheme].colors[0];

  // 获取榜单数据
  useEffect(() => {
    const fetchRankData = async () => {
      if (!config) {
        setError('无效的榜单类型');
        setLoading(false);
        return;
      }
      
      // 生成缓存键
      const cacheKey = `${rankType}_${currentPage}`;
      
      // 检查缓存
      if (rankCache.has(cacheKey)) {
        const cachedData = rankCache.get(cacheKey);
        setNovels(cachedData.novels);
        setTotal(cachedData.total);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const ds = getDefaultSource();
        const headers = (() => { try { return JSON.parse((ds.header || '{}').replace(/'/g, '"')); } catch { return {}; } })();
        const response = await axios.get(`${ds.bookSourceUrl}/module/rank?type=${config.type}&channel=1&page=${currentPage}`, {
          headers
        });
        
        if (response.data && response.data.data) {
          const data = response.data.data.map((novel, index) => ({
            id: novel.novelId || index + 1,
            name: novel.novelName || '未知标题',
            author: novel.authorName || '未知作者',
            cover: novel.cover || '',
            category: novel.categoryNames && novel.categoryNames.length > 0 ? novel.categoryNames[0].className : '未知分类',
            score: novel.averageScore || 0,
            rankInfo: novel.rankInfo || `${index + 1}`,
            rank: (currentPage - 1) * 15 + index + 1
          }));
          setNovels(data);
          
          // 优化分页逻辑：限制最大页码为5，总数据量不超过75
          let total = 75; // 5 * 15 = 75
          if (data.length === 0) {
            // 如果当前页数据为空，则总数据量为 (currentPage - 1) * 15
            total = Math.min((currentPage - 1) * 15, 75);
          }
          setTotal(total);
          
          // 存入缓存
          rankCache.set(cacheKey, { novels: data, total });
        } else {
          // 如果没有数据，则总数据量为 (currentPage - 1) * 15，最大不超过75
          const total = Math.min((currentPage - 1) * 15, 75);
          setTotal(total);
          
          // 存入缓存
          rankCache.set(cacheKey, { novels: [], total });
        }
      } catch (error) {
        console.error('获取榜单数据失败:', error);
        setError('获取榜单数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchRankData();
  }, [rankType, currentPage, config]);

  // 小说卡片组件
  const NovelCard = ({ novel, index }) => {
    return (
      <motion.div
        whileHover={{ scale: 1.03, y: -5 }}
        transition={{ duration: 0.2 }}
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
                  objectFit: 'cover'
                }}
              />
              <Tag
                style={{ 
                  position: 'absolute', 
                  top: 8, 
                  left: 8,
                  backgroundColor: color,
                  border: 'none'
                }}
              >
                {novel.rank}
              </Tag>
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
            </div>
          }
          bodyStyle={{ padding: 12 }}
          onClick={() => {
            const ds = getDefaultSource();
            const novelId = String(novel.id || novel.novelId || '');
            const bookUrlTemplate = ds.ruleSearch?.bookUrl || '';
            let bookUrl = novelId;
            if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
              bookUrl = bookUrlTemplate.replace(/\{\{\$?\.?novelId\}\}/g, novelId);
            }
            saveNovelCache(novel, ds.bookSourceUrl, bookUrl);
            const p = new URLSearchParams();
            p.set('sourceUrl', ds.bookSourceUrl);
            p.set('bookUrl', bookUrl);
            navigate(`/novel/${novel.id}?${p.toString()}`);
          }}
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
              <Tag color={color} style={{ fontSize: 12 }}>{novel.category}</Tag>
              <Space size={4}>
                <Text style={{ fontSize: 12, color: '#faad14' }}>{novel.score}</Text>
              </Space>
            </div>
          </div>
        </Card>
      </motion.div>
    );
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

  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Text>无效的榜单类型</Text>
      </div>
    );
  }

  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 20 }} />
      
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
              <Icon style={{ fontSize: 20, color: color }} />
            </div>
            <Title level={3} style={{ margin: 0, color: color }}>{config.title}</Title>
          </Space>
        </div>
        
        <Row gutter={[16, 16]}>
          {novels.map((novel, index) => (
            <Col key={novel.id} xs={12} sm={8} md={6} lg={4} xl={4}>
              <NovelCard novel={novel} index={index} />
            </Col>
          ))}
        </Row>
        
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            current={currentPage}
            total={total}
            pageSize={15}
            onChange={setCurrentPage}
            showSizeChanger={false}
          />
        </div>
      </Card>
    </motion.div>
  );
};

export default RankDetail;