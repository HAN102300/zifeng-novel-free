import React, { useContext, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Tag, 
  Spin, 
  Space,
  Divider,
  Badge
} from 'antd';
import { 
  RightOutlined, 
  FireOutlined, 
  TrophyOutlined, 
  RiseOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CommentOutlined,
  StarOutlined
} from '@ant-design/icons';
import { NovelContext, ThemeContext } from '../App';

const { Title, Text } = Typography;

const NovelCard = ({ novel, index, color }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={() => navigate(`/novel/${novel.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <Card
        hoverAble
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
              count={novel.rank}
              style={{ 
                position: 'absolute', 
                top: 8, 
                left: 8,
                backgroundColor: color,
                border: 'none'
              }}
            />
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
              <StarOutlined style={{ color: '#faad14', fontSize: 12 }} />
              <Text style={{ fontSize: 12, color: '#faad14' }}>{novel.score}</Text>
            </Space>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const SectionHeader = ({ title, icon: Icon, color, onClick, rankType, navigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const handleReadMore = () => {
    if (rankType && navigate) {
      navigate(`/rank/${rankType}`);
    } else if (onClick) {
      onClick();
    }
  };
  
  return (
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
        <Title level={4} style={{ margin: 0, color: color }}>{title}</Title>
      </Space>
      <motion.div
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={handleReadMore}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          gap: 4,
          color: isHovered ? color : '#666',
          transition: 'color 0.3s ease'
        }}
      >
        <Text style={{ color: 'inherit' }}>阅读更多</Text>
        <motion.div
          animate={{ x: isHovered ? 5 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <RightOutlined style={{ color: 'inherit' }} />
        </motion.div>
      </motion.div>
    </div>
  );
};

const NovelSection = ({ title, icon, novels, color, span = 24, rankType, navigate, gridClass = 'novel-grid-main' }) => {
  return (
    <Col span={span} style={{ marginBottom: 24 }}>
      <Card
        style={{ 
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '0 0 20px 0' }}>
          <SectionHeader 
            title={title} 
            icon={icon} 
            color={color}
            rankType={rankType}
            navigate={navigate}
          />
          <div className="novel-section-content" style={{ padding: '0 20px' }}>
            <div className={`novel-grid ${gridClass}`}>
              {novels.map((novel, index) => (
                <div className="novel-item" key={novel.id}>
                  <NovelCard novel={novel} index={index} color={color} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </Col>
  );
};

const Home = () => {
  const { novels, loading } = useContext(NovelContext);
  const { currentTheme, themeConfigs, isDarkMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  
  const colors = themeConfigs[currentTheme].colors;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <Row gutter={[24, 24]}>
        {/* 必读热门推荐 - 全宽 */}
        <NovelSection
          title="必读热门推荐"
          icon={TrophyOutlined}
          novels={novels.mustRead}
          color={colors[0]}
          span={24}
          rankType="mustRead"
          navigate={navigate}
          gridClass="novel-grid-main"
        />

        {/* 潜力榜 - 半宽 */}
        <Col xs={24} lg={12}>
          <Card
            style={{ 
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              height: '100%'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '0 0 20px 0' }}>
              <SectionHeader 
                title="潜力榜" 
                icon={RiseOutlined} 
                color={colors[1]}
                rankType="potential"
                navigate={navigate}
              />
              <div className="novel-section-content" style={{ padding: '0 20px' }}>
                <div className="novel-grid novel-grid-half">
                  {novels.potential.map((novel, index) => (
                    <div className="novel-item" key={novel.id}>
                      <NovelCard novel={novel} index={index} color={colors[1]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 完本榜 - 半宽 */}
        <Col xs={24} lg={12}>
          <Card
            style={{ 
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              height: '100%'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '0 0 20px 0' }}>
              <SectionHeader 
                title="完本榜" 
                icon={CheckCircleOutlined} 
                color={colors[2]}
                rankType="completed"
                navigate={navigate}
              />
              <div className="novel-section-content" style={{ padding: '0 20px' }}>
                <div className="novel-grid novel-grid-half">
                  {novels.completed.map((novel, index) => (
                    <div className="novel-item" key={novel.id}>
                      <NovelCard novel={novel} index={index} color={colors[2]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 更新榜 - 中等屏幕半宽，大屏幕1/3宽 */}
        <Col xs={24} md={12} lg={8}>
          <Card
            style={{ 
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              height: '100%'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '0 0 20px 0' }}>
              <SectionHeader 
                title="更新榜" 
                icon={ClockCircleOutlined} 
                color={colors[3]}
                rankType="updated"
                navigate={navigate}
              />
              <div className="novel-section-content" style={{ padding: '0 20px' }}>
                <div className="novel-grid novel-grid-third">
                  {novels.updated.map((novel, index) => (
                    <div className="novel-item" key={novel.id}>
                      <NovelCard novel={novel} index={index} color={colors[3]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 搜索榜 - 中等屏幕半宽，大屏幕1/3宽 */}
        <Col xs={24} md={12} lg={8}>
          <Card
            style={{ 
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              height: '100%'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '0 0 20px 0' }}>
              <SectionHeader 
                title="搜索榜" 
                icon={EyeOutlined} 
                color={colors[4]}
                rankType="search"
                navigate={navigate}
              />
              <div className="novel-section-content" style={{ padding: '0 20px' }}>
                <div className="novel-grid novel-grid-third">
                  {novels.search.map((novel, index) => (
                    <div className="novel-item" key={novel.id}>
                      <NovelCard novel={novel} index={index} color={colors[4]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 评论榜 - 中等屏幕半宽，大屏幕1/3宽 */}
        <Col xs={24} md={12} lg={8}>
          <Card
            style={{ 
              borderRadius: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              height: '100%'
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '0 0 20px 0' }}>
              <SectionHeader 
                title="评论榜" 
                icon={CommentOutlined} 
                color={colors[0]}
                rankType="comment"
                navigate={navigate}
              />
              <div className="novel-section-content" style={{ padding: '0 20px' }}>
                <div className="novel-grid novel-grid-third">
                  {novels.comment.map((novel, index) => (
                    <div className="novel-item" key={novel.id}>
                      <NovelCard novel={novel} index={index} color={colors[0]} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Home;
