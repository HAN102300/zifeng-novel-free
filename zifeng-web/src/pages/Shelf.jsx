import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button, Segmented, message } from 'antd';
import {
  BookOutlined,
  DeleteOutlined,
  UserOutlined,
  PlusOutlined,
  LoginOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  StarOutlined,
} from '@ant-design/icons';
import { ThemeContext, AuthContext } from '../App';
import {
  getBookshelf,
  removeFromBookshelf,
  getReadingHistory,
  deleteReadingHistory,
} from '../utils/apiClient';
import { simpleHash } from '../utils/novelConfig';
import {
  ZfPageShell,
  ZfGrid,
  ZfPageHeader,
  ZfSectionTitle,
  ZfPill,
  ZfCoverCard,
  ZfSkeleton,
  ZfSkeletonGrid,
  ZfEmptyState,
} from '@zifeng/ui/components';
import { variants } from '@zifeng/ui/motion';
import { useBreakpoint } from '@zifeng/ui/hooks';
import { splitTags } from '@zifeng/ui/format';

/* ============================================================
   紫枫免费小说 · 书架页（P2 迁移）
   - 两种卡片语言（玻璃网格卡 + .zf-shelf-list-item 列表项）收敛为
     同一信息结构：grid 用 ZfCoverCard，list 用行式布局，字段顺序一致
   - 「我的书架」不再用 violet→pink→cyan 三色渐变文字（功能型标题被
     过度装饰 + 浅色下对比度不足）→ ZfPageHeader 常规标题色
   - 容器走 ZfPageShell size="lg"，横幅不再拉满全宽
   - 横幅副标题与空状态副标题文案重复 → 只在空态说一次
   - 行式容器刻意不带 backdrop-filter：进度条的流光 infinite 动画
     必须落在无重采样的父层里（合成器铁律）
   - 骨架 → ZfSkeleton / ZfSkeletonGrid；空态/未登录 → ZfEmptyState
   - 页面内的内联 style 标签块与 skel/progressShine/floatDemo 等旧 keyframe 全部清除
   - 保留：getBookshelf/getReadingHistory 取数、删除逻辑、
           navigateToReader 的 TOC 解析 + 进度恢复 + 缓存 + navigate
   ============================================================ */

/* 阅读进度格式化 */
const formatProgress = (val) => {
  if (val == null || val === 0) return '0.0%';
  const p = val <= 1 ? val * 100 : val;
  return `${p.toFixed(1)}%`;
};

const progressPercent = (val) => {
  const percent = val != null ? (val <= 1 ? val * 100 : val) : 0;
  return Math.min(percent, 100);
};

/* 行式容器底色：半透明但不重采样 backdrop */
const ROW_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s4)',
  padding: 'var(--zf-s4)',
  borderRadius: 'var(--zf-r-lg)',
  background: 'var(--zf-glass-1)',
  border: '1px solid var(--zf-glass-border)',
  boxShadow: 'var(--zf-shadow-1)',
  position: 'relative',
  minWidth: 0,
  cursor: 'pointer',
};

/* 版式预设：同一组合在 grid / list 两视图各写一次，收敛为常量避免重复声明 */
const COL5 = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)', minWidth: 0 };
const COL6 = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s6)', minWidth: 0 };
const ROW3 = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)', minWidth: 0 };
const BODY = { flex: 1, minWidth: 0 };
const FLEX1 = { flex: 1 };
const CELL_WRAP = { position: 'relative', minWidth: 0 };
const DEL_SLOT = { position: 'absolute', top: 'var(--zf-s3)', right: 'var(--zf-s3)' };
const PCT = { fontSize: 'var(--zf-fs-2xs)', color: 'var(--zf-text-faint)', flexShrink: 0 };
const NARROW = { maxWidth: 220 };

/** 阅读进度条：流光走 --zf-fx-shimmer 总闸，tier 0 静止但仍可读。
 *  flow=false 用于落在玻璃卡内部的场景（infinite 动画不得是 backdrop-filter 的子孙） */
const ProgressBar = ({ progress, style, flow = true }) => (
  <div
    style={{
      width: '100%',
      height: 5,
      borderRadius: 'var(--zf-r-full)',
      background: 'var(--zf-glass-3)',
      overflow: 'hidden',
      ...style,
    }}
  >
    <div
      className={flow ? 'zf-anim-grad-flow' : undefined}
      style={{
        height: '100%',
        borderRadius: 'var(--zf-r-full)',
        width: `${progressPercent(progress)}%`,
        background:
          'linear-gradient(90deg, var(--zf-brand-600), var(--zf-brand-400), var(--zf-brand-600))',
        backgroundSize: '200% auto',
        transition: 'width var(--zf-dur-slower) var(--zf-ease-out)',
      }}
    />
  </div>
);

