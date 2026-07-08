/* ============================================================
   紫枫免费小说 · 应用根组件 (App)
   职责: orchestrator — 挂载 Context, 渲染路由
   抽取:
   - config/themes.js      => 主题配置 / 榜单 URL
   - hooks/useTheme.js     => 主题状态管理
   - hooks/useAuth.js      => 认证状态管理
   - hooks/useRankData.js  => 榜单数据获取
   - contexts/*.jsx        => React Context 定义
   - components/Navbar.jsx => 导航栏组件
   - components/ErrorBoundary.jsx => 错误边界 / 懒加载包装
   ============================================================ */

import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfigProvider, theme, Layout } from 'antd';
import { AuthContext } from './contexts/AuthContext';
import Home from './pages/Home';
import Category from './pages/Category';
import Shelf from './pages/Shelf';
import Setting from './pages/Setting';
import Login from './pages/Login';
import FeedbackButton from './components/FeedbackButton';
import Navbar from './components/Navbar';
import { LazyLoad } from './components/ErrorBoundary';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useRankData } from './hooks/useRankData';
import { NovelContext } from './contexts/NovelContext';
import { ThemeContext } from './contexts/ThemeContext';
import NovelBackground from './components/NovelBackground';
import './App.css';

const { Content } = Layout;

const ROUTE_CHAR_MAP = {
  '/': '阅',
  '/shelf': '藏',
  '/category': '寻',
  '/setting': '韵',
  '/login': '归',
  '/user': '己',
};

const getRouteChar = (pathname) => {
  if (pathname.startsWith('/novel/')) return '墨';
  if (pathname.startsWith('/reader/')) return '静';
  if (pathname.startsWith('/search')) return '寻';
  return ROUTE_CHAR_MAP[pathname] || '阅';
};

