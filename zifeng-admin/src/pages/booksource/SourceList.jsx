import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Table, Button, Tag, Space, Input, Switch, Modal, Form, Select, message, Popconfirm, Tooltip, Tabs,
  Typography,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, ReloadOutlined,
  ThunderboltOutlined, CloudOutlined, CheckCircleOutlined,
  CloseCircleOutlined, EditOutlined, LinkOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { ZfPageHeader, ZfEmptyState } from '@zifeng/ui/components';
import {
  getAdminSourcesPaged, deleteAdminSource, updateAdminSource,
  createAdminSource, testSource, loginSource, browserLogin,
  batchDeleteAdminSources,
} from '../../utils/adminApi';
import {
  TABLE_SHELL, tableScrollY, PAGE_HEADROOM, TABLE_PAGINATION, MONO,
} from '../../utils/ui';

const { Text } = Typography;

const SOURCE_TYPE_MAP = {
  0: { color: 'blue', label: 'API' },
  1: { color: 'green', label: '网页' },
  2: { color: 'orange', label: '漫画' },
  3: { color: 'purple', label: '音频' },
};

/* 规则字段按语义分组，每组一句说明。
   此前 6 个 Tab 里 40+ 个 Input 平铺，无分组、无标题、无 help text ——
   对着 bookList / chapterList / content 这类同名键，用户只能靠猜。 */
const RULE_TABS = [
  {
    key: 'ruleSearch',
    label: '搜索规则',
    hint: '搜索结果 JSON 如何映射成书籍列表与各字段。',
    groups: [
      {
        title: '列表定位',
        fields: [
          { key: 'bookList', label: '书籍列表', tip: '通常以 @ 开头，如 @js:…,result' },
          { key: 'checkKeyWord', label: '关键词校验', tip: '用于校验搜索结果有效性的关键词' },
        ],
      },
      {
        title: '书籍字段',
        fields: [
          { key: 'name', label: '书名' },
          { key: 'author', label: '作者' },
          { key: 'bookUrl', label: '书籍URL' },
          { key: 'coverUrl', label: '封面URL' },
          { key: 'intro', label: '简介' },
          { key: 'kind', label: '分类' },
          { key: 'lastChapter', label: '最新章节' },
          { key: 'wordCount', label: '字数' },
          { key: 'updateTime', label: '更新时间' },
        ],
      },
    ],
  },
  {
    key: 'ruleBookInfo',
    label: '书籍信息规则',
    hint: '详情页如何补齐书名、作者、目录入口等信息。',
    groups: [
      {
        title: '入口与补充请求',
        fields: [
          { key: 'init', label: '初始化', tip: '进入详情页时先发一次的规则（如获取 token）' },
          { key: 'tocUrl', label: '目录URL' },
          { key: 'downloadUrls', label: '下载地址' },
        ],
      },
      {
        title: '书籍字段',
        fields: [
          { key: 'name', label: '书名' },
          { key: 'author', label: '作者' },
          { key: 'coverUrl', label: '封面URL' },
          { key: 'intro', label: '简介' },
          { key: 'kind', label: '分类' },
          { key: 'lastChapter', label: '最新章节' },
          { key: 'wordCount', label: '字数' },
          { key: 'updateTime', label: '更新时间' },
          { key: 'canReName', label: '可重命名' },
        ],
      },
    ],
  },
  {
    key: 'ruleToc',
    label: '目录规则',
    hint: '目录页如何解析成章节列表，并支持翻页与付费标记。',
    groups: [
      {
        title: '列表与翻页',
        fields: [
          { key: 'chapterList', label: '章节列表' },
          { key: 'nextTocUrl', label: '下一页URL' },
        ],
      },
      {
        title: '章节字段',
        fields: [
          { key: 'chapterName', label: '章节名' },
          { key: 'chapterUrl', label: '章节URL' },
          { key: 'updateTime', label: '更新时间' },
        ],
      },
      {
        title: '状态与预处理',
        fields: [
          { key: 'isVip', label: 'VIP标识' },
          { key: 'isPay', label: '付费标识' },
          { key: 'isVolume', label: '卷标识' },
          { key: 'formatJs', label: '格式化JS' },
          { key: 'preUpdateJs', label: '预处理JS' },
        ],
      },
    ],
  },
  {
    key: 'ruleContent',
    label: '正文规则',
    hint: '章节页正文的抓取、清洗与下一页拼接。',
    groups: [
      {
        title: '正文与翻页',
        fields: [
          { key: 'content', label: '正文内容' },
          { key: 'nextContentUrl', label: '下一页URL' },
          { key: 'title', label: '标题' },
        ],
      },
      {
        title: '清洗规则',
        fields: [
          { key: 'replaceRegex', label: '替换规则', tip: '形如 ##正则##替换串，多条用 || 分隔' },
          { key: 'sourceRegex', label: '源规则' },
          { key: 'imageDecode', label: '图片解码' },
          { key: 'imageStyle', label: '图片样式' },
        ],
      },
      {
        title: '付费与脚本',
        fields: [
          { key: 'payAction', label: '付费操作' },
          { key: 'webJs', label: '网页JS' },
        ],
      },
    ],
  },
  {
    key: 'ruleExplore',
    label: '发现规则',
    hint: '发现页（分类/榜单）的列表与书籍字段映射，结构同搜索规则。',
    groups: [
      {
        title: '列表定位',
        fields: [{ key: 'bookList', label: '书籍列表' }],
      },
      {
        title: '书籍字段',
        fields: [
          { key: 'name', label: '书名' },
          { key: 'author', label: '作者' },
          { key: 'bookUrl', label: '书籍URL' },
          { key: 'coverUrl', label: '封面URL' },
          { key: 'intro', label: '简介' },
          { key: 'kind', label: '分类' },
          { key: 'lastChapter', label: '最新章节' },
          { key: 'wordCount', label: '字数' },
        ],
      },
    ],
  },
];

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

