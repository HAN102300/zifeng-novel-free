import React, { useState, useEffect, useRef, useContext } from 'react';
import { Table, Input, Tag, Space, message, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { getBookshelf } from '../../utils/adminApi';
import { fadeInUp } from '../../utils/animations';
import { ThemeContext } from '../../App';

const Bookshelf = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [loading, setLoading] = useState(true);
  const [bookshelf, setBookshelf] = useState([]);
  const [keyword, setKeyword] = useState('');
  const tableRef = useRef(null);

  useEffect(() => { if (tableRef.current) fadeInUp(tableRef.current); }, [bookshelf]);
  useEffect(() => { fetchData(); }, []);

  const fetchData = async (kw = '') => {
    setLoading(true);
    try {
      const res = await getBookshelf(kw);
      setBookshelf(res.data?.data || []);
    } catch { message.error('获取书架记录失败'); }
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
    { title: '分类', dataIndex: 'category', key: 'category', width: 100, render: (text) => text ? <Tag color="blue">{text}</Tag> : '-' },
    { title: '来源', dataIndex: 'sourceName', key: 'sourceName', width: 120, render: (text) => text ? <Tag color="geekblue">{text}</Tag> : '-' },
    { title: '最新章节', dataIndex: 'lastChapter', key: 'lastChapter', width: 160, ellipsis: true, render: (text) => <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: 13 }}>{text || '-'}</span> },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120, render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-' },
    { title: '添加时间', dataIndex: 'addedAt', key: 'addedAt', width: 180, render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>书架记录</h2>
        <Input.Search placeholder="搜索书名或作者" allowClear enterButton={<><SearchOutlined /> 搜索</>} size="middle" value={keyword} onChange={(e) => setKeyword(e.target.value)} onSearch={(v) => fetchData(v)} style={{ width: 300, maxWidth: '100%' }} />
      </div>
      <div ref={tableRef} style={{ borderRadius: 12, flex: 1, boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table dataSource={bookshelf} columns={columns} rowKey="id" loading={loading} style={{ background: isDarkMode ? '#141414' : '#fff', borderRadius: 12, overflow: 'hidden' }} scroll={{ y: 'calc(100vh - 64px - 48px - 55px - 56px - 32px)' }} />
      </div>
    </div>
  );
};

export default Bookshelf;
