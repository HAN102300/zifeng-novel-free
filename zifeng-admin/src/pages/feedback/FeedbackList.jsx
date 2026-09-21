import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Select, Button, Space, Modal, Input, message, Tooltip, Dropdown, Typography,
} from 'antd';
import {
  ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SearchOutlined, ReloadOutlined, FormOutlined, DownOutlined,
} from '@ant-design/icons';
import { ZfPageHeader, ZfSectionTitle, ZfStatCard, ZfGrid, ZfEmptyState } from '@zifeng/ui/components';
import { getFeedbacks, getFeedbackStats, replyFeedback, updateFeedbackStatus } from '../../utils/adminApi';
import {
  TABLE_SHELL, tableScrollY, PAGE_HEADROOM, TABLE_PAGINATION, DEFAULT_PAGE_SIZE,
} from '../../utils/ui';

const { TextArea } = Input;
const { Text } = Typography;

const categoryMap = {
  bug: { label: 'Bug 报告', color: 'red' },
  feature: { label: '功能建议', color: 'blue' },
  ux: { label: '体验问题', color: 'orange' },
  performance: { label: '性能问题', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

// 允许的状态流转：key=当前状态, value=可切换到的状态码数组
const ALLOWED_TRANSITIONS = {
  0: [1, 3],    // 待处理 → 处理中, 已关闭
  1: [2, 3],    // 处理中 → 已解决, 已关闭
  2: [1, 3],    // 已解决 → 处理中(重开), 已关闭
  3: [],        // 已关闭 → 终态
};

const statusMap = {
  0: { label: '待处理', color: 'orange', icon: <ClockCircleOutlined />, statTone: 'warning' },
  1: { label: '处理中', color: 'blue', icon: <SyncOutlined spin />, statTone: 'brand' },
  2: { label: '已解决', color: 'green', icon: <CheckCircleOutlined />, statTone: 'success' },
  3: { label: '已关闭', color: 'default', icon: <CloseCircleOutlined />, statTone: 'brand' },
};

/* 统计卡不再自带 4 套渐变色块：图标底色由 ZfStatCard 的 tone 决定，
   与 statusMap 共用同一份定义，避免表格里的状态色与卡片区对不上。 */
const STAT_CARDS = [
  { key: 'pending', title: '待处理', status: 0 },
  { key: 'inProgress', title: '处理中', status: 1 },
  { key: 'resolved', title: '已解决', status: 2 },
  { key: 'closed', title: '已关闭', status: 3 },
];

const EMPTY_STATS = { pending: 0, inProgress: 0, resolved: 0, closed: 0, total: 0 };

const FeedbackList = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  /* 首屏即在请求中，初值直接给 true：effect 里同步 setState 会多渲染一轮 */
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [pagination, setPagination] = useState({ current: 1, pageSize: DEFAULT_PAGE_SIZE, total: 0 });
  const [filters, setFilters] = useState({ category: undefined, status: undefined });
  const [replyModal, setReplyModal] = useState({ open: false, id: null, title: '' });
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, data: null });

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。首屏的加载态由 useState(true) 给出 */
  const fetchStats = useCallback(() => {
    const run = async () => {
      try {
        const res = await getFeedbackStats();
        setStats(res.data?.data || EMPTY_STATS);
      } catch {
        message.error('获取反馈统计失败');
      }
    };
    run();
  }, []);

  const fetchFeedbacks = useCallback((page = 1, size = DEFAULT_PAGE_SIZE, of = filters) => {
    const run = async () => {
      try {
        const params = {
          page: page - 1,
          size,
          category: of.category || undefined,
          status: of.status !== undefined && of.status !== null ? of.status : undefined,
        };
        const res = await getFeedbacks(params);
        const data = res.data?.data;
        if (data) {
          setFeedbacks(data.items || []);
          setPagination({ current: (data.page || 0) + 1, pageSize: data.size || DEFAULT_PAGE_SIZE, total: data.total || 0 });
        }
      } catch {
        message.error('获取反馈列表失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [filters]);

  /* 筛选 / 翻页 / 回复改状态后的刷新都由事件触发，在回调里重新进入加载态 */
  const reload = (page = 1, size = DEFAULT_PAGE_SIZE, of = filters) => {
    setLoading(true);
    fetchFeedbacks(page, size, of);
  };

  useEffect(() => {
    fetchStats();
    fetchFeedbacks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    reload(1, pagination.pageSize);
  };

  const handleReset = () => {
    const cleared = { category: undefined, status: undefined };
    setFilters(cleared);
    setTimeout(() => reload(1, pagination.pageSize, cleared), 0);
  };

  const handleTableChange = (pag) => {
    reload(pag.current, pag.pageSize);
  };

  const handleReply = async () => {
    if (!replyContent.trim()) {
      message.warning('请输入回复内容');
      return;
    }
    setReplyLoading(true);
    try {
      await replyFeedback(replyModal.id, { adminReply: replyContent });
      message.success('回复成功');
      setReplyModal({ open: false, id: null, title: '' });
      setReplyContent('');
      reload(pagination.current, pagination.pageSize);
      fetchStats();
    } catch {
      message.error('回复失败');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateFeedbackStatus(id, { status: newStatus });
      message.success('状态更新成功');
      reload(pagination.current, pagination.pageSize);
      fetchStats();
    } catch (err) {
      const msg = err?.response?.data?.message || '状态更新失败';
      message.error(msg);
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
      render: (id) => <Text strong>#{id}</Text>,
    },
    {
      title: '类型',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (cat) => {
        const info = categoryMap[cat] || { label: cat, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (title, record) => (
        <a onClick={() => setDetailModal({ open: true, data: record })} style={{ fontWeight: 'var(--zf-fw-strong)' }}>
          {title}
        </a>
      ),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      width: 240,
      ellipsis: true,
      render: (text) => (
        <Tooltip title={text} placement="topLeft">
          <span style={{ color: 'var(--zf-text-secondary)' }}>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (username, record) => username
        ? <Tag color="blue">{username}</Tag>
        : <Tag>用户{record.userId}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status) => {
        const info = statusMap[status] || { label: '未知', color: 'default', icon: null };
        return <Tag color={info.color} icon={info.icon}>{info.label}</Tag>;
      },
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right',
      render: (_, record) => {
        const allowedNext = ALLOWED_TRANSITIONS[record.status] || [];
        const statusItems = allowedNext.map((value) => {
          const info = statusMap[value];
          return { key: String(value), label: info.label, icon: info.icon };
        });
        const isTerminal = statusItems.length === 0;

        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<FormOutlined />}
              onClick={() => setReplyModal({ open: true, id: record.id, title: record.title })}
            >
              回复
            </Button>
            <Dropdown
              menu={{
                items: statusItems,
                onClick: ({ key }) => handleStatusChange(record.id, parseInt(key)),
              }}
              disabled={isTerminal}
            >
              {/* 裸字符 ▼ 不是图标字体：字号、行高、暗色对比度都不受控。换 DownOutlined。 */}
              <Button type="link" size="small" disabled={isTerminal}>
                状态 <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const filterBar = (
    <Space wrap>
      <Select
        placeholder="反馈类型"
        allowClear
        style={{ width: 130 }}
        value={filters.category}
        onChange={(val) => setFilters(prev => ({ ...prev, category: val }))}
        options={Object.entries(categoryMap).map(([value, info]) => ({ value, label: info.label }))}
      />
      <Select
        placeholder="反馈状态"
        allowClear
        style={{ width: 130 }}
        value={filters.status}
        onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
        options={Object.entries(statusMap).map(([value, info]) => ({ value: parseInt(value), label: info.label }))}
      />
      <Button icon={<SearchOutlined />} onClick={handleSearch}>搜索</Button>
      <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
    </Space>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="用户反馈"
        subtitle={`共 ${stats.total || 0} 条反馈`}
        style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}
      />

      <ZfGrid min={170} gap="var(--zf-s4)" style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}>
        {STAT_CARDS.map((card) => (
          <ZfStatCard
            key={card.key}
            label={card.title}
            icon={statusMap[card.status].icon}
            tone={statusMap[card.status].statTone}
            value={Number(stats[card.key] || 0).toLocaleString()}
          />
        ))}
      </ZfGrid>

      <ZfSectionTitle
        title="反馈列表"
        extra={filterBar}
        animated={false}
        style={{ marginBottom: 'var(--zf-s3)', flexShrink: 0 }}
      />

      <div style={TABLE_SHELL}>
        <Table
          dataSource={feedbacks}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: tableScrollY(PAGE_HEADROOM.stats) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                title={filters.category || filters.status !== undefined ? '没有符合筛选的反馈' : '还没有用户反馈'}
                description={
                  filters.category || filters.status !== undefined
                    ? '换个类型或状态，或点「重置」看全部。'
                    : '用户在阅读页提交反馈后会出现在这里。'
                }
              />
            ),
          }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            ...TABLE_PAGINATION,
          }}
          onChange={handleTableChange}
        />
      </div>

      <Modal
        title={`回复反馈：${replyModal.title}`}
        open={replyModal.open}
        onCancel={() => {
          setReplyModal({ open: false, id: null, title: '' });
          setReplyContent('');
        }}
        onOk={handleReply}
        okText="提交回复"
        cancelText="取消"
        confirmLoading={replyLoading}
        width={560}
      >
        <TextArea
          rows={5}
          placeholder="请输入回复内容..."
          maxLength={2000}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          style={{ marginTop: 'var(--zf-s4)' }}
        />
        <div className="zf-caption" style={{ textAlign: 'right', marginTop: 'var(--zf-s1)' }}>
          {replyContent.length}/2000
        </div>
      </Modal>

      <Modal
        title="反馈详情"
        open={detailModal.open}
        onCancel={() => setDetailModal({ open: false, data: null })}
        footer={null}
        width={640}
      >
        {detailModal.data && (
          <div style={{ padding: 'var(--zf-s2) 0' }}>
            <div style={{ marginBottom: 'var(--zf-s4)', display: 'flex', gap: 'var(--zf-s2)', alignItems: 'center' }}>
              <Tag color={categoryMap[detailModal.data.category]?.color || 'default'}>
                {categoryMap[detailModal.data.category]?.label || detailModal.data.category}
              </Tag>
              <Tag
                color={statusMap[detailModal.data.status]?.color || 'default'}
                icon={statusMap[detailModal.data.status]?.icon}
              >
                {statusMap[detailModal.data.status]?.label || '未知'}
              </Tag>
            </div>

            <div style={{ marginBottom: 'var(--zf-s3)' }}>
              <div className="zf-h3" style={{ marginBottom: 'var(--zf-s2)' }}>
                {detailModal.data.title}
              </div>
              {/* 内容块：底色/描边/文字全部走令牌，暗色下不再是一块看不清的深灰 */}
              <div
                style={{
                  color: 'var(--zf-text-secondary)',
                  lineHeight: 'var(--zf-lh-body)',
                  whiteSpace: 'pre-wrap',
                  background: 'var(--zf-glass-1)',
                  border: '1px solid var(--zf-glass-border)',
                  padding: 'var(--zf-s4)',
                  borderRadius: 'var(--zf-r-sm)',
                }}
              >
                {detailModal.data.content}
              </div>
            </div>

            <div className="zf-caption" style={{ marginBottom: 'var(--zf-s4)', display: 'flex', flexDirection: 'column', gap: 'var(--zf-s1)' }}>
              <span>提交用户：{detailModal.data.username || `用户${detailModal.data.userId}`}</span>
              <span>提交时间：{detailModal.data.createdAt ? new Date(detailModal.data.createdAt).toLocaleString('zh-CN') : '-'}</span>
              {detailModal.data.pageUrl && <span className="zf-mono">页面地址：{detailModal.data.pageUrl}</span>}
              {detailModal.data.userAgent && (
                <Tooltip title={detailModal.data.userAgent}>
                  <span className="zf-truncate" style={{ display: 'block', maxWidth: '100%' }}>
                    User-Agent：{detailModal.data.userAgent}
                  </span>
                </Tooltip>
              )}
            </div>

            {detailModal.data.adminReply && (
              <div
                style={{
                  background: 'var(--zf-tint-brand-08)',
                  border: '1px solid rgb(var(--zf-brand-rgb-500) / 0.25)',
                  borderRadius: 'var(--zf-r-sm)',
                  padding: 'var(--zf-s4)',
                }}
              >
                <div style={{ fontWeight: 'var(--zf-fw-strong)', marginBottom: 'var(--zf-s2)', color: 'var(--zf-brand-400)', fontSize: 'var(--zf-fs-sm)' }}>
                  管理员回复{detailModal.data.repliedByUsername ? `（${detailModal.data.repliedByUsername}）` : ''}
                </div>
                <div style={{ color: 'var(--zf-text-secondary)', lineHeight: 'var(--zf-lh-body)', whiteSpace: 'pre-wrap' }}>
                  {detailModal.data.adminReply}
                </div>
                {detailModal.data.repliedAt && (
                  <div className="zf-caption" style={{ marginTop: 'var(--zf-s2)' }}>
                    回复时间：{new Date(detailModal.data.repliedAt).toLocaleString('zh-CN')}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FeedbackList;
