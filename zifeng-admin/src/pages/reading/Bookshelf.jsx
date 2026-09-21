import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Tag, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ZfPageHeader, ZfEmptyState } from '@zifeng/ui/components';
import { getBookshelf, proxyImageUrl } from '../../utils/adminApi';
import { TABLE_SHELL, tableScrollY, PAGE_HEADROOM, LOCAL_PAGINATION } from '../../utils/ui';

const Bookshelf = () => {
  const [loading, setLoading] = useState(true);
  const [bookshelf, setBookshelf] = useState([]);
  const [keyword, setKeyword] = useState('');

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位 */
  const fetchData = useCallback((kw = '') => {
    const run = async () => {
      try {
        const res = await getBookshelf(kw);
        setBookshelf(res.data?.data || []);
      } catch {
        message.error('获取书架记录失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  /* 搜索是事件触发，需要在回调里重新进入加载态 */
  const reload = (kw = '') => {
    setLoading(true);
    fetchData(kw);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const columns = [
    {
      title: '书名',
      dataIndex: 'bookName',
      key: 'bookName',
      render: (text, record) => (
        <Space>
          {record.coverUrl && (
            <img
              src={proxyImageUrl(record.coverUrl)}
              alt=""
              style={{
                width: 32,
                height: 42,
                borderRadius: 'var(--zf-r-xs)',
                objectFit: 'cover',
                flexShrink: 0,
              }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          )}
          <span style={{ fontWeight: 'var(--zf-fw-strong)' }}>{text}</span>
        </Space>
      ),
    },
    { title: '作者', dataIndex: 'author', key: 'author', width: 120, render: (text) => text || '-' },
    { title: '分类', dataIndex: 'category', key: 'category', width: 100, render: (text) => text ? <Tag color="blue">{text}</Tag> : '-' },
    { title: '来源', dataIndex: 'sourceName', key: 'sourceName', width: 120, render: (text) => text ? <Tag color="geekblue">{text}</Tag> : '-' },
    {
      title: '最新章节',
      dataIndex: 'lastChapter',
      key: 'lastChapter',
      width: 160,
      ellipsis: true,
      render: (text) => <span style={{ color: 'var(--zf-text-muted)', fontSize: 'var(--zf-fs-sm)' }}>{text || '-'}</span>,
    },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120, render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-' },
    { title: '添加时间', dataIndex: 'addedAt', key: 'addedAt', width: 180, render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="书架记录"
        extra={
          <Input.Search
            placeholder="搜索书名或作者"
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            size="middle"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={(v) => { setKeyword(v); reload(v); }}
            style={{ width: 300, maxWidth: '100%' }}
          />
        }
        style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}
      />
      <div style={TABLE_SHELL}>
        <Table
          dataSource={bookshelf}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: tableScrollY(PAGE_HEADROOM.filtered) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                title={keyword ? `没有匹配「${keyword}」的书架记录` : '还没有书架记录'}
                description="用户在书源详情页点「加书架」后会出现在这里。"
              />
            ),
          }}
          pagination={LOCAL_PAGINATION}
        />
      </div>
    </div>
  );
};

export default Bookshelf;
