import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { message } from 'antd';
import {
  BookOutlined,
  DeleteOutlined,
  UserOutlined,
  PlusOutlined,
  LoginOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { ThemeContext } from '../App';
import { AuthContext } from '../App';
import {
  getTocAPI,
  getBookshelf,
  removeFromBookshelf,
  getReadingHistory,
  getReadingProgress,
  deleteReadingHistory,
} from '../utils/apiClient';
import { getDefaultSource, saveReaderCache, simpleHash } from '../utils/novelConfig';
import { getBookSources } from '../utils/bookSourceManager';
import NovelCard from '../components/NovelCard';
import SectionHeader from '../components/SectionHeader';

/* ============================================================
   紫枫免费小说 · 书架页（Task 9 重构）
   - 顶部 Hero（渐变 + gradFlow 标题 + 统计）
   - 最近阅读：时间轴式列表（进度条 + 继续阅读 + 删除）
   - 我的收藏：NovelCard 响应式网格（6/4/2 列）+ 删除浮层
   - 空状态：图标圆 + 文案 + 引导按钮
   - 保留：getBookshelf/getReadingHistory 数据获取、删除逻辑、
           navigateToReader（TOC 解析）跳转
   参考：design/zifeng-pages-deep-dive.html .shelf-* / .history-*
   ============================================================ */

const REVEAL_EASE = [0.16, 1, 0.3, 1];

/* 阅读进度格式化 */
const formatProgress = (val) => {
  if (val == null || val === 0) return '0.0%';
  const p = val <= 1 ? val * 100 : val;
  return `${p.toFixed(1)}%`;
};

/* 流光进度条（参考原型 .progress / .progress-fill） */
const ProgressBar = ({ progress, style }) => {
  const percent = progress != null ? (progress <= 1 ? progress * 100 : progress) : 0;
  const clamped = Math.min(percent, 100);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 5,
        borderRadius: 3,
        background: 'var(--zf-glass-bg-strong)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          height: '100%',
          borderRadius: 3,
          width: `${clamped}%`,
          background:
            'linear-gradient(90deg, var(--zf-primary-500), var(--zf-accent-magenta))',
          boxShadow: '0 0 8px rgba(139,92,246,.6)',
          transition: 'width .8s var(--zf-ease-out)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)',
            animation: 'progressShine 2s linear infinite',
          }}
        />
      </div>
    </div>
  );
};

/* 骨架占位块（基于 skel keyframe，不用全屏 Spin） */
function Skel({ height, width = '100%', radius = 'var(--zf-r-md)' }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background:
          'linear-gradient(90deg, var(--zf-glass-bg) 25%, var(--zf-glass-bg-strong) 50%, var(--zf-glass-bg) 75%)',
        backgroundSize: '200% 100%',
        animation: 'skel 1.4s ease-in-out infinite',
      }}
    />
  );
}

/* 加载态：Hero + 网格骨架 */
function ShelfSkeleton() {
  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          padding: 'var(--zf-s12)',
          borderRadius: 'var(--zf-r-xl)',
          background:
            'linear-gradient(135deg, rgba(124,58,237,.18), rgba(236,72,153,.10))',
          border: '1px solid var(--zf-glass-border)',
          marginBottom: 'var(--zf-s8)',
        }}
      >
        <Skel height={44} width={260} radius="var(--zf-r-sm)" />
        <div style={{ marginTop: 12 }}>
          <Skel height={16} width={220} radius="var(--zf-r-sm)" />
        </div>
      </div>
      <div
        style={{
          padding: 'var(--zf-s6)',
          borderRadius: 'var(--zf-r-xl)',
          background: 'var(--zf-glass-bg)',
          border: '1px solid var(--zf-glass-border)',
        }}
      >
        <Skel height={28} width={180} radius="var(--zf-r-sm)" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 'var(--zf-s4)',
            marginTop: 'var(--zf-s5)',
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skel key={i} height={252} radius="var(--zf-r-md)" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* 主按钮（参考原型 .btn-primary） */
const BTN_PRIMARY = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontFamily: 'inherit',
  fontWeight: 600,
  fontSize: 'var(--zf-fs-base)',
  cursor: 'pointer',
  border: 'none',
  borderRadius: 'var(--zf-r-full)',
  padding: '11px 22px',
  color: '#fff',
  background:
    'linear-gradient(135deg, var(--zf-primary-600), var(--zf-primary-500))',
  boxShadow: '0 4px 14px rgba(139,92,246,.4)',
  transition: 'transform var(--zf-dur-fast) var(--zf-ease-out), box-shadow var(--zf-dur-fast)',
};

