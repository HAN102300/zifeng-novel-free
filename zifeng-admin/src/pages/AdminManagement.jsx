import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Space, Popconfirm, message, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { ZfPageHeader, ZfEmptyState } from '@zifeng/ui/components';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../utils/adminApi';
import {
  TABLE_SHELL,
  tableScrollY,
  PAGE_HEADROOM,
  LOCAL_PAGINATION,
  AVATAR_SQUARE,
  AVATAR_SQUARE_DANGER,
  USERNAME_RULES,
  PASSWORD_RULES,
} from '../utils/ui';

const AdminManagement = () => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位。 */
  const fetchAdmins = useCallback(() => {
    const run = async () => {
      try {
        const res = await getAdmins();
        setAdmins(res.data?.data || []);
      } catch {
        message.error('获取管理员列表失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  /* 增删改后的刷新是事件触发，在回调里重新进入加载态 */
  const reload = () => {
    setLoading(true);
    fetchAdmins();
  };

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleAdd = async (values) => {
    setSubmitting(true);
    try {
      const res = await createAdmin(values);
      if (res.data?.data) {
        message.success('添加管理员成功');
        setAddModalOpen(false);
        addForm.resetFields();
        reload();
      } else {
        message.error(res.data?.message || '添加失败');
      }
    } catch (err) {
      message.error(err.response?.data?.message || '添加失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values) => {
    if (!editingAdmin) return;
    setSubmitting(true);
    try {
      const res = await updateAdmin(editingAdmin.id, values);
      if (res.data?.data) {
        message.success('更新管理员成功');
        setEditModalOpen(false);
        setEditingAdmin(null);
        editForm.resetFields();
        reload();
      } else {
        message.error(res.data?.message || '更新失败');
      }
    } catch (err) {
      message.error(err.response?.data?.message || '更新失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdmin(id);
      message.success('删除管理员成功');
      reload();
    } catch (err) {
      message.error(err.response?.data?.message || '删除失败');
    }
  };

  const openEditModal = (record) => {
    setEditingAdmin(record);
    editForm.setFieldsValue({ username: record.username });
    setEditModalOpen(true);
  };

  const isSuperAdmin = (record) => {
    return record.role === 'super_admin' || record.id === 1;
  };

  const closeAdd = () => { setAddModalOpen(false); addForm.resetFields(); };
  const closeEdit = () => { setEditModalOpen(false); setEditingAdmin(null); editForm.resetFields(); };

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      width: 180,
      render: (text, record) => {
        const superAdmin = isSuperAdmin(record);
        return (
          <Space>
            {/* 与用户列表的头像共用同一枚 AVATAR_SQUARE；超管身份改用实心危险色
                而不是另配一套红渐变，避免同一屏出现第三种「品牌色」。 */}
            <span
              aria-hidden="true"
              style={{ ...AVATAR_SQUARE(32), ...(superAdmin ? AVATAR_SQUARE_DANGER : null) }}
            >
              {text?.charAt(0)?.toUpperCase() || 'A'}
            </span>
            <span style={{ fontWeight: 'var(--zf-fw-strong)' }}>{text}</span>
            {superAdmin && (
              <Tooltip title="超级管理员受保护，不可编辑或删除">
                <Tag icon={<LockOutlined />} color="volcano" style={{ margin: 0, fontSize: 'var(--zf-fs-2xs)' }}>
                  受保护
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => {
        const map = {
          super_admin: { color: 'volcano', label: '超级管理员' },
          admin: { color: 'blue', label: '管理员' },
        };
        const info = map[role] || { color: 'default', label: role || '未知' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const map = {
          1: { color: 'success', label: '正常' },
          0: { color: 'default', label: '禁用' },
        };
        const info = map[status] || { color: 'default', label: status || '未知' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : '-',
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 180,
      render: (text) => text
        ? new Date(text).toLocaleString('zh-CN')
        : <span style={{ color: 'var(--zf-text-faint)' }}>从未登录</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_, record) => {
        const isSuper = isSuperAdmin(record);
        return (
          <Space>
            <Tooltip title={isSuper ? '超级管理员不可编辑' : '编辑'}>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => !isSuper && openEditModal(record)}
                disabled={isSuper}
              >
                编辑
              </Button>
            </Tooltip>
            <Popconfirm
              title="确认删除"
              description={`确定要删除管理员「${record.username}」吗？`}
              onConfirm={() => handleDelete(record.id)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              disabled={isSuper}
            >
              <Tooltip title={isSuper ? '超级管理员不可删除' : '删除'}>
                <Button type="text" danger icon={<DeleteOutlined />} disabled={isSuper}>
                  删除
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="管理员管理"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddModalOpen(true)}
            classNames={{ root: 'zf-btn zf-btn--brand' }}
          >
            添加管理员
          </Button>
        }
        style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}
      />

      <div style={TABLE_SHELL}>
        <Table
          dataSource={admins}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ y: tableScrollY(PAGE_HEADROOM.plain) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                title="还没有管理员"
                description="点击右上角「添加管理员」创建第一个账号。"
              />
            ),
          }}
          pagination={LOCAL_PAGINATION}
        />
      </div>

      <Modal
        title={<Space><PlusOutlined /> 添加管理员</Space>}
        open={addModalOpen}
        onCancel={closeAdd}
        footer={null}
        width={440}
      >
        <Form form={addForm} onFinish={handleAdd} layout="vertical" style={{ marginTop: 'var(--zf-s4)' }}>
          <Form.Item name="username" label="用户名" rules={USERNAME_RULES}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={PASSWORD_RULES}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={closeAdd}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>确认添加</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><EditOutlined /> 编辑管理员</Space>}
        open={editModalOpen}
        onCancel={closeEdit}
        footer={null}
        width={440}
      >
        <Form form={editForm} onFinish={handleEdit} layout="vertical" style={{ marginTop: 'var(--zf-s4)' }}>
          <Form.Item name="username" label="用户名" rules={USERNAME_RULES}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={closeEdit}>取消</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>保存修改</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminManagement;