/** 进度行：grid 卡片与 list 行共用，保证两种视图信息同构 */
function ProgressLine({ book, flow = true, barStyle = FLEX1 }) {
  return (
    <div style={ROW3}>
      <ProgressBar progress={book.progress} flow={flow} style={barStyle} />
      <span className="zf-num" style={PCT}>
        {formatProgress(book.progress)}
      </span>
    </div>
  );
}

/** 标签行：最多两枚，超出交给详情页 */
function BookMeta({ book }) {
  const tags = book.tags?.slice(0, 2) ?? (book.category ? [book.category] : []);
  if (tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', flexWrap: 'wrap', minWidth: 0 }}>
      {tags.map((t) => (
        <ZfPill key={t} size="xs">
          {t}
        </ZfPill>
      ))}
    </div>
  );
}

/** 删除按钮：始终可见（hover 才显形在触屏上等于不可发现） */
function RemoveButton({ onClick, title }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      aria-label={title}
      style={{
        display: 'grid',
        placeItems: 'center',
        width: 30,
        height: 30,
        borderRadius: 'var(--zf-r-full)',
        border: '1px solid var(--zf-glass-border)',
        background: 'var(--zf-glass-2)',
        color: 'var(--zf-status-error)',
        cursor: 'pointer',
        fontSize: 'var(--zf-fs-sm)',
        flexShrink: 0,
      }}
    >
      <DeleteOutlined />
    </motion.button>
  );
}

