import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Space, Badge } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import { glassItemStyle } from '../utils/glassStyle';

const { Text } = Typography;

const NovelCard = ({ novel, index, color, glassMode, isDarkMode, rankBadge, showHoverEffect = true }) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  const handleClick = () => {
    const ds = getDefaultSource();
    const sourceUrl = ds.bookSourceUrl;
    const novelId = String(novel.id || novel.novelId || '');
    const bookUrlTemplate = ds.ruleSearch?.bookUrl || '';
    let bookUrl = novelId;
    if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
      bookUrl = bookUrlTemplate.replace(/\{\{\$?\.?novelId\}\}/g, novelId);
    } else if (bookUrlTemplate && !bookUrlTemplate.includes('{{')) {
      bookUrl = bookUrlTemplate;
    }
    saveNovelCache(novel, sourceUrl, bookUrl);

    const params = new URLSearchParams();
    params.set('sourceUrl', sourceUrl);
    params.set('bookUrl', bookUrl);
    navigate(`/novel/${novel.id}?${params.toString()}`);
  };

  return (
    <motion.div
      whileHover={showHoverEffect ? { scale: 1.03, y: -5 } : {}}
      transition={{ duration: 0.2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      style={{ cursor: 'pointer' }}
    >
      <Card
        hoverable
        style={{ ...glassItemStyle(glassMode, isDarkMode) }}
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
            {rankBadge != null && (
              <Badge
                count={rankBadge}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 8,
                  backgroundColor: color,
                  border: 'none'
                }}
              />
            )}
            {novel.rank != null && rankBadge == null && (
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
            )}
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
        styles={{ body: { padding: 12 } }}
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

export default NovelCard;
