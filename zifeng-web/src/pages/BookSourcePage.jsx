import React, { useState, useEffect, useContext, useRef } from 'react';
import { Card, Typography, Space, Switch, Tag, List, Input, Empty, Badge, Tooltip, Spin, message, Button } from 'antd';
import {
  SearchOutlined,
  CloudOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  GlobalOutlined,
  SoundOutlined,
  ReadOutlined,
  CloudSyncOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { ThemeContext } from '../App';
import {
  getBookSources,
  toggleBookSource as toggleLocalSource,
  getActiveSource,
  setActiveSource,
} from '../utils/bookSourceManager';
import {
  getAllEnabledSources,
  toggleBookSource as toggleBackendSource,
  importBookSources
} from '../utils/apiClient';
import { staggerFadeIn, fadeInUp } from '../utils/animations';

const { Title, Text } = Typography;

const sourceTypeConfig = {
  0: { label: 'API', color: '#1890ff', icon: <ApiOutlined /> },
  1: { label: '网页', color: '#52c41a', icon: <GlobalOutlined /> },
  2: { label: '漫画', color: '#faad14', icon: <ReadOutlined /> },
  3: { label: '音频', color: '#722ed1', icon: <SoundOutlined /> },
};

const BookSourcePage = () => {
  const { themeConfigs, currentTheme, isDarkMode, glassMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].primaryColor;

  const [sources, setSources] = useState([]);
  const [activeSourceUrl, setActiveSourceUrl] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const isLoggedIn = !!localStorage.getItem('zifeng_token');

  const statsRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (!loading && statsRef.current) {
      staggerFadeIn(statsRef.current.children);
    }
  }, [loading, sources]);

  useEffect(() => {
    if (!loading && listRef.current) {
      fadeInUp(listRef.current);
    }
  }, [loading]);

  const resolveActiveUrl = (sources) => {
    let activeUrl = '';
    try {
      activeUrl = localStorage.getItem('zifeng_active_source') || '';
    } catch {}

    const normalizeUrl = (url) => (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();

    if (activeUrl) {
      const exact = sources.find(s => s.bookSourceUrl === activeUrl);
      if (exact) return exact.bookSourceUrl;
      const norm = normalizeUrl(activeUrl);
      const fuzzy = sources.find(s => normalizeUrl(s.bookSourceUrl) === norm);
      if (fuzzy) return fuzzy.bookSourceUrl;
    }

    const localActive = getActiveSource();
    if (localActive && localActive.bookSourceUrl) {
      const exact = sources.find(s => s.bookSourceUrl === localActive.bookSourceUrl);
      if (exact) return exact.bookSourceUrl;
      const norm = normalizeUrl(localActive.bookSourceUrl);
      const fuzzy = sources.find(s => normalizeUrl(s.bookSourceUrl) === norm);
      if (fuzzy) return fuzzy.bookSourceUrl;
      const byName = sources.find(s => s.bookSourceName === localActive.bookSourceName);
      if (byName) return byName.bookSourceUrl;
    }

    if (sources.length > 0) return sources[0].bookSourceUrl;
    return '';
  };

  const loadSources = async () => {
    setLoading(true);
    try {
      let sources = [];

      try {
        const res = await getAllEnabledSources();
        const backendSources = res.data?.data;
        if (backendSources && backendSources.length > 0) {
          const parsed = backendSources.map(s => {
            const p = { ...s };
            ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore'].forEach(key => {
              if (typeof p[key] === 'string' && p[key]) {
                try { p[key] = JSON.parse(p[key]); } catch {}
              }
            });
            return p;
          });
          sources = parsed;
          syncToLocal(parsed);
        } else {
          sources = getBookSources();
          if (sources.length > 0) {
            syncToBackend(sources);
          }
        }
      } catch {
        sources = getBookSources();
      }

      setSources(sources);
      const activeUrl = resolveActiveUrl(sources);
      setActiveSourceUrl(activeUrl);
    } finally {
      setLoading(false);
    }
  };

  const syncToLocal = (backendSources) => {
    try {
      const { saveBookSources } = require('../utils/bookSourceManager');
      saveBookSources(backendSources);
    } catch {}
  };

  const syncToBackend = async (localSources) => {
    try {
      const cleanSources = localSources.map(s => {
        const copy = { ...s };
        delete copy.id;
        delete copy.userId;
        delete copy.createdAt;
        delete copy.updatedAt;
        return copy;
      });
      await importBookSources(cleanSources);
    } catch {}
  };

  const handleSyncFromBackend = async () => {
    setSyncLoading(true);
    try {
      const res = await getAllEnabledSources();
      const backendSources = res.data?.data;
      if (backendSources && backendSources.length > 0) {
        const parsed = backendSources.map(s => {
          const p = { ...s };
          ['ruleSearch', 'ruleBookInfo', 'ruleToc', 'ruleContent', 'ruleExplore'].forEach(key => {
            if (typeof p[key] === 'string' && p[key]) {
              try { p[key] = JSON.parse(p[key]); } catch {}
            }
          });
          return p;
        });
        setSources(parsed);
        syncToLocal(parsed);
        const activeUrl = resolveActiveUrl(parsed);
        setActiveSourceUrl(activeUrl);
        message.success(`已从服务器同步 ${parsed.length} 个书源`);
      } else {
        message.info('服务器暂无书源数据');
      }
    } catch {
      message.error('同步失败，请检查网络连接');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSetActive = (url) => {
    if (url === activeSourceUrl) return;
    setActiveSource(url);
    setActiveSourceUrl(url);
    message.success('已设为搜索默认书源');
  };

  const handleToggle = async (url, enabled) => {
    setSources(prev => prev.map(s =>
      s.bookSourceUrl === url ? { ...s, enabled } : s
    ));

    const updated = toggleLocalSource(url, enabled);

    try {
      await toggleBackendSource(url, enabled);
    } catch {
      setSources(updated);
    }

    message.info(enabled ? '已启用该书源，搜索时可使用' : '已禁用该书源，搜索时将跳过');
  };

  const filteredSources = sources.filter(s => {
    if (!searchText) return true;
    const q = searchText.toLowerCase();
    return (
      (s.bookSourceName || '').toLowerCase().includes(q) ||
      (s.bookSourceUrl || '').toLowerCase().includes(q) ||
      (s.bookSourceGroup || '').toLowerCase().includes(q)
    );
  });

  const enabledCount = sources.filter(s => s.enabled).length;

  const glassStyle = (extra = {}) => ({
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="加载书源中..." />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0', maxWidth: 900, margin: '0 auto' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8, color }} />
            现有书源
          </Title>
          <Badge count={enabledCount} style={{ backgroundColor: color }} />
        </div>
        <Input
          placeholder="搜索书源..."
          prefix={<SearchOutlined style={{ color: isDarkMode ? '#666' : '#bbb' }} />}
          size="middle"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 200, borderRadius: 8 }}
          allowClear
        />
      </div>

      {isLoggedIn && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            color: '#fff',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Title level={5} style={{ color: '#fff', margin: 0 }}>云端书源同步</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>从服务器同步最新书源数据</Text>
              </div>
              <Button
                type="primary"
                icon={<CloudSyncOutlined />}
                loading={syncLoading}
                onClick={handleSyncFromBackend}
                style={{
                  borderRadius: 10,
                  height: 40,
                  background: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                刷新书源
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      <div ref={statsRef} style={{
        display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap'
      }}>
        <Card size="small" style={{ borderRadius: 12, flex: 1, minWidth: 100, ...glassStyle() }} bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>总书源</Text>
          <div style={{ fontSize: 24, fontWeight: 'bold', color }}>{sources.length}</div>
        </Card>
        <Card size="small" style={{ borderRadius: 12, flex: 1, minWidth: 100, ...glassStyle() }} bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>已启用</Text>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{enabledCount}</div>
        </Card>
        <Card size="small" style={{ borderRadius: 12, flex: 1, minWidth: 100, ...glassStyle() }} bodyStyle={{ padding: '12px 16px', textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>已禁用</Text>
          <div style={{ fontSize: 24, fontWeight: 'bold', color: isDarkMode ? '#666' : '#bbb' }}>{sources.length - enabledCount}</div>
        </Card>
      </div>

      <Card ref={listRef} style={{ borderRadius: 16, ...glassStyle() }} bodyStyle={{ padding: 0 }}>
        {filteredSources.length > 0 ? (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}>
            <List
              dataSource={filteredSources}
              renderItem={(source, index) => {
                const isActive = source.bookSourceUrl === activeSourceUrl;
                const typeConf = sourceTypeConfig[source.bookSourceType] || sourceTypeConfig[0];

                return (
                  <div
                    key={source.bookSourceUrl || index}
                    style={{
                      padding: '14px 20px',
                      borderLeft: isActive ? `3px solid ${color}` : '3px solid transparent',
                      borderTop: index === 0 ? 'none' : `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      backgroundColor: isActive
                        ? (isDarkMode ? `${color}10` : `${color}08`)
                        : 'transparent',
                      transition: 'background-color 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleSetActive(source.bookSourceUrl)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: 14 }}>{source.bookSourceName}</Text>
                          {isActive && (
                            <Tag color={color} style={{ fontSize: 11, lineHeight: '18px', borderRadius: 4, margin: 0 }}>
                              搜索默认
                            </Tag>
                          )}
                          <Tag
                            icon={typeConf.icon}
                            style={{
                              fontSize: 10, lineHeight: '16px', borderRadius: 4, margin: 0,
                              borderColor: typeConf.color, color: typeConf.color
                            }}
                          >
                            {typeConf.label}
                          </Tag>
                          {source.bookSourceGroup && (
                            <Tag style={{ fontSize: 10, lineHeight: '16px', borderRadius: 4, margin: 0 }}>
                              {source.bookSourceGroup}
                            </Tag>
                          )}
                        </div>
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary" style={{ fontSize: 12, wordBreak: 'break-all' }}>{source.bookSourceUrl}</Text>
                        </div>
                      </div>

                      <Space size={8} onClick={e => e.stopPropagation()}>
                        <Tooltip title={source.enabled ? '已启用 - 搜索时可使用此书源' : '已禁用 - 搜索时将跳过此书源'}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Switch
                              size="small"
                              checked={source.enabled}
                              onChange={(checked) => handleToggle(source.bookSourceUrl, checked)}
                            />
                            <Text style={{
                              fontSize: 11,
                              color: source.enabled ? '#52c41a' : (isDarkMode ? '#555' : '#bbb'),
                              whiteSpace: 'nowrap'
                            }}>
                              {source.enabled ? '启用' : '禁用'}
                            </Text>
                          </div>
                        </Tooltip>
                      </Space>
                    </div>
                  </div>
                );
              }}
            />
            <div style={{ height: 24 }} />
          </div>
        ) : (
          <Empty
            style={{ padding: 40 }}
            description={<Text type="secondary">暂无书源</Text>}
          >
            <Text type="secondary">请在管理后台导入书源</Text>
          </Empty>
        )}
      </Card>
    </div>
  );
};

export default BookSourcePage;
