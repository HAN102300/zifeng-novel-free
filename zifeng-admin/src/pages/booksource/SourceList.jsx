import React, { useState, useEffect, useRef, useContext } from 'react';
import { Table, Button, Tag, Space, Input, Switch, Dropdown, Modal, Form, Select, message, Popconfirm, Tooltip, Tabs } from 'antd';
import {
  PlusOutlined, ImportOutlined, DeleteOutlined, ReloadOutlined,
  ThunderboltOutlined, CloudOutlined, CheckCircleOutlined,
  CloseCircleOutlined, EditOutlined, LinkOutlined, ExportOutlined,
} from '@ant-design/icons';
import {
  getAdminSources, deleteAdminSource, updateAdminSource,
  createAdminSource, testSource, loginSource,
  importAdminSources, importFromUrl,
} from '../../utils/adminApi';
import { detectSourceType } from '../../utils/bookSourceManager';
import { fadeInUp, cardHover, cardLeave } from '../../utils/animations';
import { ThemeContext } from '../../App';

const SOURCE_TYPE_MAP = {
  0: { color: 'blue', label: 'API' },
  1: { color: 'green', label: '网页' },
  2: { color: 'orange', label: '漫画' },
  3: { color: 'purple', label: '音频' },
};

const RULE_FIELDS = {
  ruleSearch: [
    { key: 'bookList', label: '书籍列表' },
    { key: 'name', label: '书名' },
    { key: 'author', label: '作者' },
    { key: 'bookUrl', label: '书籍URL' },
    { key: 'coverUrl', label: '封面URL' },
    { key: 'intro', label: '简介' },
    { key: 'kind', label: '分类' },
    { key: 'lastChapter', label: '最新章节' },
    { key: 'wordCount', label: '字数' },
    { key: 'checkKeyWord', label: '关键词校验' },
    { key: 'updateTime', label: '更新时间' },
  ],
  ruleBookInfo: [
    { key: 'init', label: '初始化' },
    { key: 'name', label: '书名' },
    { key: 'author', label: '作者' },
    { key: 'coverUrl', label: '封面URL' },
    { key: 'intro', label: '简介' },
    { key: 'kind', label: '分类' },
    { key: 'lastChapter', label: '最新章节' },
    { key: 'tocUrl', label: '目录URL' },
    { key: 'wordCount', label: '字数' },
    { key: 'updateTime', label: '更新时间' },
    { key: 'canReName', label: '可重命名' },
    { key: 'downloadUrls', label: '下载地址' },
  ],
  ruleToc: [
    { key: 'chapterList', label: '章节列表' },
    { key: 'chapterName', label: '章节名' },
    { key: 'chapterUrl', label: '章节URL' },
    { key: 'nextTocUrl', label: '下一页URL' },
    { key: 'updateTime', label: '更新时间' },
    { key: 'isVip', label: 'VIP标识' },
    { key: 'isPay', label: '付费标识' },
    { key: 'isVolume', label: '卷标识' },
    { key: 'formatJs', label: '格式化JS' },
    { key: 'preUpdateJs', label: '预处理JS' },
  ],
  ruleContent: [
    { key: 'content', label: '正文内容' },
    { key: 'nextContentUrl', label: '下一页URL' },
    { key: 'replaceRegex', label: '替换规则' },
    { key: 'sourceRegex', label: '源规则' },
    { key: 'imageDecode', label: '图片解码' },
    { key: 'imageStyle', label: '图片样式' },
    { key: 'title', label: '标题' },
    { key: 'payAction', label: '付费操作' },
    { key: 'webJs', label: '网页JS' },
  ],
  ruleExplore: [
    { key: 'bookList', label: '书籍列表' },
    { key: 'name', label: '书名' },
    { key: 'author', label: '作者' },
    { key: 'bookUrl', label: '书籍URL' },
    { key: 'coverUrl', label: '封面URL' },
    { key: 'intro', label: '简介' },
    { key: 'kind', label: '分类' },
    { key: 'lastChapter', label: '最新章节' },
    { key: 'wordCount', label: '字数' },
  ],
};

const parseRule = (val) => {
  if (!val || !val.trim()) return '';
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return val;
  } catch { return val; }
};

const stringifyRule = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try { return JSON.stringify(val, null, 2); } catch { return String(val); }
};

