import React, { useContext, useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Typography, Space, Empty, Button, Tag, Switch, Input, Modal, message, Tabs, List, Tooltip, Badge, Select, Checkbox, Steps } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, ImportOutlined, ExportOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, LinkOutlined, FileOutlined, CloudOutlined, SearchOutlined, UndoOutlined, ThunderboltOutlined, WarningOutlined, LoginOutlined, LogoutOutlined, SafetyOutlined, CompassOutlined } from '@ant-design/icons';
import { ThemeContext } from '../App';
import BackButton from '../components/BackButton';
import {
  getBookSources, addBookSources, removeBookSource, toggleBookSource,
  getActiveSource, setActiveSource, testBookSource, exportBookSources,
  importBookSourcesFromJson, getDefaultSource, saveBookSources,
  fetchBookSourcesFromUrl, detectLoginCapability, getSourceLoginStatus,
  setSourceLoginStatus, clearSourceLoginStatus
} from '../utils/bookSourceManager';
import { getExploreAPI } from '../utils/apiClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

const DEFAULT_SOURCE_URL = 'http://api.jmlldsc.com';

const glassStyle = (isDarkMode, glassMode, extra = {}) => ({
  background: glassMode
    ? (isDarkMode ? 'rgba(20,20,20,0.65)' : 'rgba(255,255,255,0.6)')
    : (isDarkMode ? '#141414' : '#ffffff'),
  backdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
  WebkitBackdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
  border: glassMode
    ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`
    : `1px solid ${isDarkMode ? '#333' : '#f0f0f0'}`,
  boxShadow: glassMode
    ? `0 8px 32px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)'}`
    : '0 4px 20px rgba(0,0,0,0.08)',
  ...extra
});

