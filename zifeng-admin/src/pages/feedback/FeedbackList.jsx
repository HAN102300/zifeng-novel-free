import React, { useState, useEffect, useRef, useContext } from 'react';
import { Row, Col, Card, Table, Tag, Select, Button, Space, Modal, Input, message, Tooltip, Dropdown, Typography } from 'antd';
import { ClockCircleOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, SearchOutlined, ReloadOutlined, FormOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getFeedbacks, getFeedbackStats, replyFeedback, updateFeedbackStatus } from '../../utils/adminApi';
import { staggerFadeIn, cardHover, cardLeave } from '../../utils/animations';
import { ThemeContext } from '../../App';

const { TextArea } = Input;
const { Text } = Typography;

const categoryMap = {
  bug: { label: 'Bug 报告', color: 'red' },
  feature: { label: '功能建议', color: 'blue' },
  ux: { label: '体验问题', color: 'orange' },
  performance: { label: '性能问题', color: 'purple' },
  other: { label: '其他', color: 'default' },
};

const statusMap = {
  0: { label: '待处理', color: 'orange', icon: <ClockCircleOutlined /> },
  1: { label: '处理中', color: 'blue', icon: <SyncOutlined spin /> },
  2: { label: '已解决', color: 'green', icon: <CheckCircleOutlined /> },
  3: { label: '已关闭', color: 'default', icon: <CloseCircleOutlined /> },
};

const statCards = [
  { key: 'pending', title: '待处理', color: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)', icon: <ClockCircleOutlined /> },
  { key: 'inProgress', title: '处理中', color: '#1890ff', gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', icon: <SyncOutlined /> },
  { key: 'resolved', title: '已解决', color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)', icon: <CheckCircleOutlined /> },
  { key: 'closed', title: '已关闭', color: '#8c8c8c', gradient: 'linear-gradient(135deg, #8c8c8c 0%, #595959 100%)', icon: <CloseCircleOutlined /> },
];

const FeedbackList = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ pending: 0, inProgress: 0, resolved: 0, closed: 0, total: 0 });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ category: undefined, status: undefined });
  const [replyModal, setReplyModal] = useState({ open: false, id: null, title: '' });
  const [replyContent, setReplyContent] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, data: null });
  const statsRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (statsRef.current) {
      staggerFadeIn(statsRef.current.children, 60);
    }
  }, [stats]);

  useEffect(() => {
    fetchStats();
    fetchFeedbacks();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getFeedbackStats();
      setStats(res.data?.data || { pending: 0, inProgress: 0, resolved: 0, closed: 0, total: 0 });
    } catch {}
  };

  const fetchFeedbacks = async (page = 1, size = 20) => {
    setLoading(true);
    try {
      const params = {
        page: page - 1,
        size,
        category: filters.category || undefined,
        status: filters.status !== undefined && filters.status !== null ? filters.status : undefined,
      };
      const res = await getFeedbacks(params);
      const data = res.data?.data;
      if (data) {
        setFeedbacks(data.items || []);
        setPagination({ current: (data.page || 0) + 1, pageSize: data.size || 20, total: data.total || 0 });
      }
    } catch {
      message.error('获取反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchFeedbacks(1, pagination.pageSize);
  };

  const handleReset = () => {
    setFilters({ category: undefined, status: undefined });
    setTimeout(() => fetchFeedbacks(1, pagination.pageSize), 0);
  };

  const handleTableChange = (pag) => {
    fetchFeedbacks(pag.current, pag.pageSize);
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
      fetchFeedbacks(pagination.current, pagination.pageSize);
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
      fetchFeedbacks(pagination.current, pagination.pageSize);
      fetchStats();
    } catch {
      message.error('状态更新失败');
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
        <a onClick={() => setDetailModal({ open: true, data: record })} style={{ fontWeight: 500 }}>
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
          <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 90,
      render: (id) => <Tag>用户{id}</Tag>,
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
        const statusItems = Object.entries(statusMap).map(([value, info]) => ({
          key: value,
          label: info.label,
          icon: info.icon,
        }));

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
            >
              <Button type="link" size="small">
                状态 <span style={{ fontSize: 10 }}>▼</span>
              </Button>
            </Dropdown>
          </Space>
        );
      },
    },
  ];

  const cardStyle = {
    borderRadius: 12,
    border: 'none',
    boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  };

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Row gutter={[16, 16]} ref={statsRef} style={{ marginBottom: 16, flexShrink: 0 }}>
        {statCards.map((card) => (
          <Col xs={12} sm={12} md={6} key={card.key}>
            <Card
              style={cardStyle}
              styles={{ body: { padding: '20px 24px' } }}
              onMouseEnter={(e) => cardHover(e.currentTarget)}
              onMouseLeave={(e) => cardLeave(e.currentTarget)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', marginBottom: 8 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
                    {stats[card.key] || 0}
                  </div>
                </div>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: card.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: '#fff',
                  boxShadow: `0 4px 12px ${card.color}33`,
                }}>
                  {card.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
        flexShrink: 0,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>反馈列表</h2>
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
      </div>

      <div ref={tableRef} style={{
        borderRadius: 12,
        flex: 1,
        boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <Table
          dataSource={feedbacks}
          columns={columns}
          rowKey="id"
          loading={loading}
          style={{ background: isDarkMode ? '#141414' : '#fff', borderRadius: 12, overflow: 'hidden' }}
          scroll={{ y: 'calc(100vh - 64px - 48px - 120px - 60px - 32px)' }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['15', '30', '50'],
            showTotal: (total) => `共 ${total} 条记录`,
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
          style={{ marginTop: 16 }}
        />
        <div style={{ textAlign: 'right', marginTop: 4, fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
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
          <div style={{ padding: '8px 0' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Tag color={categoryMap[detailModal.data.category]?.color || 'default'}>
                {categoryMap[detailModal.data.category]?.label || detailModal.data.category}
              </Tag>
              <Tag color={statusMap[detailModal.data.status]?.color || 'default'} icon={statusMap[detailModal.data.status]?.icon}>
                {statusMap[detailModal.data.status]?.label || '未知'}
              </Tag>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{detailModal.data.title}</div>
              <div style={{
                color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                background: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                padding: 16,
                borderRadius: 8,
              }}>
                {detailModal.data.content}
              </div>
            </div>

            <div style={{
              fontSize: 12,
              color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              <span>提交用户：用户{detailModal.data.userId}</span>
              <span>提交时间：{detailModal.data.createdAt ? new Date(detailModal.data.createdAt).toLocaleString('zh-CN') : '-'}</span>
              {detailModal.data.pageUrl && <span>页面地址：{detailModal.data.pageUrl}</span>}
              {detailModal.data.userAgent && (
                <Tooltip title={detailModal.data.userAgent}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', maxWidth: '100%' }}>
                    User-Agent：{detailModal.data.userAgent}
                  </span>
                </Tooltip>
              )}
            </div>

            {detailModal.data.adminReply && (
              <div style={{
                background: isDarkMode ? 'rgba(24, 144, 255, 0.08)' : 'rgba(24, 144, 255, 0.04)',
                border: `1px solid ${isDarkMode ? 'rgba(24, 144, 255, 0.2)' : 'rgba(24, 144, 255, 0.15)'}`,
                borderRadius: 8,
                padding: 16,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: '#1890ff', fontSize: 13 }}>
                  管理员回复
                </div>
                <div style={{ color: isDarkMode ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {detailModal.data.adminReply}
                </div>
                {detailModal.data.repliedAt && (
                  <div style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', marginTop: 8 }}>
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