const NovelDetail = lazy(() => import('./pages/NovelDetail'));
const RankDetail = lazy(() => import('./pages/RankDetail'));
const CategoryDetail = lazy(() => import('./pages/CategoryDetail'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const UserCenter = lazy(() => import('./pages/UserCenter'));
const Reader = lazy(() => import('./pages/Reader'));
const SearchResult = lazy(() => import('./pages/SearchResult'));
const BookSourcePage = lazy(() => import('./pages/BookSourcePage'));

function App() {
  const themeState = useTheme();
  const authState = useAuth();
  const rankState = useRankData();
  const { novels, loading } = rankState;

  return (
    <Router>
      <ConfigProvider
        theme={{
          algorithm: themeState.isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: themeState.currentThemeConfig.primaryColor,
            colorBgContainer: themeState.isDarkMode ? '#141414' : '#ffffff',
            colorBgLayout: themeState.isDarkMode ? '#000000' : '#f0f2f5',
            borderRadius: 12,
            fontSize: themeState.globalFontSize,
          },
        }}
      >
        <NovelContext.Provider value={{ novels, loading }}>
          <ThemeContext.Provider value={themeState}>
            <AppLayout themeState={themeState} authState={authState} glassMode={themeState.glassMode} />
          </ThemeContext.Provider>
        </NovelContext.Provider>
      </ConfigProvider>
    </Router>
  );
}

const AppLayout = ({ themeState, authState, glassMode }) => {
  const location = useLocation();
  const isReaderPage = location.pathname.startsWith('/reader');
  const isSearchPage = location.pathname.startsWith('/search');

  const { isDarkMode, currentThemeConfig, setIsDarkMode } = themeState;
  const { isLoggedIn, userInfo, setIsLoggedIn, setUserInfo } = authState;

  return (
    <AuthContext.Provider value={{ ...authState }}>
      <Layout className="app-layout" style={{ minHeight: '100vh' }}>
        {!isReaderPage && !isSearchPage && (
          <Navbar
            currentThemeConfig={currentThemeConfig}
            isDarkMode={isDarkMode}
            isLoggedIn={isLoggedIn}
            userInfo={userInfo}
            setIsDarkMode={setIsDarkMode}
            glassMode={glassMode}
          />
        )}
        <Content
          style={{
            padding: isReaderPage ? 0 : '24px 20px',
            background: glassMode
              ? (isDarkMode ? 'linear-gradient(135deg, #0a0a0a 0%, #0d0d1a 50%, #0a0a0a 100%)' : 'linear-gradient(135deg, #e8ecf1 0%, #f0f2f5 50%, #e8ecf1 100%)')
              : (isDarkMode ? '#000000' : '#f0f2f5'),
            position: 'relative',
            transition: 'background 0.5s ease'
          }}
        >
          {glassMode && !isReaderPage && <GlassBackground currentThemeConfig={currentThemeConfig} />}
          {!isReaderPage && !isSearchPage && (
            <NovelBackground
              char={getRouteChar(location.pathname)}
              primaryColor={currentThemeConfig.primaryColor}
              colors={currentThemeConfig.colors}
            />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ width: '100%' }}>
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<PageTransition><Home /></PageTransition>} />
                  <Route path="/category" element={<PageTransition><Category /></PageTransition>} />
                  <Route path="/shelf" element={<PageTransition><Shelf /></PageTransition>} />
                  <Route path="/setting" element={<PageTransition><Setting /></PageTransition>} />
                  <Route path="/novel/:novelId" element={<LazyLoadChild><NovelDetail /></LazyLoadChild>} />
                  <Route path="/rank/:rankType" element={<LazyLoadChild><RankDetail /></LazyLoadChild>} />
                  <Route path="/category-detail/:channel/:sort/:categoryId/:categoryName" element={<LazyLoadChild><CategoryDetail /></LazyLoadChild>} />
                  <Route path="/login" element={<PageTransition><Login setIsLoggedIn={setIsLoggedIn} setUserInfo={setUserInfo} /></PageTransition>} />
                  <Route path="/reset-password" element={<LazyLoadChild><ResetPassword /></LazyLoadChild>} />
                  <Route path="/user" element={<LazyLoadChild><UserCenter setIsLoggedIn={setIsLoggedIn} setUserInfo={setUserInfo} /></LazyLoadChild>} />
                  <Route path="/reader/:novelId" element={<LazyLoadChild><Reader /></LazyLoadChild>} />
                  <Route path="/search" element={<LazyLoadChild><SearchResult /></LazyLoadChild>} />
                  <Route path="/booksource" element={<LazyLoadChild><BookSourcePage /></LazyLoadChild>} />
                </Routes>
              </AnimatePresence>
            </div>
          </div>
        </Content>
        {isLoggedIn && <FeedbackButton />}
      </Layout>
    </AuthContext.Provider>
  );
};

/* ===== 路由过渡包装 ===== */
const pageTransition = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

const PageTransition = ({ children }) => (
  <motion.div {...pageTransition}>{children}</motion.div>
);

const LazyLoadChild = ({ children }) => (
  <LazyLoad><motion.div {...pageTransition}>{children}</motion.div></LazyLoad>
);

/* ===== 玻璃背景光晕 ===== */
const GlassBackground = React.memo(({ currentThemeConfig }) => {
  const primaryRgb = currentThemeConfig.primaryColor || '#8B5CF6';
  const colors = currentThemeConfig.colors || [];

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '5%', right: '-5%', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${primaryRgb}25 0%, transparent 70%)`, filter: 'blur(100px)', animation: 'glassFloat1 20s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: `radial-gradient(circle, ${colors[2] || primaryRgb}1a 0%, transparent 70%)`, filter: 'blur(90px)', animation: 'glassFloat2 25s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '50%', left: '35%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${primaryRgb}18 0%, transparent 70%)`, filter: 'blur(80px)', animation: 'glassFloat3 22s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '20%', left: '10%', width: 350, height: 350, borderRadius: '50%', background: `radial-gradient(circle, ${colors[3] || primaryRgb}14 0%, transparent 70%)`, filter: 'blur(70px)', animation: 'glassFloat4 28s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '25%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${colors[1] || primaryRgb}12 0%, transparent 70%)`, filter: 'blur(65px)', animation: 'glassFloat5 24s ease-in-out infinite' }} />
    </div>
  );
});

export { NovelContext, ThemeContext, AuthContext };
export default App;
