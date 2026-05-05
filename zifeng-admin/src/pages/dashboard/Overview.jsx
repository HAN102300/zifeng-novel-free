import React, { useState, useEffect, useRef, useContext } from 'react';
import { Row, Col, Card, Spin, message, Typography } from 'antd';
import { Column, Area, Pie } from '@ant-design/charts';
import { getDashboard, getOnlineUsers } from '../../utils/adminApi';
import { staggerFadeIn, cardHover, cardLeave } from '../../utils/animations';
import { ThemeContext } from '../../App';

const { Text } = Typography;

const Overview = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
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
      x: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 12 } } },
      y: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' } } },
    },
    style: { radiusTopLeft: 6, radiusTopRight: 6 },
    theme: isDarkMode ? 'classicDark' : 'classic',
  };

  const areaConfig = {
    data: visitTrendData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    style: { fill: 'linear-gradient(-90deg, #1890ff 0%, rgba(24,144,255,0.1) 100%)' },
    axis: {
      x: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)', fontSize: 11 } } },
      y: { label: { style: { fill: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' } } },
    },
    interaction: { tooltip: { marker: false } },
    theme: isDarkMode ? 'classicDark' : 'classic',
  };

  const pieConfig = {
    data: ipPieData,
    angleField: 'value',
    colorField: 'type',
    color: ['#1890ff', '#bae7ff'],
    radius: 0.8,
    innerRadius: 0.6,
    label: {
      text: (d) => `${d.type}: ${d.value}`,
      style: { fontWeight: 600, fill: isDarkMode ? '#fff' : '#333' },
    },
    legend: { color: { position: 'bottom' } },
    theme: isDarkMode ? 'classicDark' : 'classic',
  };

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <Row gutter={[16, 16]} ref={statsRef}>
        <Col xs={24} lg={14}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 16 }}>核心数据指标</span>}
            extra={<Text style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{today}</Text>}
            style={cardStyle}
            styles={{ body: { padding: '16px 16px 8px' } }}
            onMouseEnter={(e) => cardHover(e.currentTarget)}
            onMouseLeave={(e) => cardLeave(e.currentTarget)}
          >
            <Column {...columnConfig} height={320} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 16 }}>IP分布</span>}
            style={cardStyle}
            styles={{ body: { padding: '16px 16px 8px' } }}
            onMouseEnter={(e) => cardHover(e.currentTarget)}
            onMouseLeave={(e) => cardLeave(e.currentTarget)}
          >
            <Pie {...pieConfig} height={320} />
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600, fontSize: 16 }}>访问趋势</span>}
            style={cardStyle}
            styles={{ body: { padding: '16px 16px 8px' } }}
            onMouseEnter={(e) => cardHover(e.currentTarget)}
            onMouseLeave={(e) => cardLeave(e.currentTarget)}
          >
            <Area {...areaConfig} height={280} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Overview;
