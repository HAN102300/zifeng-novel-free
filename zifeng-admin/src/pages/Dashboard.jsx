import React, { useState, useEffect, useRef, useContext } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Spin, message } from 'antd';
import {
  EyeOutlined,
  UserOutlined,
  GlobalOutlined,
  BookOutlined,
  HistoryOutlined,
  TeamOutlined,
  RiseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { getDashboard, getOnlineUsers } from '../utils/adminApi';
import { staggerFadeIn, fadeInUp, countUp, cardHover, cardLeave } from '../utils/animations';
import { ThemeContext } from '../App';

const Dashboard = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const statsRef = useRef(null);
  const tableRef = useRef(null);
  const visitLogRef = useRef(null);

  useEffect(() => {
    if (statsRef.current) {
      staggerFadeIn(statsRef.current.children, 80);
    }
    if (tableRef.current) {
      fadeInUp(tableRef.current, 300);
    }
    if (visitLogRef.current) {
      fadeInUp(visitLogRef.current, 400);
    }
  }, [data]);

  useEffect(() => {
    fetchData();
  }, []);

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
    } catch {
      message.error('获取仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  const statCards = [
    { title: '总访问量', value: data?.totalVisits || 0, icon: <EyeOutlined />, color: '#1890ff', gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' },
    { title: '今日访问', value: data?.todayVisits || 0, icon: <RiseOutlined />, color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
    { title: '在线用户', value: onlineUsers, icon: <TeamOutlined />, color: '#722ed1', gradient: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)' },
    { title: '总用户数', value: data?.totalUsers || 0, icon: <UserOutlined />, color: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)' },
    { title: '书架收藏', value: data?.totalBookshelfItems || 0, icon: <BookOutlined />, color: '#eb2f96', gradient: 'linear-gradient(135deg, #eb2f96 0%, #c41d7f 100%)' },
    { title: '阅读记录', value: data?.totalReadingHistory || 0, icon: <HistoryOutlined />, color: '#13c2c2', gradient: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)' },
  ];

  const visitTrendColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '访问量',
      dataIndex: 'count',
      key: 'count',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: `${Math.min((val / Math.max(...(data?.visitTrend || []).map(v => v.count), 1)) * 100, 100)}%`,
            minWidth: val > 0 ? 8 : 0,
            height: 8,
            borderRadius: 4,
            background: 'linear-gradient(90deg, #1890ff, #36cfc9)',
            transition: 'width 0.6s ease',
          }} />
          <span style={{ fontWeight: 600, color: '#1890ff' }}>{val}</span>
        </div>
      ),
    },
  ];

  const visitLogColumns = [
    {
      title: '访问IP',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (text) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text) => text ? <span style={{ fontWeight: 500 }}>{text}</span> : <span style={{ color: isDarkMode ? '#555' : '#bbb' }}>游客</span>,
    },
    {
      title: '访问路径',
      dataIndex: 'visitUrl',
      key: 'visitUrl',
      ellipsis: true,
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span>,
    },
    {
      title: '访问时间',
      dataIndex: 'visitDate',
      key: 'visitDate',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
  ];

  const extraStats = [
    { label: '总IP数', value: data?.totalIps || 0, icon: <GlobalOutlined /> },
    { label: '今日IP数', value: data?.todayIps || 0, icon: <ClockCircleOutlined /> },
  ];

  return (
    <div style={{ flex: 1, overflow: 'auto' }}>
      <Row gutter={[16, 16]} ref={statsRef}>
        {statCards.map((item, index) => (
          <Col xs={24} sm={12} md={8} lg={8} xl={4} key={item.title}>
            <Card
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: 'none',
                    boxShadow: isDarkMode
                      ? '0 2px 12px rgba(0,0,0,0.3)'
                      : '0 2px 12px rgba(0,0,0,0.06)',
                    cursor: 'default',
                  }}
                  styles={{ body: { padding: '20px 24px' } }}
                  onMouseEnter={(e) => cardHover(e.currentTarget)}
                  onMouseLeave={(e) => cardLeave(e.currentTarget)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: item.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      color: '#fff',
                      flexShrink: 0,
                      boxShadow: `0 4px 12px ${item.color}40`,
                    }}>
                      {item.icon}
                    </div>
                    <Statistic
                      title={<span style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{item.title}</span>}
                      value={item.value}
                      valueStyle={{ fontSize: 24, fontWeight: 700, color: item.color }}
                    />
                  </div>
                </Card>
            </Col>
          ))}
        </Row>

      <div style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              ref={tableRef}
              title={<span style={{ fontWeight: 600 }}>访问趋势</span>}
              style={{
                borderRadius: 12,
                border: 'none',
                boxShadow: isDarkMode
                  ? '0 2px 12px rgba(0,0,0,0.3)'
                  : '0 2px 12px rgba(0,0,0,0.06)',
                height: '100%',
              }}
              styles={{ body: { padding: '0 16px 16px' } }}
            >
              <Table
                dataSource={data?.visitTrend || []}
                columns={visitTrendColumns}
                rowKey="date"
                pagination={false}
                size="small"
                scroll={{ y: 320 }}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ fontWeight: 600 }}>其他统计</span>}
              style={{
                borderRadius: 12,
                border: 'none',
                boxShadow: isDarkMode
                  ? '0 2px 12px rgba(0,0,0,0.3)'
                  : '0 2px 12px rgba(0,0,0,0.06)',
                height: '100%',
              }}
              styles={{ body: { padding: '16px 24px', display: 'flex', flexDirection: 'column' } }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1 }}>
                {extraStats.map((item) => (
                  <div key={item.label} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px',
                    borderRadius: 10,
                    background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    flex: 1,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 10,
                        background: isDarkMode ? 'rgba(24,144,255,0.15)' : 'rgba(24,144,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color: '#1890ff',
                      }}>
                        {item.icon}
                      </div>
                      <span style={{ fontSize: 15, color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#1890ff' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card
          ref={visitLogRef}
          title={<span style={{ fontWeight: 600 }}>访问日志</span>}
          style={{
            borderRadius: 12,
            border: 'none',
            boxShadow: isDarkMode
              ? '0 2px 12px rgba(0,0,0,0.3)'
              : '0 2px 12px rgba(0,0,0,0.06)',
          }}
          styles={{ body: { padding: '0 16px 16px' } }}
        >
          <Table
            dataSource={data?.recentVisitLogs || []}
            columns={visitLogColumns}
            rowKey="id"
            size="small"
            scroll={{ y: 320 }}
          />
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