/* 规则值可能是 @js:… / ##regex## 这类长串，单行 Input 会把后半段顶出视野。
   统一改 autoSize TextArea + 等宽字体：短值和 Input 视觉一致，长值可换行读全。 */
const SourceList = () => {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [testingIds, setTestingIds] = useState({});
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [batchDeleting, setBatchDeleting] = useState(false);
  const searchTimerRef = useRef(null);

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位 */
  const fetchSources = useCallback((page = 1, size = 20, keyword = '') => {
    const run = async () => {
      try {
        const res = await getAdminSourcesPaged(keyword, page, size);
        const data = res.data?.data;
        if (data) {
          setSources(data.content || []);
          setPagination({
            current: data.currentPage || 1,
            pageSize: data.size || 20,
            total: data.totalElements || 0,
          });
        }
      } catch { message.error('获取书源列表失败'); }
      finally { setLoading(false); }
    };
    run();
  }, []);

  /* 搜索 / 翻页 / 增删改后的刷新都由事件触发，在回调里重新进入加载态 */
  const reload = (page = 1, size = 20, keyword = '') => {
    setLoading(true);
    fetchSources(page, size, keyword);
  };

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const handleSearch = (value) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      reload(1, pagination.pageSize, value);
    }, 400);
  };

  const handleTableChange = (pag) => {
    reload(pag.current, pag.pageSize, searchText);
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

  const runLogin = async (record) => {
    try {
      const loginRes = await loginSource(record, 'login');
      if (loginRes.data?.success) { message.success(`${record.bookSourceName}: 登录成功`); handleTest(record); }
      else { message.error(`${record.bookSourceName}: 登录失败 - ${loginRes.data?.message || '未知错误'}`); }
    } catch { message.error(`${record.bookSourceName}: 登录请求失败`); }
  };

  const handleLoginRequired = (record) => {
    const loginUrl = (record.loginUrl || '').trim();
    const loginUi = record.loginUi || '';
    const hasLoginUi = !!loginUi && loginUi !== '{}' && loginUi !== '[]' && loginUi !== '""';

    if (!loginUrl && !hasLoginUi) {
      message.warning('该书源未配置登录信息');
      return;
    }

    const isHttpLogin = loginUrl && /^https?:\/\//i.test(loginUrl);
    const isScriptLogin = loginUrl && !isHttpLogin;

    let loginUiFields = [];
    if (hasLoginUi) {
      try {
        let uiData = loginUi;
        if (typeof uiData === 'string') {
          try { uiData = JSON.parse(uiData); } catch { /* 非法 JSON 时按无字段处理 */ }
        }
        if (Array.isArray(uiData)) {
          loginUiFields = uiData;
        } else if (uiData && typeof uiData === 'object') {
          loginUiFields = Array.isArray(uiData.fields) ? uiData.fields : [uiData];
        }
      } catch { /* 解析失败时保持空字段列表 */ }
    }

    const hasFormFields = loginUiFields.length > 0;

    if (isHttpLogin) {
      Modal.confirm({
        title: '需要浏览器登录',
        width: 520,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
            <Text>书源「{record.bookSourceName}」需要通过浏览器完成登录。</Text>
            <Input.TextArea value={loginUrl} readOnly autoSize className="zf-mono" style={{ ...MONO, fontSize: 'var(--zf-fs-xs)' }} />
            <div>
              <Text strong style={{ fontSize: 'var(--zf-fs-sm)' }}>选择登录方式：</Text>
              <ul style={{ margin: 'var(--zf-s1) 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--zf-s1)' }}>
                <li className="zf-caption"><Text strong style={{ fontSize: 'var(--zf-fs-xs)' }}>Puppeteer 浏览器</Text>：在服务器端打开浏览器窗口，自动获取 Cookie</li>
                <li className="zf-caption"><Text strong style={{ fontSize: 'var(--zf-fs-xs)' }}>本地浏览器</Text>：在本地打开浏览器标签页，手动操作</li>
              </ul>
            </div>
          </div>
        ),
        okText: 'Puppeteer 登录',
        cancelText: '本地浏览器',
        onOk: async () => {
          try {
            const res = await browserLogin(record);
            if (res.data?.success) {
              message.success('浏览器已打开，请完成登录后关闭窗口，然后重新测活');
            } else {
              message.error(res.data?.message || '浏览器登录启动失败');
            }
          } catch {
            message.error('浏览器登录请求失败，请检查解析引擎是否运行');
          }
        },
        onCancel: () => {
          try {
            const win = window.open(loginUrl, '_blank', 'noopener,noreferrer');
            if (!win || win.closed) {
              message.warning('浏览器已阻止弹窗，请允许弹窗后重试');
            } else {
              message.info('请在浏览器中完成登录后，重新测活验证');
            }
          } catch {
            message.warning('浏览器已阻止弹窗，请允许弹窗后重试');
          }
        },
      });
    } else if (isScriptLogin) {
      Modal.confirm({
        title: '需要执行登录脚本',
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
            <Text>书源「{record.bookSourceName}」包含登录脚本，是否执行？</Text>
            {hasFormFields && <LoginFieldTable fields={loginUiFields} />}
          </div>
        ),
        okText: '执行登录', cancelText: '取消',
        onOk: () => runLogin(record),
      });
    } else if (hasFormFields) {
      Modal.info({
        title: '登录界面参数',
        width: 520,
        content: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
            <Text>书源「{record.bookSourceName}」配置了登录界面参数：</Text>
            <LoginFieldTable fields={loginUiFields} detailed />
            <Text type="secondary" style={{ fontSize: 'var(--zf-fs-xs)' }}>
              该登录界面需要通过脚本登录执行，请点击下方按钮执行登录
            </Text>
          </div>
        ),
        okText: '执行登录',
        onOk: () => runLogin(record),
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAdminSource(id);
      message.success('删除成功');
      reload(pagination.current, pagination.pageSize, searchText);
    } catch { message.error('删除失败'); }
  };

  const handleToggleEnabled = async (record) => {
    try {
      await updateAdminSource(record.id, { enabled: !record.enabled });
      message.success(record.enabled ? '已禁用' : '已启用');
      reload(pagination.current, pagination.pageSize, searchText);
    } catch { message.error('操作失败'); }
  };

  const openEditModal = (record) => {
    setEditingSource(record);
    const flatData = { ...record };
    for (const ruleKey of ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore']) {
      let ruleVal = record[ruleKey];
      if (typeof ruleVal === 'string' && ruleVal.trim()) {
        try { ruleVal = JSON.parse(ruleVal); } catch { /* 非 JSON 时按原样保留 */ }
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
      reload(pagination.current, pagination.pageSize, searchText);
    } catch { message.error('操作失败'); }
    finally { setSubmitting(false); }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    setBatchDeleting(true);
    try {
      const res = await batchDeleteAdminSources(selectedRowKeys);
      const deleted = res.data?.data?.deleted || selectedRowKeys.length;
      message.success(`已删除 ${deleted} 个书源`);
      setSelectedRowKeys([]);
      reload(pagination.current, pagination.pageSize, searchText);
    } catch {
      message.error('批量删除失败');
    } finally {
      setBatchDeleting(false);
    }
  };

  const columns = [
    { title: '名称', dataIndex: 'bookSourceName', key: 'bookSourceName', width: 160, ellipsis: true, render: (text) => <span style={{ fontWeight: 'var(--zf-fw-strong)' }}>{text}</span> },
    {
      title: 'URL', dataIndex: 'bookSourceUrl', key: 'bookSourceUrl', width: 200, ellipsis: true,
      render: (text) => (
        <Tooltip placement="topLeft" title={text}>
          <span className="zf-mono" style={{ fontSize: 'var(--zf-fs-sm)', fontWeight: 400, color: 'var(--zf-text-secondary)' }}>{text}</span>
        </Tooltip>
      ),
    },
    { title: '分组', dataIndex: 'bookSourceGroup', key: 'bookSourceGroup', width: 100, ellipsis: true, render: (text) => text ? <Tag>{text}</Tag> : '-' },
    { title: '类型', dataIndex: 'bookSourceType', key: 'bookSourceType', width: 80, render: (val) => { const info = SOURCE_TYPE_MAP[val] || { color: 'default', label: '未知' }; return <Tag color={info.color}>{info.label}</Tag>; } },
    { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 70, render: (val, record) => <Switch size="small" checked={val} onChange={() => handleToggleEnabled(record)} /> },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, record) => {
        const testStatus = testingIds[record.id];
        const hasLogin = !!(record.loginUrl || (record.loginUi && record.loginUi !== '{}' && record.loginUi !== '[]' && record.loginUi !== '""'));
        return (
          <Space size={4}>
            <Tooltip title={testStatus === 'loading' ? '测试中...' : testStatus === 'login' ? '需要登录' : '测试书源'}>
              <Button
                type="text"
                size="small"
                icon={
                  testStatus === 'loading' ? <CloudOutlined spin />
                    : testStatus === 'success' ? <CheckCircleOutlined style={{ color: 'var(--zf-status-success)' }} />
                    : testStatus === 'fail' ? <CloseCircleOutlined style={{ color: 'var(--zf-status-error)' }} />
                    : testStatus === 'login' ? <LinkOutlined style={{ color: 'var(--zf-status-warning)' }} />
                    : <ThunderboltOutlined />
                }
                onClick={() => handleTest(record)}
              />
            </Tooltip>
            {hasLogin && (
              <Tooltip title="登录">
                <Button type="text" size="small" icon={<LoginOutlined style={{ color: 'var(--zf-brand-400)' }} />} onClick={() => handleLoginRequired(record)} />
              </Tooltip>
            )}
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} />
            <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  const toolbar = (
    <Space wrap>
      <Input.Search
        placeholder="搜索书源"
        allowClear
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        onSearch={(v) => reload(1, pagination.pageSize, v)}
        style={{ width: 200 }}
      />
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={openAddModal}
        classNames={{ root: 'zf-btn zf-btn--brand' }}
      >
        添加书源
      </Button>
      <Button icon={<ReloadOutlined />} onClick={() => reload(pagination.current, pagination.pageSize, searchText)}>刷新</Button>
      {selectedRowKeys.length > 0 && (
        <Button danger icon={<DeleteOutlined />} loading={batchDeleting} onClick={handleBatchDelete}>
          删除 ({selectedRowKeys.length})
        </Button>
      )}
    </Space>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <ZfPageHeader
        title="书源列表"
        subtitle={`共 ${pagination.total} 个书源`}
        extra={toolbar}
        style={{ marginBottom: 'var(--zf-s4)', flexShrink: 0 }}
      />
      <div style={TABLE_SHELL}>
        <Table
          dataSource={sources}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
          /* scroll.x 原先写 1040，但各列宽度实际总和只有 854
             （选择框44 + 名称160 + URL200 + 分组100 + 类型80 + 启用70 + 操作200）。
             多出的 186px 加上操作列 fixed:'right'，使固定列悬浮遮挡了 URL 文本，
             看起来就像「文字和图标重叠」。按真实总和给，并取消 fixed。 */
          scroll={{ x: 854, y: tableScrollY(PAGE_HEADROOM.source) }}
          locale={{
            emptyText: (
              <ZfEmptyState
                compact
                title={searchText ? `没有匹配「${searchText}」的书源` : '还没有书源'}
                description={searchText ? '换个关键词，或到「书源导入」批量导入。' : '先到「书源导入」批量导入，或点「添加书源」手工新建。'}
                action={
                  <Button onClick={openAddModal} classNames={{ root: 'zf-btn zf-btn--glass' }} icon={<PlusOutlined />}>
                    添加书源
                  </Button>
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

      {/* 弹窗此前不限高，6 个 Tab 的长表单把「确定/取消」footer 顶到视口之外，
          用户必须滚动整个页面才找得到提交按钮。改为 body 内部滚动、footer 常驻。 */}
      <Modal
        title={editingSource ? '编辑书源' : '添加书源'}
        open={editModalOpen}
        onCancel={() => setEditModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={780}
        destroyOnClose
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', overflowX: 'hidden', paddingBlock: 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={handleEditSubmit}>
          <Tabs type="card" size="small" items={[
            {
              key: 'basic',
              label: '基本规则',
              children: <BasicTab />,
            },
            ...RULE_TABS.map(tab => ({
              key: tab.key,
              label: tab.label,
              children: (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)' }}>
                  <Text type="secondary" style={{ fontSize: 'var(--zf-fs-xs)' }}>{tab.hint}</Text>
                  {tab.groups.map(group => (
                    <FormSection key={group.title} title={group.title}>
                      {group.fields.map(field => (
                        <Form.Item
                          key={`${tab.key}__${field.key}`}
                          name={`${tab.key}__${field.key}`}
                          label={field.label}
                          tooltip={field.tip}
                        >
                          <Input.TextArea
                            autoSize={{ minRows: 1, maxRows: 6 }}
                            placeholder={field.tip || field.key}
                            className="zf-mono"
                            style={MONO}
                          />
                        </Form.Item>
                      ))}
                    </FormSection>
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

/* 弹窗内容里的登录字段表：原先是裸 <p>/<strong> 配一组浅灰底 + 灰字字面量，
   暗色模式下几乎读不出来。这里改成令牌化的定义列表。 */
function LoginFieldTable({ fields, detailed = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s2)' }}>
      {detailed && (
        <Text type="secondary" style={{ fontSize: 'var(--zf-fs-xs)' }}>登录表单参数：</Text>
      )}
      {fields.map((field, idx) => {
        const name = field.name || field.label || `字段${idx + 1}`;
        const type = field.type || 'text';
        const placeholder = field.placeholder || field.hint || '';
        return (
          <div
            key={idx}
            style={{
              padding: 'var(--zf-s1) var(--zf-s3)',
              background: 'var(--zf-glass-1)',
              border: '1px solid var(--zf-glass-border)',
              borderRadius: 'var(--zf-r-xs)',
              fontSize: 'var(--zf-fs-sm)',
            }}
          >
            <Text strong>{name}</Text>
            <Text type="secondary" style={{ marginLeft: 'var(--zf-s2)', fontSize: 'var(--zf-fs-xs)' }}>({type})</Text>
            {placeholder && (
              <div className="zf-caption">提示: {placeholder}</div>
            )}
            {field.url && (
              <div className="zf-mono" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-brand-400)', wordBreak: 'break-all' }}>
                URL: {field.url}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section>
      <div
        style={{
          fontSize: 'var(--zf-fs-xs)',
          fontWeight: 'var(--zf-fw-strong)',
          letterSpacing: 'var(--zf-ls-wide)',
          color: 'var(--zf-text-muted)',
          paddingBottom: 'var(--zf-s1)',
          marginBottom: 'var(--zf-s3)',
          borderBottom: '1px solid var(--zf-glass-border)',
        }}
      >
        {title}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 var(--zf-s4)' }}>{children}</div>
    </section>
  );
}

function BasicTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)' }}>
      <FormSection title="基本信息">
        <Form.Item name="bookSourceName" label="书源名称" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="bookSourceUrl" label="书源URL" rules={[{ required: true }]} tooltip="书源站点根地址，用于拼接相对路径">
          <Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} className="zf-mono" style={MONO} />
        </Form.Item>
        <Form.Item name="bookSourceGroup" label="分组">
          <Input />
        </Form.Item>
        <Form.Item name="bookSourceType" label="类型">
          <Select options={[{ value: 0, label: 'API' }, { value: 1, label: '网页' }, { value: 2, label: '漫画' }, { value: 3, label: '音频' }]} />
        </Form.Item>
        <Form.Item name="weight" label="权重" tooltip="多书源并发时的排序权重，越大越优先">
          <Input type="number" />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="enabledCookieJar" label="启用Cookie" valuePropName="checked" tooltip="开启后该书源共用 Cookie 容器">
          <Switch />
        </Form.Item>
      </FormSection>

      <FormSection title="搜索与发现">
        <OptionalRuleField name="searchUrl" label="搜索URL" tip="留空则不提交。多行用 || 分隔，每行一个分类" />
        <OptionalRuleField name="exploreUrl" label="发现URL" tip="留空则不提交。格式：分类名##URL||分类名##URL" />
      </FormSection>

      <FormSection title="请求头与登录">
        <OptionalRuleField name="header" label="请求头" tip={'JSON 字符串，如 {"User-Agent":"…"}'} rows={2} />
        <OptionalRuleField name="loginUrl" label="登录URL" tip="http(s) 开头走浏览器登录，否则视为登录脚本" />
        <OptionalRuleField name="loginUi" label="登录界面" tip="登录表单字段定义（JSON）" rows={2} />
        <OptionalRuleField name="jsLib" label="JS库" tip="全局 JS 库地址，供规则里的 @js: 调用" />
      </FormSection>
    </div>
  );
}

/* 这几个可空字段此前靠 shouldUpdate 隐藏「未填写」的行 —— 编辑时看得到、
   新增时看不到，读起来像表单坏了。这里一律展示，用 autoSize TextArea
   让长 URL 能换行读全。 */
function OptionalRuleField({ name, label, tip, rows = 1 }) {
  return (
    <Form.Item name={name} label={label} tooltip={tip}>
      <Input.TextArea
        autoSize={{ minRows: rows, maxRows: rows + 4 }}
        placeholder={tip}
        className="zf-mono"
        style={MONO}
      />
    </Form.Item>
  );
}

export default SourceList;
