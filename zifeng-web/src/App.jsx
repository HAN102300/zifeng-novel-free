import React, { useState, useEffect, createContext, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ConfigProvider, theme, Layout, Menu, Input, Button, Switch, Card, Row, Col, Tag, Typography, Space, Divider, Tooltip, Spin, message, Dropdown, Avatar } from 'antd';
import { 
  HomeOutlined, 
  AppstoreOutlined, 
  BookOutlined, 
  SettingOutlined, 
  SearchOutlined,
  MoonOutlined,
  SunOutlined,
  RightOutlined,
  FireOutlined,
  TrophyOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CommentOutlined,
  UserOutlined,
  DatabaseOutlined
} from '@ant-design/icons';
import Home from './pages/Home';
import Category from './pages/Category';
import Shelf from './pages/Shelf';
import Setting from './pages/Setting';
import Login from './pages/Login';
import { cleanLocalStorageCache } from './utils/novelConfig';

const NovelDetail = lazy(() => import('./pages/NovelDetail'));
const RankDetail = lazy(() => import('./pages/RankDetail'));
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UserCenter = lazy(() => import('./pages/UserCenter'));
const Reader = lazy(() => import('./pages/Reader'));
const SearchResult = lazy(() => import('./pages/SearchResult'));
const BookSourcePage = lazy(() => import('./pages/BookSourcePage'));

import { getCurrentUser } from './utils/apiClient';
import { getDefaultSource } from './utils/novelConfig';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>页面加载出错</h2>
          <p style={{ color: '#999' }}>{this.state.error?.message || '未知错误'}</p>
          <Button type="primary" onClick={() => window.location.reload()}>刷新页面</Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const LazyLoad = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" tip="加载中..." /></div>}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

function parseHeaders(headerStr) {
  try {
    return headerStr ? JSON.parse(headerStr) : {};
  } catch {
    return {};
  }
}

import './App.css';

const { Header, Content } = Layout;
const { Search } = Input;
const { Title, Text } = Typography;

// 创建数据上下文
const NovelContext = createContext();
const ThemeContext = createContext();
export const AuthContext = createContext();

const defaultSource = getDefaultSource();

const rankUrls = {
  mustRead: '/module/rank?type=1&channel=1&page=1',
  potential: '/module/rank?type=5&channel=1&page=1',
  completed: '/module/rank?type=2&channel=1&page=1',
  updated: '/module/rank?type=3&channel=1&page=1',
  search: '/module/rank?type=4&channel=1&page=1',
  comment: '/module/rank?type=6&channel=1&page=1'
};

// 主题配置
const themeConfigs = {
  default: {
    primaryColor: '#1890ff',
    colors: ['#1890ff', '#40a9ff', '#69c0ff', '#91d5ff', '#bae7ff'],
    name: '经典蓝'
  },
  green: {
    primaryColor: '#52c41a',
    colors: ['#52c41a', '#73d13d', '#95de64', '#b7eb8f', '#d9f7be'],
    name: '清新绿'
  },
  purple: {
    primaryColor: '#722ed1',
    colors: ['#722ed1', '#9254de', '#b37feb', '#d3adf7', '#efdbff'],
    name: '优雅紫'
  },
  orange: {
    primaryColor: '#fa8c16',
    colors: ['#fa8c16', '#ffa940', '#ffc069', '#ffd591', '#ffe7ba'],
    name: '活力橙'
  },
  red: {
    primaryColor: '#f5222d',
    colors: ['#f5222d', '#ff4d4f', '#ff7875', '#ffa39e', '#ffccc7'],
    name: '热情红'
  }
};

