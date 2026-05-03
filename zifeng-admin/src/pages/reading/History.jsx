import React, { useState, useEffect, useRef, useContext } from 'react';
import { Table, Input, Tag, Progress, Space, message, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getReadingHistory } from '../../utils/adminApi';
import { fadeInUp } from '../../utils/animations';
import { ThemeContext } from '../../App';

const History = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [keyword, setKeyword] = useState('');
  const tableRef = useRef(null);

  useEffect(() => { if (tableRef.current) fadeInUp(tableRef.current); }, [history]);
  useEffect(() => { fetchData(); }, []);

  const fetchData = async (kw = '') => {
    setLoading(true);
    try {
      const res = await getReadingHistory(kw);
      setHistory(res.data?.data || []);
    } catch { message.error('获取阅读历史失败'); }
    finally { setLoading(false); }
  };

  const columns = [
    {
      title: '书名', dataIndex: 'bookName', key: 'bookName',
      render: (text, record) => (
        <Space>
          {record.coverUrl && <img src={record.coverUrl} alt="" style={{ width: 32, height: 42, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} onError={(e) => { e.target.style.display = 'none'; }} />}
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120, render: (text) => text || '-' },
    { title: '章节', dataIndex: 'chapterName', key: 'chapterName', width: 160, ellipsis: true, render: (text) => text || '-' },
    {
      title: '阅读进度', dataIndex: 'progress', key: 'progress', width: 180,
      render: (progress) => {
        const percent = progress != null ? (progress <= 1 ? progress * 100 : progress) : 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress percent={Math.round(percent * 1000) / 1000} size="small" strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }} style={{ marginBottom: 0, flex: 1, minWidth: 80 }} format={() => percent.toFixed(3) + '%'} />
          </div>
        );
      },
    },
    { title: '最后阅读', dataIndex: 'lastRead', key: 'lastRead', width: 180, render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120, render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-' },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>阅读历史</h2>
        <Input.Search placeholder="搜索书名或作者" allowClear enterButton={<><SearchOutlined /> 搜索</>} size="middle" value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={(v) => fetchData(v)} style={{ width: 300, maxWidth: '100%' }} />
      </div>
      <div ref={tableRef} style={{ borderRadius: 12, flex: 1, boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table dataSource={history} columns={columns} rowKey="id" loading={loading} style={{ background: isDarkMode ? '#141414' : '#fff', borderRadius: 12, overflow: 'hidden' }} scroll={{ y: 'calc(100vh - 64px - 48px - 55px - 56px - 32px)' }} />
      </div>
    </div>
  );
};

export default History;
