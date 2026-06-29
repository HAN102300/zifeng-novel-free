/* ============================================================
   紫枫免费小说 · 导航栏组件 (Navbar)
   从 App.jsx 提取的独立组件
   ============================================================ */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout, Drawer, Input, Button, Switch, Tooltip, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined, AppstoreOutlined, BookOutlined, DatabaseOutlined,
  SettingOutlined, SearchOutlined, UserOutlined, MenuOutlined,
  MoonOutlined, SunOutlined
} from '@ant-design/icons';
import { glassNavbar } from '../utils/glassStyle';
import { getPrimaryRgb } from '../utils/colorUtils';

const { Header } = Layout;

const menuItems = [
  { key: '/', to: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/category', to: '/category', label: '分类', icon: <AppstoreOutlined /> },
  { key: '/shelf', to: '/shelf', label: '书架', icon: <BookOutlined /> },
  { key: '/booksource', to: '/booksource', label: '书源', icon: <DatabaseOutlined /> },
  { key: '/setting', to: '/setting', label: '设置', icon: <SettingOutlined /> },
];

export default function Navbar({
  currentThemeConfig, isDarkMode, isLoggedIn, userInfo,
  setIsDarkMode, glassMode
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 响应式
  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 滚动收缩
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 路由切换时关闭移动端抽屉
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const isSmallScreen = screenWidth <= 880;
  const isMobile = screenWidth <= 480;

  const onSearch = (value) => {
    if (value && value.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(value.trim())}`);
      setDrawerOpen(false);
    }
  };

  // 获取当前选中的菜单 key
  const selectedKey = useMemo(() => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path.startsWith('/category')) return '/category';
    if (path.startsWith('/shelf')) return '/shelf';
    if (path.startsWith('/booksource')) return '/booksource';
    if (path.startsWith('/setting')) return '/setting';
    if (path.startsWith('/search')) return '/';
    if (path.startsWith('/novel/') || path.startsWith('/reader/')) {
      const from = new URLSearchParams(window.location.search).get('from');
      if (from === 'shelf') return '/shelf';
      if (from === 'category') return '/category';
    }
    if (path === '/login' || path === '/reset-password' || path === '/user') {
      const from = location.state?.from || '';
      if (from.startsWith('/shelf')) return '/shelf';
      if (from.startsWith('/category')) return '/category';
    }
    return '/';
  }, [location]);

  const userMenuItems = [
    ...(isLoggedIn
      ? [{ key: 'user', icon: <UserOutlined />, label: userInfo?.username || '用户中心', onClick: () => navigate('/user') }]
      : [{ key: 'login', icon: <UserOutlined />, label: '登录', onClick: () => navigate('/login', { state: { from: location.pathname + location.search } }) }]
    ),
    { type: 'divider' },
    {
      key: 'darkMode', icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: isDarkMode ? '浅色模式' : '深色模式',
      onClick: () => setIsDarkMode(!isDarkMode)
    }
  ];

  const primaryRgb = useMemo(() => getPrimaryRgb(currentThemeConfig.primaryColor), [currentThemeConfig.primaryColor]);

  const navbarStyle = useMemo(() => ({
    position: 'sticky',
    top: 0,
    zIndex: 1000,
    width: '100%',
    ...glassNavbar(scrolled, isDarkMode, glassMode),
    margin: 0,
    borderRadius: 0,
    padding: isMobile ? '0 10px' : '0 20px',
    overflow: 'hidden',
  }), [scrolled, isDarkMode, glassMode, isMobile]);

  return (
    <Header className={`zf-navbar${scrolled ? ' scrolled' : ''}`} style={navbarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* 左侧：Logo + 导航链接 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 20, flex: '1 1 auto', minWidth: 0 }}>
          <NavLink to="/" aria-label="紫枫免费小说首页" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(135deg, var(--zf-primary-500), var(--zf-accent-magenta))',
              display: 'grid', placeItems: 'center', color: '#fff',
              fontFamily: 'var(--zf-font-serif)', fontWeight: 900, fontSize: 22,
              boxShadow: 'var(--zf-glow-primary)', position: 'relative', overflow: 'hidden'
            }}>
              枫
              <span style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%)',
                backgroundSize: '200% auto',
                animation: 'logoShine 4s ease-in-out infinite',
              }} />
            </div>
            {!isMobile && (
              <span style={{ fontFamily: 'var(--zf-font-serif)', fontWeight: 700, fontSize: 20, color: 'var(--zf-text-primary)' }}>
                紫枫<em style={{ fontStyle: 'normal', color: 'var(--zf-primary-400)' }}>免费小说</em>
              </span>
            )}
          </NavLink>
          {!isSmallScreen && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, marginLeft: 16 }}>
              {menuItems.map(item => (
                <button
                  key={item.key}
                  className="zf-nav-btn"
                  onClick={() => navigate(item.to)}
                  style={{
                    position: 'relative', padding: '10px 16px', fontSize: 15, fontWeight: 500,
                    color: selectedKey === item.key ? 'var(--zf-text-primary)' : 'var(--zf-text-secondary)',
                    border: 'none', background: 'none', fontFamily: 'inherit', cursor: 'pointer',
                    transition: 'color 0.18s'
                  }}
                  aria-current={selectedKey === item.key ? 'page' : undefined}
                >
                  {item.label}
                  {selectedKey === item.key && (
                    <motion.span
                      layoutId="navIndicator"
                      style={{
                        position: 'absolute', bottom: 2, left: 0, right: 0, height: 3, borderRadius: 3,
                        background: 'linear-gradient(90deg, var(--zf-primary-500), var(--zf-accent-magenta))',
                        boxShadow: 'var(--zf-glow-primary)'
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* 右侧：搜索 + 用户 + 暗色切换 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
          {!isSmallScreen && (
            <Input.Search
              placeholder="搜索小说..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={onSearch}
              className="zf-search-input"
              style={{ width: 'clamp(140px, 20vw, 250px)' }}
            />
          )}
          {isSmallScreen ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              {isLoggedIn ? (
                <Avatar size={28} src={userInfo?.avatar} icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
              ) : (
                <Button type="text" icon={<UserOutlined />} style={{ color: currentThemeConfig.primaryColor }} />
              )}
            </Dropdown>
          ) : (
            <>
              {/* 用户信息/登录按钮 */}
              {isLoggedIn ? (
                <NavLink to="/user" style={{ textDecoration: 'none' }}>
                  <Tooltip title="用户中心">
                    <div
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '4px 12px', borderRadius: 10,
                        background: isDarkMode ? 'rgba(255,255,255,0.1)' : `rgba(${primaryRgb}, 0.1)`,
                        border: `1px solid ${currentThemeConfig.primaryColor}`,
                        transition: 'all 0.3s ease', cursor: 'pointer', height: '36px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.15)' : `rgba(${primaryRgb}, 0.2)`;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = `0 2px 8px rgba(${primaryRgb}, 0.3)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.1)' : `rgba(${primaryRgb}, 0.1)`;
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
                        border: `2px solid ${currentThemeConfig.primaryColor}`,
                        boxShadow: `0 2px 6px rgba(${primaryRgb}, 0.4)`, flexShrink: 0
                      }}>
                        {userInfo?.avatar ? (
                          <img src={userInfo.avatar} alt={userInfo.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        ) : (
                          <div style={{
                            width: '100%', height: '100%', backgroundColor: currentThemeConfig.primaryColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
                          </div>
                        )}
                      </div>
                      <span style={{
                        color: currentThemeConfig.primaryColor, fontWeight: 'bold',
                        fontSize: 14, textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                      }}>
                        {userInfo?.username || '用户'}
                      </span>
                    </div>
                  </Tooltip>
                </NavLink>
              ) : (
                <Tooltip title="登录/注册">
                  <Button
                    icon={<UserOutlined />}
                    type="default"
                    style={{ borderColor: currentThemeConfig.primaryColor, color: currentThemeConfig.primaryColor }}
                    onClick={() => navigate('/login', { state: { from: location.pathname + location.search } })}
                  >
                    登录
                  </Button>
                </Tooltip>
              )}
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={isDarkMode}
                onChange={setIsDarkMode}
              />
            </>
          )}
          {isSmallScreen && (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="打开菜单" />
          )}
        </div>
      </div>

      {/* 移动端抽屉 */}
      <Drawer title="紫枫免费小说" placement="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={280}>
        <div style={{ marginBottom: 16 }}>
          <Input.Search placeholder="搜索小说..." onSearch={onSearch} className="zf-search-input" enterButton />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map(item => (
            <button
              key={item.key} onClick={() => navigate(item.to)}
              style={{
                textAlign: 'left', padding: '12px 16px', fontSize: 16,
                fontWeight: selectedKey === item.key ? 600 : 500,
                color: selectedKey === item.key ? currentThemeConfig.primaryColor : 'var(--zf-text-primary)',
                background: selectedKey === item.key ? `rgba(${primaryRgb}, 0.12)` : 'transparent',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.18s'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </Drawer>
    </Header>
  );
}
