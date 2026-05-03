import React, { useState, useEffect, useRef, useContext } from 'react';
import { Card, Table, Tag, Spin, message } from 'antd';
import { getDashboard } from '../../utils/adminApi';
import { fadeInUp } from '../../utils/animations';
import { ThemeContext } from '../../App';

const Logs = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const visitLogRef = useRef(null);

  useEffect(() => {
    if (visitLogRef.current) fadeInUp(visitLogRef.current, 300);
  }, [data]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDashboard();
      setData(res.data?.data || {});
    } catch {
      message.error('获取访问日志失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}><Spin size="large" /></div>;
  }

  const visitLogColumns = [
    { title: '访问IP', dataIndex: 'ip', key: 'ip', width: 140, render: (text) => <Tag color="blue">{text}</Tag> },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text) => {
        const cleanName = text ? text.replace(/\(管理员\)$/, '') : '';
        return cleanName ? <span style={{ fontWeight: 500 }}>{cleanName}</span> : <span style={{ color: isDarkMode ? '#555' : '#bbb' }}>游客</span>;
      },
    },
    {
      title: '访客类型',
      key: 'userType',
      width: 110,
      render: (_, record) => {
        let type = record.userType;
        if (!type) {
          const username = record.username || '';
          if (username.includes('(管理员)')) {
            type = username === 'zifeng(管理员)' ? 'super_admin' : 'admin';
          } else if (record.userId == null) {
            type = 'guest';
          } else {
            type = 'user';
          }
        }
        const typeMap = {
          super_admin: { color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)', label: '超级管理员' },
          admin: { color: '#fa8c16', bg: 'rgba(250,140,22,0.1)', label: '管理员' },
          user: { color: '#1677ff', bg: 'rgba(22,119,255,0.1)', label: '普通用户' },
          guest: { color: '#8c8c8c', bg: 'rgba(140,140,140,0.08)', label: '游客' },
        };
        const info = typeMap[type] || typeMap.guest;
        return (
          <Tag
            color={info.color}
            style={{
              background: info.bg,
              borderColor: info.color,
              color: info.color,
              fontWeight: 500,
              borderRadius: 4,
            }}
          >
            {info.label}
          </Tag>
        );
      },
    },
    { title: '访问路径', dataIndex: 'visitUrl', key: 'visitUrl', ellipsis: true, render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span> },
    { title: '访问时间', dataIndex: 'visitDate', key: 'visitDate', width: 180, render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>访问日志</h2>
      </div>
      <div ref={visitLogRef} style={{ flex: 1 }}>
        <Card style={{ borderRadius: 12, border: 'none', boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }} styles={{ body: { padding: 0, height: '100%', display: 'flex', flexDirection: 'column' } }}>
          <Table dataSource={data?.recentVisitLogs || []} columns={visitLogColumns} rowKey="id" size="small" style={{ flex: 1, borderRadius: 12, overflow: 'hidden' }} scroll={{ y: 'calc(100vh - 64px - 48px - 55px - 56px - 32px)' }} pagination={{ pageSize: 50, showSizeChanger: true, pageSizeOptions: ['50', '100', '200', '500'], showTotal: (total) => `共 ${total} 条记录` }} />
        </Card>
      </div>
    </div>
  );
};

export default Logs;
