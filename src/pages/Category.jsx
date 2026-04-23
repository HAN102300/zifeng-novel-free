import React, { useState, useContext } from 'react';
import { Card, Row, Col, Typography, Tag, Space, Radio, Segmented } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FireOutlined,
  ThunderboltOutlined,
  BankOutlined,
  CloudOutlined,
  AimOutlined,
  HistoryOutlined,
  CustomerServiceOutlined,
  RocketOutlined,
  QuestionCircleOutlined,
  CrownOutlined,
  HeartOutlined,
  BulbOutlined,
  SmileOutlined,
  SafetyOutlined,
  StarOutlined,
  TrophyOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { ThemeContext } from '../App';

const { Title, Text } = Typography;

// 男生频道分类
const maleCategories = [
  { name: '玄幻', categoryId: 'lejRej', icon: FireOutlined, desc: '修仙悟道，逆天改命', color: '#ff4d4f' },
  { name: '武侠', categoryId: 'nel5aK', icon: ThunderboltOutlined, desc: '快意恩仇，仗剑天涯', color: '#fa8c16' },
  { name: '都市', categoryId: 'mbk5ez', icon: BankOutlined, desc: '都市风云，纵横捭阖', color: '#1890ff' },
  { name: '仙侠', categoryId: 'vbmOeY', icon: CloudOutlined, desc: '仙道飘渺，御剑飞行', color: '#722ed1' },
  { name: '军事', categoryId: 'penRe7', icon: AimOutlined, desc: '铁血军魂，保家卫国', color: '#52c41a' },
  { name: '历史', categoryId: 'xbojag', icon: HistoryOutlined, desc: '穿越古今，纵横天下', color: '#eb2f96' },
  { name: '游戏', categoryId: 'mep2bM', icon: CustomerServiceOutlined, desc: '虚拟世界，无限可能', color: '#13c2c2' },
  { name: '科幻', categoryId: 'zbq2dp', icon: RocketOutlined, desc: '星辰大海，未来可期', color: '#2f54eb' },
  { name: '轻小说', categoryId: 'YerEdO', icon: ExperimentOutlined, desc: '轻松阅读，趣味横生', color: '#faad14' },
];

// 女生频道分类
const femaleCategories = [
  { name: '现代言情', categoryId: '9avmeG', icon: HeartOutlined, desc: '都市情缘，甜蜜爱恋', color: '#eb2f96' },
  { name: '古代言情', categoryId: 'DdwRb1', icon: CrownOutlined, desc: '宫闱情深，凤舞九天', color: '#ff4d4f' },
  { name: '幻想言情', categoryId: '7ax9by', icon: BulbOutlined, desc: '奇幻世界，浪漫邂逅', color: '#722ed1' },
  { name: '青春校园', categoryId: 'Pdy7aQ', icon: SmileOutlined, desc: '青春校园，懵懂心动', color: '#fa8c16' },
  { name: '唯美纯爱', categoryId: 'kazYeJ', icon: StarOutlined, desc: '纯爱至上，温暖治愈', color: '#13c2c2' },
  { name: '同人衍生', categoryId: '9aAOdv', icon: SafetyOutlined, desc: '同人创作，衍生无限', color: '#2f54eb' },
];

// sort选项
const sortOptions = [
  { label: '全部', value: 1 },
  { label: '完结', value: 2 },
  { label: '连载', value: 3 },
];

