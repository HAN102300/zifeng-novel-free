/* ============================================================
   紫枫免费小说 · 导航栏组件 (Navbar)
   从 App.jsx 提取的独立组件

   ★ 本次迁移修掉的两处性能/正确性问题：
   1) logo 的「呼吸光晕」原先用 framer-motion 以 JS 每帧改 boxShadow。
      boxShadow 不走合成器（每帧触发重绘），而该元素又嵌在带
      backdrop-filter 的 Header 内部 —— 等于每帧逼浏览器重采样整条玻璃
      背景，同时违反合成器铁律 ①（单元素不叠加 backdrop-filter 与
      infinite 动画）和 ②（infinite 必须是玻璃层的兄弟层而非子孙）。
      现改为静态光晕 + hover 增强，只保留一个 background-position 扫光
      （合成器友好，且挂 --zf-fx-shimmer 总闸）。
   2) 响应式原先用 window.innerWidth + resize 监听，resize 期间每个像素
      都 setState 重渲染；且 880/480 是魔数。改用 useBreakpoint()。
   3) 用户胶囊原先用 onMouseEnter/Leave 一次直改 3 个 DOM style 属性，
      且卸载时不复位 border-color。改为声明式 whileHover。
   ============================================================ */

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout, Drawer, Input, Button, Switch, Tooltip, Dropdown, Avatar } from 'antd';
import {
  HomeOutlined, AppstoreOutlined, BookOutlined, DatabaseOutlined,
  SettingOutlined, SearchOutlined, UserOutlined, MenuOutlined,
  MoonOutlined, SunOutlined,
} from '@ant-design/icons';
import { glassNavbar, glassNavIndicator } from '../utils/glassStyle';
import { useBreakpoint } from '@zifeng/ui/hooks';
import { variants } from '@zifeng/ui/motion';

const { Header } = Layout;

