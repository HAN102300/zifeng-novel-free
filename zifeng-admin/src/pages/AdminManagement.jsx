import React, { useState, useEffect, useRef, useContext } from 'react';
import { Table, Button, Modal, Form, Input, Tag, Space, Popconfirm, message, Spin, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined } from '@ant-design/icons';
import { getAdmins, createAdmin, updateAdmin, deleteAdmin } from '../utils/adminApi';
import { fadeInUp } from '../utils/animations';
import { ThemeContext } from '../App';

const AdminManagement = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => {
    if (tableRef.current) {
      fadeInUp(tableRef.current);
    }
  }, [admins]);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await getAdmins();
      setAdmins(res.data?.data || []);
    } catch {
      message.error('获取管理员列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (values) => {
    setSubmitting(true);
    try {
      const res = await createAdmin(values);
      if (res.data?.data) {
        message.success('添加管理员成功');
        setAddModalOpen(false);
        addForm.resetFields();
        fetchAdmins();
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
        fetchAdmins();
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
      fetchAdmins();
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

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
      render: (text, record) => (
        <Space>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: isSuperAdmin(record)
              ? 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 14,
            fontWeight: 'bold',
          }}>
            {text?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {isSuperAdmin(record) && (
            <Tooltip title="超级管理员受保护，不可编辑或删除">
              <Tag icon={<LockOutlined />} color="volcano" style={{ margin: 0, fontSize: 10 }}>受保护</Tag>
            </Tooltip>
          )}
        </Space>
      ),
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
      render: (text) => text ? new Date(text).toLocaleString('zh-CN') : <span style={{ color: isDarkMode ? '#555' : '#bbb' }}>从未登录</span>,
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
                style={isSuper ? { color: isDarkMode ? '#555' : '#bbb' } : { color: '#1890ff' }}
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
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={isSuper}
                  style={isSuper ? { color: isDarkMode ? '#555' : '#bbb' } : undefined}
                >
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
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>管理员管理</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalOpen(true)}
          style={{ borderRadius: 8 }}
        >
          添加管理员
        </Button>
      </div>

      <div ref={tableRef} style={{
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: isDarkMode
          ? '0 2px 12px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <Table
          dataSource={admins}
          columns={columns}
          rowKey="id"
          loading={loading}
          style={{ background: isDarkMode ? '#141414' : '#fff' }}
        />
      </div>

      <Modal
        title={<Space><PlusOutlined /> 添加管理员</Space>}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        footer={null}
        width={440}
      >
        <Form
          form={addForm}
          onFinish={handleAdd}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' },
              { max: 8, message: '用户名最多8个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' },
            ]}
          >
            <Input.Password placeholder="请输入密码" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setAddModalOpen(false); addForm.resetFields(); }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                确认添加
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={<Space><EditOutlined /> 编辑管理员</Space>}
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingAdmin(null); editForm.resetFields(); }}
        footer={null}
        width={440}
      >
        <Form
          form={editForm}
          onFinish={handleEdit}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 2, message: '用户名至少2个字符' },
              { max: 8, message: '用户名最多8个字符' },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => { setEditModalOpen(false); setEditingAdmin(null); editForm.resetFields(); }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                保存修改
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminManagement;
