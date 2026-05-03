import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Table, Button, Modal, Form, Input, Tag, Space, Popconfirm, message,
  Card, Statistic, Row, Col, Switch, InputNumber, Select, Tabs, Upload,
  Tooltip, Dropdown,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined,
  ImportOutlined, ExportOutlined, DatabaseOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ThunderboltOutlined, FileOutlined, LinkOutlined,
  CloudOutlined, CloudUploadOutlined,
} from '@ant-design/icons';
import {
  getAdminSources, getAdminSourceStats, createAdminSource,
  updateAdminSource, deleteAdminSource, importAdminSources,
  testSource, importFromUrl, loginSource, checkLoginState,
} from '../utils/adminApi';
import { staggerFadeIn, fadeInUp } from '../utils/animations';
import { detectSourceType } from '../utils/bookSourceManager';
import { ThemeContext } from '../App';

const { TextArea } = Input;

const SOURCE_TYPE_MAP = {
  0: { color: 'blue', label: 'API' },
  1: { color: 'green', label: '网页' },
  2: { color: 'orange', label: '漫画' },
  3: { color: 'purple', label: '音频' },
};

const formatTime = (text) => {
  if (!text) return '-';
  const d = new Date(text);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const stringifyRule = (val) => {
  if (!val) return '';
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val, null, 2);
  } catch {
    return String(val);
  }
};

const parseRule = (val) => {
  if (!val || !val.trim()) return '';
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === 'object' && parsed !== null) return parsed;
    return val;
  } catch {
    return val;
  }
};

