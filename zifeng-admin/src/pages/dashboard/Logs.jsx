import React, { useState, useEffect, useRef } from 'react';
import { Table, Input, Select, DatePicker, Button, Space, Tag, Tooltip, Popconfirm, message } from 'antd';
import { ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { ZfPageHeader, ZfEmptyState } from '@zifeng/ui/components';
import { getLogsPaged, batchDeleteLogs } from '../../utils/adminApi';
import { TABLE_SHELL, tableScrollY, PAGE_HEADROOM, TABLE_PAGINATION } from '../../utils/ui';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const userTypeMap = {
  admin: { label: '管理员', color: 'red' },
  user: { label: '登录用户', color: 'blue' },
  guest: { label: '游客', color: 'default' },
};

/* 空态图标用中性的「∅」：页头与筛选控件已占用放大镜类图标，
   同一屏出现两个相同图标读起来像 bug。 */
const SearchEmptyIcon = () => <span aria-hidden="true">∅</span>;

const Logs = () => {
  const [logs, setLogs] = useState([]);
  /* 首屏即在请求中，初值直接给 true：effect 里同步 setState 会多渲染一轮 */
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({
    keyword: '',
    userType: 'all',
    dateRange: [dayjs().subtract(7, 'day'), dayjs()],
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const searchTimerRef = useRef(null);

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。首屏的加载态由 useState(true) 给出 */
  const fetchLogs = (page = 1, size = 20, keyword = filters.keyword, userType = filters.userType, dateRange = filters.dateRange) => {
    const run = async () => {
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
      } catch {
        message.error('获取日志失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  };

  /* 筛选 / 搜索 / 翻页 / 批量删除后的刷新都由事件触发，在回调里重新进入加载态 */
  const reload = (...args) => {
    setLoading(true);
    fetchLogs(...args);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value) => {
    setFilters(prev => ({ ...prev, keyword: value }));
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      reload(1, pagination.pageSize, value, filters.userType, filters.dateRange);
    }, 400);
  };

  const handleUserTypeChange = (value) => {
    setFilters(prev => ({ ...prev, userType: value }));
    reload(1, pagination.pageSize, filters.keyword, value, filters.dateRange);
  };

  const handleDateRangeChange = (dates) => {
    setFilters(prev => ({ ...prev, dateRange: dates }));
    reload(1, pagination.pageSize, filters.keyword, filters.userType, dates);
  };

  const handleReset = () => {
    const resetFilters = { keyword: '', userType: 'all', dateRange: [dayjs().subtract(7, 'day'), dayjs()] };
    setFilters(resetFilters);
    setSelectedRowKeys([]);
    setTimeout(() => reload(1, pagination.pageSize, '', 'all', resetFilters.dateRange), 0);
  };

  const handleTableChange = (pag) => {
    reload(pag.current, pag.pageSize, filters.keyword, filters.userType, filters.dateRange);
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchDeleting(true);
    try {
      const res = await batchDeleteLogs(selectedRowKeys);
      const deleted = res.data?.data?.deleted || selectedRowKeys.length;
      message.success(`已删除 ${deleted} 条日志`);
      setSelectedRowKeys([]);
      reload(pagination.current, pagination.pageSize, filters.keyword, filters.userType, filters.dateRange);
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
      render: (v) => <span className="zf-mono" style={{ fontSize: 'var(--zf-fs-sm)' }}>{v}</span>,
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
          <span className="zf-mono" style={{ fontSize: 'var(--zf-fs-sm)', fontWeight: 400 }}>{v}</span>
        </Tooltip>
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username) => username
        ? <span style={{ fontWeight: 'var(--zf-fw-strong)' }}>{username}</span>
        : <span style={{ color: 'var(--zf-text-faint)' }}>游客</span>,
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
      render: (v) => (
        <Tooltip placement="topLeft" title={v}>
          <span style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>{v || '-'}</span>
        </Tooltip>
      ),
    },
  ];

  const filtersBar = (
    <Space wrap>
      <Input.Search
        placeholder="搜索IP/路径/UA等"
        allowClear
        value={filters.keyword}
        onChange={(e) => handleSearchChange(e.target.value)}
        onSearch={(v) => reload(1, pagination.pageSize, v, filters.userType, filters.dateRange)}
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
  );

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="访问日志"
        extra={filtersBar}
        style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}
      />
      <div style={TABLE_SHELL}>
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          scroll={{ x: 900, y: tableScrollY(PAGE_HEADROOM.filtered) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                icon={<SearchEmptyIcon />}
                title="没有匹配的访问日志"
                description="试着放宽关键词，或把时间范围往前挪。"
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
    </div>
  );
};

export default Logs;
