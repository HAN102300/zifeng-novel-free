import React, { useState, useEffect, useRef, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, theme, Layout, Menu, Button, Switch, Space, Dropdown, message } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  BookOutlined,
  DatabaseOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MoonOutlined,
  SunOutlined,
  LogoutOutlined,
  LineChartOutlined,
  FileSearchOutlined,
  HistoryOutlined,
  BookOutlined as BookshelfIcon,
  ImportOutlined,
  BarChartOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import anime from 'animejs/lib/anime.es.js';
import Login from './pages/Login';
import DashboardOverview from './pages/dashboard/Overview';
import DashboardLogs from './pages/dashboard/Logs';
import UserManagement from './pages/UserManagement';
import AdminManagement from './pages/AdminManagement';
import ReadingBookshelf from './pages/reading/Bookshelf';
import ReadingHistory from './pages/reading/History';
import BookSourceList from './pages/booksource/SourceList';
import BookSourceImport from './pages/booksource/SourceImport';
import BookSourceStats from './pages/booksource/SourceStats';

const { Header, Sider, Content } = Layout;

const ThemeContext = createContext();

const themeConfigs = {
  default: { primaryColor: '#1890ff', name: '经典蓝' },
  green: { primaryColor: '#52c41a', name: '清新绿' },
  purple: { primaryColor: '#722ed1', name: '优雅紫' },
};

const menuItems = [
  {
    key: 'dashboard-group',
    icon: <DashboardOutlined />,
    label: '仪表盘',
    children: [
      { key: '/dashboard/overview', icon: <LineChartOutlined />, label: '数据概览' },
      { key: '/dashboard/logs', icon: <FileSearchOutlined />, label: '访问日志' },
    ],
  },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  {
    key: 'reading-group',
    icon: <BookOutlined />,
    label: '阅读管理',
    children: [
      { key: '/reading/bookshelf', icon: <BookshelfIcon />, label: '书架记录' },
      { key: '/reading/history', icon: <HistoryOutlined />, label: '阅读历史' },
    ],
  },
  {
    key: 'booksource-group',
    icon: <DatabaseOutlined />,
    label: '书源管理',
    children: [
      { key: '/booksource/stats', icon: <BarChartOutlined />, label: '书源统计' },
      { key: '/booksource/list', icon: <UnorderedListOutlined />, label: '书源列表' },
      { key: '/booksource/import', icon: <ImportOutlined />, label: '书源导入' },
    ],
  },
  { key: '/admins', icon: <TeamOutlined />, label: '管理员管理' },
];