const BookSourceManager = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, enabled: 0, disabled: 0 });
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importTab, setImportTab] = useState('json');
  const [importJsonText, setImportJsonText] = useState('');
  const [importUrlText, setImportUrlText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const [testingIds, setTestingIds] = useState({});
  const statsRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (statsRef.current) {
      staggerFadeIn(statsRef.current.children, 80);
    }
  }, [stats]);

  useEffect(() => {
    if (tableRef.current) {
      fadeInUp(tableRef.current);
    }
  }, [sources]);

  useEffect(() => {
    fetchSources();
    fetchStats();
  }, []);

  const fetchSources = async (kw = '') => {
    setLoading(true);
    try {
      const res = await getAdminSources(kw);
      setSources(res.data?.data || []);
    } catch {
      message.error('获取书源列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await getAdminSourceStats();
      setStats(res.data?.data || { total: 0, enabled: 0, disabled: 0 });
    } catch {}
  };

  const handleSearch = async (value) => {
    setSearching(true);
    setKeyword(value);
    try {
      const res = await getAdminSources(value);
      setSources(res.data?.data || []);
    } catch {
      message.error('搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const handleToggleEnabled = async (record, checked) => {
    try {
      await updateAdminSource(record.id, { ...record, enabled: checked });
      message.success(checked ? '已启用' : '已禁用');
      fetchSources(keyword);
      fetchStats();
    } catch {
      message.error('操作失败');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminSource(id);
      message.success('删除成功');
      fetchSources(keyword);
      fetchStats();
      setSelectedRowKeys(prev => prev.filter(k => k !== id));
    } catch {
      message.error('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的书源');
      return;
    }
    try {
      for (const id of selectedRowKeys) {
        await deleteAdminSource(id);
      }
      message.success(`已删除 ${selectedRowKeys.length} 个书源`);
      setSelectedRowKeys([]);
      fetchSources(keyword);
      fetchStats();
    } catch {
      message.error('批量删除失败');
      fetchSources(keyword);
      fetchStats();
    }
  };

  const handleTest = async (record) => {
    setTestingIds(prev => ({ ...prev, [record.id]: 'loading' }));
    try {
      const res = await testSource(record);
      const data = res.data;
      if (data?.success) {
        message.success(`${record.bookSourceName}: 测试通过${data.respondTime ? ` (${data.respondTime}ms)` : ''}`);
        setTestingIds(prev => ({ ...prev, [record.id]: 'success' }));
      } else if (data?.requiresLogin) {
        setTestingIds(prev => ({ ...prev, [record.id]: 'login' }));
        handleLoginRequired(record);
      } else {
        message.error(`${record.bookSourceName}: 测试失败 - ${data?.message || '未知错误'}`);
        setTestingIds(prev => ({ ...prev, [record.id]: 'fail' }));
      }
    } catch (err) {
      message.error(`${record.bookSourceName}: 测试请求失败`);
      setTestingIds(prev => ({ ...prev, [record.id]: 'fail' }));
    }
    setTimeout(() => {
      setTestingIds(prev => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
    }, 5000);
  };

  const handleLoginRequired = (record) => {
    const loginUrl = record.loginUrl || '';
    const isHttpLogin = /^https?:\/\//i.test(loginUrl.trim());
    const isJsLogin = loginUrl.includes('<js>') || loginUrl.includes('function') || (loginUrl.trim() && !isHttpLogin);

    if (isHttpLogin) {
      Modal.confirm({
        title: '需要浏览器登录',
        content: (
          <div>
            <p>书源「{record.bookSourceName}」需要通过浏览器完成登录。</p>
            <p>请在浏览器中访问以下地址完成登录，登录后Cookie将自动保存：</p>
            <Input.TextArea value={loginUrl} readOnly rows={2} style={{ marginTop: 8 }} />
          </div>
        ),
        okText: '打开登录页面',
        cancelText: '取消',
        onOk: () => {
          window.open(loginUrl, '_blank');
          message.info('请在浏览器中完成登录后，重新测活验证');
        },
      });
    } else if (isJsLogin) {
      Modal.confirm({
        title: '需要执行登录脚本',
        content: (
          <div>
            <p>书源「{record.bookSourceName}」包含登录脚本，是否执行？</p>
            <p style={{ color: '#999', fontSize: 12 }}>脚本将自动运行以获取认证信息</p>
          </div>
        ),
        okText: '执行登录',
        cancelText: '取消',
        onOk: async () => {
          try {
            const loginRes = await loginSource(record, 'login');
            if (loginRes.data?.success) {
              message.success(`${record.bookSourceName}: 登录成功`);
              handleTest(record);
            } else {
              message.error(`${record.bookSourceName}: 登录失败 - ${loginRes.data?.message || '未知错误'}`);
            }
          } catch (e) {
            message.error(`${record.bookSourceName}: 登录请求失败`);
          }
        },
      });
    }
  };

  const openCreateModal = () => {
    setEditingSource(null);
    editForm.resetFields();
    editForm.setFieldsValue({
      bookSourceType: 0,
      enabled: true,
      weight: 0,
      enabledCookieJar: false,
    });
    setEditModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingSource(record);
    editForm.resetFields();
    editForm.setFieldsValue({
      bookSourceName: record.bookSourceName || '',
      bookSourceUrl: record.bookSourceUrl || '',
      bookSourceType: record.bookSourceType ?? 0,
      bookSourceGroup: record.bookSourceGroup || '',
      header: record.header || '',
      searchUrl: record.searchUrl || '',
      exploreUrl: record.exploreUrl || '',
      loginUrl: record.loginUrl || '',
      loginUi: stringifyRule(record.loginUi),
      jsLib: record.jsLib || '',
      weight: record.weight ?? 0,
      concurrentRate: record.concurrentRate || '',
      enabledCookieJar: record.enabledCookieJar ?? false,
      ruleSearch: stringifyRule(record.ruleSearch),
      ruleBookInfo: stringifyRule(record.ruleBookInfo),
      ruleToc: stringifyRule(record.ruleToc),
      ruleContent: stringifyRule(record.ruleContent),
      ruleExplore: stringifyRule(record.ruleExplore),
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        bookSourceName: values.bookSourceName,
        bookSourceUrl: values.bookSourceUrl,
        bookSourceGroup: values.bookSourceGroup,
        bookSourceType: values.bookSourceType,
        header: values.header,
        searchUrl: values.searchUrl,
        exploreUrl: values.exploreUrl,
        loginUrl: values.loginUrl,
        loginUi: parseRule(values.loginUi),
        jsLib: values.jsLib,
        concurrentRate: values.concurrentRate,
        enabled: values.enabled,
        enabledCookieJar: values.enabledCookieJar,
        weight: values.weight,
        customOrder: values.customOrder,
        ruleSearch: parseRule(values.ruleSearch),
        ruleBookInfo: parseRule(values.ruleBookInfo),
        ruleToc: parseRule(values.ruleToc),
        ruleContent: parseRule(values.ruleContent),
        ruleExplore: parseRule(values.ruleExplore),
      };

      if (editingSource) {
        const resp = await updateAdminSource(editingSource.id, payload);
        if (resp.data && resp.data.success === false) {
          message.error(resp.data.message || '更新失败');
        } else {
          message.success('更新成功');
        }
      } else {
        await createAdminSource(payload);
        message.success('创建成功');
      }
      setEditModalOpen(false);
      setEditingSource(null);
      fetchSources(keyword);
      fetchStats();
    } catch (err) {
      message.error(err.response?.data?.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportJson = async () => {
    if (!importJsonText.trim()) {
      message.warning('请输入JSON内容');
      return;
    }
    setImportLoading(true);
    try {
      let parsed;
      try {
        parsed = JSON.parse(importJsonText.trim());
      } catch {
        message.error('JSON格式错误');
        setImportLoading(false);
        return;
      }
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const res = await importAdminSources(arr);
      const result = res.data?.data;
      message.success(`导入完成：成功 ${result?.success ?? 0} 个，失败 ${result?.fail ?? 0} 个`);
      setImportModalOpen(false);
      setImportJsonText('');
      fetchSources(keyword);
      fetchStats();
    } catch (err) {
      message.error(err.response?.data?.message || '导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportFromUrl = async () => {
    if (!importUrlText.trim()) {
      message.warning('请输入URL地址');
      return;
    }
    setImportLoading(true);
    try {
      const res = await importFromUrl(importUrlText.trim());
      const arr = res.data?.sources || res.data?.data || (Array.isArray(res.data) ? res.data : null);
      if (!arr || (Array.isArray(arr) && arr.length === 0)) {
        message.warning('未获取到书源数据');
        setImportLoading(false);
        return;
      }
      const sources = Array.isArray(arr) ? arr : [arr];
      const importRes = await importAdminSources(sources);
      const result = importRes.data?.data;
      message.success(`导入完成：成功 ${result?.success ?? 0} 个，失败 ${result?.fail ?? 0} 个`);
      setImportModalOpen(false);
      setImportUrlText('');
      fetchSources(keyword);
      fetchStats();
    } catch (err) {
      message.error(err.response?.data?.message || 'URL导入失败');
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportFromFile = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        setImportLoading(true);
        const res = await importAdminSources(arr);
        const result = res.data?.data;
        message.success(`导入完成：成功 ${result?.success ?? 0} 个，失败 ${result?.fail ?? 0} 个`);
        setImportModalOpen(false);
        fetchSources(keyword);
        fetchStats();
      } catch (err) {
        message.error('文件解析失败或导入失败');
      } finally {
        setImportLoading(false);
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(sources, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zifeng_book_sources_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('导出成功');
  };

  const columns = [
    {
      title: '书源名称',
      dataIndex: 'bookSourceName',
      key: 'bookSourceName',
      width: 180,
      render: (text) => <span style={{ fontWeight: 600 }}>{text || '-'}</span>,
    },
    {
      title: '地址',
      dataIndex: 'bookSourceUrl',
      key: 'bookSourceUrl',
      width: 200,
      ellipsis: { showTitle: false },
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          <span style={{ color: isDarkMode ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>
            {text || '-'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '类型',
      dataIndex: 'bookSourceType',
      key: 'bookSourceType',
      width: 80,
      render: (val, record) => {
        const detectedType = detectSourceType(record);
        const info = SOURCE_TYPE_MAP[detectedType] || { color: 'default', label: '未知' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: '分组',
      dataIndex: 'bookSourceGroup',
      key: 'bookSourceGroup',
      width: 100,
      ellipsis: true,
      render: (text) => text ? <Tag>{text}</Tag> : '-',
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 80,
      render: (enabled, record) => (
        <Switch
          size="small"
          checked={enabled}
          onChange={(checked) => handleToggleEnabled(record, checked)}
        />
      ),
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 60,
      render: (val) => val ?? 0,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (text) => formatTime(text),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_, record) => {
        const testStatus = testingIds[record.id];
        return (
          <Space size={4}>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              style={{ color: '#1890ff' }}
            >
              编辑
            </Button>
            <Tooltip title={testStatus === 'loading' ? '测试中...' : testStatus === 'login' ? '需要登录' : '测试书源'}>
              <Button
                type="text"
                size="small"
                icon={
                  testStatus === 'loading' ? <CloudOutlined spin /> :
                  testStatus === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  testStatus === 'fail' ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} /> :
                  testStatus === 'login' ? <LinkOutlined style={{ color: '#faad14' }} /> :
                  <ThunderboltOutlined />
                }
                onClick={() => handleTest(record)}
              />
            </Tooltip>
            <Popconfirm
              title="确认删除"
              description={`确定要删除书源「${record.bookSourceName}」吗？`}
              onConfirm={() => handleDelete(record.id)}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const statCards = [
    { title: '总书源', value: stats.total, icon: <DatabaseOutlined />, color: '#1890ff', gradient: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)' },
    { title: '已启用', value: stats.enabled, icon: <CheckCircleOutlined />, color: '#52c41a', gradient: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)' },
    { title: '已禁用', value: stats.disabled, icon: <CloseCircleOutlined />, color: '#ff4d4f', gradient: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)' },
  ];

  const importMenuItems = [
    { key: 'json', icon: <FileOutlined />, label: '从JSON导入' },
    { key: 'url', icon: <LinkOutlined />, label: '从URL导入' },
    { key: 'file', icon: <CloudUploadOutlined />, label: '从文件导入' },
  ];

  const handleImportMenuClick = ({ key }) => {
    setImportTab(key);
    setImportJsonText('');
    setImportUrlText('');
    setImportModalOpen(true);
  };

  const editFormTabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bookSourceName" label="书源名称" rules={[{ required: true, message: '请输入书源名称' }]}>
                <Input placeholder="如：猫眼看书" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bookSourceUrl" label="书源地址" rules={[{ required: true, message: '请输入书源地址' }]}>
                <Input placeholder="如：http://api.example.com" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="bookSourceType" label="书源类型">
                <Select options={[
                  { value: 0, label: 'API（JSON接口）' },
                  { value: 1, label: '网页（HTML解析）' },
                  { value: 2, label: '漫画' },
                  { value: 3, label: '音频' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="bookSourceGroup" label="书源分组">
                <Input placeholder="如：小说,热门" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="header" label="请求头">
            <TextArea rows={2} placeholder="JSON格式的请求头" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Form.Item name="searchUrl" label="搜索地址">
            <Input placeholder="/search?page={{page}}&keyword={{key}}" />
          </Form.Item>
          <Form.Item name="exploreUrl" label="发现页地址">
            <TextArea rows={2} placeholder="男生频道::/boy.html&#10;女生频道::/girl.html" style={{ fontFamily: 'monospace' }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="loginUrl" label="登录地址">
                <Input placeholder="登录URL" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="loginUi" label="登录UI">
                <TextArea rows={1} placeholder="JSON格式登录界面配置" style={{ fontFamily: 'monospace', fontSize: 12 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="jsLib" label="JS库">
            <TextArea rows={3} placeholder="书源公共JS函数库" style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="weight" label="权重">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="concurrentRate" label="并发率">
                <Input placeholder="如：2000（毫秒）" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="enabledCookieJar" label="启用CookieJar" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </>
      ),
    },
    {
      key: 'ruleSearch',
      label: '搜索规则',
      children: (
        <Form.Item name="ruleSearch" label="搜索规则 (ruleSearch)">
          <TextArea rows={16} placeholder='JSON格式，如：{"bookList":"","name":"","author":"","bookUrl":""}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Form.Item>
      ),
    },
    {
      key: 'ruleBookInfo',
      label: '详情规则',
      children: (
        <Form.Item name="ruleBookInfo" label="详情规则 (ruleBookInfo)">
          <TextArea rows={16} placeholder='JSON格式，如：{"name":"","author":"","coverUrl":"","intro":""}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Form.Item>
      ),
    },
    {
      key: 'ruleToc',
      label: '目录规则',
      children: (
        <Form.Item name="ruleToc" label="目录规则 (ruleToc)">
          <TextArea rows={16} placeholder='JSON格式，如：{"chapterList":"","chapterName":"","chapterUrl":""}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Form.Item>
      ),
    },
    {
      key: 'ruleContent',
      label: '正文规则',
      children: (
        <Form.Item name="ruleContent" label="正文规则 (ruleContent)">
          <TextArea rows={16} placeholder='JSON格式，如：{"content":"","replaceRegex":""}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Form.Item>
      ),
    },
    {
      key: 'ruleExplore',
      label: '发现规则',
      children: (
        <Form.Item name="ruleExplore" label="发现规则 (ruleExplore)">
          <TextArea rows={16} placeholder='JSON格式，如：{"bookList":"","name":"","author":"","bookUrl":""}' style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Form.Item>
      ),
    },
  ];

  const importTabItems = [
    {
      key: 'json',
      label: <span><FileOutlined /> 从JSON导入</span>,
      children: (
        <div>
          <TextArea
            rows={10}
            placeholder="粘贴书源 JSON 内容（支持单条或数组格式）"
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            style={{ marginBottom: 12, fontFamily: 'monospace', fontSize: 12 }}
          />
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" loading={importLoading} onClick={handleImportJson} icon={<ImportOutlined />}>
              确认导入
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'url',
      label: <span><LinkOutlined /> 从URL导入</span>,
      children: (
        <div>
          <Input
            placeholder="输入书源 JSON 文件的 URL 地址"
            value={importUrlText}
            onChange={(e) => setImportUrlText(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" loading={importLoading} onClick={handleImportFromUrl} icon={<CloudOutlined />}>
              从URL导入
            </Button>
          </div>
        </div>
      ),
    },
    {
      key: 'file',
      label: <span><CloudUploadOutlined /> 从文件导入</span>,
      children: (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Upload
            accept=".json,.txt"
            showUploadList={false}
            beforeUpload={handleImportFromFile}
          >
            <Button icon={<CloudUploadOutlined />} size="large">选择本地 JSON 文件</Button>
          </Upload>
          <div style={{ marginTop: 8, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)', fontSize: 12 }}>
            支持 .json 和 .txt 格式
          </div>
        </div>
      ),
    },
  ];

  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16, flexShrink: 0 }} ref={statsRef}>
        {statCards.map((item, index) => (
          <Col xs={24} sm={8} key={item.title}>
            <Card
                style={{
                  borderRadius: 12,
                  border: 'none',
                  boxShadow: isDarkMode
                    ? '0 2px 12px rgba(0,0,0,0.3)'
                    : '0 2px 12px rgba(0,0,0,0.06)',
                }}
                styles={{ body: { padding: '20px 24px' } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: item.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: `0 4px 12px ${item.color}40`,
                  }}>
                    {item.icon}
                  </div>
                  <Statistic
                    title={<span style={{ fontSize: 13, color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{item.title}</span>}
                    value={item.value}
                    valueStyle={{ fontSize: 24, fontWeight: 700, color: item.color }}
                  />
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
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>书源管理</h2>
        <Space wrap size={8}>
          <Input.Search
            placeholder="搜索书源名称或地址"
            allowClear
            enterButton={<><SearchOutlined /> 搜索</>}
            size="middle"
            loading={searching}
            onSearch={handleSearch}
            style={{ width: 280 }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} style={{ borderRadius: 8 }}>
            新建书源
          </Button>
          <Dropdown menu={{ items: importMenuItems, onClick: handleImportMenuClick }}>
            <Button icon={<ImportOutlined />} style={{ borderRadius: 8 }}>
              导入书源
            </Button>
          </Dropdown>
          <Button icon={<ExportOutlined />} onClick={handleExport} style={{ borderRadius: 8 }}>
            导出书源
          </Button>
          {selectedRowKeys.length > 0 && (
            <Popconfirm
              title="批量删除"
              description={`确定要删除选中的 ${selectedRowKeys.length} 个书源吗？`}
              onConfirm={handleBatchDelete}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>
                批量删除 ({selectedRowKeys.length})
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <div ref={tableRef} style={{
        borderRadius: 12,
        overflow: 'hidden',
        flex: 1,
        boxShadow: isDarkMode
          ? '0 2px 12px rgba(0,0,0,0.3)'
          : '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <Table
          dataSource={sources}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          style={{ background: isDarkMode ? '#141414' : '#fff' }}
          scroll={{ x: 1040, y: 'calc(100vh - 64px - 48px - 55px - 100px - 32px)' }}
        />
      </div>

      <Modal
        title={editingSource ? '编辑书源' : '新建书源'}
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingSource(null); }}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form
          form={editForm}
          onFinish={handleEditSubmit}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Tabs items={editFormTabItems} />
          <div style={{ textAlign: 'right', marginTop: 16, borderTop: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : '#f0f0f0'}`, paddingTop: 16 }}>
            <Space>
              <Button onClick={() => { setEditModalOpen(false); setEditingSource(null); }}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingSource ? '保存修改' : '确认创建'}
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title="导入书源"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setImportJsonText(''); setImportUrlText(''); }}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Tabs
          activeKey={importTab}
          onChange={setImportTab}
          items={importTabItems}
        />
      </Modal>
    </div>
  );
};

export default BookSourceManager;
