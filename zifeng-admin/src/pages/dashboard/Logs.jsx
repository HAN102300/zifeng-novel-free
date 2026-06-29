import React, { useState, useEffect, useRef, useContext } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Tag, Tooltip, Popconfirm, message } from 'antd';
import { SearchOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { getLogsPaged, batchDeleteLogs } from '../../utils/adminApi';
import { fadeInUp } from '../../utils/animations';
import { ThemeContext } from '../../App';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const userTypeMap = {
  admin: { label: '管理员', color: 'red' },
  user: { label: '登录用户', color: 'blue' },
  guest: { label: '游客', color: 'default' },
};

const Logs = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    keyword: '',
    userType: 'all',
    dateRange: [dayjs().subtract(7, 'day'), dayjs()],
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const searchTimerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      fadeInUp(containerRef.current, 100);
    }
  }, []);

  const fetchLogs = async (page = 1, size = 20, keyword = filters.keyword, userType = filters.userType, dateRange = filters.dateRange) => {
    setLoading(true);
    try {
      const params = {
        page: page - 1,
        size,
        keyword: keyword || undefined,
        userType: userType !== 'all' ? userType : undefined,
        startDate: dateRange?.[0]?.startOf('day').format('YYYY-MM-DDTHH:mm:ss'),
        endDate: dateRange?.[1]?.endOf('day').format('YYYY-MM-DDTHH:mm:ss'),
      };
      const res = await getLogsPaged(params);
      const data = res.data?.data;
      if (data) {
        setLogs(data.items || []);
        setPagination({ current: (data.page || 0) + 1, pageSize: data.size || 20, total: data.total || 0 });
      }
    } catch (e) {
      message.error('获取日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, keyword: value }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      fetchLogs(1, pagination.pageSize, value, filters.userType, filters.dateRange);
    }, 400);
  };

  const handleUserTypeChange = (value) => {
    setFilters(prev => ({ ...prev, userType: value }));
    fetchLogs(1, pagination.pageSize, filters.keyword, value, filters.dateRange);
  };

  const handleDateRangeChange = (dates) => {
    setFilters(prev => ({ ...prev, dateRange: dates }));
    fetchLogs(1, pagination.pageSize, filters.keyword, filters.userType, dates);
  };

  const handleReset = () => {
    const resetFilters = { keyword: '', userType: 'all', dateRange: [dayjs().subtract(7, 'day'), dayjs()] };
    setFilters(resetFilters);
    setSelectedRowKeys([]);
    setTimeout(() => fetchLogs(1, pagination.pageSize, '', 'all', resetFilters.dateRange), 0);
  };

  const handleTableChange = (pag) => {
    fetchLogs(pag.current, pag.pageSize, filters.keyword, filters.userType, filters.dateRange);
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchDeleting(true);
    try {
      const res = await batchDeleteLogs(selectedRowKeys);
      const deleted = res.data?.data?.deleted || selectedRowKeys.length;
      message.success(`已删除 ${deleted} 条日志`);
      setSelectedRowKeys([]);
      fetchLogs(pagination.current, pagination.pageSize, filters.keyword, filters.userType, filters.dateRange);
    } catch {
      message.error('批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const getUserTypeTag = (record) => {
    const userType = record.userType;
    const info = userTypeMap[userType] || userTypeMap.guest;
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const columns = [
    {
      title: '访问时间',
      dataIndex: 'visitDate',
      key: 'visitDate',
      width: 170,
      render: (v) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 140,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{v}</span>,
    },
    {
      title: 'IP属地',
      dataIndex: 'ipLocation',
      key: 'ipLocation',
      width: 100,
      render: (v) => v || '-',
    },
    {
      title: '访问路径',
      dataIndex: 'visitUrl',
      key: 'visitUrl',
      ellipsis: true,
      render: (v) => (
        <Tooltip placement="topLeft" title={v}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 400 }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username) => username
        ? <span style={{ fontWeight: 500 }}>{username}</span>
        : <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>游客</span>,
    },
    {
      title: '用户类型',
      key: 'userType',
      width: 110,
      render: (_, r) => getUserTypeTag(r),
    },
    {
      title: 'User-Agent',
      dataIndex: 'userAgent',
      key: 'userAgent',
      width: 200,
      ellipsis: { showTitle: false },
      render: (v) => <Tooltip placement="topLeft" title={v}><span style={{ fontSize: 12, color: isDarkMode ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{v || '-'}</span></Tooltip>,
    },
  ];

  return (
    <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <h2 className="page-title">访问日志</h2>
        <Space wrap>
          <Input.Search
            placeholder="搜索IP/路径/UA等"
            allowClear
            value={filters.keyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            onSearch={(v) => fetchLogs(1, pagination.pageSize, v, filters.userType, filters.dateRange)}
            style={{ width: 220 }}
          />
          <Select value={filters.userType} onChange={handleUserTypeChange} style={{ width: 130 }}>
            <Select.Option value="all">全部</Select.Option>
            <Select.Option value="admin">管理员</Select.Option>
            <Select.Option value="user">登录用户</Select.Option>
            <Select.Option value="guest">游客</Select.Option>
          </Select>
          <RangePicker value={filters.dateRange} onChange={handleDateRangeChange} />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title={`确定删除选中的 ${selectedRowKeys.length} 条日志？`}
              onConfirm={handleBatchDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />} loading={batchDeleting}>
                删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>
      <div style={{ borderRadius: 12, flex: 1, boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          style={{ background: isDarkMode ? '#141414' : '#fff', borderRadius: 12, overflow: 'hidden' }}
          scroll={{ x: 900, y: 'calc(100vh - 64px - 48px - 55px - 56px - 32px)' }}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100'],
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          onChange={handleTableChange}
        />
      </div>
    </div>
  );
};

export default Logs;