function App() {
  useEffect(() => { cleanLocalStorageCache(); }, []);

  const [currentTheme, setCurrentTheme] = useState(() => {
    const saved = localStorage.getItem('zifeng_theme');
    return saved || 'default';
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const manualOverride = localStorage.getItem('zifeng_manual_dark_override');
    if (manualOverride === 'true') {
      const saved = localStorage.getItem('zifeng_dark_mode');
      return saved === 'true';
    }
    const autoConfig = localStorage.getItem('zifeng_auto_night_mode');
    if (autoConfig) {
      const config = JSON.parse(autoConfig);
      if (config.enabled) {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const [startH, startM] = config.startTime.split(':').map(Number);
        const [endH, endM] = config.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        if (startMinutes > endMinutes) {
          return currentMinutes >= startMinutes || currentMinutes < endMinutes;
        } else {
          return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }
      }
    }
    return false;
  });
  const [globalFontSize, setGlobalFontSize] = useState(() => {
    const saved = localStorage.getItem('zifeng_font_size');
    return saved ? parseInt(saved, 10) : 14;
  });
  const [glassMode, setGlassMode] = useState(() => {
    const saved = localStorage.getItem('zifeng_glass_mode');
    return saved === 'true';
  });

  const handleGlassModeToggle = useCallback((value) => {
    setGlassMode(value);
    localStorage.setItem('zifeng_glass_mode', String(value));
  }, []);

  const handleManualDarkModeToggle = useCallback((value) => {
    setIsDarkMode(value);
    localStorage.setItem('zifeng_dark_mode', String(value));
    localStorage.setItem('zifeng_manual_dark_override', 'true');
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [novels, setNovels] = useState({
    mustRead: [],
    potential: [],
    completed: [],
    updated: [],
    search: [],
    comment: []
  });
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('zifeng_token');
  });
  const [userInfo, setUserInfo] = useState(() => {
    try {
      const stored = localStorage.getItem('zifeng_user');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  // 获取榜单数据
  const fetchRankData = async (url, key, limit) => {
    try {
      const response = await axios.get(`${defaultSource.bookSourceUrl}${url}`, {
        headers: parseHeaders(defaultSource.header)
      });
      
      if (response.data && response.data.data) {
        const data = response.data.data.slice(0, limit).map((novel, index) => ({
          id: novel.novelId || index + 1,
          name: novel.novelName || '未知标题',
          author: novel.authorName || '未知作者',
          cover: novel.cover || '',
          category: novel.categoryNames && novel.categoryNames.length > 0 ? novel.categoryNames[0].className : '未知分类',
          score: novel.averageScore || 0,
          rankInfo: novel.rankInfo || `${index + 1}`,
          rank: index + 1
        }));
        setNovels(prev => ({ ...prev, [key]: data }));
      }
    } catch (error) {
      console.error(`获取${key}榜单数据失败: ${error.message}`);
      const mockData = Array.from({ length: limit }, (_, i) => ({
        id: i + 1,
        name: `${key === 'mustRead' ? '必读' : key === 'potential' ? '潜力' : key === 'completed' ? '完本' : key === 'updated' ? '更新' : key === 'search' ? '搜索' : '评论'}小说 ${i + 1}`,
        author: `作者${i + 1}`,
        cover: '',
        category: '玄幻',
        score: (Math.random() * 2 + 8).toFixed(1),
        rankInfo: `${i + 1}. 热度未知`,
        rank: i + 1
      }));
      setNovels(prev => ({ ...prev, [key]: mockData }));
    }
  };

  useEffect(() => {
    const loadUserInfo = async () => {
      const token = localStorage.getItem('zifeng_token');
      if (token) {
        try {
          const user = await getCurrentUser();
          if (user) {
            setIsLoggedIn(true);
            setUserInfo(user);
            localStorage.setItem('zifeng_user', JSON.stringify(user));
          }
        } catch (e) {
          if (e.response?.status === 401) {
            const msg = e.response?.data?.message || "";
            if (msg.includes("过期") || msg.includes("无效") || msg.includes("其他设备") || msg.includes("踢下线")) {
              localStorage.removeItem('zifeng_token');
              localStorage.removeItem('zifeng_user');
              localStorage.removeItem('zifeng_token_expires');
              setIsLoggedIn(false);
              setUserInfo(null);
            }
          }
        }
      }
    };
    loadUserInfo();

    const handleAuthLogin = () => {
      loadUserInfo();
    };
    window.addEventListener('auth-login', handleAuthLogin);
    return () => window.removeEventListener('auth-login', handleAuthLogin);
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setIsLoggedIn(false);
      setUserInfo(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    const checkTokenExpiration = () => {
      const expiresAt = localStorage.getItem('zifeng_token_expires');
      if (expiresAt) {
        const remaining = Number(expiresAt) - Date.now();
        if (remaining <= 0) {
          localStorage.removeItem('zifeng_token');
          localStorage.removeItem('zifeng_user');
          localStorage.removeItem('zifeng_token_expires');
          setIsLoggedIn(false);
          setUserInfo(null);
          message.warning('登录已过期，请重新登录');
        } else if (remaining < 300000) {
          message.warning('登录即将过期，请注意保存数据');
        }
      }
    };
    const interval = setInterval(checkTokenExpiration, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoggedIn && userInfo) {
      localStorage.setItem('zifeng_user', JSON.stringify(userInfo));
    }
  }, [isLoggedIn, userInfo]);

  useEffect(() => {
    let failCount = 0;
    const interval = setInterval(async () => {
      const token = localStorage.getItem('zifeng_token');
      if (token) {
        try {
          await backendAxios.post('/user/heartbeat');
        } catch {}
        try {
          const user = await getCurrentUser();
          if (user) {
            failCount = 0;
            setUserInfo(user);
            localStorage.setItem('zifeng_user', JSON.stringify(user));
          }
        } catch (e) {
          if (e.response?.status === 401) {
            const msg = e.response?.data?.message || "";
            if (msg.includes("过期") || msg.includes("无效") || msg.includes("其他设备") || msg.includes("踢下线")) {
              localStorage.removeItem('zifeng_token');
              localStorage.removeItem('zifeng_user');
              localStorage.removeItem('zifeng_token_expires');
              setIsLoggedIn(false);
              setUserInfo(null);
            }
          } else {
            failCount++;
            if (failCount >= 3) {
              failCount = 0;
            }
          }
        }
      }
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  // 初始化数据
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchRankData(rankUrls.mustRead, 'mustRead', 15),
          fetchRankData(rankUrls.potential, 'potential', 8),
          fetchRankData(rankUrls.completed, 'completed', 8),
          fetchRankData(rankUrls.updated, 'updated', 6),
          fetchRankData(rankUrls.search, 'search', 6),
          fetchRankData(rankUrls.comment, 'comment', 6)
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${globalFontSize}px`);
    document.documentElement.style.fontSize = `${globalFontSize}px`;
  }, [globalFontSize]);

  useEffect(() => {
    localStorage.setItem('zifeng_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('zifeng_theme', currentTheme);
  }, [currentTheme]);

  const handleGlobalFontSizeChange = (value) => {
    const clampedValue = Math.min(value, 24);
    setGlobalFontSize(clampedValue);
    localStorage.setItem('zifeng_font_size', String(clampedValue));
  };

  const handleSearch = () => {};

  const currentThemeConfig = themeConfigs[currentTheme];

  return (
    <Router>
      <ConfigProvider
        theme={{
          algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: currentThemeConfig.primaryColor,
            colorBgContainer: isDarkMode ? '#141414' : '#ffffff',
            colorBgLayout: isDarkMode ? '#000000' : '#f0f2f5',
            fontSize: globalFontSize,
          },
        }}
      >
        <NovelContext.Provider value={{ novels, loading }}>
          <ThemeContext.Provider value={{ currentTheme, setCurrentTheme, isDarkMode, setIsDarkMode, themeConfigs, globalFontSize, handleGlobalFontSizeChange, glassMode, setGlassMode, handleGlassModeToggle }}>
            <AppLayout
              currentThemeConfig={currentThemeConfig}
              isDarkMode={isDarkMode}
              isLoggedIn={isLoggedIn}
              userInfo={userInfo}
              setIsDarkMode={setIsDarkMode}
              setCurrentTheme={setCurrentTheme}
              themeConfigs={themeConfigs}
              setIsLoggedIn={setIsLoggedIn}
              setUserInfo={setUserInfo}
              glassMode={glassMode}
            />
          </ThemeContext.Provider>
        </NovelContext.Provider>
      </ConfigProvider>
    </Router>
  );
}

// 应用布局组件（在Router内部，可以使用useLocation）
const AppLayout = ({ currentThemeConfig, isDarkMode, isLoggedIn, userInfo, setIsDarkMode, setCurrentTheme, themeConfigs, setIsLoggedIn, setUserInfo, glassMode }) => {
  const location = useLocation();
  const isReaderPage = location.pathname.startsWith('/reader');
  const isSearchPage = location.pathname.startsWith('/search');

  return (
    <AuthContext.Provider value={{ isLoggedIn, userInfo, setIsLoggedIn, setUserInfo }}>
    <Layout className="app-layout" style={{ minHeight: '100vh' }}>
      {!isReaderPage && !isSearchPage && (
        <Navbar
          currentThemeConfig={currentThemeConfig}
          isDarkMode={isDarkMode}
          isLoggedIn={isLoggedIn}
          userInfo={userInfo}
          setIsDarkMode={setIsDarkMode}
          setCurrentTheme={setCurrentTheme}
          themeConfigs={themeConfigs}
          glassMode={glassMode}
        />
      )}
      <Content style={{ padding: isReaderPage ? 0 : '24px 20px', background: isDarkMode ? '#000000' : '#f0f2f5', position: 'relative' }}>
        {glassMode && !isReaderPage && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '5%', right: '-3%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${currentThemeConfig.primaryColor}10 0%, transparent 70%)`, filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', bottom: '10%', left: '-3%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${currentThemeConfig.colors ? currentThemeConfig.colors[2] + '0c' : currentThemeConfig.primaryColor + '08'} 0%, transparent 70%)`, filter: 'blur(80px)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${currentThemeConfig.primaryColor}08 0%, transparent 70%)`, filter: 'blur(60px)' }} />
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ width: '100%' }}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Home />
                </motion.div>
              } />
              <Route path="/category" element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Category />
                </motion.div>
              } />
              <Route path="/shelf" element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Shelf />
                </motion.div>
              } />
              <Route path="/setting" element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Setting />
                </motion.div>
              } />
              <Route path="/novel/:novelId" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <NovelDetail />
                </motion.div></LazyLoad>
              } />
              <Route path="/rank/:rankType" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <RankDetail />
                </motion.div></LazyLoad>
              } />
              <Route path="/category-detail/:channel/:sort/:categoryId/:categoryName" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <CategoryDetail />
                </motion.div></LazyLoad>
              } />
              <Route path="/login" element={
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <Login setIsLoggedIn={setIsLoggedIn} setUserInfo={setUserInfo} />
                </motion.div>
              } />
              <Route path="/reset-password" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <ResetPassword />
                </motion.div></LazyLoad>
              } />
              <Route path="/user" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <UserCenter setIsLoggedIn={setIsLoggedIn} setUserInfo={setUserInfo} />
                </motion.div></LazyLoad>
              } />
              <Route path="/reader/:novelId" element={
                <LazyLoad><Reader /></LazyLoad>
              } />
              <Route path="/search" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <SearchResult />
                </motion.div></LazyLoad>
              } />
              <Route path="/booksource" element={
                <LazyLoad><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                  <BookSourcePage />
                </motion.div></LazyLoad>
              } />
            </Routes>
          </AnimatePresence>
        </div>
        </div>
      </Content>
    </Layout>
    </AuthContext.Provider>
  );
};

