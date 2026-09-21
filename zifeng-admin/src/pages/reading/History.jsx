import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Tag, Space, Progress, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { ZfPageHeader, ZfEmptyState } from '@zifeng/ui/components';
import { getReadingHistory, proxyImageUrl } from '../../utils/adminApi';
import { TABLE_SHELL, tableScrollY, PAGE_HEADROOM, LOCAL_PAGINATION } from '../../utils/ui';

const History = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [keyword, setKeyword] = useState('');

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位 */
  const fetchData = useCallback((kw = '') => {
    const run = async () => {
      try {
        const res = await getReadingHistory(kw);
        setHistory(res.data?.data || []);
      } catch {
        message.error('获取阅读历史失败');
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
    { title: '章节', dataIndex: 'chapterName', key: 'chapterName', width: 160, ellipsis: true, render: (text) => text || '-' },
    {
      title: '阅读进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 180,
      render: (progress) => {
        const percent = progress != null ? (progress <= 1 ? progress * 100 : progress) : 0;
        return (
          <Progress
            /* 进度是运营读数，3 位小数是调试输出；1 位足够区分「看到第几章」。 */
            format={() => `${percent.toFixed(1)}%`}
            percent={Math.round(percent * 1000) / 1000}
            size="small"
            /* 原先是蓝→绿的固定渐变，与全站紫无关。
               Progress 在 antd v6 里是 div + 内联 background，var() 能正常解析。 */
            strokeColor={{ '0%': 'var(--zf-brand-700)', '100%': 'var(--zf-brand-400)' }}
            style={{ minWidth: 80 }}
          />
        );
      },
    },
    { title: '最后阅读', dataIndex: 'lastRead', key: 'lastRead', width: 180, render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-' },
    { title: '用户名', dataIndex: 'username', key: 'username', width: 120, render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-' },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="阅读历史"
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
          dataSource={history}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: tableScrollY(PAGE_HEADROOM.filtered) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                title={keyword ? `没有匹配「${keyword}」的阅读记录` : '还没有阅读记录'}
                description="用户开始阅读章节后会出现在这里。"
              />
            ),
          }}
          pagination={LOCAL_PAGINATION}
        />
      </div>
    </div>
  );
};

export default History;
