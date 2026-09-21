import React, { useState, useEffect, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ConfigProvider, Layout, Menu, Button, Switch, Dropdown, message } from 'antd';
import { buildAntdTheme } from '@zifeng/ui/antd/theme';
import { zhCN } from '@zifeng/ui/antd/locales';
import { motion } from 'framer-motion';
import { variants } from '@zifeng/ui/motion';
import { ZfErrorBoundary } from '@zifeng/ui/components';
import { FxProvider } from '@zifeng/ui/motion/FxContext';
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
  CommentOutlined,
} from '@ant-design/icons';
import { BRAND_NAME, BRAND_SHORT, COPYRIGHT_YEAR, AVATAR_SQUARE } from './utils/ui';
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
import FeedbackList from './pages/feedback/FeedbackList';

const { Header, Sider, Content } = Layout;

/* 只提供明暗开关。此前这里还挂着 themeConfigs / currentTheme / glassMode 三件套：
   setCurrentTheme 传进 AdminLayout 后从没有调用点，currentThemeConfig 是死变量，
   glassMode 恒为 false —— 一套完整的「换肤」管道其实一根线都没接上。
   后台不是面向读者的产品，没有换肤诉求，而「两端品牌统一」恰恰要求后台不许换品牌，
   故整块删除（详见 P3 报告）。页面仍需要 isDarkMode 来决定图表的 classic/classicDark。 */
const ThemeContext = createContext({ isDarkMode: true, setIsDarkMode: () => {} });

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
  { key: '/feedback', icon: <CommentOutlined />, label: '用户反馈' },
  { key: '/admins', icon: <TeamOutlined />, label: '管理员管理' },
];

const AdminLayout = ({ isDarkMode, setIsDarkMode, collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getOpenKeys = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return ['dashboard-group'];
    if (path.startsWith('/reading')) return ['reading-group'];
    if (path.startsWith('/booksource')) return ['booksource-group'];
    return [];
  };

  /* 展开项从当前路由派生，而不是用 effect 把路由同步回 state
     （effect 里同步 setState 会多渲染一轮）。manualOpenKeys 只在它所属的那次
     路由内有效：换路由（含 * 重定向）自动回到该路由应有的展开态，
     折叠侧栏时在事件里清掉。 */
  const [manualOpenKeys, setManualOpenKeys] = useState(null);
  const openKeys =
    manualOpenKeys && manualOpenKeys.path === location.pathname
      ? manualOpenKeys.keys
      : getOpenKeys();

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
          zIndex: 'var(--zf-z-navbar)',
          /* 原先写死一套靛紫渐变，和用户端的紫并不是同一个紫。
             改为画布令牌后，侧栏随 data-theme 走，品牌装饰只保留顶端那一条渐变。 */
          background: 'linear-gradient(180deg, var(--zf-canvas) 0%, var(--zf-canvas-2) 100%)',
          boxShadow: 'var(--zf-shadow-2)',
          transition: 'all var(--zf-dur-normal) var(--zf-ease-in-out)',
        }}
      >
        <div
          style={{
            height: 'var(--zf-header-height)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid var(--zf-glass-border)',
            overflow: 'hidden',
            padding: '0 var(--zf-s4)',
          }}
        >
          <div
            className="brand-pulse"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--zf-r-sm)',
              background: 'var(--zf-grad-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--zf-on-accent)',
              fontWeight: 'var(--zf-fw-bold)',
              fontSize: 'var(--zf-fs-lg)',
              flexShrink: 0,
              boxShadow: 'var(--zf-shadow-1)',
            }}
          >
            {BRAND_SHORT.charAt(1)}
          </div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: variants.pageSlide.animate.transition.duration }}
              className="zf-grad-text"
              style={{
                marginLeft: 'var(--zf-s3)',
                fontSize: 'var(--zf-fs-base)',
                fontWeight: 'var(--zf-fw-bold)',
                whiteSpace: 'nowrap',
              }}
            >
              {BRAND_NAME}
            </motion.span>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          {...(collapsed ? {} : { openKeys, onOpenChange: (keys) => setManualOpenKeys({ path: location.pathname, keys }) })}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 'none', marginTop: 'var(--zf-s2)', background: 'transparent', flex: 1 }}
        />
        {!collapsed && (
          <div className="brand-footer">紫枫小说 © {COPYRIGHT_YEAR}</div>
        )}
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left var(--zf-dur-normal) var(--zf-ease-in-out)' }}>
        <Header
          className="admin-header"
          style={{
            padding: '0 var(--zf-s6)',
            background: 'var(--zf-surface-1)',
            borderBottom: '1px solid var(--zf-glass-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 'var(--zf-header-height)',
            position: 'sticky',
            top: 0,
            zIndex: 'var(--zf-z-sticky)',
            boxShadow: 'var(--zf-shadow-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s4)' }}>
            <Button
              type="text"
              aria-label={collapsed ? '展开侧栏' : '收起侧栏'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              /* 展开/收起时回到当前路由对应的展开态（原先由 effect 在 collapsed 变化后重算） */
              onClick={() => { setManualOpenKeys(null); setCollapsed(!collapsed); }}
              style={{ fontSize: 'var(--zf-fs-lg)', width: 40, height: 40, borderRadius: 'var(--zf-r-sm)' }}
            />
            <span className="zf-hide-md" style={{ fontSize: 'var(--zf-fs-base)', fontWeight: 'var(--zf-fw-strong)', color: 'var(--zf-text-secondary)' }}>
              {BRAND_NAME}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s4)' }}>
            {/* 原先是一个装饰性月亮/太阳图标 + 一个 Switch 并排，两个控件表达
                同一件事。图标收进 Switch 自身，语义唯一且省掉一列宽度。 */}
            <Switch
              checked={isDarkMode}
              onChange={setIsDarkMode}
              size="small"
              checkedChildren={<SunOutlined />}
              unCheckedChildren={<MoonOutlined />}
              aria-label="切换明暗模式"
            />
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenu }} placement="bottomRight" trigger={['click']}>
              {/* 此前是裸 div + onMouseEnter 改 style：键盘不可达、hover 与 CSS transition 打架。
                  改 button（原生可聚焦），hover 交给 index.css 的 .user-trigger。 */}
              <button type="button" className="user-trigger" aria-label={`管理员菜单：${adminInfo.username || '未登录'}`}>
                <span aria-hidden="true" style={AVATAR_SQUARE(32)}>
                  {adminInfo.username?.charAt(0)?.toUpperCase() || 'A'}
                </span>
                <span style={{ fontSize: 'var(--zf-fs-base)', fontWeight: 'var(--zf-fw-strong)', color: 'var(--zf-text-secondary)' }}>
                  {adminInfo.username || '管理员'}
                </span>
              </button>
            </Dropdown>
          </div>
        </Header>
        <Content
          className="admin-content"
          style={{
            margin: 0,
            padding: 'var(--zf-s6)',
            height: `calc(100vh - var(--zf-header-height))`,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--zf-canvas)',
          }}
        >
          {/* 路由过渡：animejs → framer-motion（与用户端同一动画库）。
              key 用 pathname，卸载即停，不需要 exit，避免切换时闪白帧。 */}
          <motion.div
            key={location.pathname}
            variants={variants.pageSlide}
            initial="initial"
            animate="animate"
            style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            {/* 后台此前完全没有错误边界：任一页抛错都会把整个壳子白屏，
                管理员只能刷新或看控制台。key 用 pathname，切页即重置。 */}
            <ZfErrorBoundary title="该页面出错了" description="其他页面仍可正常访问，重试或切换到别的菜单。">
                <Routes>
                  <Route path="/dashboard/overview" element={<DashboardOverview />} />
                  <Route path="/dashboard/logs" element={<DashboardLogs />} />
                  <Route path="/users" element={<UserManagement />} />
                  <Route path="/reading/bookshelf" element={<ReadingBookshelf />} />
                  <Route path="/reading/history" element={<ReadingHistory />} />
                  <Route path="/booksource/list" element={<BookSourceList />} />
                  <Route path="/booksource/import" element={<BookSourceImport />} />
                  <Route path="/booksource/stats" element={<BookSourceStats />} />
                  <Route path="/feedback" element={<FeedbackList />} />
                  <Route path="/admins" element={<AdminManagement />} />
                  <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
                </Routes>
            </ZfErrorBoundary>
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
};


