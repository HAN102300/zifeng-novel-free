import React, { useState, useEffect, useRef, useContext } from 'react';
import { Row, Col, Card, Spin, message, Typography } from 'antd';
import { Column, Area, Pie } from '@ant-design/charts';
import { getDashboard, getOnlineUsers } from '../../utils/adminApi';
import { staggerFadeIn, cardHover, cardLeave } from '../../utils/animations';
import { ThemeContext } from '../../App';

const { Text } = Typography;

const Overview = () => {
  const { isDarkMode, currentTheme, themeConfigs } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [onlineVisitors, setOnlineVisitors] = useState(0);
  const statsRef = useRef(null);

  useEffect(() => {
    if (statsRef.current) staggerFadeIn(statsRef.current.children, 80);
  }, [data]);

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await getOnlineUsers();
        setOnlineUsers(res.data?.data?.onlineUsers || 0);
        setOnlineVisitors(res.data?.data?.onlineVisitors || 0);
      } catch {}
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDashboard();
      setData(res.data?.data || {});
    } catch { message.error('获取仪表盘数据失败'); }
    finally { setLoading(false); }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  const statItems = [
    { title: '总访问量', value: data?.totalVisits || 0, color: '#1890ff', gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' },
    { title: '今日访问', value: data?.todayVisits || 0, color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
    { title: '在线用户', value: onlineUsers, color: '#722ed1', gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)' },
    { title: '在线访客', value: onlineVisitors, color: '#2f54eb', gradient: 'linear-gradient(135deg, #2f54eb 0%, #1d39c4 100%)' },
    { title: '总用户数', value: data?.totalUsers || 0, color: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)' },
    { title: '书架收藏', value: data?.totalBookshelfItems || 0, color: '#eb2f96', gradient: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)' },
    { title: '阅读记录', value: data?.totalReadingHistory || 0, color: '#13c2c2', gradient: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)' },
  ];

  const statChartData = statItems.map((item, idx) => ({
    name: item.title,
    value: item.value,
    color: item.color,
    gradient: item.gradient,
  }));

  const visitTrendData = (data?.visitTrend || []).map(v => ({
    date: v.date,
    value: v.count,
  }));

  const ipPieData = [
    { type: '今日IP', value: data?.todayIps || 0 },
    { type: '历史累计IP', value: Math.max((data?.totalIps || 0) - (data?.todayIps || 0), 0) },
  ];

  const cardStyle = {
    borderRadius: 12,
    border: 'none',
    boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    transition: 'transform 0.25s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)',
  };

  const columnConfig = {
    data: statChartData,
    xField: 'name',
    yField: 'value',
    colorField: 'name',
    color: statItems.map(s => s.color),
    columnWidthRatio: 0.5,
    label: {
      text: (d) => d.value.toLocaleString(),
      textBaseline: 'bottom',
      style: { fill: isDarkMode ? '#fff' : '#333', fontSize: 13, fontWeight: 600 },
    },
    axis: {
      x: {
        label: {
          style: { fill: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 12 },
          autoHide: true,
          autoRotate: false,
        },
      },
      y: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' } } },
    },
    style: { radiusTopLeft: 6, radiusTopRight: 6 },
    tooltip: (d) => ({ name: d.name, value: d.value.toLocaleString() }),
    interaction: { elementHighlight: { background: true } },
    theme: isDarkMode ? 'classicDark' : 'classic',
    animation: { appear: { animation: 'fade-in', duration: 600 } },
  };

  const primaryColor = themeConfigs[currentTheme]?.primaryColor || '#1890ff';

  const areaConfig = {
    data: visitTrendData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    style: {
      fill: `linear-gradient(-90deg, ${primaryColor} 0%, ${primaryColor}20 100%)`,
    },
    line: {
      style: { stroke: primaryColor, lineWidth: 3, shadowColor: primaryColor, shadowBlur: 10 },
    },
    axis: {
      x: {
        label: {
          style: { fill: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 12 },
          rotate: 0,
          autoHide: true,
          autoRotate: false,
        },
      },
      y: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' } } },
    },
    tooltip: (d) => ({ name: '访问量', value: d.value.toLocaleString(), title: d.date }),
    interaction: { tooltip: { shared: true, marker: false }, elementHighlight: true },
    theme: isDarkMode ? 'classicDark' : 'classic',
    animation: { appear: { animation: 'path-in', duration: 800, easing: 'ease-out' } },
  };

  const pieConfig = {
    data: ipPieData,
    angleField: 'value',
    colorField: 'type',
    color: [primaryColor, `${primaryColor}33`],
    radius: 0.85,
    innerRadius: 0.6,
    label: {
      text: (d) => `${d.type}: ${d.value.toLocaleString()}`,
      position: 'outside',
      connector: true,
      style: { fontSize: 12, fontWeight: 500, fill: isDarkMode ? '#fff' : '#333' },
      layout: [{ type: 'overlap-hide' }, { type: 'limit-in-canvas' }],
    },
    legend: { color: { position: 'right' } },
    tooltip: (d) => ({ name: d.type, value: d.value.toLocaleString() }),
    interaction: { elementHighlight: true },
    theme: isDarkMode ? 'classicDark' : 'classic',
    animation: { appear: { animation: 'fade-in', duration: 600 } },
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
      <h2 className="page-title" style={{ marginBottom: 16 }}>数据概览</h2>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }} ref={statsRef}>
        <Col xs={24} lg={14}>
          <Card
            className="stat-card-brand"
            title={<span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />核心数据指标</span>}
            extra={<Text style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{today}</Text>}
            style={cardStyle}
            styles={{ body: { padding: '16px 16px 24px' } }}
            onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)}
            onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}
          >
            <Column {...columnConfig} height={320} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 16 }}>IP分布</span>}
            style={cardStyle}
            styles={{ body: { padding: '16px 16px 24px' } }}
            onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)}
            onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}
          >
            <Pie {...pieConfig} height={320} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            className="stat-card-brand"
            title={<span style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />访问趋势</span>}
            style={cardStyle}
            styles={{ body: { padding: '16px 16px 24px' } }}
            onMouseEnter={(e) => cardHover(e.currentTarget, isDarkMode)}
            onMouseLeave={(e) => cardLeave(e.currentTarget, isDarkMode)}
          >
            <Area {...areaConfig} height={280} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Overview;