const menuItems = [
  { key: '/', to: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/category', to: '/category', label: '分类', icon: <AppstoreOutlined /> },
  { key: '/shelf', to: '/shelf', label: '书架', icon: <BookOutlined /> },
  { key: '/booksource', to: '/booksource', label: '书源', icon: <DatabaseOutlined /> },
  { key: '/setting', to: '/setting', label: '设置', icon: <SettingOutlined /> },
];

export default function Navbar({
  isDarkMode, isLoggedIn, userInfo, setIsDarkMode, glassMode,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  /* 旧断点 880 归到 lg(992)：中屏会更早收进抽屉，这是断点归一的预期变化 */
  const { isMobile, up } = useBreakpoint();
  const showFullNav = up('lg');
  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 滚动收缩
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* 抽屉关闭由导航动作本身负责，不再用「监听 location 变化后 setState」
     那个 effect —— 后者是 react-hooks/set-state-in-effect 反模式：
     先渲染一次、effect 再触发第二次渲染。 */
  const go = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  const onSearch = (value) => {
    if (value && value.trim()) {
      setDrawerOpen(false);
      navigate(`/search?keyword=${encodeURIComponent(value.trim())}`);
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
      key: 'darkMode',
      icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: isDarkMode ? '浅色模式' : '深色模式',
      onClick: () => setIsDarkMode(!isDarkMode),
    },
  ];

  const navbarStyle = useMemo(() => ({
    position: 'sticky',
    top: 0,
    zIndex: 'var(--zf-z-navbar)',
    width: '100%',
    /* 第 3 参现在真正生效了：glassStyle 已补 OFF 分支，
       此前签名只收两参导致「毛玻璃风格」开关关不掉导航栏 */
    ...glassNavbar(scrolled, isDarkMode, glassMode),
    margin: 0,
    borderRadius: 0,
    padding: isMobile ? '0 var(--zf-s2)' : '0 var(--zf-s5)',
    overflow: 'hidden',
  }), [scrolled, isDarkMode, glassMode, isMobile]);

  return (
    <Header className={`zf-navbar${scrolled ? ' scrolled' : ''}`} style={navbarStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {/* 左侧：Logo + 导航链接 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 'var(--zf-s2)' : 'var(--zf-s5)', flex: '1 1 auto', minWidth: 0 }}>
          <NavLink
            to="/"
            aria-label="紫枫免费小说首页"
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)', flexShrink: 0 }}
          >
            <span
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 'var(--zf-r-md)',
                background: 'var(--zf-grad-brand)',
                boxShadow: 'var(--zf-glow-brand)',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: 'var(--zf-font-display)',
                  fontWeight: 'var(--zf-fw-black)',
                  fontSize: 'var(--zf-fs-xl)',
                  lineHeight: 1,
                  color: 'var(--zf-on-accent)',
                }}
              >枫</span>
              {/* 扫光走 background-position（合成器处理）并受 shimmer 总闸控制 */}
              <span
                aria-hidden="true"
                className="zf-anim-grad-flow"
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: 'var(--zf-grad-sheen)',
                }}
              />
            </span>
            {!isMobile && (
              <span
                style={{
                  fontFamily: 'var(--zf-font-display)',
                  fontWeight: 'var(--zf-fw-bold)',
                  fontSize: 'var(--zf-fs-lg)',
                  color: 'var(--zf-text-primary)',
                }}
              >
                紫枫<em style={{ fontStyle: 'normal', color: 'var(--zf-brand-400)' }}>免费小说</em>
              </span>
            )}
          </NavLink>

          {showFullNav && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s1)', flex: 1, marginLeft: 'var(--zf-s4)' }}>
              {menuItems.map(item => (
                <button
                  key={item.key}
                  type="button"
                  className="zf-nav-btn"
                  onClick={() => go(item.to)}
                  aria-current={selectedKey === item.key ? 'page' : undefined}
                  style={{
                    position: 'relative',
                    padding: 'var(--zf-s2) var(--zf-s4)',
                    fontSize: 'var(--zf-fs-md)',
                    fontWeight: 'var(--zf-fw-normal)',
                    color: selectedKey === item.key ? 'var(--zf-text-primary)' : 'var(--zf-text-secondary)',
                    border: 'none',
                    background: 'none',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: `color var(--zf-dur-fast) var(--zf-ease-out)`,
                  }}
                >
                  {item.label}
                  {selectedKey === item.key && (
                    /* 磁吸下划线：复用此前零引用的 glassNavIndicator；
                       layoutId 让它成为跨菜单项的共享元素过渡 */
                    <motion.span layoutId="navIndicator" style={glassNavIndicator()} />
                  )}
                </button>
              ))}
            </nav>
          )}
        </div>

        {/* 右侧：搜索 + 用户 + 暗色切换 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 'var(--zf-s1)' : 'var(--zf-s3)', flexShrink: 0 }}>
          {showFullNav && (
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

          {!showFullNav ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              {isLoggedIn ? (
                <Avatar size={28} src={userInfo?.avatar} icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
              ) : (
                <Button type="text" icon={<UserOutlined />} style={{ color: 'var(--zf-brand-500)' }} />
              )}
            </Dropdown>
          ) : (
            <>
              {isLoggedIn ? (
                <NavLink to="/user" style={{ textDecoration: 'none' }}>
                  <Tooltip title="用户中心">
                    <motion.div
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      transition={variants.hoverLift.transition}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--zf-s2)',
                        height: 36,
                        padding: 'var(--zf-s1) var(--zf-s3)',
                        borderRadius: 'var(--zf-r-sm)',
                        background: 'var(--zf-tint-brand-10)',
                        border: '1px solid rgb(var(--zf-brand-rgb-500) / 0.45)',
                        cursor: 'pointer',
                      }}
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 30,
                          height: 30,
                          flexShrink: 0,
                          overflow: 'hidden',
                          borderRadius: 'var(--zf-r-full)',
                          border: '2px solid rgb(var(--zf-brand-rgb-500) / 0.55)',
                          background: 'var(--zf-grad-brand)',
                          color: 'var(--zf-on-accent)',
                        }}
                      >
                        {userInfo?.avatar ? (
                          <img
                            src={userInfo.avatar}
                            alt={userInfo.username}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <UserOutlined style={{ fontSize: 'var(--zf-fs-xs)' }} />
                        )}
                      </span>
                      <span
                        className="zf-truncate"
                        style={{
                          maxWidth: 120,
                          fontSize: 'var(--zf-fs-base)',
                          fontWeight: 'var(--zf-fw-bold)',
                          color: 'var(--zf-brand-400)',
                        }}
                      >
                        {userInfo?.username || '用户'}
                      </span>
                    </motion.div>
                  </Tooltip>
                </NavLink>
              ) : (
                <Tooltip title="登录/注册">
                  <Button
                    icon={<UserOutlined />}
                    className="zf-btn zf-btn--ghost"
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

          {!showFullNav && (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="打开菜单" />
          )}
        </div>
      </div>

      {/* 移动端抽屉 */}
      <Drawer
        title="紫枫免费小说"
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={280}
      >
        <div style={{ marginBottom: 'var(--zf-s4)' }}>
          <Input.Search placeholder="搜索小说..." onSearch={onSearch} className="zf-search-input" enterButton />
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s1)' }}>
          {menuItems.map(item => {
            const active = selectedKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => go(item.to)}
                aria-current={active ? 'page' : undefined}
                style={{
                  textAlign: 'left',
                  padding: 'var(--zf-s3) var(--zf-s4)',
                  fontSize: 'var(--zf-fs-lg)',
                  fontWeight: active ? 'var(--zf-fw-strong)' : 'var(--zf-fw-normal)',
                  color: active ? 'var(--zf-brand-400)' : 'var(--zf-text-primary)',
                  background: active ? 'var(--zf-tint-brand-10)' : 'transparent',
                  border: 'none',
                  borderRadius: 'var(--zf-r-sm)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: `background var(--zf-dur-fast) var(--zf-ease-out), color var(--zf-dur-fast) var(--zf-ease-out)`,
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </Drawer>
    </Header>
  );
}
