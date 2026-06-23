import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Tag, Space, Divider, Spin, Button, Pagination } from 'antd';
import { FireOutlined, TrophyOutlined, RiseOutlined, CheckCircleOutlined, ClockCircleOutlined, EyeOutlined, CommentOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext } from '../App';
import { glassCardStyle } from '../utils/glassStyle';
import { CountUp, BlurText, ReactBitsErrorBoundary } from '../components/react-bits';
import axios from 'axios';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import NovelCard from '../components/NovelCard';
import { proxyImageUrl } from '../utils/apiClient';

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
  const { currentTheme, themeConfigs, isDarkMode, glassMode } = useContext(ThemeContext);
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
        const sourceHeaders = (() => { try { return JSON.parse((ds.header || '{}').replace(/'/g, '"')); } catch { return {}; } })();
        const response = await axios.get(`/api/proxy`, {
          params: {
            url: `${ds.bookSourceUrl}/module/rank?type=${config.type}&channel=1&page=${currentPage}`,
            headers: JSON.stringify(sourceHeaders)
          }
        });
        
        if (response.data && response.data.data) {
          const data = response.data.data.map((novel, index) => {
            let coverUrl = novel.cover || '';
            if (coverUrl && !coverUrl.startsWith('http') && !coverUrl.startsWith('data:') && !coverUrl.startsWith('//')) {
              coverUrl = `${ds.bookSourceUrl}${coverUrl.startsWith('/') ? '' : '/'}${coverUrl}`;
            }
            return {
              id: novel.novelId || index + 1,
              name: novel.novelName || '未知标题',
              author: novel.authorName || '未知作者',
              cover: coverUrl,
              category: novel.categoryNames && novel.categoryNames.length > 0 ? novel.categoryNames[0].className : '未知分类',
              score: novel.averageScore || 0,
              rankInfo: novel.rankInfo || `${index + 1}`,
              rank: (currentPage - 1) * 15 + index + 1
            };
          });
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
              <Icon style={{ fontSize: 20, color: color }} />
            </div>
            <Title level={3} style={{ margin: 0, color: color }}>
              <ReactBitsErrorBoundary fallback={config.title}>
                <BlurText text={config.title} animateBy="words" delay={100} tag="span" style={{ display: 'inline-flex' }} />
              </ReactBitsErrorBoundary>
            </Title>
          </Space>
          <Text type="secondary" style={{ fontSize: 14 }}>
            共 <ReactBitsErrorBoundary fallback={total}><CountUp to={total} from={0} duration={1.5} separator="," /></ReactBitsErrorBoundary> 本
          </Text>
        </div>
        
        {novels.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <motion.span
                initial={{ opacity: 0, filter: 'blur(6px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.5 }}
                style={{ fontSize: 16, color: isDarkMode ? '#888' : '#999' }}
              >
                暂无榜单数据
              </motion.span>
            </div>
        ) : (
        <Row gutter={[16, 16]}>
          {novels.map((novel, index) => (
            <Col key={novel.id} xs={12} sm={8} md={6} lg={4} xl={4}>
              <NovelCard novel={novel} index={index} color={color} glassMode={glassMode} isDarkMode={isDarkMode} />
            </Col>
          ))}
        </Row>
        )}
        
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