const flattenRule = (ruleVal, prefix) => {
  const result = {};
  if (ruleVal && typeof ruleVal === 'object') {
    for (const [k, v] of Object.entries(ruleVal)) {
      result[`${prefix}__${k}`] = typeof v === 'string' ? v : (v != null ? String(v) : '');
    }
  }
  return result;
};

const unflattenRule = (values, prefix) => {
  const obj = {};
  const pfx = `${prefix}__`;
  for (const [k, v] of Object.entries(values)) {
    if (k.startsWith(pfx) && v !== undefined && v !== '') {
      const subKey = k.slice(pfx.length);
      obj[subKey] = v;
    }
  }
  return Object.keys(obj).length > 0 ? obj : null;
};

const SourceList = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [testingIds, setTestingIds] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const tableRef = useRef(null);

  useEffect(() => { fetchSources(); }, []);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await getAdminSources();
      setSources(res.data?.data || []);
    } catch { message.error('获取书源列表失败'); }
    finally { setLoading(false); }
  };

  const handleTest = async (record) => {
    setTestingIds(prev => ({ ...prev, [record.id]: 'loading' }));
    try {
      const res = await testSource(record);
      const data = res.data;
      if (data?.success) {
        message.success(`${record.bookSourceName}: 测试通过`);
        setTestingIds(prev => ({ ...prev, [record.id]: 'success' }));
      } else if (data?.requiresLogin) {
        setTestingIds(prev => ({ ...prev, [record.id]: 'login' }));
        handleLoginRequired(record);
      } else {
        message.error(`${record.bookSourceName}: 测试失败 - ${data?.message || '未知错误'}`);
        setTestingIds(prev => ({ ...prev, [record.id]: 'fail' }));
      }
    } catch {
      message.error(`${record.bookSourceName}: 测试请求失败`);
      setTestingIds(prev => ({ ...prev, [record.id]: 'fail' }));
    }
    setTimeout(() => { setTestingIds(prev => { const next = { ...prev }; delete next[record.id]; return next; }); }, 5000);
  };

  const handleLoginRequired = (record) => {
    const loginUrl = (record.loginUrl || '').trim();
    if (!loginUrl) {
      message.warning('该书源未配置登录地址');
      return;
    }
    const isHttpLogin = /^https?:\/\//i.test(loginUrl);
    if (isHttpLogin) {
      Modal.confirm({
        title: '需要浏览器登录',
        content: <div><p>书源「{record.bookSourceName}」需要通过浏览器完成登录。</p><Input.TextArea value={loginUrl} readOnly rows={2} style={{ marginTop: 8 }} /></div>,
        okText: '打开登录页面', cancelText: '取消',
        onOk: () => {
          try {
            const win = window.open(loginUrl, '_blank', 'noopener,noreferrer');
            if (!win || win.closed) {
              message.warning('浏览器已阻止弹窗，请允许弹窗后重试或手动复制地址访问');
            } else {
              message.info('请在浏览器中完成登录后，重新测活验证');
            }
          } catch {
            message.warning('浏览器已阻止弹窗，请允许弹窗后重试或手动复制地址访问');
          }
        },
      });
    } else {
      Modal.confirm({
        title: '需要执行登录脚本',
        content: <div><p>书源「{record.bookSourceName}」包含登录脚本，是否执行？</p></div>,
        okText: '执行登录', cancelText: '取消',
        onOk: async () => {
          try {
            const loginRes = await loginSource(record, 'login');
            if (loginRes.data?.success) { message.success(`${record.bookSourceName}: 登录成功`); handleTest(record); }
            else { message.error(`${record.bookSourceName}: 登录失败 - ${loginRes.data?.message || '未知错误'}`); }
          } catch { message.error(`${record.bookSourceName}: 登录请求失败`); }
        },
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminSource(id);
      message.success('删除成功');
      fetchSources();
    } catch { message.error('删除失败'); }
  };

  const handleToggleEnabled = async (record) => {
    try {
      await updateAdminSource(record.id, { enabled: !record.enabled });
      message.success(record.enabled ? '已禁用' : '已启用');
      fetchSources();
    } catch { message.error('操作失败'); }
  };

  const openEditModal = (record) => {
    setEditingSource(record);
    const flatData = { ...record };
    for (const ruleKey of ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore']) {
      let ruleVal = record[ruleKey];
      if (typeof ruleVal === 'string' && ruleVal.trim()) {
        try { ruleVal = JSON.parse(ruleVal); } catch {}
      }
      Object.assign(flatData, flattenRule(ruleVal, ruleKey));
      delete flatData[ruleKey];
    }
    if (record.loginUi && typeof record.loginUi === 'string') {
      flatData.loginUi = record.loginUi;
    } else if (record.loginUi) {
      flatData.loginUi = stringifyRule(record.loginUi);
    }
    form.setFieldsValue(flatData);
    setEditModalOpen(true);
  };

  const openAddModal = () => {
    setEditingSource(null);
    form.resetFields();
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        bookSourceName: values.bookSourceName, bookSourceUrl: values.bookSourceUrl,
        bookSourceGroup: Array.isArray(values.bookSourceGroup) ? values.bookSourceGroup.join(',') : (values.bookSourceGroup || ''),
        bookSourceType: values.bookSourceType,
        header: values.header, searchUrl: values.searchUrl, exploreUrl: values.exploreUrl,
        loginUrl: values.loginUrl, loginUi: parseRule(values.loginUi), jsLib: values.jsLib,
        concurrentRate: values.concurrentRate, enabled: values.enabled,
        enabledCookieJar: values.enabledCookieJar, weight: values.weight, customOrder: values.customOrder,
        ruleSearch: unflattenRule(values, 'ruleSearch'),
        ruleBookInfo: unflattenRule(values, 'ruleBookInfo'),
        ruleToc: unflattenRule(values, 'ruleToc'),
        ruleContent: unflattenRule(values, 'ruleContent'),
        ruleExplore: unflattenRule(values, 'ruleExplore'),
      };
      if (editingSource) {
        const resp = await updateAdminSource(editingSource.id, payload);
        if (resp.data && resp.data.success === false) { message.error(resp.data.message || '更新失败'); }
        else { message.success('更新成功'); }
      } else {
        await createAdminSource(payload);
        message.success('创建成功');
      }
      setEditModalOpen(false);
      fetchSources();
    } catch { message.error('操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      for (const id of selectedRowKeys) { await deleteAdminSource(id); }
      message.success(`已删除 ${selectedRowKeys.length} 个书源`);
      setSelectedRowKeys([]);
      fetchSources();
    } catch { message.error('批量删除失败'); }
  };

  const filteredSources = sources.filter(s =>
    !searchText || s.bookSourceName?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.bookSourceUrl?.toLowerCase().includes(searchText.toLowerCase()) ||
    s.bookSourceGroup?.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    { title: '名称', dataIndex: 'bookSourceName', key: 'bookSourceName', width: 160, ellipsis: true, render: (text) => <span style={{ fontWeight: 500 }}>{text}</span> },
    { title: 'URL', dataIndex: 'bookSourceUrl', key: 'bookSourceUrl', width: 200, ellipsis: true, render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{text}</span> },
    { title: '分组', dataIndex: 'bookSourceGroup', key: 'bookSourceGroup', width: 100, ellipsis: true, render: (text) => text ? <Tag>{text}</Tag> : '-' },
    { title: '类型', dataIndex: 'bookSourceType', key: 'bookSourceType', width: 80, render: (val, record) => { const detectedType = detectSourceType(record); const info = SOURCE_TYPE_MAP[detectedType] || { color: 'default', label: '未知' }; return <Tag color={info.color}>{info.label}</Tag>; } },
    { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 70, render: (val, record) => <Switch size="small" checked={val} onChange={() => handleToggleEnabled(record)} /> },
    {
      title: '操作', key: 'actions', width: 160, fixed: 'right',
      render: (_, record) => {
        const testStatus = testingIds[record.id];
        return (
          <Space size={4}>
            <Tooltip title={testStatus === 'loading' ? '测试中...' : testStatus === 'login' ? '需要登录' : '测试书源'}>
              <Button type="text" size="small" icon={testStatus === 'loading' ? <CloudOutlined spin /> : testStatus === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : testStatus === 'fail' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> : testStatus === 'login' ? <LinkOutlined style={{ color: '#faad14' }} /> : <ThunderboltOutlined />} onClick={() => handleTest(record)} />
            </Tooltip>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>书源列表</h2>
        <Space wrap>
          <Input.Search placeholder="搜索书源" allowClear value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 200 }} />
          <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>添加书源</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchSources}>刷新</Button>
          {selectedRowKeys.length > 0 && <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>删除 ({selectedRowKeys.length})</Button>}
        </Space>
      </div>
      <div ref={tableRef} style={{ borderRadius: 12, flex: 1, boxShadow: isDarkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)' }}>
        <Table dataSource={filteredSources} columns={columns} rowKey="id" loading={loading} rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }} style={{ background: isDarkMode ? '#141414' : '#fff', borderRadius: 12, overflow: 'hidden' }} scroll={{ x: 1040, y: 'calc(100vh - 64px - 48px - 55px - 56px - 32px)' }} />
      </div>

      <Modal title={editingSource ? '编辑书源' : '添加书源'} open={editModalOpen} onCancel={() => setEditModalOpen(false)} onOk={() => form.submit()} confirmLoading={submitting} width={780} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <Tabs type="card" size="small" items={[
            {
              key: 'basic',
              label: '基本规则',
              children: (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                    <Form.Item name="bookSourceName" label="书源名称" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="bookSourceUrl" label="书源URL" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="bookSourceGroup" label="分组"><Input /></Form.Item>
                    <Form.Item name="bookSourceType" label="类型"><Select options={[{ value: 0, label: 'API' }, { value: 1, label: '网页' }, { value: 2, label: '漫画' }, { value: 3, label: '音频' }]} /></Form.Item>
                    <Form.Item name="enabled" label="启用" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="enabledCookieJar" label="启用Cookie" valuePropName="checked"><Switch /></Form.Item>
                    <Form.Item name="weight" label="权重"><Input type="number" /></Form.Item>
                  </div>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.header !== cur.header}>
                    {({ getFieldValue }) => {
                      const val = getFieldValue('header');
                      if (!val || !String(val).trim()) return null;
                      return <Form.Item name="header" label="请求头"><Input.TextArea rows={1} autoSize /></Form.Item>;
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.searchUrl !== cur.searchUrl}>
                    {({ getFieldValue }) => {
                      const val = getFieldValue('searchUrl');
                      if (!val || !String(val).trim()) return null;
                      const long = String(val).length > 40;
                      return <Form.Item name="searchUrl" label="搜索URL">{long ? <Input.TextArea rows={1} autoSize /> : <Input />}</Form.Item>;
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.exploreUrl !== cur.exploreUrl}>
                    {({ getFieldValue }) => {
                      const val = getFieldValue('exploreUrl');
                      if (!val || !String(val).trim()) return null;
                      const long = String(val).length > 40;
                      return <Form.Item name="exploreUrl" label="发现URL">{long ? <Input.TextArea rows={1} autoSize /> : <Input />}</Form.Item>;
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.loginUrl !== cur.loginUrl}>
                    {({ getFieldValue }) => {
                      const val = getFieldValue('loginUrl');
                      if (!val || !String(val).trim()) return null;
                      const long = String(val).length > 40;
                      return <Form.Item name="loginUrl" label="登录URL">{long ? <Input.TextArea rows={1} autoSize /> : <Input />}</Form.Item>;
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.loginUi !== cur.loginUi}>
                    {({ getFieldValue }) => {
                      const val = getFieldValue('loginUi');
                      if (!val || !String(val).trim()) return null;
                      return <Form.Item name="loginUi" label="登录界面"><Input.TextArea rows={1} autoSize /></Form.Item>;
                    }}
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate={(prev, cur) => prev.jsLib !== cur.jsLib}>
                    {({ getFieldValue }) => {
                      const val = getFieldValue('jsLib');
                      if (!val || !String(val).trim()) return null;
                      return <Form.Item name="jsLib" label="JS库"><Input.TextArea rows={1} autoSize /></Form.Item>;
                    }}
                  </Form.Item>
                </>
              ),
            },
            ...['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore'].map(ruleKey => ({
              key: ruleKey,
              label: {
                ruleSearch: '搜索规则',
                ruleBookInfo: '书籍信息规则',
                ruleToc: '目录规则',
                ruleContent: '正文规则',
                ruleExplore: '发现规则',
              }[ruleKey],
              children: (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  {RULE_FIELDS[ruleKey].map(field => (
                    <Form.Item key={`${ruleKey}__${field.key}`} name={`${ruleKey}__${field.key}`} label={field.label}>
                      <Input placeholder={field.key} />
                    </Form.Item>
                  ))}
                </div>
              ),
            })),
          ]} />
        </Form>
      </Modal>
    </div>
  );
};

export default SourceList;
