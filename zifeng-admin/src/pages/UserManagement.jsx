import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Avatar, Tag, Space, Switch, message, Popconfirm } from 'antd';
import { SearchOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { ZfPageHeader, ZfEmptyState } from '@zifeng/ui/components';
import { getUsers, banUser, unbanUser } from '../utils/adminApi';
import { TABLE_SHELL, tableScrollY, PAGE_HEADROOM, LOCAL_PAGINATION, AVATAR_SQUARE } from '../utils/ui';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位；
     搜索走 handleSearch 自己的 searching。 */
  const fetchUsers = useCallback((kw = '') => {
    const run = async () => {
      try {
        const res = await getUsers(kw);
        setUsers(res.data?.data || []);
      } catch {
        message.error('获取用户列表失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = async (value) => {
    setSearching(true);
    setKeyword(value);
    try {
      const res = await getUsers(value);
      setUsers(res.data?.data || []);
    } catch {
      message.error('搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const handleToggleBan = async (userId, isBanned) => {
    setTogglingIds(prev => new Set(prev).add(userId));
    try {
      if (isBanned) {
        await unbanUser(userId);
        message.success('已解封该用户');
      } else {
        await banUser(userId);
        message.success('已封禁该用户');
      }
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return { ...u, status: isBanned ? 1 : 0 };
        }
        return u;
      }));
    } catch (err) {
      message.error(err.response?.data?.message || '操作失败');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const columns = [
    {
      title: '头像',
      dataIndex: 'avatar',
      key: 'avatar',
      width: 64,
      /* 此前固定一个蓝色底，而管理员列表用的是品牌渐变首字母 ——
         同类元素两种画法，且那个蓝与全站紫无关。统一走 AVATAR_SQUARE。 */
      render: (avatar, record) => {
        const initial = (record.username || '?').charAt(0).toUpperCase();
        return avatar ? (
          <Avatar
            src={avatar}
            alt={record.username || '用户头像'}
            size={36}
            shape="square"
            style={{ borderRadius: 'var(--zf-r-sm)', flexShrink: 0 }}
          />
        ) : (
          <span aria-hidden="true" style={AVATAR_SQUARE(36)}>
            {initial}
          </span>
        );
      },
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 140,
      render: (text) => <span style={{ fontWeight: 'var(--zf-fw-strong)' }}>{text}</span>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 220,
      render: (text) => <span style={{ color: 'var(--zf-text-secondary)' }}>{text || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const map = {
          1: { color: 'success', label: '正常' },
          0: { color: 'error', label: '封禁' },
        };
        const info = map[status] || { color: 'default', label: '未知' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '封禁/解封',
      key: 'banAction',
      width: 120,
      render: (_, record) => {
        const isBanned = record.status === 0;
        const isToggling = togglingIds.has(record.id);
        return (
          <Popconfirm
            title={isBanned ? '确认解封该用户？' : '确认封禁该用户？'}
            description={isBanned ? '解封后用户可正常登录使用' : '封禁后用户将被强制下线，无法登录'}
            onConfirm={() => handleToggleBan(record.id, isBanned)}
            okText="确认"
            cancelText="取消"
            okButtonProps={isBanned ? {} : { danger: true }}
          >
            <Switch
              checked={!isBanned}
              loading={isToggling}
              checkedChildren={<CheckCircleOutlined />}
              unCheckedChildren={<StopOutlined />}
              onChange={() => {}}
            />
          </Popconfirm>
        );
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="用户管理"
        extra={
          <Input.Search
            placeholder="搜索用户名或邮箱"
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            size="middle"
            loading={searching}
            onSearch={handleSearch}
            style={{ width: 300, maxWidth: '100%' }}
          />
        }
        style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}
      />

      <div style={TABLE_SHELL}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: tableScrollY(PAGE_HEADROOM.plain) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                title={keyword ? `没有匹配「${keyword}」的用户` : '还没有注册用户'}
                description={keyword ? '换个用户名或邮箱片段试试。' : '用户端注册后会出现在这里。'}
              />
            ),
          }}
          pagination={LOCAL_PAGINATION}
        />
      </div>
    </div>
  );
};

export default UserManagement;