const BookSourceManager = () => {
  const navigate = useNavigate();
  const { themeConfigs, currentTheme, isDarkMode, glassMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].primaryColor;

  const [sources, setSources] = useState([]);
  const [activeSourceUrl, setActiveSourceUrl] = useState('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [testingUrls, setTestingUrls] = useState({});
  const [testFailReasons, setTestFailReasons] = useState({});
  const [searchText, setSearchText] = useState('');
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [batchTesting, setBatchTesting] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginSource, setLoginSource] = useState(null);
  const [loginStatuses, setLoginStatuses] = useState({});
  const [hoveredUrl, setHoveredUrl] = useState(null);
  const [fullTestResult, setFullTestResult] = useState(null);
  const [fullTestModalOpen, setFullTestModalOpen] = useState(false);
  const [exploreBooks, setExploreBooks] = useState([]);
  const [exploreLoading, setExploreLoading] = useState(false);
  const [activeExploreUrl, setActiveExploreUrl] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => { loadSources(); }, []);

  useEffect(() => {
    if (!editModalOpen) {
      setExploreBooks([]);
      setExploreLoading(false);
      setActiveExploreUrl('');
    }
  }, [editModalOpen]);

  const loadSources = () => {
    const all = getBookSources();
    setSources(all);
    const active = getActiveSource();
    setActiveSourceUrl(active.bookSourceUrl);
    const statuses = {};
    all.forEach(s => {
      statuses[s.bookSourceUrl] = getSourceLoginStatus(s.bookSourceUrl);
    });
    setLoginStatuses(statuses);
  };

  const sourceLoginInfo = useMemo(() => {
    const info = {};
    sources.forEach(s => {
      info[s.bookSourceUrl] = detectLoginCapability(s);
    });
    return info;
  }, [sources]);

  const isDefaultSource = (url) => url === DEFAULT_SOURCE_URL;

  const handleSetActive = (url) => {
    if (url === activeSourceUrl) return;
    setActiveSource(url);
    setActiveSourceUrl(url);
    message.success('已设为搜索默认书源');
  };
  const handleToggle = (url, enabled) => {
    const updated = toggleBookSource(url, enabled);
    setSources([...updated]);
    message.info(enabled ? '已启用该书源，搜索时可使用' : '已禁用该书源，搜索时将跳过');
  };

  const handleDelete = (url) => {
    if (isDefaultSource(url)) { message.warning('默认书源不可删除'); return; }
    Modal.confirm({
      title: '确认删除', content: '删除后不可恢复，确定要删除这个书源吗？', okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => {
        const updated = removeBookSource(url);
        setSources([...updated]);
        setSelectedUrls(prev => { const n = new Set(prev); n.delete(url); return n; });
        if (activeSourceUrl === url) { const n = updated[0]?.bookSourceUrl || ''; setActiveSourceUrl(n); if (n) setActiveSource(n); }
        message.success('已删除');
      }
    });
  };

  const handleBatchDelete = () => {
    const deletable = [...selectedUrls].filter(url => !isDefaultSource(url));
    if (deletable.length === 0) { message.warning('没有可删除的书源（默认书源不可删除）'); return; }
    Modal.confirm({
      title: '批量删除', content: `确定要删除选中的 ${deletable.length} 个书源吗？`, okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => {
        let updated = getBookSources();
        for (const url of deletable) {
          updated = updated.filter(s => s.bookSourceUrl !== url);
        }
        saveBookSources(updated);
        setSources([...updated]);
        setSelectedUrls(new Set());
        if (deletable.includes(activeSourceUrl)) {
          const n = updated[0]?.bookSourceUrl || '';
          setActiveSourceUrl(n);
          if (n) setActiveSource(n);
        }
        message.success(`已删除 ${deletable.length} 个书源`);
      }
    });
  };

  const handleTest = async (url, isFullTest = false) => {
    setTestingUrls(prev => ({ ...prev, [url]: 'loading' }));
    setTestFailReasons(prev => { const n = { ...prev }; delete n[url]; return n; });
    const source = sources.find(s => s.bookSourceUrl === url);
    if (!source) return;
    const result = await testBookSource(source, isFullTest);
    setTestingUrls(prev => ({ ...prev, [url]: result.success ? 'success' : 'fail' }));
    if (!result.success && result.message) {
      setTestFailReasons(prev => ({ ...prev, [url]: result.message }));
    }
    if (isFullTest && result.stages) {
      setFullTestResult({ ...result, sourceName: source.bookSourceName });
      setFullTestModalOpen(true);
    } else {
      if (!result.success) {
        message.error(`${source.bookSourceName}: ${result.message}`);
      } else {
        message.success(`${source.bookSourceName}: ${result.message}`);
      }
    }
    setTimeout(() => {
      setTestingUrls(prev => { const n = { ...prev }; delete n[url]; return n; });
    }, 5000);
  };

  const handleBatchTest = async () => {
    const urlsToTest = [...selectedUrls].filter(url => sources.find(s => s.bookSourceUrl === url));
    if (urlsToTest.length === 0) { message.warning('请先选择要测活的书源'); return; }

    setBatchTesting(true);
    const newFailReasons = {};

    for (const url of urlsToTest) {
      setTestingUrls(prev => ({ ...prev, [url]: 'loading' }));
      const source = sources.find(s => s.bookSourceUrl === url);
      if (!source) continue;

      const result = await testBookSource(source);
      setTestingUrls(prev => ({ ...prev, [url]: result.success ? 'success' : 'fail' }));
      if (!result.success && result.message) {
        newFailReasons[url] = result.message;
      }
    }

    setTestFailReasons(prev => ({ ...prev, ...newFailReasons }));
    setBatchTesting(false);

    const failCount = Object.keys(newFailReasons).length;
    const successCount = urlsToTest.length - failCount;
    if (failCount > 0) {
      message.warning(`测活完成：${successCount} 个通过，${failCount} 个失败`);
    } else {
      message.success(`测活完成：全部 ${successCount} 个通过`);
    }

    setTimeout(() => {
      setTestingUrls(prev => {
        const n = { ...prev };
        urlsToTest.forEach(u => delete n[u]);
        return n;
      });
    }, 8000);
  };

  const toggleSelect = (url) => {
    setSelectedUrls(prev => {
      const n = new Set(prev);
      if (n.has(url)) n.delete(url); else n.add(url);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedUrls.size === filteredSources.length) {
      setSelectedUrls(new Set());
    } else {
      setSelectedUrls(new Set(filteredSources.map(s => s.bookSourceUrl)));
    }
  };

  const handleImport = () => {
    if (!importText.trim()) { message.warning('请输入书源内容'); return; }
    setImportLoading(true);
    try {
      const parsed = importBookSourcesFromJson(importText.trim());
      if (parsed.length === 0) { message.error('未解析到有效书源'); return; }
      addBookSources(parsed); loadSources(); setImportModalOpen(false); setImportText('');
      message.success(`成功导入 ${parsed.length} 个书源`);
    } catch (e) { message.error('导入失败：' + e.message); }
    finally { setImportLoading(false); }
  };

  const handleImportFromUrl = async () => {
    if (!importText.trim()) { message.warning('请输入书源URL'); return; }
    setImportLoading(true);
    try {
      const parsed = await fetchBookSourcesFromUrl(importText.trim());
      addBookSources(parsed); loadSources(); setImportModalOpen(false); setImportText('');
      message.success(`成功导入 ${parsed.length} 个书源`);
    } catch (e) { message.error(e.message || 'URL导入失败'); }
    finally { setImportLoading(false); }
  };

  const handleFileImport = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const parsed = importBookSourcesFromJson(event.target.result);
      if (parsed.length === 0) { message.error('未解析到有效书源'); return; }
      addBookSources(parsed); loadSources();
      message.success(`成功导入 ${parsed.length} 个书源`);
    };
    reader.readAsText(file); e.target.value = '';
  };

  const handleExport = () => {
    const blob = new Blob([exportBookSources(sources)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `zifeng_book_sources_${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url); message.success('导出成功');
  };

  const handleSaveEdit = () => {
    if (!editingSource) return;
    addBookSources([editingSource]); loadSources(); setEditModalOpen(false); setEditingSource(null);
    message.success('保存成功');
  };

  const handleAddNew = () => {
    setEditingSource({
      bookSourceName: '', bookSourceUrl: '', bookSourceType: 0, bookSourceGroup: '', enabled: true, header: '',
      searchUrl: '/search?page={{page}}&keyword={{key}}',
      exploreUrl: '',
      ruleSearch: { author: '', bookList: '', bookUrl: '', coverUrl: '', intro: '', kind: '', lastChapter: '', name: '', wordCount: '' },
      ruleExplore: { bookList: '', name: '', author: '', coverUrl: '', intro: '', kind: '', wordCount: '', lastChapter: '', bookUrl: '' },
      ruleBookInfo: { author: '', coverUrl: '', init: '', intro: '', kind: '', lastChapter: '', name: '', tocUrl: '', wordCount: '' },
      ruleToc: { chapterList: '', chapterName: '', chapterUrl: '', updateTime: '' },
      ruleContent: { content: '', replaceRegex: '' }
    });
    setEditModalOpen(true);
  };

  const handleResetToDefault = () => {
    Modal.confirm({
      title: '重置书源', content: '将恢复为默认书源，自定义书源将被清除。确定继续？', okText: '确定', cancelText: '取消', okButtonProps: { danger: true },
      onOk: () => { const d = getDefaultSource(); saveBookSources([d]); setActiveSource(d.bookSourceUrl); loadSources(); message.success('已重置为默认书源'); }
    });
  };

  const parseExploreUrlLocal = (exploreUrl) => {
    if (!exploreUrl || typeof exploreUrl !== 'string') return [];
    const trimmed = exploreUrl.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          title: item.title || '',
          url: item.url || ''
        })).filter(item => item.title && item.url);
      }
    } catch {}
    return trimmed.split('\n').map(line => line.trim()).filter(line => line).map(line => {
      const idx = line.indexOf('::');
      if (idx !== -1) {
        return { title: line.slice(0, idx).trim(), url: line.slice(idx + 2).trim() };
      }
      return null;
    }).filter(item => item && item.title && item.url);
  };

  const handleExploreCategory = async (url) => {
    if (!editingSource) return;
    setExploreLoading(true);
    setActiveExploreUrl(url);
    try {
      const result = await getExploreAPI(editingSource, url);
      if (result.success) {
        setExploreBooks(result.books || []);
      } else {
        setExploreBooks([]);
        message.error(result.message || '获取发现页失败');
      }
    } catch (e) {
      setExploreBooks([]);
      message.error('获取发现页失败：' + (e.message || '未知错误'));
    }
    setExploreLoading(false);
  };

  const filteredSources = sources.filter(s => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (s.bookSourceName || '').toLowerCase().includes(q) || (s.bookSourceUrl || '').toLowerCase().includes(q) || (s.bookSourceGroup || '').toLowerCase().includes(q);
  });

  const enabledCount = sources.filter(s => s.enabled).length;
  const hasSelection = selectedUrls.size > 0;

  return (
    <div style={{ position: 'relative', padding: '0 0 40px 0', maxWidth: 900, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {glassMode && (
        <div style={{ position: 'fixed', top: '15%', right: '-5%', width: 350, height: 350, borderRadius: '50%', background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`, filter: 'blur(60px)', pointerEvents: 'none' }} />
      )}

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ flexShrink: 0, position: 'sticky', top: 0, zIndex: 20, paddingTop: 8, paddingBottom: 4,
          background: glassMode
            ? (isDarkMode ? 'rgba(10,10,10,0.85)' : 'rgba(245,245,245,0.85)')
            : (isDarkMode ? '#0a0a0a' : '#f5f5f5'),
          backdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
          WebkitBackdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 12, padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BackButton onClick={() => navigate('/setting')} text="返回" />
            <Title level={4} style={{ margin: 0 }}>书源管理</Title>
            <Badge count={enabledCount} style={{ backgroundColor: color }} />
          </div>
          <Space wrap size={8}>
            <Input
              placeholder="搜索书源..."
              prefix={<SearchOutlined style={{ color: isDarkMode ? '#666' : '#bbb' }} />}
              size="small"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 150, borderRadius: 8 }}
              allowClear
            />
            <Button size="small" icon={<PlusOutlined />} type="primary" style={{ backgroundColor: color, borderColor: color, borderRadius: 8 }} onClick={handleAddNew}>新建</Button>
            <Button size="small" icon={<ImportOutlined />} style={{ borderRadius: 8, color: color, borderColor: color }} onClick={() => setImportModalOpen(true)}>导入</Button>
            <Button size="small" icon={<ExportOutlined />} style={{ borderRadius: 8, color: color, borderColor: color }} onClick={handleExport}>导出</Button>
            <Button size="small" icon={<UndoOutlined />} danger style={{ borderRadius: 8 }} onClick={handleResetToDefault}>重置</Button>
          </Space>
        </div>
      </motion.div>

      <AnimatePresence>
        {hasSelection && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 8, overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 56, zIndex: 15,
              background: glassMode
                ? (isDarkMode ? 'rgba(10,10,10,0.85)' : 'rgba(245,245,245,0.85)')
                : (isDarkMode ? '#0a0a0a' : '#f5f5f5'),
              backdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
              WebkitBackdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderRadius: 12,
              ...glassStyle(isDarkMode, glassMode, {
                background: glassMode
                  ? (isDarkMode ? 'rgba(255,77,79,0.12)' : 'rgba(255,77,79,0.08)')
                  : (isDarkMode ? '#1a1a1a' : '#fff1f0'),
                borderColor: isDarkMode ? 'rgba(255,77,79,0.2)' : 'rgba(255,77,79,0.15)',
              })
            }}>
              <Space size={12}>
                <Checkbox checked={selectedUrls.size === filteredSources.length && filteredSources.length > 0} indeterminate={selectedUrls.size > 0 && selectedUrls.size < filteredSources.length} onChange={toggleSelectAll} />
                <Text style={{ fontSize: 13 }}>已选 <Text strong style={{ color: '#ff4d4f' }}>{selectedUrls.size}</Text> 项</Text>
              </Space>
              <Space size={8}>
                <Button size="small" icon={<ThunderboltOutlined />} loading={batchTesting} onClick={handleBatchTest} style={{ borderRadius: 8 }}>
                  批量测活
                </Button>
                <Button size="small" danger icon={<DeleteOutlined />} onClick={handleBatchDelete} style={{ borderRadius: 8 }}>
                  批量删除
                </Button>
                <Button size="small" onClick={() => setSelectedUrls(new Set())} style={{ borderRadius: 8 }}>
                  取消选择
                </Button>
              </Space>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={fileInputRef} type="file" accept=".json,.txt" style={{ display: 'none' }} onChange={handleFileImport} />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ flex: 1, overflow: 'auto', minHeight: 0 }}
      >
        <Card style={{ borderRadius: 16, ...glassStyle(isDarkMode, glassMode) }} bodyStyle={{ padding: '0 0 24px 0' }}>
          {filteredSources.length > 0 ? (
            <List
              dataSource={filteredSources}
              renderItem={(source, index) => {
                const isActive = source.bookSourceUrl === activeSourceUrl;
                const testStatus = testingUrls[source.bookSourceUrl];
                const failReason = testFailReasons[source.bookSourceUrl];
                const isDefault = isDefaultSource(source.bookSourceUrl);
                const isSelected = selectedUrls.has(source.bookSourceUrl);
                const isHovered = hoveredUrl === source.bookSourceUrl;

                return (
                  <motion.div
                    key={source.bookSourceUrl}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.4), ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div style={{
                      padding: '12px 20px',
                      borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                      borderRight: 'none',
                      borderTop: index === 0 ? 'none' : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      borderBottom: 'none',
                      backgroundColor: isActive
                        ? (isDarkMode ? `${color}10` : `${color}08`)
                        : isSelected
                          ? (isDarkMode ? 'rgba(24,144,255,0.08)' : 'rgba(24,144,255,0.04)')
                          : isHovered
                            ? (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)')
                            : 'transparent',
                      transition: 'background-color 0.35s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.35s ease, transform 0.25s ease',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transform: isHovered && !isActive ? 'translateX(2px)' : 'translateX(0)',
                    }}
                      onClick={() => handleSetActive(source.bookSourceUrl)}
                      onMouseEnter={() => setHoveredUrl(source.bookSourceUrl)}
                      onMouseLeave={() => setHoveredUrl(null)}
                    >
                      {isDefault ? (
                        <div style={{ width: 16, height: 16, flexShrink: 0 }} />
                      ) : (
                        <Checkbox checked={isSelected} onChange={() => toggleSelect(source.bookSourceUrl)} onClick={(e) => e.stopPropagation()} />
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: 14 }}>{source.bookSourceName}</Text>
                          {isActive && <Tag color={color} style={{ fontSize: 11, lineHeight: '18px', borderRadius: 4, margin: 0 }}>搜索默认</Tag>}
                          {source.bookSourceType === 0 && <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, borderColor: '#1890ff', color: '#1890ff', margin: 0 }}>API</Tag>}
                          {source.bookSourceType === 1 && <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, borderColor: '#52c41a', color: '#52c41a', margin: 0 }}>网页</Tag>}
                          {source.bookSourceType === 2 && <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, borderColor: '#faad14', color: '#faad14', margin: 0 }}>漫画</Tag>}
                          {source.bookSourceType === 3 && <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, borderColor: '#722ed1', color: '#722ed1', margin: 0 }}>音频</Tag>}
                          {isDefault && <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, borderColor: color, color: color, margin: 0 }}>默认</Tag>}
                          {(() => {
                            const loginInfo = sourceLoginInfo[source.bookSourceUrl];
                            if (!loginInfo || !loginInfo.hasLogin) return null;
                            const loginStatus = loginStatuses[source.bookSourceUrl];
                            const isLoggedIn = loginStatus?.loggedIn === true;
                            if (isLoggedIn) {
                              return <Tag icon={<SafetyOutlined />} color="success" style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, margin: 0 }}>已登录</Tag>;
                            }
                            if (loginInfo.loginRequired) {
                              return <Tag icon={<LoginOutlined />} color="error" style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, margin: 0 }}>需登录</Tag>;
                            }
                            return <Tag icon={<LoginOutlined />} color="warning" style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, margin: 0 }}>可登录</Tag>;
                          })()}
                          {(() => {
                            const loginInfo = sourceLoginInfo[source.bookSourceUrl];
                            if (!loginInfo || !loginInfo.isAggregate) return null;
                            return <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, borderColor: '#eb2f96', color: '#eb2f96', margin: 0 }}>聚合</Tag>;
                          })()}
                        </div>
                        <div style={{ marginTop: 2 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>{source.bookSourceUrl}</Text>
                          {source.bookSourceGroup && <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{source.bookSourceGroup}</Text>}
                        </div>
                        <AnimatePresence>
                          {failReason && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <div style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '2px 8px', borderRadius: 4, fontSize: 11,
                                background: isDarkMode ? 'rgba(255,77,79,0.15)' : 'rgba(255,77,79,0.08)',
                                color: '#ff4d4f',
                              }}>
                                <WarningOutlined style={{ fontSize: 10 }} />
                                {failReason}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <Space size={6} onClick={e => e.stopPropagation()}>
                        <Tooltip title={testStatus === 'loading' ? '测活中...' : testStatus === 'success' ? '测活通过' : testStatus === 'fail' ? '测活失败' : '点击测活 / Shift+点击全链路测活'}>
                          <Button type="text" size="middle" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} icon={
                            testStatus === 'loading' ? <LoadingOutlined spin style={{ fontSize: 16 }} /> :
                            testStatus === 'success' ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} /> :
                            testStatus === 'fail' ? <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} /> :
                            <CloudOutlined style={{ fontSize: 16 }} />
                          } onClick={(e) => handleTest(source.bookSourceUrl, e.shiftKey)} />
                        </Tooltip>
                        {(() => {
                          const loginInfo = sourceLoginInfo[source.bookSourceUrl];
                          if (!loginInfo || !loginInfo.hasLogin) return null;
                          const loginStatus = loginStatuses[source.bookSourceUrl];
                          const isLoggedIn = loginStatus?.loggedIn === true;
                          if (isLoggedIn) {
                            return (
                              <Tooltip title="已登录，点击退出登录">
                                <Button type="text" size="middle" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} icon={<LogoutOutlined style={{ color: '#52c41a', fontSize: 16 }} />} onClick={() => {
                                  clearSourceLoginStatus(source.bookSourceUrl);
                                  setLoginStatuses(prev => ({ ...prev, [source.bookSourceUrl]: {} }));
                                  message.info('已退出书源登录');
                                }} />
                              </Tooltip>
                            );
                          }
                          return (
                            <Tooltip title={loginInfo.loginRequired ? '需要登录才能使用' : '点击登录'}>
                              <Button type="text" size="middle" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} icon={<LoginOutlined style={{ color: loginInfo.loginRequired ? '#ff4d4f' : '#faad14', fontSize: 16 }} />} onClick={() => {
                                setLoginSource(source);
                                setLoginModalOpen(true);
                              }} />
                            </Tooltip>
                          );
                        })()}
                        {!isDefault && (
                          <>
                            <Tooltip title="编辑书源">
                              <Button type="text" size="middle" style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} icon={<EditOutlined style={{ fontSize: 15 }} />} onClick={() => { setEditingSource({ ...source }); setEditModalOpen(true); }} />
                            </Tooltip>
                            <Tooltip title="删除书源">
                              <Button type="text" size="middle" danger style={{ width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }} icon={<DeleteOutlined style={{ fontSize: 15 }} />} onClick={() => handleDelete(source.bookSourceUrl)} />
                            </Tooltip>
                          </>
                        )}
                        <Tooltip title={source.enabled ? '已启用 - 搜索时可使用此书源' : '已禁用 - 搜索时将跳过此书源'} placement="left">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Switch size="small" checked={source.enabled} onChange={(checked) => handleToggle(source.bookSourceUrl, checked)} />
                            <Text style={{ fontSize: 10, color: source.enabled ? '#52c41a' : (isDarkMode ? '#555' : '#bbb'), whiteSpace: 'nowrap' }}>
                              {source.enabled ? '启用' : '禁用'}
                            </Text>
                          </div>
                        </Tooltip>
                      </Space>
                    </div>
                  </motion.div>
                );
              }}
            />
          ) : (
            <Empty style={{ padding: 40 }} description={<Text type="secondary">暂无书源</Text>}>
              <Button type="primary" icon={<ImportOutlined />} style={{ backgroundColor: color, borderColor: color, borderRadius: 8 }} onClick={() => setImportModalOpen(true)}>导入书源</Button>
            </Empty>
          )}
        </Card>
      </motion.div>

      <Modal
        title="导入书源"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); setImportText(''); }}
        footer={null}
        width={560}
        styles={{ content: glassStyle(isDarkMode, glassMode, { borderRadius: 16 }) }}
      >
        <Tabs items={[
          {
            key: 'paste', label: <span><FileOutlined /> 粘贴导入</span>,
            children: (
              <div>
                <TextArea rows={8} placeholder="粘贴书源 JSON 内容（支持单条或数组格式）" value={importText} onChange={e => setImportText(e.target.value)} style={{ marginBottom: 12, borderRadius: 8 }} />
                <Button type="primary" loading={importLoading} onClick={handleImport} style={{ backgroundColor: color, borderColor: color, borderRadius: 8 }}>确认导入</Button>
              </div>
            )
          },
          {
            key: 'url', label: <span><LinkOutlined /> URL导入</span>,
            children: (
              <div>
                <Input placeholder="输入书源 JSON 文件的 URL 地址" value={importText} onChange={e => setImportText(e.target.value)} style={{ marginBottom: 12, borderRadius: 8 }} />
                <Button type="primary" loading={importLoading} onClick={handleImportFromUrl} style={{ backgroundColor: color, borderColor: color, borderRadius: 8 }}>从URL导入</Button>
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                  支持源仓库格式：https://www.yck2026.top/yuedu/shuyuan/json/id/xxxx.json
                </Text>
              </div>
            )
          },
          {
            key: 'file', label: <span><CloudOutlined /> 文件导入</span>,
            children: (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <Button icon={<CloudOutlined />} size="large" onClick={() => fileInputRef.current?.click()} style={{ borderRadius: 8 }}>选择本地 JSON 文件</Button>
                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>支持 .json 和 .txt 格式</Text>
              </div>
            )
          }
        ]} />
      </Modal>

      <Modal
        title={editingSource?.bookSourceUrl ? '编辑书源' : '新建书源'}
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingSource(null); }}
        onOk={handleSaveEdit}
        okText="保存"
        width={640}
        okButtonProps={{ style: { backgroundColor: color, borderColor: color, borderRadius: 8 } }}
        styles={{ content: glassStyle(isDarkMode, glassMode, { borderRadius: 16 }) }}
      >
        {editingSource && (
          <div style={{ maxHeight: '60vh', overflow: 'auto', paddingRight: 8 }}>
            <Tabs items={[
              {
                key: 'basic', label: '基本信息',
                children: (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>书源名称 *</Text><Input value={editingSource.bookSourceName} onChange={e => setEditingSource({ ...editingSource, bookSourceName: e.target.value })} placeholder="如：猫眼看书" style={{ borderRadius: 8 }} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>书源地址 *</Text><Input value={editingSource.bookSourceUrl} onChange={e => setEditingSource({ ...editingSource, bookSourceUrl: e.target.value })} placeholder="如：http://api.jmlldsc.com" style={{ borderRadius: 8 }} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>书源类型</Text>
                      <Select value={editingSource.bookSourceType || 0} onChange={val => setEditingSource({ ...editingSource, bookSourceType: val })} style={{ width: '100%' }} options={[
                        { value: 0, label: 'API（JSON接口）' }, { value: 1, label: '网页（HTML解析）' }, { value: 2, label: '漫画' }, { value: 3, label: '音频' }
                      ]} />
                    </div>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>书源分组</Text><Input value={editingSource.bookSourceGroup || ''} onChange={e => setEditingSource({ ...editingSource, bookSourceGroup: e.target.value })} placeholder="如：小说,热门" style={{ borderRadius: 8 }} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>请求头</Text><TextArea rows={3} value={editingSource.header || ''} onChange={e => setEditingSource({ ...editingSource, header: e.target.value })} placeholder="JSON格式的请求头" style={{ borderRadius: 8 }} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>搜索地址</Text><Input value={editingSource.searchUrl || ''} onChange={e => setEditingSource({ ...editingSource, searchUrl: e.target.value })} placeholder="/search?page={{page}}&keyword={{key}}" style={{ borderRadius: 8 }} /></div>
                    <div><Text strong style={{ display: 'block', marginBottom: 4 }}>发现页地址</Text><TextArea rows={3} value={editingSource.exploreUrl || ''} onChange={e => setEditingSource({ ...editingSource, exploreUrl: e.target.value })} placeholder="男生频道::/boy.html&#10;女生频道::/girl.html" style={{ borderRadius: 8 }} /></div>
                    {editingSource.loginUrl != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>登录地址 (loginUrl)</Text><TextArea rows={4} value={editingSource.loginUrl || ''} onChange={e => setEditingSource({ ...editingSource, loginUrl: e.target.value })} placeholder="登录脚本或URL" style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} /></div>
                    )}
                    {editingSource.loginUi != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>登录UI (loginUi)</Text><TextArea rows={4} value={editingSource.loginUi || ''} onChange={e => setEditingSource({ ...editingSource, loginUi: e.target.value })} placeholder="JSON格式的登录界面配置" style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} /></div>
                    )}
                    {editingSource.loginCheckJs != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>登录检查JS (loginCheckJs)</Text><Input value={editingSource.loginCheckJs || ''} onChange={e => setEditingSource({ ...editingSource, loginCheckJs: e.target.value })} placeholder="检查是否已登录的JS脚本" style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} /></div>
                    )}
                    {editingSource.jsLib != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>JS函数库 (jsLib)</Text><TextArea rows={6} value={editingSource.jsLib || ''} onChange={e => setEditingSource({ ...editingSource, jsLib: e.target.value })} placeholder="书源公共JS函数库" style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} /></div>
                    )}
                    {editingSource.bookUrlPattern != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>书籍URL正则 (bookUrlPattern)</Text><Input value={editingSource.bookUrlPattern || ''} onChange={e => setEditingSource({ ...editingSource, bookUrlPattern: e.target.value })} placeholder="匹配书籍详情页URL的正则" style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} /></div>
                    )}
                    {editingSource.concurrentRate != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>并发率 (concurrentRate)</Text><Input value={editingSource.concurrentRate || ''} onChange={e => setEditingSource({ ...editingSource, concurrentRate: e.target.value })} placeholder="如：2000（毫秒）" style={{ borderRadius: 8 }} /></div>
                    )}
                    {editingSource.variableComment != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>变量说明 (variableComment)</Text><Input value={editingSource.variableComment || ''} onChange={e => setEditingSource({ ...editingSource, variableComment: e.target.value })} placeholder="书源变量说明" style={{ borderRadius: 8 }} /></div>
                    )}
                    {editingSource.coverDecodeJs != null && (
                      <div><Text strong style={{ display: 'block', marginBottom: 4 }}>封面解密JS (coverDecodeJs)</Text><Input value={editingSource.coverDecodeJs || ''} onChange={e => setEditingSource({ ...editingSource, coverDecodeJs: e.target.value })} placeholder="封面解密脚本" style={{ borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }} /></div>
                    )}
                  </Space>
                )
              },
              ...['search', 'bookInfo', 'toc', 'content', 'explore'].map(key => {
                const ruleKey = `rule${key.charAt(0).toUpperCase() + key.slice(1)}`;
                const labels = { search: '搜索规则', bookInfo: '详情规则', toc: '目录规则', content: '正文规则', explore: '发现规则' };
                return {
                  key, label: labels[key],
                  children: (
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      {Object.entries(editingSource[ruleKey] || {}).map(([k, val]) => (
                        <div key={k}>
                          <Text style={{ fontSize: 12, color: isDarkMode ? '#888' : '#888' }}>{k}</Text>
                          <Input size="small" value={val || ''} onChange={e => setEditingSource({ ...editingSource, [ruleKey]: { ...editingSource[ruleKey], [k]: e.target.value } })} style={{ borderRadius: 6 }} />
                        </div>
                      ))}
                    </Space>
                  )
                };
              }),
              {
                key: 'exploreBrowse', label: <span><CompassOutlined /> 发现页</span>,
                children: (
                  <div>
                    {(() => {
                      const categories = parseExploreUrlLocal(editingSource.exploreUrl);
                      if (categories.length === 0) {
                        return <Empty description="未配置发现页地址，请在基本信息中填写 exploreUrl" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
                      }
                      return (
                        <div>
                          <div style={{ marginBottom: 12 }}>
                            <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>分类</Text>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                              {categories.map((cat, idx) => (
                                <Tag
                                  key={idx}
                                  color={activeExploreUrl === cat.url ? color : (isDarkMode ? '#333' : '')}
                                  style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 10px' }}
                                  onClick={() => handleExploreCategory(cat.url)}
                                >
                                  {cat.title}
                                </Tag>
                              ))}
                            </div>
                          </div>
                          {exploreLoading && (
                            <div style={{ textAlign: 'center', padding: 24 }}>
                              <LoadingOutlined spin style={{ fontSize: 24, color }} />
                              <div style={{ marginTop: 8 }}><Text type="secondary">加载中...</Text></div>
                            </div>
                          )}
                          {!exploreLoading && exploreBooks.length > 0 && (
                            <List
                              dataSource={exploreBooks}
                              size="small"
                              renderItem={(book) => (
                                <List.Item style={{ padding: '8px 0' }}>
                                  <List.Item.Meta
                                    avatar={book.cover ? <img src={book.cover} alt="" style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 4 }} /> : undefined}
                                    title={<Text style={{ fontSize: 13 }}>{book.name}</Text>}
                                    description={<Text type="secondary" style={{ fontSize: 11 }}>{book.author}{book.lastChapter ? ` | ${book.lastChapter}` : ''}</Text>}
                                  />
                                </List.Item>
                              )}
                            />
                          )}
                          {!exploreLoading && exploreBooks.length === 0 && activeExploreUrl && (
                            <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )
              }
            ]} />
          </div>
        )}
      </Modal>

      <Modal
        title={
          <Space>
            <LoginOutlined style={{ color }} />
            <span>书源登录 - {loginSource?.bookSourceName}</span>
          </Space>
        }
        open={loginModalOpen}
        onCancel={() => { setLoginModalOpen(false); setLoginSource(null); }}
        footer={null}
        width={700}
        styles={{ content: glassStyle(isDarkMode, glassMode, { borderRadius: 16 }) }}
      >
        {loginSource && (() => {
          const loginInfo = sourceLoginInfo[loginSource.bookSourceUrl] || {};
          const loginUrl = loginInfo.loginUrl || loginSource.bookSourceUrl;

          return (
            <div>
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                background: isDarkMode ? 'rgba(24,144,255,0.1)' : 'rgba(24,144,255,0.06)',
                border: `1px solid ${isDarkMode ? 'rgba(24,144,255,0.2)' : 'rgba(24,144,255,0.15)'}`,
              }}>
                <Space direction="vertical" size={4}>
                  <Text style={{ fontSize: 13 }}>
                    <SafetyOutlined style={{ marginRight: 6, color }} />
                    {loginInfo.loginType === 'url' ? '该书源需要通过网页登录验证' : '该书源包含登录脚本，请在下方页面中完成登录'}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    登录地址：{loginUrl}
                  </Text>
                </Space>
              </div>

              <div style={{
                borderRadius: 8, overflow: 'hidden', border: `1px solid ${isDarkMode ? '#333' : '#e8e8e8'}`,
                height: 420, position: 'relative',
              }}>
                <iframe
                  src={loginUrl}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                  title={`登录 - ${loginSource.bookSourceName}`}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
                  allow="cookies"
                />
              </div>

              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  登录成功后，请点击"确认登录"按钮
                </Text>
                <Space>
                  <Button onClick={() => { setLoginModalOpen(false); setLoginSource(null); }} style={{ borderRadius: 8 }}>
                    取消
                  </Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    style={{ backgroundColor: color, borderColor: color, borderRadius: 8 }}
                    onClick={() => {
                      setSourceLoginStatus(loginSource.bookSourceUrl, { loggedIn: true, loginTime: new Date().toISOString() });
                      setLoginStatuses(prev => ({ ...prev, [loginSource.bookSourceUrl]: { loggedIn: true, loginTime: new Date().toISOString() } }));
                      message.success(`${loginSource.bookSourceName} 登录成功`);
                      setLoginModalOpen(false);
                      setLoginSource(null);
                    }}
                  >
                    确认登录
                  </Button>
                </Space>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        title={
          <Space>
            <ThunderboltOutlined style={{ color }} />
            <span>全链路测活 - {fullTestResult?.sourceName}</span>
          </Space>
        }
        open={fullTestModalOpen}
        onCancel={() => { setFullTestModalOpen(false); setFullTestResult(null); }}
        footer={
          <Button onClick={() => { setFullTestModalOpen(false); setFullTestResult(null); }} style={{ borderRadius: 8 }}>
            关闭
          </Button>
        }
        width={560}
        styles={{ content: glassStyle(isDarkMode, glassMode, { borderRadius: 16 }) }}
      >
        {fullTestResult && fullTestResult.stages && (() => {
          const { stages, overallSuccess, failedStage } = fullTestResult;
          const stageList = [
            { key: 'search', title: '搜索', stage: stages.search },
            { key: 'bookInfo', title: '详情', stage: stages.bookInfo },
            { key: 'toc', title: '目录', stage: stages.toc },
            { key: 'content', title: '内容', stage: stages.content },
          ];

          const currentStep = failedStage
            ? stageList.findIndex(s => s.key === failedStage)
            : 4;

          return (
            <div>
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: overallSuccess
                  ? (isDarkMode ? 'rgba(82,196,26,0.12)' : 'rgba(82,196,26,0.06)')
                  : (isDarkMode ? 'rgba(255,77,79,0.12)' : 'rgba(255,77,79,0.06)'),
                border: `1px solid ${overallSuccess
                  ? (isDarkMode ? 'rgba(82,196,26,0.25)' : 'rgba(82,196,26,0.15)')
                  : (isDarkMode ? 'rgba(255,77,79,0.25)' : 'rgba(255,77,79,0.15)')}`,
              }}>
                <Text style={{ fontSize: 14, fontWeight: 600, color: overallSuccess ? '#52c41a' : '#ff4d4f' }}>
                  {overallSuccess ? '全链路测试通过' : `测试失败，失败阶段：${failedStage}`}
                </Text>
              </div>

              <Steps
                current={currentStep}
                status={failedStage ? 'error' : 'finish'}
                size="small"
                items={stageList.map(s => ({
                  title: s.title,
                  status: s.stage?.success ? 'finish' : (s.key === failedStage ? 'error' : 'wait'),
                  icon: s.stage?.success
                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    : (s.key === failedStage || (!s.stage?.success && s.stage?.error))
                      ? <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      : undefined,
                }))}
                style={{ marginBottom: 20 }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stageList.map(({ key, title, stage }) => (
                  <div key={key} style={{
                    padding: '10px 14px', borderRadius: 8,
                    background: stage?.success
                      ? (isDarkMode ? 'rgba(82,196,26,0.08)' : 'rgba(82,196,26,0.04)')
                      : (isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                    border: `1px solid ${stage?.success
                      ? (isDarkMode ? 'rgba(82,196,26,0.15)' : 'rgba(82,196,26,0.1)')
                      : (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: stage?.success || stage?.error ? 6 : 0 }}>
                      {stage?.success
                        ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                        : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 14 }} />}
                      <Text strong style={{ fontSize: 13 }}>{title}</Text>
                      <Tag color={stage?.success ? 'success' : 'error'} style={{ fontSize: 10, lineHeight: '16px', margin: 0 }}>
                        {stage?.success ? '通过' : '失败'}
                      </Tag>
                    </div>
                    {stage?.success && key === 'search' && (
                      <div style={{ paddingLeft: 22 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>结果数量: {stage.resultCount}</Text>
                        {stage.sampleBook && (
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              示例: {stage.sampleBook.name} - {stage.sampleBook.author}
                            </Text>
                          </div>
                        )}
                      </div>
                    )}
                    {stage?.success && key === 'bookInfo' && (
                      <div style={{ paddingLeft: 22 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          提取字段: {Object.entries(stage.fields || {}).filter(([, v]) => v).map(([k]) => k).join(', ') || '无'}
                        </Text>
                      </div>
                    )}
                    {stage?.success && key === 'toc' && (
                      <div style={{ paddingLeft: 22 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>章节数量: {stage.chapterCount}</Text>
                      </div>
                    )}
                    {stage?.success && key === 'content' && (
                      <div style={{ paddingLeft: 22 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>内容长度: {stage.contentLength} 字符</Text>
                        {stage.sampleContent && (
                          <div style={{ marginTop: 4, padding: '4px 8px', borderRadius: 4, background: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', fontSize: 11, color: isDarkMode ? '#999' : '#666', lineHeight: 1.5 }}>
                            {stage.sampleContent}...
                          </div>
                        )}
                      </div>
                    )}
                    {stage?.error && (
                      <div style={{ paddingLeft: 22 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 4, fontSize: 11, background: isDarkMode ? 'rgba(255,77,79,0.15)' : 'rgba(255,77,79,0.08)', color: '#ff4d4f' }}>
                          <WarningOutlined style={{ fontSize: 10 }} />
                          {stage.error}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default BookSourceManager;
