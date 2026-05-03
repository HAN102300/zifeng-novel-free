import React, { useState, useEffect, useRef, useContext } from 'react';
import { Tabs, Table, Input, Tag, Progress, Space, message, Spin } from 'antd';
import { BookOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { getBookshelf, getReadingHistory } from '../utils/adminApi';
import { fadeInUp } from '../utils/animations';
import { ThemeContext } from '../App';

const ReadingManagement = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState('bookshelf');
  const [bookshelf, setBookshelf] = useState([]);
  const [history, setHistory] = useState([]);
  const [bookshelfLoading, setBookshelfLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const tableRef = useRef(null);

  useEffect(() => {
    if (tableRef.current) {
      fadeInUp(tableRef.current);
    }
  }, [bookshelf, history]);

  useEffect(() => {
    fetchBookshelf();
  }, []);

  const fetchBookshelf = async (kw = '') => {
    setBookshelfLoading(true);
    try {
      const res = await getBookshelf(kw);
      setBookshelf(res.data?.data || []);
    } catch {
      message.error('获取书架记录失败');
    } finally {
      setBookshelfLoading(false);
    }
  };

  const fetchHistory = async (kw = '') => {
    setHistoryLoading(true);
    try {
      const res = await getReadingHistory(kw);
      setHistory(res.data?.data || []);
    } catch {
      message.error('获取阅读历史失败');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    setKeyword('');
    if (key === 'bookshelf') {
      fetchBookshelf();
    } else {
      fetchHistory();
    }
  };

  const handleSearch = (value) => {
    setKeyword(value);
    if (activeTab === 'bookshelf') {
      fetchBookshelf(value);
    } else {
      fetchHistory(value);
    }
  };

  const bookshelfColumns = [
    {
      title: '书名',
      dataIndex: 'bookName',
      key: 'bookName',
      render: (text, record) => (
        <Space>
          {record.coverUrl && (
            <img
              src={record.coverUrl}
              alt=""
              style={{
                width: 32,
                height: 42,
                borderRadius: 4,
                objectFit: 'cover',
                flexShrink: 0,
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-',
    },
    {
      title: '来源',
      dataIndex: 'sourceName',
      key: 'sourceName',
      width: 120,
      render: (text) => text ? <Tag color="geekblue">{text}</Tag> : '-',
    },
    {
      title: '最新章节',
      dataIndex: 'lastChapter',
      key: 'lastChapter',
      width: 160,
      ellipsis: true,
      render: (text) => (
        <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: 13 }}>
          {text || '-'}
        </span>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-',
    },
    {
      title: '添加时间',
      dataIndex: 'addedAt',
      key: 'addedAt',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
  ];

  const historyColumns = [
    {
      title: '书名',
      dataIndex: 'bookName',
      key: 'bookName',
      render: (text, record) => (
        <Space>
          {record.coverUrl && (
            <img
              src={record.coverUrl}
              alt=""
              style={{
                width: 32,
                height: 42,
                borderRadius: 4,
                objectFit: 'cover',
                flexShrink: 0,
              }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span style={{ fontWeight: 500 }}>{text}</span>
        </Space>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: '章节',
      dataIndex: 'chapterName',
      key: 'chapterName',
      width: 160,
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '阅读进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (progress) => {
        const percent = progress != null ? (progress <= 1 ? progress * 100 : progress) : 0;
        const displayText = percent.toFixed(3) + '%';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={Math.round(percent * 1000) / 1000}
              size="small"
              strokeColor={{
                '0%': '#1890ff',
                '100%': '#52c41a',
              }}
              style={{ marginBottom: 0, flex: 1, minWidth: 80 }}
              format={() => displayText}
            />
          </div>
        );
      },
    },
    {
      title: '最后阅读',
      dataIndex: 'lastRead',
      key: 'lastRead',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-',
    },
  ];

  const tabItems = [
    {
      key: 'bookshelf',
      label: (
        <Space>
          <BookOutlined />
          书架记录
        </Space>
      ),
      children: (
        <Table
          dataSource={bookshelf}
          columns={bookshelfColumns}
          rowKey="id"
          loading={bookshelfLoading}
          scroll={{ y: 'calc(100vh - 64px - 48px - 55px - 46px - 32px)' }}
        />
      ),
    },
    {
      key: 'history',
      label: (
        <Space>
          <HistoryOutlined />
          阅读历史
        </Space>
      ),
      children: (
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          loading={historyLoading}
          scroll={{ y: 'calc(100vh - 64px - 48px - 55px - 46px - 32px)' }}
        />
      ),
    },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>阅读管理</h2>
        <Input.Search
          placeholder="搜索书名或作者"
          allowClear
          enterButton={<><SearchOutlined /> 搜索</>}
          size="middle"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300, maxWidth: '100%' }}
        />
      </div>

      <div ref={tableRef} style={{
        borderRadius: 12,
        overflow: 'hidden',
        flex: 1,
        boxShadow: isDarkMode
          ? '0 2px 12px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          style={{ padding: '0 16px', background: isDarkMode ? '#141414' : '#fff', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default ReadingManagement;