// 导航栏组件
const Navbar = ({ currentThemeConfig, isDarkMode, isLoggedIn, userInfo, setIsDarkMode, setCurrentTheme, themeConfigs, glassMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);
  const [searchVisible, setSearchVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setSearchVisible(false);
  }, [location.pathname]);

  const isSmallScreen = screenWidth <= 768;
  const isMobile = screenWidth <= 480;

  const onSearch = (value) => {
    if (value && value.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(value.trim())}`);
      setSearchVisible(false);
    }
  };

  const userMenuItems = [
    ...(isLoggedIn ? [{
      key: 'user',
      icon: <UserOutlined />,
      label: userInfo?.username || '用户中心',
      onClick: () => navigate('/user')
    }] : [{
      key: 'login',
      icon: <UserOutlined />,
      label: '登录',
      onClick: () => navigate('/login', { state: { from: location.pathname + location.search } })
    }]),
    { type: 'divider' },
    {
      key: 'darkMode',
      icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />,
      label: isDarkMode ? '浅色模式' : '深色模式',
      onClick: () => {
        setIsDarkMode(!isDarkMode);
        localStorage.setItem('zifeng_dark_mode', String(!isDarkMode));
        localStorage.setItem('zifeng_manual_dark_override', 'true');
      }
    }
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path === '/') return '/';
    if (path.startsWith('/category')) return '/category';
    if (path.startsWith('/shelf')) return '/shelf';
    if (path.startsWith('/booksource')) return '/booksource';
    if (path.startsWith('/setting')) return '/setting';
    if (path.startsWith('/search')) return '/';
    if (path.startsWith('/novel/')) {
      const urlParams = new URLSearchParams(window.location.search);
      const from = urlParams.get('from');
      if (from === 'shelf') return '/shelf';
      if (from === 'category') return '/category';
    }
    if (path.startsWith('/reader/')) {
      const urlParams = new URLSearchParams(window.location.search);
      const from = urlParams.get('from');
      if (from === 'shelf') return '/shelf';
      if (from === 'category') return '/category';
    }
    if (path === '/login' || path === '/reset-password' || path === '/user') {
      const from = location.state?.from || '';
      if (from.startsWith('/shelf')) return '/shelf';
      if (from.startsWith('/category')) return '/category';
      if (from.startsWith('/novel/')) {
        const urlParams = new URLSearchParams(from.split('?')[1] || '');
        const fromParam = urlParams.get('from');
        if (fromParam === 'shelf') return '/shelf';
        if (fromParam === 'category') return '/category';
      }
    }
    return '/';
  };

  return (
    <Header 
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 1000, 
        width: '100%',
        background: glassMode
          ? (isDarkMode ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.7)')
          : (isDarkMode ? '#141414' : '#ffffff'),
        backdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
        WebkitBackdropFilter: glassMode ? 'blur(20px) saturate(1.2)' : 'none',
        boxShadow: glassMode
          ? `0 2px 16px ${isDarkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.06)'}`
          : '0 2px 8px rgba(0,0,0,0.1)',
        borderBottom: glassMode
          ? `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`
          : 'none',
        padding: isMobile ? '0 10px' : '0 20px',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 20, flex: '1 1 auto', minWidth: 0 }}>
          <NavLink to="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <Title level={4} style={{ margin: 0, color: currentThemeConfig.primaryColor, whiteSpace: 'nowrap' }}>
              <BookOutlined style={{ marginRight: isMobile ? 4 : 8 }} />
              {!isMobile && '紫枫免费小说'}
            </Title>
          </NavLink>
          <Menu
            mode="horizontal"
            style={{ 
              borderBottom: 'none',
              background: 'transparent',
              flex: '1 1 auto',
              minWidth: 0
            }}
            selectedKeys={[getSelectedKey()]}
            items={[
              { key: '/', icon: <HomeOutlined />, label: <NavLink to="/" style={{ textDecoration: 'none' }}>{isMobile ? '' : '首页'}</NavLink> },
              { key: '/category', icon: <AppstoreOutlined />, label: <NavLink to="/category" style={{ textDecoration: 'none' }}>{isMobile ? '' : '分类'}</NavLink> },
              { key: '/shelf', icon: <BookOutlined />, label: <NavLink to="/shelf" style={{ textDecoration: 'none' }}>{isMobile ? '' : '书架'}</NavLink> },
              { key: '/booksource', icon: <DatabaseOutlined />, label: <NavLink to="/booksource" style={{ textDecoration: 'none' }}>{isMobile ? '' : '书源'}</NavLink> },
              { key: '/setting', icon: <SettingOutlined />, label: <NavLink to="/setting" style={{ textDecoration: 'none' }}>{isMobile ? '' : '设置'}</NavLink> },
            ]}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 12, flexShrink: 0 }}>
          {isSmallScreen ? (
            <Space size={4}>
              {searchVisible && (
                <Input.Search
                  placeholder="搜索小说..."
                  onSearch={onSearch}
                  style={{ width: isMobile ? 120 : 160 }}
                  autoFocus
                />
              )}
              <Button
                type="text"
                icon={<SearchOutlined />}
                onClick={() => setSearchVisible(!searchVisible)}
              />
            </Space>
          ) : (
            <Search
              placeholder="搜索小说..."
              allowClear
              enterButton={<SearchOutlined />}
              size="middle"
              onSearch={onSearch}
              style={{ width: 'clamp(140px, 20vw, 250px)' }}
            />
          )}
          {isSmallScreen ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              {isLoggedIn ? (
                <Avatar size={28} src={userInfo?.avatar} icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
              ) : (
                <Button
                  type="text"
                  icon={<UserOutlined />}
                  style={{ color: currentThemeConfig.primaryColor }}
                />
              )}
            </Dropdown>
          ) : (
            <>
              {isLoggedIn ? (
                <NavLink to="/user" style={{ textDecoration: 'none' }}>
                  <Tooltip title="用户中心">
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 8,
                      padding: '4px 12px',
                      borderRadius: 10,
                      background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(24, 144, 255, 0.1)',
                      border: `1px solid ${currentThemeConfig.primaryColor}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      height: '36px'
                    }} onMouseEnter={(e) => {
                      e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(24, 144, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 2px 8px rgba(${currentThemeConfig.primaryColor.replace('#', '').match(/.{2}/g).map(c => parseInt(c, 16)).join(',')}, 0.3)`;
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.background = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(24, 144, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}>
                      <div style={{ 
                        width: 30, 
                        height: 30, 
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: `2px solid ${currentThemeConfig.primaryColor}`,
                        boxShadow: `0 2px 6px rgba(${currentThemeConfig.primaryColor.replace('#', '').match(/.{2}/g).map(c => parseInt(c, 16)).join(',')}, 0.4)`,
                        flexShrink: 0
                      }}>
                        {userInfo?.avatar ? (
                          <img 
                            src={userInfo.avatar} 
                            alt={userInfo.username} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{ 
                            width: '100%', 
                            height: '100%', 
                            backgroundColor: currentThemeConfig.primaryColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <UserOutlined style={{ color: '#fff', fontSize: 14 }} />
                          </div>
                        )}
                      </div>
                      <span style={{ 
                        color: currentThemeConfig.primaryColor,
                        fontWeight: 'bold',
                        fontSize: 14,
                        textShadow: `0 1px 2px rgba(0,0,0,0.1)`
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
                    style={{ 
                      borderColor: currentThemeConfig.primaryColor,
                      color: currentThemeConfig.primaryColor
                    }}
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
                onChange={(checked) => {
                  setIsDarkMode(checked);
                  localStorage.setItem('zifeng_dark_mode', String(checked));
                  localStorage.setItem('zifeng_manual_dark_override', 'true');
                }}
              />
            </>
          )}
        </div>
      </div>
    </Header>
  );
};

// 导出Context供其他组件使用
export { NovelContext, ThemeContext, themeConfigs };
export default App;