const AdminLayout = ({ isDarkMode, setIsDarkMode, currentTheme, setCurrentTheme, collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef(null);
  const [fadeState, setFadeState] = useState('in');

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return ['dashboard-group'];
    if (path.startsWith('/reading')) return ['reading-group'];
    if (path.startsWith('/booksource')) return ['booksource-group'];
    return [];
  };

  const [openKeys, setOpenKeys] = useState(getOpenKeys);

  useEffect(() => {
    setOpenKeys(getOpenKeys());
  }, [location.pathname]);

  useEffect(() => {
    if (contentRef.current) {
      anime({
        targets: contentRef.current,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 350,
        easing: 'easeOutCubic',
      });
    }
  }, [location.pathname]);

  const adminInfo = (() => {
    try {
      return JSON.parse(localStorage.getItem('zifeng_admin_info') || '{}');
    } catch {
      return {};
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem('zifeng_admin_token');
    localStorage.removeItem('zifeng_admin_info');
    window.dispatchEvent(new Event('auth-change'));
    message.success('已退出登录');
  };

  const currentThemeConfig = themeConfigs[currentTheme];

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
    },
  ];

  const handleUserMenu = ({ key }) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh', overflow: 'hidden' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        collapsedWidth={72}
        theme="dark"
        className="admin-sider"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          background: isDarkMode
            ? 'linear-gradient(180deg, #0a0a14 0%, #0d0d1a 100%)'
            : 'linear-gradient(180deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)',
          boxShadow: isDarkMode
            ? '2px 0 16px rgba(0,0,0,0.6)'
            : '4px 0 16px rgba(15, 52, 96, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1)',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          padding: '0 16px',
        }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 18,
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          }}>
            枫
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              style={{
                marginLeft: 12,
                fontSize: 16,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              紫枫管理后台
            </motion.span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={collapsed ? [] : openKeys}
          onOpenChange={(keys) => setOpenKeys(keys)}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', marginTop: 8, background: 'transparent' }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s ease' }}>
        <Header className="admin-header" style={{
          padding: '0 24px',
          background: isDarkMode
            ? 'linear-gradient(90deg, #0d0d1a 0%, #141414 100%)'
            : 'linear-gradient(90deg, #f0f2ff 0%, #ffffff 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 99,
          boxShadow: isDarkMode
            ? '0 2px 12px rgba(0,0,0,0.4)'
            : '0 2px 12px rgba(102, 126, 234, 0.08)',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 16,
                width: 40,
                height: 40,
                borderRadius: 8,
              }}
            />
            <span style={{
              fontSize: 16,
              fontWeight: 600,
              color: isDarkMode ? '#f0f0f0' : '#1a1a2e',
            }}>
              紫枫小说管理后台
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Space size={8}>
              {isDarkMode
                ? <SunOutlined style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }} />
                : <MoonOutlined style={{ color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }} />
              }
              <Switch
                checked={isDarkMode}
                onChange={setIsDarkMode}
                size="small"
              />
            </Space>
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                padding: '4px 12px',
                borderRadius: 8,
                transition: 'background 0.2s',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 'bold',
                }}>
                  {adminInfo.username?.charAt(0)?.toUpperCase() || 'A'}
                </div>
                <span style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: isDarkMode ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)',
                }}>
                  {adminInfo.username || '管理员'}
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="admin-content" style={{
          margin: 0,
          padding: '24px',
          height: 'calc(100vh - 64px)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: isDarkMode ? '#141414' : '#f5f6fa',
        }}>
          <div
            ref={contentRef}
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <Routes>
              <Route path="/dashboard/overview" element={<DashboardOverview />} />
              <Route path="/dashboard/logs" element={<DashboardLogs />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/reading/bookshelf" element={<ReadingBookshelf />} />
              <Route path="/reading/history" element={<ReadingHistory />} />
              <Route path="/booksource/list" element={<BookSourceList />} />
              <Route path="/booksource/import" element={<BookSourceImport />} />
              <Route path="/booksource/stats" element={<BookSourceStats />} />
              <Route path="/admins" element={<AdminManagement />} />
              <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

function App() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('zifeng_admin_theme') || 'default';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('zifeng_admin_dark') === 'true';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('zifeng_admin_token');
  });

  useEffect(() => {
    localStorage.setItem('zifeng_admin_theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    localStorage.setItem('zifeng_admin_dark', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(!!localStorage.getItem('zifeng_admin_token'));
    };
    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  const currentThemeConfig = themeConfigs[currentTheme];

  return (
    <Router>
      <ConfigProvider
        getPopupContainer={() => document.body}
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: currentThemeConfig.primaryColor,
            borderRadius: 8,
          },
          components: {
            Layout: {
              headerBg: 'transparent',
              siderBg: 'transparent',
            },
            Menu: {
              darkItemBg: 'transparent',
            },
            Table: {
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              headerBorderRadius: 0,
              cellPaddingBlock: 12,
            },
          },
        }}
        table={{
          bordered: true,
          size: 'middle',
        }}
        pagination={{
          pageSize: 15,
          showSizeChanger: true,
          pageSizeOptions: ['15', '30', '50'],
          showTotal: (total) => `共 ${total} 条记录`,
        }}
      >
        <ThemeContext.Provider value={{
          themeConfigs,
          currentTheme,
          setCurrentTheme,
          isDarkMode,
          setIsDarkMode,
          glassMode: false,
        }}>
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/dashboard/overview" replace /> : <Login />
            } />
            <Route path="/*" element={
              isAuthenticated ? (
                <AdminLayout
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
                  currentTheme={currentTheme}
                  setCurrentTheme={setCurrentTheme}
                  collapsed={collapsed}
                  setCollapsed={setCollapsed}
                />
              ) : (
                <Navigate to="/login" replace />
              )
            } />
          </Routes>
        </ThemeContext.Provider>
      </ConfigProvider>
    </Router>
  );
}

export { ThemeContext, themeConfigs };
export default App;