const Category = () => {
  const { themeConfigs, currentTheme, isDarkMode } = useContext(ThemeContext);
  const colors = themeConfigs[currentTheme].colors;
  const primaryColor = themeConfigs[currentTheme].primaryColor;
  const navigate = useNavigate();

  const [channel, setChannel] = useState(() => {
    try {
      const saved = sessionStorage.getItem('category_channel');
      return saved ? Number(saved) : 1;
    } catch { return 1; }
  });
  const [sort, setSort] = useState(() => {
    try {
      const saved = sessionStorage.getItem('category_sort');
      return saved ? Number(saved) : 1;
    } catch { return 1; }
  });

  const categories = channel === 1 ? maleCategories : femaleCategories;

  const handleSortChange = (value) => {
    setSort(value);
    sessionStorage.setItem('category_sort', String(value));
  };

  const handleChannelChange = (e) => {
    const value = e.target.value;
    setChannel(value);
    sessionStorage.setItem('category_channel', String(value));
  };

  const handleCategoryClick = (category) => {
    navigate(`/category-detail/${channel}/${sort}/${category.categoryId}/${category.name}`);
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <Card
        style={{
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* 顶部区域：标题 + 频道切换 */}
        <div style={{
          padding: '20px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <Space align="center">
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: `${primaryColor}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FireOutlined style={{ fontSize: 20, color: primaryColor }} />
            </div>
            <Title level={4} style={{ margin: 0 }}>小说分类</Title>
          </Space>

          <Radio.Group
            value={channel}
            onChange={handleChannelChange}
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value={1}>男生频道</Radio.Button>
            <Radio.Button value={2}>女生频道</Radio.Button>
          </Radio.Group>
        </div>

        {/* 状态筛选 */}
        <div style={{
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Text type="secondary" style={{ fontSize: 14, whiteSpace: 'nowrap' }}>状态筛选</Text>
          <Segmented
            value={sort}
            onChange={handleSortChange}
            options={sortOptions}
            style={{
              background: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f0f0f0',
              borderRadius: 8,
              padding: 2
            }}
          />
        </div>

        {/* 分隔线 */}
        <div style={{
          margin: '0 24px',
          height: 1,
          background: isDarkMode ? 'rgba(255,255,255,0.06)' : '#f0f0f0'
        }} />

        {/* 分类卡片网格 */}
        <div style={{ padding: '20px 24px 24px' }}>
          <Row gutter={[16, 16]}>
            <AnimatePresence mode="popLayout">
              {categories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <Col xs={8} sm={8} md={8} lg={8} xl={8} key={category.categoryId}>
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleCategoryClick(category)}
                      style={{ cursor: 'pointer' }}
                    >
                      <Card
                        hoverable
                        style={{
                          borderRadius: 12,
                          textAlign: 'center',
                          border: `1.5px solid ${category.color}30`,
                          background: isDarkMode
                            ? `linear-gradient(135deg, ${category.color}10 0%, transparent 60%)`
                            : `linear-gradient(135deg, ${category.color}08 0%, #ffffff 60%)`,
                          overflow: 'hidden',
                          position: 'relative'
                        }}
                        bodyStyle={{ padding: '20px 12px' }}
                      >
                        {/* 装饰圆 */}
                        <div style={{
                          position: 'absolute',
                          top: -20,
                          right: -20,
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          background: `${category.color}10`,
                          pointerEvents: 'none'
                        }} />

                        <Space direction="vertical" size={8} style={{ width: '100%', position: 'relative' }}>
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            backgroundColor: `${category.color}18`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            color: category.color,
                            fontSize: 22,
                            transition: 'all 0.3s ease'
                          }}>
                            <Icon />
                          </div>
                          <Text strong style={{ fontSize: 15, color: isDarkMode ? '#e0e0e0' : '#333' }}>
                            {category.name}
                          </Text>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 11,
                              lineHeight: 1.4,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                          >
                            {category.desc}
                          </Text>
                          <Tag
                            color={category.color}
                            style={{ margin: 0, fontSize: 11, borderRadius: 10 }}
                          >
                            {sort === 1 ? '全部' : sort === 2 ? '完结' : '连载'}
                          </Tag>
                        </Space>
                      </Card>
                    </motion.div>
                  </Col>
                );
              })}
            </AnimatePresence>
          </Row>
        </div>
      </Card>
    </div>
  );
};

export default Category;
