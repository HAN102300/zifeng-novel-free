import React, { useState, useEffect, useRef, useContext } from 'react';
import { Table, Input, Avatar, Tag, Space, Switch, message, Spin, Popconfirm } from 'antd';
import { UserOutlined, SearchOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getUsers, banUser, unbanUser } from '../utils/adminApi';
import { fadeInUp } from '../utils/animations';
import { ThemeContext } from '../App';

const UserManagement = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const tableRef = useRef(null);

  useEffect(() => {
    if (tableRef.current) {
      fadeInUp(tableRef.current);
    }
  }, [users]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (kw = '') => {
    setLoading(true);
    try {
      const res = await getUsers(kw);
      setUsers(res.data?.data || []);
    } catch {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

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
      render: (avatar) => (
        <Avatar
          src={avatar}
          size={36}
          icon={<UserOutlined />}
          style={{
            backgroundColor: '#1890ff',
            flexShrink: 0,
          }}
        />
      ),
    },
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      render: (text) => <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>{text || '-'}</span>,
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      key: 'nickname',
      render: (text) => text || '-',
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
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>用户管理</h2>
        <Input.Search
          placeholder="搜索用户名或邮箱"
          allowClear
          enterButton={<><SearchOutlined /> 搜索</>}
          size="middle"
          loading={searching}
          onSearch={handleSearch}
          style={{ width: 300, maxWidth: '100%' }}
        />
      </div>

      <div ref={tableRef} style={{
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isDarkMode
          ? '0 2px 12px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          style={{ background: isDarkMode ? '#141414' : '#fff' }}
        />
      </div>
    </div>
  );
};

export default UserManagement;