const Shelf = () => {
  const navigate = useNavigate();
  const { glassMode } = useContext(ThemeContext);
  const { isLoggedIn, userInfo } = useContext(AuthContext);
  const { up, isMobile } = useBreakpoint();

  const [readingBooks, setReadingBooks] = useState([]);
  const [favoriteBooks, setFavoriteBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState(
    () => localStorage.getItem('shelf_layout_mode') || 'grid'
  );
  const [historyLayoutMode, setHistoryLayoutMode] = useState(
    () => localStorage.getItem('shelf_history_layout_mode') || 'list'
  );

  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('shelf_layout_mode', mode);
  };

  const handleHistoryLayoutChange = (mode) => {
    setHistoryLayoutMode(mode);
    localStorage.setItem('shelf_history_layout_mode', mode);
  };

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

          const mappedShelf = serverShelf.map((item) => {
            const tags = splitTags(item.category);
            return {
              id: item.bookUrl,
              name: item.bookName,
              author: item.author,
              cover: item.coverUrl,
              summary: item.summary,
              lastChapter: item.lastChapter,
              sourceUrl: item.sourceUrl,
              sourceName: item.sourceName,
              bookUrl: item.bookUrl,
              category: tags[0] || item.category,
              tags,
              progress: item.progress || 0,
            };
          });

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
            tags: splitTags(item.category),
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

  /* —— 跳转阅读器 ——
     目录获取、进度恢复、书源兜底全部交给 Reader：它自带 reader 缓存快路径、
     tocUrl 相对转绝对、备选书源与超时错误态。这里此前复制了一份 TOC 解析，
     少了「相对 tocUrl 拼成绝对 URL」那一步，从书架进入必然拉取失败。 */
  const navigateToReader = (bookId) => {
    const novelId = String(bookId);
    const matchedBook =
      favoriteBooks.find((b) => String(b.id) === novelId) ||
      readingBooks.find((b) => String(b.id) === novelId);

    const sourceUrl = matchedBook?.sourceUrl || '';
    const bookUrl = matchedBook?.bookUrl || novelId;

    const readerParams = new URLSearchParams();
    readerParams.set('sourceUrl', sourceUrl);
    readerParams.set('bookUrl', bookUrl);
    readerParams.set('from', 'shelf');

    navigate(`/reader/${simpleHash(`${sourceUrl}_${bookUrl}`)}?${readerParams.toString()}`);
  };

  const navigateToHome = () => navigate('/');
  const navigateToLogin = () => navigate('/login', { state: { from: '/shelf' } });

  const cols = up('lg') ? 6 : isMobile ? 3 : 5;

  const gridStyle = useMemo(
    () => ({ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 'var(--zf-s4)' }),
    [cols]
  );

  /* —— 未登录：只留一张引导卡，不再叠一层渐变横幅 —— */
  if (!isLoggedIn || !userInfo) {
    return (
      <ZfPageShell size="lg">
        <div style={COL6}>
          <ZfPageHeader title="我的书架" subtitle="书架与阅读进度保存在云端，换设备登录后自动续读。" />
          <ZfEmptyState
            icon={<UserOutlined />}
            title="请先登录"
            description="登录后可收藏书籍、记录章节进度并跨设备续读。"
            action={
              <Button
                classNames={{ root: 'zf-btn zf-btn--brand' }}
                icon={<LoginOutlined />}
                onClick={navigateToLogin}
              >
                立即登录
              </Button>
            }
          />
        </div>
      </ZfPageShell>
    );
  }

  /* —— 加载态：骨架屏 —— */
  if (loading) {
    return (
      <ZfPageShell size="lg">
        <div style={COL6}>
          <ZfSkeleton variant="text" width={180} height={26} />
          <ZfSkeletonGrid count={isMobile ? 3 : 8} />
        </div>
      </ZfPageShell>
    );
  }

  const totalCount = favoriteBooks.length + readingBooks.length;
  const isAllEmpty = favoriteBooks.length === 0 && readingBooks.length === 0;

  return (
    <ZfPageShell size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s10)' }}>
        {/* ============== 页头：空书架时不在这里重复空态文案 ============== */}
        <ZfPageHeader
          title="我的书架"
          subtitle={isAllEmpty ? undefined : '收藏与在读分开管理，进度自动同步'}
          extra={
            isAllEmpty ? null : (
              <>
                <ZfPill tone="brand" icon={<BookOutlined />}>
                  共 {totalCount} 本
                </ZfPill>
                <ZfPill>收藏 {favoriteBooks.length}</ZfPill>
                <ZfPill>在读 {readingBooks.length}</ZfPill>
              </>
            )
          }
        />

        {/* ============== 我的收藏 ============== */}
        {favoriteBooks.length > 0 ? (
          <motion.section
            variants={variants.reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            style={COL5}
          >
            <ZfSectionTitle
              animated={false}
              variant="line"
              title="我的收藏"
              sub={`共 ${favoriteBooks.length} 本`}
              icon={<StarOutlined />}
              extra={
                <Segmented
                  value={layoutMode}
                  onChange={handleLayoutChange}
                  options={[
                    { value: 'grid', icon: <AppstoreOutlined /> },
                    { value: 'list', icon: <UnorderedListOutlined /> },
                  ]}
                />
              }
            />

            {layoutMode === 'grid' ? (
              <div style={gridStyle}>
                {favoriteBooks.map((book, idx) => (
                  <motion.div
                    key={book.id || idx}
                    layout
                    variants={variants.cardIn}
                    initial="initial"
                    animate="animate"
                    style={CELL_WRAP}
                  >
                    <ZfCoverCard
                      novel={book}
                      size="md"
                      glass={glassMode}
                      onOpen={() => navigateToReader(book.id)}
                      footer={<ProgressLine book={book} flow={false} />}
                    />
                    <div style={DEL_SLOT}>
                      <RemoveButton onClick={() => handleRemoveBook(book.id, 'shelf')} title="移出书架" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <ZfGrid columns={1} gap="var(--zf-s3)">
                {favoriteBooks.map((book, idx) => (
                  <motion.div
                    key={book.id || idx}
                    layout
                    variants={variants.listRise}
                    initial="initial"
                    animate="animate"
                    whileHover={{ x: 4 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateToReader(book.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateToReader(book.id);
                      }
                    }}
                    style={ROW_STYLE}
                  >
                    <ShelfCover book={book} />
                    <div style={BODY}>
                      <BookTitle book={book} />
                      <BookLine text={`${book.author || '佚名'}${book.sourceName ? ` · ${book.sourceName}` : ''}`} />
                      {book.lastChapter ? <BookLine text={`最新 · ${book.lastChapter}`} /> : null}
                      {book.summary ? (
                        <div className="zf-clamp-2" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-secondary)' }}>
                          {book.summary}
                        </div>
                      ) : null}
                      <ProgressLine book={book} barStyle={NARROW} />
                      <BookMeta book={book} />
                    </div>
                    <RemoveButton onClick={() => handleRemoveBook(book.id, 'shelf')} title="移出书架" />
                  </motion.div>
                ))}
              </ZfGrid>
            )}
          </motion.section>
        ) : null}

        {/* ============== 最近阅读 ============== */}
        {readingBooks.length > 0 ? (
          <motion.section
            variants={variants.reveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            style={COL5}
          >
            <ZfSectionTitle
              animated={false}
              variant="line"
              title="最近阅读"
              sub={`${readingBooks.length} 本在读 · 进度自动同步`}
              icon={<ClockCircleOutlined />}
              extra={
                <div style={ROW3}>
                  <Segmented
                    value={historyLayoutMode}
                    onChange={handleHistoryLayoutChange}
                    options={[
                      { value: 'grid', icon: <AppstoreOutlined /> },
                      { value: 'list', icon: <UnorderedListOutlined /> },
                    ]}
                  />
                  <Button
                    size="small"
                    classNames={{ root: 'zf-btn zf-btn--ghost' }}
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveBook(null, 'history')}
                  >
                    清空历史
                  </Button>
                </div>
              }
            />

            {historyLayoutMode === 'grid' ? (
              <div style={gridStyle}>
                {readingBooks.map((book, idx) => (
                  <motion.div
                    key={book.id || idx}
                    layout
                    variants={variants.cardIn}
                    initial="initial"
                    animate="animate"
                    style={CELL_WRAP}
                  >
                    <ZfCoverCard
                      novel={book}
                      size="md"
                      glass={glassMode}
                      onOpen={() => navigateToReader(book.id)}
                      footer={<ProgressLine book={book} flow={false} />}
                    />
                    <div style={DEL_SLOT}>
                      <RemoveButton onClick={() => handleRemoveBook(book.id, 'singleHistory')} title="删除此记录" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <ZfGrid columns={1} gap="var(--zf-s3)">
                {readingBooks.map((book, idx) => (
                  <motion.div
                    key={book.id || idx}
                    layout
                    variants={variants.listRise}
                    initial="initial"
                    animate="animate"
                    whileHover={{ x: 4 }}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigateToReader(book.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigateToReader(book.id);
                      }
                    }}
                    style={ROW_STYLE}
                  >
                    {/* 位次式品牌竖条：与阅读进度同一语义，不再是无意义装饰 */}
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 'var(--zf-s3)',
                        bottom: 'var(--zf-s3)',
                        width: 3,
                        borderRadius: '0 var(--zf-r-full) var(--zf-r-full) 0',
                        background: 'var(--zf-grad-brand)',
                        opacity: 0.7,
                      }}
                    />
                    <ShelfCover book={book} />
                    <div style={BODY}>
                      <BookTitle book={book} />
                      <BookLine text={`${book.author ? `${book.author} · ` : ''}${book.chapterName || '未读'}`} />
                      <ProgressLine book={book} barStyle={NARROW} />
                      <BookMeta book={book} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', flexShrink: 0 }}>
                      <Button
                        size="small"
                        classNames={{ root: 'zf-btn zf-btn--brand' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateToReader(book.id);
                        }}
                      >
                        继续
                      </Button>
                      <RemoveButton onClick={() => handleRemoveBook(book.id, 'singleHistory')} title="删除此记录" />
                    </div>
                  </motion.div>
                ))}
              </ZfGrid>
            )}
          </motion.section>
        ) : null}

        {/* ============== 空书架：一处文案，一个入口 ============== */}
        {isAllEmpty ? (
          <ZfEmptyState
            icon={<BookOutlined />}
            title="书架空空如也"
            description="还没有收藏或读过的书。去首页从六大榜单里挑几本，加入书架后即可记录进度。"
            action={
              <Button
                classNames={{ root: 'zf-btn zf-btn--brand' }}
                icon={<PlusOutlined />}
                onClick={navigateToHome}
              >
                去发现好书
              </Button>
            }
          />
        ) : null}
      </div>
    </ZfPageShell>
  );
};

/* —— 行式布局的封面与文字块：与 ZfCoverCard 同一信息顺序 —— */
function ShelfCover({ book }) {
  return (
    <div
      style={{
        width: 48,
        height: 64,
        flexShrink: 0,
        borderRadius: 'var(--zf-r-sm)',
        overflow: 'hidden',
        background: 'var(--zf-glass-2)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 'var(--zf-fs-sm)',
        color: 'var(--zf-text-faint)',
      }}
    >
      {book.cover ? (
        <img
          src={book.cover}
          alt=""
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        String(book.name || '').slice(0, 1)
      )}
    </div>
  );
}

function BookTitle({ book }) {
  return (
    <div
      className="zf-truncate"
      title={book.name}
      style={{
        fontFamily: 'var(--zf-font-display)',
        fontSize: 'var(--zf-fs-md)',
        fontWeight: 700,
        color: 'var(--zf-text-primary)',
        lineHeight: 'var(--zf-lh-snug)',
      }}
    >
      {book.name}
    </div>
  );
}

function BookLine({ text }) {
  return (
    <div className="zf-truncate" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>
      {text}
    </div>
  );
}

export default Shelf;
