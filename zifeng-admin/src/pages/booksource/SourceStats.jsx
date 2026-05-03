import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Spin, message, Typography } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import {
  DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined,
  GlobalOutlined, CodeOutlined, FileTextOutlined,
} from '@ant-design/icons';
import { getAdminSourceStats } from '../../utils/adminApi';
import { staggerFadeIn, cardHover, cardLeave } from '../../utils/animations';
import { ThemeContext } from '../../App';

const { Text } = Typography;

const SourceStats = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const statsRef = React.useRef(null);

  useEffect(() => {
    if (statsRef.current) staggerFadeIn(statsRef.current.children, 80);
  }, [stats]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getAdminSourceStats();
      setStats(res.data?.data || {});
    } catch { message.error('获取统计数据失败'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const total = stats?.total || 0;
  const enabled = stats?.enabled || 0;
  const disabled = total - enabled;
  const hasLogin = stats?.hasLogin || 0;
  const hasJs = stats?.hasJs || 0;
  const hasExplore = stats?.hasExplore || 0;

  const cardStyle = {
    borderRadius: 12,
    border: 'none',
    boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  };

  const summaryCards = [
    { title: '总书源数', value: total, icon: <DatabaseOutlined />, color: '#1890ff', gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' },
    { title: '已启用', value: enabled, icon: <CheckCircleOutlined />, color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
    { title: '已禁用', value: disabled, icon: <CloseCircleOutlined />, color: '#ff4d4f', gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' },
  ];

  const enablePieData = [
    { type: '已启用', value: enabled },
    { type: '已禁用', value: disabled },
  ];

  const featureBarData = [
    { feature: '含登录', value: hasLogin, color: '#722ed1' },
    { feature: '含JS脚本', value: hasJs, color: '#fa8c16' },
    { feature: '含发现规则', value: hasExplore, color: '#13c2c2' },
  ];

  const enablePieConfig = {
    data: enablePieData,
    angleField: 'value',
    colorField: 'type',
    color: ['#52c41a', '#ff4d4f'],
    radius: 0.85,
    innerRadius: 0.6,
    label: {
      text: (d) => `${d.type}\n${d.value}`,
      style: { fontWeight: 600, fill: isDarkMode ? '#fff' : '#333', fontSize: 13 },
    },
    legend: { color: { position: 'bottom' } },
    theme: isDarkMode ? 'classicDark' : 'classic',
  };

  const featureBarConfig = {
    data: featureBarData,
    xField: 'feature',
    yField: 'value',
    colorField: 'feature',
    color: featureBarData.map(d => d.color),
    columnWidthRatio: 0.4,
    label: {
      text: (d) => d.value.toLocaleString(),
      textBaseline: 'bottom',
      style: { fill: isDarkMode ? '#fff' : '#333', fontSize: 14, fontWeight: 600 },
    },
    axis: {
      x: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 13 } } },
      y: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' } } },
    },
    style: { radiusTopLeft: 6, radiusTopRight: 6 },
    theme: isDarkMode ? 'classicDark' : 'classic',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }} ref={statsRef}>
        {summaryCards.map((item) => (
          <Col xs={24} sm={12} md={8} key={item.title}>
            <Card style={cardStyle} styles={{ body: { padding: '20px 24px' } }} onMouseEnter={(e) => cardHover(e.currentTarget)} onMouseLeave={(e) => cardLeave(e.currentTarget)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: item.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#fff', flexShrink: 0, boxShadow: `0 4px 12px ${item.color}40` }}>{item.icon}</div>
                <div>
                  <Text style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', display: 'block' }}>{item.title}</Text>
                  <Text style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value.toLocaleString()}</Text>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontWeight: 600, fontSize: 16 }}>启用状态分布</span>} style={cardStyle} styles={{ body: { padding: '16px 16px 8px' } }} onMouseEnter={(e) => cardHover(e.currentTarget)} onMouseLeave={(e) => cardLeave(e.currentTarget)}>
            <Pie {...enablePieConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title={<span style={{ fontWeight: 600, fontSize: 16 }}>功能特性统计</span>} style={cardStyle} styles={{ body: { padding: '16px 16px 8px' } }} onMouseEnter={(e) => cardHover(e.currentTarget)} onMouseLeave={(e) => cardLeave(e.currentTarget)}>
            <Column {...featureBarConfig} height={300} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SourceStats;
