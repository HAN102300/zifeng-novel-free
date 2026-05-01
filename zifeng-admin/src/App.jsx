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
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import anime from 'animejs/lib/anime.es.js';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserManagement from './pages/UserManagement';
import AdminManagement from './pages/AdminManagement';
import ReadingManagement from './pages/ReadingManagement';
import BookSourceManager from './pages/BookSourceManager';

const { Header, Sider, Content } = Layout;

const ThemeContext = createContext();

const themeConfigs = {
  default: { primaryColor: '#1890ff', name: '经典蓝' },
  green: { primaryColor: '#52c41a', name: '清新绿' },
  purple: { primaryColor: '#722ed1', name: '优雅紫' },
};

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '仪表盘' },
  { key: '/users', icon: <UserOutlined />, label: '用户管理' },
  { key: '/reading', icon: <BookOutlined />, label: '阅读管理' },
  { key: '/booksource', icon: <DatabaseOutlined />, label: '书源管理' },
  { key: '/admins', icon: <TeamOutlined />, label: '管理员管理' },
];

const AdminLayout = ({ isDarkMode, setIsDarkMode, currentTheme, setCurrentTheme, collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const contentRef = useRef(null);
  const [fadeState, setFadeState] = useState('in');

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={220}
        collapsedWidth={72}
        theme={isDarkMode ? 'dark' : 'light'}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          borderRight: isDarkMode
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid #f0f0f0',
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: isDarkMode
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid #f0f0f0',
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
          theme={isDarkMode ? 'dark' : 'light'}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', marginTop: 8 }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s ease' }}>
        <Header style={{
          padding: '0 24px',
          background: isDarkMode ? '#141414' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 99,
          borderBottom: isDarkMode
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid #f0f0f0',
          boxShadow: isDarkMode
            ? '0 1px 8px rgba(0,0,0,0.3)'
            : '0 1px 8px rgba(0,0,0,0.04)',
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
        <Content style={{
          margin: 24,
          minHeight: 'calc(100vh - 64px - 48px)',
          overflow: 'initial',
        }}>
          <div
            ref={contentRef}
          >
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/reading" element={<ReadingManagement />} />
              <Route path="/booksource" element={<BookSourceManager />} />
              <Route path="/admins" element={<AdminManagement />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: currentThemeConfig.primaryColor,
            borderRadius: 8,
          },
          components: {
            Layout: {
              headerBg: isDarkMode ? '#141414' : '#fff',
              siderBg: isDarkMode ? '#141414' : '#fff',
            },
            Menu: {
              darkItemBg: '#141414',
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
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
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
