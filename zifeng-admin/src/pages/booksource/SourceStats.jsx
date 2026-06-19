import React, { useState, useEffect, useContext } from 'react';
import { Row, Col, Card, Spin, message, Typography } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import {
  DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, ReadOutlined, CompassOutlined,
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
  const hasSearch = stats?.hasSearch || 0;
  const hasContent = stats?.hasContent || 0;
  const hasExploreUrl = stats?.hasExploreUrl || 0;
  const typeText = stats?.typeText || 0;
  const typeWeb = stats?.typeWeb || 0;
  const typeComic = stats?.typeComic || 0;
  const typeAudio = stats?.typeAudio || 0;
  const hasCookie = stats?.hasCookie || 0;

  const cardStyle = {
    borderRadius: 12,
    border: 'none',
    boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  };

  const summaryCards = [
    { title: '总书源数', value: total, icon: <DatabaseOutlined />, color: '#667eea', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { title: '已启用', value: enabled, icon: <CheckCircleOutlined />, color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
    { title: '已禁用', value: disabled, icon: <CloseCircleOutlined />, color: '#ff4d4f', gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' },
  ];

  // 启用状态分布
  const enablePieData = [
    { type: '已启用', value: enabled },
    { type: '已禁用', value: disabled },
  ];

  // 书源类型分布
  const typePieData = [
    { type: '文本(API)', value: typeText },
    { type: '网页', value: typeWeb },
    { type: '漫画', value: typeComic },
    { type: '音频', value: typeAudio },
  ].filter(d => d.value > 0);

  // 功能特性统计
  const featureBarData = [
    { feature: '含搜索', value: hasSearch },
    { feature: '含正文', value: hasContent },
    { feature: '含发现', value: hasExploreUrl },
    { feature: '含登录', value: hasLogin },
    { feature: '含发现规则', value: hasExplore },
    { feature: '含JS脚本', value: hasJs },
    { feature: '含Cookie', value: hasCookie },
  ];

  const chartLabelStyle = {
    fontWeight: 500,
    fill: isDarkMode ? '#fff' : '#333',
    fontSize: 12,
  };

  const enablePieConfig = {
    data: enablePieData,
    angleField: 'value',
    colorField: 'type',
    color: ['#52c41a', '#ff4d4f'],
    radius: 0.8,
    innerRadius: 0.5,
    label: {
      text: (d) => `${d.type}: ${d.value}`,
      position: 'spider',
      connector: true,
      style: chartLabelStyle,
      layout: [
        { type: 'hide-overlap' },
        { type: 'limit-in-canvas', margin: 10 },
      ],
    },
    legend: {
      color: { position: 'bottom', itemMarker: 'circle' },
    },
    tooltip: (d) => ({ name: d.type, value: d.value.toLocaleString() }),
    interaction: { elementHighlight: true },
    theme: isDarkMode ? 'classicDark' : 'classic',
    animation: { appear: { animation: 'fade-in', duration: 600 } },
  };

  const typePieConfig = {
    data: typePieData,
    angleField: 'value',
    colorField: 'type',
    color: ['#667eea', '#fa8c16', '#eb2f96', '#13c2c2'],
    radius: 0.8,
    innerRadius: 0.5,
    label: {
      text: (d) => `${d.type}: ${d.value}`,
      position: 'spider',
      connector: true,
      style: chartLabelStyle,
      layout: [
        { type: 'hide-overlap' },
        { type: 'limit-in-canvas', margin: 10 },
      ],
    },
    legend: {
      color: { position: 'bottom', itemMarker: 'circle' },
    },
    tooltip: (d) => ({ name: d.type, value: d.value.toLocaleString() }),
    interaction: { elementHighlight: true },
    theme: isDarkMode ? 'classicDark' : 'classic',
    animation: { appear: { animation: 'fade-in', duration: 600 } },
  };

  const featureBarConfig = {
    data: featureBarData,
    xField: 'feature',
    yField: 'value',
    colorField: 'feature',
    color: ['#667eea', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96'],
    columnWidthRatio: 0.4,
    label: {
      text: (d) => d.value.toLocaleString(),
      position: 'top',
      style: {
        fill: isDarkMode ? '#fff' : '#333',
        fontSize: 13,
        fontWeight: 600,
        textBaseline: 'bottom',
        dy: -4,
      },
    },
    axis: {
      x: {
        label: {
          style: {
            fill: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
            fontSize: 13,
          },
          offset: 14,
        },
      },
      y: {
        label: {
          style: {
            fill: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
          },
        },
      },
    },
    style: {
      radius: 6,
      minWidth: 36,
      maxWidth: 72,
    },
    scale: {
      y: { nice: true, domainMin: 0 },
    },
    tooltip: (d) => ({ name: d.feature, value: d.value.toLocaleString() }),
    interaction: {
      elementHighlight: true,
    },
    theme: isDarkMode ? 'classicDark' : 'classic',
    animation: { appear: { animation: 'fade-in', duration: 600 } },
  };

  const brandDot = <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />;
  const cardTitle = (text) => (
    <span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
      {brandDot}{text}
    </span>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>书源统计</h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} ref={statsRef}>
        {summaryCards.map((item) => (
          <Col xs={24} sm={12} md={8} key={item.title}>
            <Card className="stat-card-brand" style={cardStyle} styles={{ body: { padding: '20px 24px' } }} onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)} onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}>
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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <Card title={cardTitle('启用状态分布')} style={cardStyle} styles={{ body: { padding: '16px 16px 24px' } }} onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)} onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}>
            <Pie {...enablePieConfig} height={300} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={cardTitle('书源类型分布')} style={cardStyle} styles={{ body: { padding: '16px 16px 24px' } }} onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)} onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}>
            <Pie {...typePieConfig} height={300} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card title={cardTitle('功能特性统计')} style={cardStyle} styles={{ body: { padding: '16px 24px 24px' } }} onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)} onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}>
            <Column {...featureBarConfig} height={320} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SourceStats;