function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('zifeng_admin_dark') === 'true';
  });
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('zifeng_admin_token');
  });

  useEffect(() => {
    localStorage.setItem('zifeng_admin_dark', String(isDarkMode));
  }, [isDarkMode]);

  /* 后台此前从不写 data-theme，导致它的暗色开关只切 antd 算法、
     切不动 --zf-* 表面令牌（玻璃/描边/文本色仍停在深色默认值）。
     品牌固定 violet，与用户端共用同一 token 源 —— 不给后台换肤入口是刻意的。 */
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    el.setAttribute('data-brand', 'violet');
    el.setAttribute('data-glass', 'off');
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

  return (
    <Router basename="/admin">
      {/* FxProvider 写 html[data-fx]，--zf-fx-loop / --zf-fx-shimmer 才会切到 paused。
          没有它，index.css 里 brand-pulse 的 animation-play-state 与骨架屏微光
          就永远拿不到 tier 0 的静止值，prefers-reduced-motion 也形同虚设。 */}
      <FxProvider>
      <ConfigProvider
        locale={zhCN}
        getPopupContainer={() => document.body}
        /* 表格的 bordered/size、分页的档位与 showTotal 都改由 buildAntdTheme 的
           components 段 + 各页 pagination 常量承担，不再在 ConfigProvider 上叠
           一层全局 table/pagination 默认值 —— 那会和页内定义重复且互相遮蔽。 */
        theme={buildAntdTheme({ mode: isDarkMode ? 'dark' : 'light', brand: 'violet' })}
      >
        <ThemeContext.Provider value={{ isDarkMode, setIsDarkMode }}>
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <Navigate to="/dashboard/overview" replace /> : <Login />
            } />
            <Route path="/*" element={
              isAuthenticated ? (
                <AdminLayout
                  isDarkMode={isDarkMode}
                  setIsDarkMode={setIsDarkMode}
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
      </FxProvider>
    </Router>
  );
}

export { ThemeContext };
export default App;