const BTN_PRIMARY_SM = {
  ...BTN_PRIMARY,
  fontSize: 'var(--zf-fs-sm)',
  padding: '7px 16px',
};

const BTN_ICON = {
  display: 'grid',
  placeItems: 'center',
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: '1px solid var(--zf-glass-border)',
  background: 'var(--zf-glass-bg)',
  color: 'var(--zf-text-muted)',
  cursor: 'pointer',
  flexShrink: 0,
  transition: 'all var(--zf-dur-fast) var(--zf-ease-out)',
};

const BTN_GLASS_SM = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: 'inherit',
  fontWeight: 600,
  fontSize: 'var(--zf-fs-sm)',
  cursor: 'pointer',
  border: '1px solid var(--zf-glass-border-strong)',
  borderRadius: 'var(--zf-r-full)',
  padding: '7px 14px',
  color: 'var(--zf-text-primary)',
  background: 'var(--zf-glass-bg-strong)',
  transition: 'all var(--zf-dur-fast) var(--zf-ease-out)',
};

const Shelf = () => {
  const navigate = useNavigate();
  const { themeConfigs, currentTheme, isDarkMode, glassMode } = useContext(ThemeContext);
  const { isLoggedIn, userInfo } = useContext(AuthContext);
  const primaryColor = themeConfigs[currentTheme].primaryColor;

  const [readingBooks, setReadingBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [navigatingBookId, setNavigatingBookId] = useState(null);
  const [loading, setLoading] = useState(true);

  /* —— 数据获取：保留原有 BookshelfController 调用逻辑 —— */
  useEffect(() => {
    let cancelled = false;
    const loadUserData = async () => {
      if (isLoggedIn && userInfo) {
        setLoading(true);
        try {
          const token = localStorage.getItem('zifeng_token');
          if (!token) {
            setLoading(false);
            return;
          }

          const [serverShelf, serverHistory] = await Promise.all([
            getBookshelf(),
            getReadingHistory(),
          ]);

          const mappedShelf = serverShelf.map((item) => ({
            id: item.bookUrl,
            name: item.bookName,
            author: item.author,
            cover: item.coverUrl,
            summary: item.summary,
            lastChapter: item.lastChapter,
            sourceUrl: item.sourceUrl,
            sourceName: item.sourceName,
            bookUrl: item.bookUrl,
            category: item.category,
            progress: item.progress || 0,
          }));

          const mappedHistory = serverHistory.map((item) => ({
            id: item.bookUrl,
            name: item.bookName,
            author: item.author,
            cover: item.coverUrl,
            summary: item.summary,
            lastChapter: item.lastChapter,
            sourceUrl: item.sourceUrl,
            sourceName: item.sourceName,
            bookUrl: item.bookUrl,
            chapterIndex: item.chapterIndex,
            chapterName: item.chapterName,
            progress: item.progress || 0,
            lastRead: item.lastRead,
          }));

          if (!cancelled) {
            setFavoriteBooks(mappedShelf);
            setReadingBooks(mappedHistory);
          }
        } catch (error) {
          console.error('加载用户数据失败:', error);
          if (error?.response?.status === 401) {
            message.warning('登录已过期，请重新登录');
          }
          if (!cancelled) {
            setFavoriteBooks([]);
            setReadingBooks([]);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      } else {
        setFavoriteBooks([]);
        setReadingBooks([]);
        setLoading(false);
      }
    };

    loadUserData();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, userInfo]);

  /* —— 删除逻辑：完整保留（shelf / history / singleHistory） —— */
  const handleRemoveBook = async (bookId, type) => {
    if (!isLoggedIn || !userInfo) return;

    try {
      if (type === 'shelf') {
        const book = favoriteBooks.find((b) => b.id === bookId);
        if (book && book.bookUrl) {
          await removeFromBookshelf(book.bookUrl);
        }
        setFavoriteBooks((prev) => prev.filter((book) => book.id !== bookId));
        message.success('移除成功');
      } else if (type === 'history') {
        await deleteReadingHistory();
        setReadingBooks([]);
        message.success('清空历史记录成功');
      } else if (type === 'singleHistory') {
        const book = readingBooks.find((b) => b.id === bookId);
        if (book && book.bookUrl) {
          await deleteReadingHistory(book.bookUrl);
        }
        setReadingBooks((prev) => prev.filter((book) => book.id !== bookId));
        message.success('删除成功');
      }
    } catch (error) {
      console.error('移除书籍失败:', error);
      message.error('移除失败，请稍后重试');
    }
  };

  /* —— 跳转阅读器：完整保留 TOC 解析 + 缓存 + navigate —— */
  const navigateToReader = async (bookId) => {
    setNavigatingBookId(bookId);
    try {
      const novelId = String(bookId);

      let sourceUrl = '';
      let bookUrl = novelId;
      let sourceName = '';
      let matchedBook = null;

      const shelfBook = favoriteBooks.find((b) => String(b.id) === novelId);
      if (shelfBook) {
        matchedBook = shelfBook;
      } else {
        const historyBook = readingBooks.find((b) => String(b.id) === novelId);
        if (historyBook) {
          matchedBook = historyBook;
        }
      }

      if (matchedBook) {
        sourceUrl = matchedBook.sourceUrl || '';
        bookUrl = matchedBook.bookUrl || novelId;
        sourceName = matchedBook.sourceName || '';
      }

      let effectiveSource = null;
      if (sourceUrl) {
        const allSources = getBookSources();
        effectiveSource = allSources.find((s) => s.bookSourceUrl === sourceUrl);
      }
      if (!effectiveSource) {
        const ds = getDefaultSource();
        effectiveSource = ds;
        sourceUrl = ds.bookSourceUrl;
      }

      const tocUrlTemplate = effectiveSource.ruleBookInfo?.tocUrl || '';
      let tocUrl = bookUrl;
      if (tocUrlTemplate && tocUrlTemplate.includes('{{')) {
        let extractedId = bookUrl;
        const bookUrlTemplate = effectiveSource.ruleSearch?.bookUrl || '';
        if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
          const templatePattern = bookUrlTemplate.replace(/\{\{[^}]+\}\}/g, '([^/?#]+)');
          const regex = new RegExp('^' + templatePattern + '$');
          const match = bookUrl.match(regex);
          if (match && match[1]) {
            extractedId = match[1];
          }
        }
        if (extractedId === bookUrl) {
          try {
            const urlPath = new URL(
              bookUrl.startsWith('http') ? bookUrl : 'http://dummy' + bookUrl
            ).pathname;
            const segments = urlPath.split('/').filter(Boolean);
            if (segments.length > 0) {
              extractedId = segments[segments.length - 1];
            }
          } catch {}
        }
        tocUrl = tocUrlTemplate.replace(/\{\{[^}]+\}\}/g, extractedId);
      }

      const bookData = {
        id: bookId,
        novelId: bookId,
        name: matchedBook?.name || '',
        author: matchedBook?.author || '',
        cover: matchedBook?.cover || '',
        summary: matchedBook?.summary || '',
        lastChapter: matchedBook?.lastChapter || '',
        sourceUrl,
        sourceName,
        bookUrl,
      };

      let savedChapterIndex = 0;
      if (isLoggedIn && userInfo) {
        const token = localStorage.getItem('zifeng_token');
        if (token && bookUrl) {
          try {
            const serverProgress = await getReadingProgress(bookUrl);
            if (serverProgress && typeof serverProgress.chapterIndex === 'number') {
              savedChapterIndex = serverProgress.chapterIndex;
            }
          } catch {}
        }
      }

      const result = await getTocAPI(effectiveSource, tocUrl, bookData);
      if (result.success && result.chapters && result.chapters.length > 0) {
        const chapters = result.chapters;
        if (savedChapterIndex >= chapters.length) {
          savedChapterIndex = chapters.length - 1;
        }
        saveReaderCache(bookData, sourceUrl, bookUrl, tocUrl, chapters);

        const readerParams = new URLSearchParams();
        readerParams.set('sourceUrl', sourceUrl);
        readerParams.set('bookUrl', bookUrl);
        readerParams.set('tocUrl', tocUrl);
        readerParams.set('chapterIndex', String(savedChapterIndex));
        readerParams.set('from', 'shelf');

        const bookKey = simpleHash(sourceUrl + '_' + bookUrl);
        navigate(`/reader/${bookKey}?${readerParams.toString()}`);
      } else {
        message.error('获取章节列表失败');
      }
    } catch (error) {
      console.error('获取章节列表失败:', error);
      message.error('获取章节列表失败，请稍后重试');
    } finally {
      setNavigatingBookId(null);
    }
  };

  /* —— 跳转首页发现好书 —— */
  const navigateToHome = () => {
    navigate('/');
  };

  /* —— 跳转登录（保留原 from=/shelf 回跳） —— */
  const navigateToLogin = () => {
    navigate('/login', { state: { from: '/shelf' } });
  };

  /* —— 未登录：登录提示卡 —— */
  if (!isLoggedIn || !userInfo) {
    return (
      <div style={{ padding: '0 0 40px 0' }}>
        <section
          style={{
            padding: 'var(--zf-s12)',
            borderRadius: 'var(--zf-r-xl)',
            background:
              'linear-gradient(135deg, rgba(124,58,237,.25), rgba(236,72,153,.15))',
            border: '1px solid var(--zf-glass-border-strong)',
            backdropFilter: 'var(--zf-blur-glass)',
            WebkitBackdropFilter: 'var(--zf-blur-glass)',
            marginBottom: 'var(--zf-s8)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 'var(--zf-fs-3xl)',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                background:
                  'linear-gradient(120deg, var(--zf-primary-400), var(--zf-accent-magenta), var(--zf-accent-cyan))',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                animation: 'gradFlow 4s linear infinite',
                display: 'inline-block',
              }}
            >
              我的书架
            </span>
          </h2>
          <p style={{ color: 'var(--zf-text-secondary)', margin: 0, fontSize: 'var(--zf-fs-md)' }}>
            登录后即可同步云端书架与阅读进度
          </p>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: REVEAL_EASE }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            padding: 'var(--zf-s16) var(--zf-s6)',
            borderRadius: 'var(--zf-r-xl)',
            background: 'var(--zf-glass-bg)',
            border: '1px solid var(--zf-glass-border)',
            backdropFilter: 'var(--zf-blur-light)',
            WebkitBackdropFilter: 'var(--zf-blur-light)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--zf-primary-400)',
              fontSize: 38,
              background:
                'radial-gradient(circle at 30% 30%, rgba(139,92,246,.25), rgba(139,92,246,.05))',
              border: '1px solid var(--zf-glass-border-strong)',
              boxShadow: 'var(--zf-glow-primary)',
            }}
          >
            <UserOutlined />
          </div>
          <div
            style={{
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 'var(--zf-fs-xl)',
              fontWeight: 700,
              color: 'var(--zf-text-primary)',
            }}
          >
            请先登录以查看您的书架
          </div>
          <p style={{ color: 'var(--zf-text-muted)', margin: 0, fontSize: 'var(--zf-fs-sm)' }}>
            登录后即可收藏书籍、记录进度、跨设备阅读
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={navigateToLogin}
            style={BTN_PRIMARY}
          >
            <LoginOutlined /> 立即登录
          </motion.button>
        </motion.div>
      </div>
    );
  }

  /* —— 加载态：骨架屏（不用全屏 Spin） —— */
  if (loading) {
    return <ShelfSkeleton />;
  }

  const totalCount = favoriteBooks.length + readingBooks.length;
  const isAllEmpty = favoriteBooks.length === 0 && readingBooks.length === 0;

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* —— 响应式网格：6/4/2 列 —— */}
      <style>{`
        .zf-shelf-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));
          gap:var(--zf-s4);
        }
        .zf-shelf-card-wrap{position:relative}
        .zf-shelf-del{
          position:absolute; top:8px; right:8px; z-index:5;
          width:30px; height:30px; border-radius:50%;
          display:grid; place-items:center;
          background:rgba(11,8,20,.72);
          color:#FCA5A5;
          border:1px solid rgba(244,63,94,.35);
          cursor:pointer;
          opacity:0;
          transform:scale(.85);
          transition:all var(--zf-dur-fast) var(--zf-ease-out);
          backdrop-filter:blur(6px);
          -webkit-backdrop-filter:blur(6px);
        }
        .zf-shelf-card-wrap:hover .zf-shelf-del{opacity:1; transform:scale(1)}
        .zf-shelf-del:hover{
          background:rgba(244,63,94,.85);
          color:#fff;
          border-color:rgba(244,63,94,.6);
          box-shadow:0 0 14px rgba(244,63,94,.5);
        }
        .zf-shelf-loading{
          position:absolute; inset:0;
          display:grid; place-items:center;
          background:rgba(11,8,20,.55);
          backdrop-filter:blur(4px);
          -webkit-backdrop-filter:blur(4px);
          border-radius:var(--zf-r-md);
          color:var(--zf-primary-300);
          font-size:24px;
          z-index:6;
        }
        @keyframes zf-spin{to{transform:rotate(360deg)}}
        .zf-spin{animation:zf-spin 0.8s linear infinite}
      `}</style>

      {/* ============== Hero 区 ============== */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: REVEAL_EASE }}
        style={{
          padding: 'var(--zf-s12)',
          borderRadius: 'var(--zf-r-xl)',
          background:
            'linear-gradient(135deg, rgba(124,58,237,.25), rgba(236,72,153,.15))',
          border: '1px solid var(--zf-glass-border-strong)',
          backdropFilter: 'var(--zf-blur-glass)',
          WebkitBackdropFilter: 'var(--zf-blur-glass)',
          marginBottom: 'var(--zf-s8)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--zf-font-serif)',
            fontSize: 'var(--zf-fs-3xl)',
            fontWeight: 900,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 12,
          }}
        >
          <span
            style={{
              background:
                'linear-gradient(120deg, var(--zf-primary-400), var(--zf-accent-magenta), var(--zf-accent-cyan))',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              animation: 'gradFlow 4s linear infinite',
              display: 'inline-block',
            }}
          >
            我的书架
          </span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 'var(--zf-r-full)',
              fontSize: 'var(--zf-fs-sm)',
              fontWeight: 600,
              color: 'var(--zf-primary-300)',
              background: 'rgba(139,92,246,.18)',
              border: '1px solid rgba(139,92,246,.30)',
            }}
          >
            <BookOutlined /> 共 {totalCount} 本
          </span>
          {favoriteBooks.length > 0 && (
            <span
              style={{
                fontSize: 'var(--zf-fs-sm)',
                color: 'var(--zf-text-secondary)',
              }}
            >
              收藏 {favoriteBooks.length} · 在读 {readingBooks.length}
            </span>
          )}
        </div>
      </motion.section>

      {/* ============== 最近阅读（时间轴列表） ============== */}
      {readingBooks.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: REVEAL_EASE }}
          style={{ marginBottom: 'var(--zf-s10)' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderRadius: 'var(--zf-r-lg)',
              background: 'var(--zf-glass-bg)',
              border: '1px solid var(--zf-glass-border)',
              backdropFilter: 'var(--zf-blur-light)',
              WebkitBackdropFilter: 'var(--zf-blur-light)',
              marginBottom: 'var(--zf-s5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontSize: 18,
                  background:
                    'linear-gradient(135deg, var(--zf-accent-cyan), #0E7490)',
                }}
              >
                <ClockCircleOutlined />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: 'var(--zf-font-serif)',
                    fontSize: 'var(--zf-fs-lg)',
                    fontWeight: 700,
                    color: 'var(--zf-text-primary)',
                    lineHeight: 1.2,
                  }}
                >
                  最近阅读
                </div>
                <div style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)', marginTop: 1 }}>
                  {readingBooks.length} 本在读 · 进度自动同步
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleRemoveBook(null, 'history')}
              style={BTN_GLASS_SM}
            >
              <DeleteOutlined /> 清空历史
            </motion.button>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--zf-s3)',
            }}
          >
            {readingBooks.map((book, idx) => (
              <motion.div
                key={book.id || idx}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, ease: REVEAL_EASE, delay: idx * 0.06 }}
                whileHover={{ x: 4 }}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: 14,
                  borderRadius: 'var(--zf-r-lg)',
                  background: 'var(--zf-glass-bg)',
                  border: '1px solid var(--zf-glass-border)',
                  backdropFilter: 'var(--zf-blur-light)',
                  WebkitBackdropFilter: 'var(--zf-blur-light)',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* 时间轴竖线装饰 */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 3,
                    background:
                      'linear-gradient(180deg, var(--zf-primary-500), var(--zf-accent-magenta))',
                    opacity: 0.6,
                  }}
                />
                {/* 封面 */}
                <div
                  style={{
                    width: 54,
                    height: 72,
                    borderRadius: 'var(--zf-r-sm)',
                    overflow: 'hidden',
                    flexShrink: 0,
                    background: 'var(--zf-glass-bg-strong)',
                  }}
                >
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--zf-text-faint)',
                        fontSize: 18,
                      }}
                    >
                      <BookOutlined />
                    </div>
                  )}
                </div>

                {/* 信息：标题 + 章节 + 进度条 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: 'var(--zf-font-serif)',
                      fontSize: 'var(--zf-fs-md)',
                      fontWeight: 700,
                      color: 'var(--zf-text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 3,
                    }}
                  >
                    {book.name}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--zf-fs-xs)',
                      color: 'var(--zf-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 8,
                    }}
                  >
                    {book.author ? `${book.author} · ` : ''}
                    {book.chapterName || '未读'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ flex: 1, maxWidth: 220 }}>
                      <ProgressBar progress={book.progress} />
                    </div>
                    <span
                      style={{
                        fontSize: 'var(--zf-fs-xs)',
                        fontWeight: 600,
                        color: 'var(--zf-primary-300)',
                        flexShrink: 0,
                      }}
                    >
                      {formatProgress(book.progress)}
                    </span>
                  </div>
                </div>

                {/* 操作：继续阅读 + 删除 */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => navigateToReader(book.id)}
                    style={BTN_PRIMARY_SM}
                  >
                    继续
                  </motion.button>
                  <button
                    onClick={() => handleRemoveBook(book.id, 'singleHistory')}
                    style={BTN_ICON}
                    title="删除此记录"
                  >
                    <DeleteOutlined />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ============== 我的收藏（NovelCard 网格） ============== */}
      {favoriteBooks.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.7, ease: REVEAL_EASE }}
        >
          <SectionHeader
            icon="fire"
            title="我的收藏"
            subtitle={`共 ${favoriteBooks.length} 本好书`}
          />
          <div className="zf-shelf-grid">
            {favoriteBooks.map((book, idx) => (
              <motion.div
                key={book.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.5, ease: REVEAL_EASE, delay: idx * 0.05 }}
                className="zf-shelf-card-wrap"
              >
                <NovelCard
                  novel={book}
                  index={idx}
                  color={primaryColor}
                  glassMode={glassMode}
                  isDarkMode={isDarkMode}
                  onClick={() => navigateToReader(book.id)}
                />
                {/* 删除浮层按钮（hover 显示） */}
                <button
                  className="zf-shelf-del"
                  onClick={() => handleRemoveBook(book.id, 'shelf')}
                  title="移出书架"
                >
                  <DeleteOutlined style={{ fontSize: 14 }} />
                </button>
                {/* navigating 加载蒙层 */}
                {navigatingBookId === book.id && (
                  <div className="zf-shelf-loading">
                    <div className="zf-spin">
                      <ClockCircleOutlined />
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ============== 双空状态：书架空空如也 ============== */}
      {isAllEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: REVEAL_EASE }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            padding: 'var(--zf-s16) var(--zf-s6)',
            borderRadius: 'var(--zf-r-xl)',
            background: 'var(--zf-glass-bg)',
            border: '1px solid var(--zf-glass-border)',
            backdropFilter: 'var(--zf-blur-light)',
            WebkitBackdropFilter: 'var(--zf-blur-light)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              color: 'var(--zf-primary-400)',
              fontSize: 52,
              background:
                'radial-gradient(circle at 30% 30%, rgba(139,92,246,.22), rgba(139,92,246,.05))',
              border: '1px solid var(--zf-glass-border-strong)',
              boxShadow: 'var(--zf-glow-primary)',
              animation: 'floatDemo 3s ease-in-out infinite',
            }}
          >
            <BookOutlined />
          </div>
          <div
            style={{
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 'var(--zf-fs-2xl)',
              fontWeight: 700,
              color: 'var(--zf-text-primary)',
            }}
          >
            书架空空如也
          </div>
          <p style={{ color: 'var(--zf-text-muted)', margin: 0, fontSize: 'var(--zf-fs-sm)', maxWidth: 380 }}>
            还没有收藏任何书籍，去发现精彩好书加入你的书架吧
          </p>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={navigateToHome}
            style={BTN_PRIMARY}
          >
            <PlusOutlined /> 去发现好书
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

export default Shelf;
