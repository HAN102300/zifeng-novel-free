import React, { useContext, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, Row, Col, Typography, Tag, Space, Divider, Spin, Button, Descriptions, message } from 'antd';
import { StarOutlined, ClockCircleOutlined, BookOutlined, FireOutlined, CheckOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import { ThemeContext, NovelContext } from '../App';
import { addToBookShelf, addToReadHistory, getUserInfo, getBookShelf, getReadHistory } from '../utils/storage';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

// 书源信息
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

// 缓存机制
const novelCache = new Map();

const NovelDetail = () => {
  const { novelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const { novels } = useContext(NovelContext);
  const [novel, setNovel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isInShelf, setIsInShelf] = useState(false);
  
  const color = themeConfigs[currentTheme].colors[0];

  // 加载用户信息和书架状态
  useEffect(() => {
    const loadUserAndShelf = async () => {
      const user = await getUserInfo();
      setUserInfo(user);
      
      // 检查书籍是否在书架中
      if (user && user.username && novelId) {
        try {
          const shelf = await getBookShelf(user.username);
          const inShelf = shelf.some(book => book.id === novelId);
          setIsInShelf(inShelf);
        } catch (error) {
          console.error('获取书架数据失败:', error);
        }
      }
    };
    
    loadUserAndShelf();
  }, [novelId]);

  // 监听用户信息变化，更新书架状态
  useEffect(() => {
    const checkShelfStatus = async () => {
      if (userInfo && novelId) {
        try {
          const shelf = await getBookShelf(userInfo.username);
          const inShelf = shelf.some(book => book.id === novelId);
          setIsInShelf(inShelf);
        } catch (error) {
          console.error('获取书架数据失败:', error);
        }
      }
    };
    
    checkShelfStatus();
  }, [userInfo, novelId]);

  // 获取小说详情数据
  useEffect(() => {
    const fetchNovelDetail = async () => {
      // 检查缓存
      if (novelCache.has(novelId)) {
        setNovel(novelCache.get(novelId));
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 使用ruleSearch中的bookUrl获取小说详情
        const response = await axios.get(`${bookSource.url}/novel/${novelId}?isSearch=1`, {
          headers: bookSource.headers
        });
        
        if (response.data && response.data.data) {
          const novelData = response.data.data;
          // console.log('API返回的数据结构:', novelData);
          // console.log('封面图片字段:', novelData.cover || novelData.coverUrl || novelData.image || novelData.img);
          setNovel(novelData);
          // 存入缓存
          novelCache.set(novelId, novelData);
        } else {
          setError('未找到小说信息');
        }
      } catch (error) {
        console.error('获取小说详情失败:', error);
        setError('获取小说详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNovelDetail();
  }, [novelId]);

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

  // 获取URL参数
  const getUrlParam = (name) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
  };

  // 处理返回按钮点击
  const handleBack = () => {
    const from = getUrlParam('from');
    if (from === 'shelf') {
      navigate('/shelf');
    } else if (from === 'search') {
      navigate(-1);
    } else if (from === 'category') {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

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
            background: isDarkMode ? '#141414' : '#ffffff'
          }}
          bodyStyle={{ padding: 0 }}
        >
          <Row gutter={[24, 24]} style={{ padding: '32px 24px' }}>
            {/* 小说封面 */}
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
                  transition: 'transform 0.3s ease'
                }}>
                  <img
                    alt={novel.novelName}
                    src={novel.cover || novel.coverUrl || novel.image || novel.img || `https://placehold.co/200x300/${color.replace('#', '')}/white?text=${encodeURIComponent(novel.novelName.slice(0, 2))}`}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  />
                </div>
              </motion.div>
            </Col>
            
            {/* 小说信息 */}
            <Col xs={24} md={18}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <Title level={3} style={{ margin: 0, color: color, marginBottom: 12 }}>{novel.novelName}</Title>
                <Text type="secondary" style={{ fontSize: 16, marginBottom: 20, display: 'block' }}>作者：{novel.authorName}</Text>
                
                <Space wrap style={{ marginBottom: 24 }}>
                  {novel.categoryNames && novel.categoryNames.map((category, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
                    >
                      <Tag color={color} style={{ fontSize: 12, padding: '4px 12px' }}>{category.className}</Tag>
                    </motion.div>
                  ))}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 }}
                  >
                    <Tag color="orange" style={{ fontSize: 12, padding: '4px 12px' }}>{novel.averageScore}分</Tag>
                  </motion.div>
                  {novel.tagNames && novel.tagNames.slice(0, 5).map((tag, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.8 + index * 0.1 }}
                    >
                      <Tag style={{ fontSize: 12, padding: '4px 12px' }}>{tag.tagName}</Tag>
                    </motion.div>
                  ))}
                </Space>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1 }}
                  style={{ marginBottom: 24 }}
                >
                  <Descriptions 
                    column={2} 
                    bordered 
                    style={{ 
                      borderRadius: 8,
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                    }}
                  >
                    <Descriptions.Item label="字数" style={{ fontWeight: 'bold' }}>{novel.wordNum || '未知'}</Descriptions.Item>
                    <Descriptions.Item label="章节数" style={{ fontWeight: 'bold' }}>{novel.chapterNum || '未知'}</Descriptions.Item>
                    <Descriptions.Item label="最后更新时间" style={{ fontWeight: 'bold' }}>{novel.lastUpdatedAt || '未知'}</Descriptions.Item>
                    <Descriptions.Item label="最后章节" style={{ fontWeight: 'bold' }}>{novel.lastChapter?.chapterName || '未知'}</Descriptions.Item>
                  </Descriptions>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.2 }}
                >
                  <Divider orientation="left" style={{ fontWeight: 'bold', color: color }}>简介</Divider>
                  <Card
                    style={{
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.08)',
                      background: isDarkMode ? '#1e1e1e' : '#f9f9f9'
                    }}
                    bodyStyle={{ padding: 20 }}
                  >
                    <Paragraph style={{ lineHeight: 1.8, margin: 0 }}>
                      {novel.summary || '暂无简介'}
                    </Paragraph>
                  </Card>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 1.4 }}
                  style={{ marginTop: 24, display: 'flex', gap: 16 }}
                >
                  <Button 
                    type="primary" 
                    size="large" 
                    style={{ 
                      backgroundColor: color, 
                      borderColor: color,
                      padding: '0 32px',
                      fontSize: 16,
                      height: 48
                    }}
                    onClick={async () => {
                      if (!userInfo) {
                        message.info('请先登录');
                        navigate('/login', { state: { from: location.pathname + location.search } });
                        return;
                      }
                      // 开始阅读，添加到阅读历史
                      const bookData = {
                        id: novel.novelId,
                        name: novel.novelName,
                        author: novel.authorName,
                        cover: novel.cover || novel.coverUrl || novel.image || novel.img,
                        summary: novel.summary || '',
                        lastChapter: novel.lastChapter?.chapterName || '',
                        progress: 0,
                        lastRead: new Date().toISOString()
                      };
                      try {
                        const history = await getReadHistory(userInfo.username);
                        const alreadyExists = history.some(book => book.id === novel.novelId);
                        await addToReadHistory(userInfo.username, bookData);
                        if (!alreadyExists) {
                          message.success('已记录阅读历史');
                        }
                      } catch (error) {
                        console.error('添加阅读历史失败:', error);
                      }
                      
                      // 获取章节列表，跳转到第一章
                      try {
                        // 使用代理路径
                        const response = await axios.get(`/api/novel/${novel.novelId}/chapters?readNum=1`, {
                          headers: bookSource.headers
                        });
                        
                        if (response.data && response.data.data && response.data.data.list.length > 0) {
                          const firstChapter = response.data.data.list[0];
                          const from = getUrlParam('from');
                          let readerUrl = `/reader/${novel.novelId}/${firstChapter.chapterId}`;
                          if (from) {
                            readerUrl += `?from=${from}`;
                          }
                          navigate(readerUrl);
                        } else {
                          message.error('获取章节列表失败');
                        }
                      } catch (error) {
                        console.error('获取章节列表失败:', error);
                        message.error('获取章节列表失败');
                      }
                    }}
                  >
                    开始阅读
                  </Button>
                  <Button 
                    size="large" 
                    style={{ 
                      padding: '0 32px',
                      fontSize: 16,
                      height: 48,
                      backgroundColor: isInShelf ? '#f0f0f0' : '',
                      borderColor: isInShelf ? '#d9d9d9' : '',
                      color: isInShelf ? '#666' : ''
                    }}
                    onClick={async () => {
                      if (!userInfo) {
                        message.info('请先登录');
                        navigate('/login', { state: { from: location.pathname + location.search } });
                        return;
                      }
                      if (isInShelf) {
                        message.info('书籍已在书架中');
                        return;
                      }
                      // 加入书架
                      const bookData = {
                        id: novel.novelId,
                        name: novel.novelName,
                        author: novel.authorName,
                        cover: novel.cover || novel.coverUrl || novel.image || novel.img,
                        summary: novel.summary || '',
                        lastChapter: novel.lastChapter?.chapterName || ''
                      };
                      try {
                        const success = await addToBookShelf(userInfo.username, bookData);
                        if (success) {
                          message.success('已加入书架');
                          setIsInShelf(true);
                        } else {
                          message.info('书籍已在书架中');
                          setIsInShelf(true);
                        }
                      } catch (error) {
                        console.error('加入书架失败:', error);
                        message.error('加入书架失败，请稍后重试');
                      }
                    }}
                  >
                    {isInShelf ? (
                      <Space>
                        <CheckOutlined /> 已加入书架
                      </Space>
                    ) : (
                      '加入书架'
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </Col>
          </Row>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default NovelDetail;