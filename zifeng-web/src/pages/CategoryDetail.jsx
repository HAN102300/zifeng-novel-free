import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FireOutlined, HeartOutlined, LeftOutlined } from '@ant-design/icons';
import BackButton from '../components/BackButton';
import NovelCard from '../components/NovelCard';
import { ThemeContext } from '../App';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import axios from 'axios';

/* ============================================================
   紫枫免费小说 · 分类详情页（Task 11 重构）
   - 分类头部：渐变背景 + 图标 + categoryName + 统计
   - NovelCard 网格（不设 rank，干净网格）
   - 自定义 Pager：紫色渐变 active
   - 骨架加载态（不用全屏 Spin）
   - 保留：useParams、外部书源 /novel?sort=1&page=*&categoryId=*&isComplete=*
           categoryCache、onClick bookUrl 解析 + saveNovelCache + navigate
   参考：design/zifeng-pages-deep-dive.html .cat-detail-*
   ============================================================ */

const REVEAL_EASE = [0.16, 1, 0.3, 1];

const categoryCache = new Map();
const getCacheKey = (categoryId, sort, page) =>
  `category_${categoryId}_sort${sort}_page${page}`;

const MAX_PAGES = 10;
const PAGE_SIZE = 15;

function parseHeaders(headerStr) {
  try {
    return headerStr ? JSON.parse(headerStr.replace(/'/g, '"')) : {};
  } catch {
    return {};
  }
}

/* —— 骨架占位块 —— */
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

function CategoryDetailSkeleton() {
  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <Skel height={120} radius="var(--zf-r-xl)" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 'var(--zf-s4)',
          marginTop: 'var(--zf-s6)',
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skel key={i} height={290} radius="var(--zf-r-md)" />
        ))}
      </div>
    </div>
  );
}

/* —— 自定义 Pager：紫色渐变 active —— */
function Pager({ current, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const pages = [];
  const add = (p) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
  };
  add(1);
  for (let p = current - 2; p <= current + 2; p++) add(p);
  add(totalPages);
  pages.sort((a, b) => a - b);

  const withDots = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) withDots.push('...');
    withDots.push(p);
  });

  const btnBase = {
    minWidth: 36,
    height: 36,
    padding: '0 10px',
    borderRadius: 'var(--zf-r-sm)',
    border: '1px solid var(--zf-glass-border)',
    background: 'var(--zf-glass-bg)',
    color: 'var(--zf-text-secondary)',
    fontSize: 'var(--zf-fs-sm)',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--zf-dur-fast) var(--zf-ease-out)',
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 'var(--zf-s8)', flexWrap: 'wrap' }}>
      <button style={btnBase} disabled={current <= 1} onClick={() => onChange(current - 1)}>
        <LeftOutlined />
      </button>
      {withDots.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} style={{ padding: '0 4px', color: 'var(--zf-text-muted)' }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            style={
              p === current
                ? {
                    ...btnBase,
                    color: '#fff',
                    border: 'none',
                    background:
                      'linear-gradient(135deg, var(--zf-primary-600), var(--zf-primary-500))',
                    boxShadow: '0 4px 14px rgba(139,92,246,.4)',
                  }
                : btnBase
            }
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button style={btnBase} disabled={current >= totalPages} onClick={() => onChange(current + 1)}>
        <LeftOutlined style={{ transform: 'rotate(180deg)' }} />
      </button>
    </div>
  );
}

const CategoryDetail = () => {
  const { channel, sort, categoryId, categoryName } = useParams();
  const navigate = useNavigate();
  const { themeConfigs, currentTheme, isDarkMode, glassMode } = useContext(ThemeContext);
  const primaryColor = themeConfigs[currentTheme].primaryColor;

  const sortNum = Number(sort);

  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => getSavedPage(categoryId, sortNum));
  const [total, setTotal] = useState(0);
  const [maxKnownPage, setMaxKnownPage] = useState(1);

  const fetchingRef = useRef(false);
  const channelNum = Number(channel);

  /* —— 保留原 fetchCategoryData 逻辑 —— */
  const fetchCategoryData = useCallback(
    async (page) => {
      if (fetchingRef.current) return;

      const cacheKey = getCacheKey(categoryId, sortNum, page);

      if (categoryCache.has(cacheKey)) {
        const cached = categoryCache.get(cacheKey);
        setNovels(cached.novels);
        setTotal(cached.total);
        return;
      }

      fetchingRef.current = true;
      setLoading(true);
      try {
        const ds = getDefaultSource();
        let url = `${ds.bookSourceUrl}/novel?sort=1&page=${page}&categoryId=${categoryId}`;
        if (sortNum === 2) {
          url += '&isComplete=1';
        } else if (sortNum === 3) {
          url += '&isComplete=0';
        }

        const response = await axios.get(url, { headers: parseHeaders(ds.header) });

        if (response.data && response.data.code === 200 && response.data.data) {
          const rawData = response.data.data;
          const data = rawData.map((novel, index) => ({
            id: novel.novelId || index + 1,
            name: novel.novelName || '未知标题',
            author: novel.authorName || '未知作者',
            cover: novel.cover || '',
            category:
              novel.categoryNames && novel.categoryNames.length > 0
                ? novel.categoryNames[0].className
                : '未知分类',
            score: novel.averageScore || 0,
            rankInfo: novel.rankInfo || '',
          }));

          setNovels(data);

          let newTotal;
          if (data.length === 0) {
            newTotal = (page - 1) * PAGE_SIZE;
          } else if (page >= MAX_PAGES) {
            newTotal = MAX_PAGES * PAGE_SIZE;
          } else {
            newTotal = page * PAGE_SIZE + 1;
          }
          newTotal = Math.min(newTotal, MAX_PAGES * PAGE_SIZE);

          setTotal(newTotal);
          if (data.length > 0 && page > maxKnownPage) {
            setMaxKnownPage(page);
          }

          categoryCache.set(cacheKey, { novels: data, total: newTotal });
        } else {
          setNovels([]);
          const newTotal = (page - 1) * PAGE_SIZE;
          setTotal(newTotal);
          categoryCache.set(cacheKey, { novels: [], total: newTotal });
        }
      } catch (error) {
        console.error('获取分类数据失败:', error);
        setNovels([]);
        setTotal((page - 1) * PAGE_SIZE);
      } finally {
        setLoading(false);
        fetchingRef.current = false;
      }
    },
    [categoryId, sortNum, maxKnownPage]
  );

  useEffect(() => {
    fetchCategoryData(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return; // 首次挂载时跳过重置，使用 sessionStorage 中保存的页码
    }
    goToPage(1);
    setMaxKnownPage(1);
    setTotal(0);
    setNovels([]);
    categoryCache.clear();
  }, [categoryId, sortNum]);

  /* —— 保留原 onClick：解析 bookUrl + saveNovelCache + navigate —— */
  const handleClick = (novel) => {
    const ds = getDefaultSource();
    const sourceUrl = ds.bookSourceUrl;
    const novelId = String(novel.id || novel.novelId || '');
    const bookUrlTemplate = ds.ruleSearch?.bookUrl || '';
    let bookUrl = novelId;
    if (bookUrlTemplate && bookUrlTemplate.includes('{{')) {
      bookUrl = bookUrlTemplate.replace(/\{\{\$?\.?novelId\}\}/g, novelId);
    } else if (bookUrlTemplate && !bookUrlTemplate.includes('{{')) {
      bookUrl = bookUrlTemplate;
    }
    saveNovelCache(novel, sourceUrl, bookUrl);
    const params = new URLSearchParams();
    params.set('sourceUrl', sourceUrl);
    params.set('bookUrl', bookUrl);
    params.set('from', 'category');
    navigate(`/novel/${novel.id}?${params.toString()}`);
  };

  /* —— 头部配置：男生蓝 / 女生品红 —— */
  const isFemale = channelNum === 2;
  const headIconBg = isFemale
    ? 'linear-gradient(135deg, var(--zf-accent-magenta), #BE123C)'
    : 'linear-gradient(135deg, #3B82F6, #1E40AF)';
  const headGlow = isFemale
    ? '0 0 28px rgba(236,72,153,.45)'
    : '0 0 28px rgba(59,130,246,.45)';
  const headBannerBg = isFemale
    ? 'linear-gradient(135deg, rgba(236,72,153,.22), rgba(245,158,11,.12))'
    : 'linear-gradient(135deg, rgba(59,130,246,.22), rgba(139,92,246,.12))';
  const sortLabel = sortNum === 2 ? '完结' : sortNum === 3 ? '连载' : '全部';

  /* —— 加载态：骨架屏 —— */
  if (loading && novels.length === 0) {
    return (
      <div style={{ padding: '0 0 40px 0' }}>
        <BackButton onClick={() => navigate('/category')} text="返回分类" style={{ marginBottom: 20 }} />
        <CategoryDetailSkeleton />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <style>{`
        .zf-cd-grid{
          display:grid;
          grid-template-columns:repeat(auto-fill, minmax(160px, 1fr));
          gap:var(--zf-s4);
        }
      `}</style>

      <BackButton onClick={() => navigate('/category')} text="返回分类" style={{ marginBottom: 20 }} />

      {/* ============== 分类头部 ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: REVEAL_EASE }}
        style={{
          padding: 'var(--zf-s10) var(--zf-s8)',
          borderRadius: 'var(--zf-r-xl)',
          background: headBannerBg,
          border: '1px solid var(--zf-glass-border-strong)',
          backdropFilter: 'var(--zf-blur-glass)',
          WebkitBackdropFilter: 'var(--zf-blur-glass)',
          marginBottom: 'var(--zf-s8)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--zf-s6)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 装饰光斑 */}
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: headIconBg,
            opacity: 0.12,
            filter: 'blur(24px)',
            pointerEvents: 'none',
          }}
        />
        {/* 图标方块 72×72 */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--zf-r-lg)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 32,
            flexShrink: 0,
            background: headIconBg,
            boxShadow: headGlow,
          }}
        >
          {isFemale ? <HeartOutlined /> : <FireOutlined />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2
            style={{
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 'var(--zf-fs-2xl)',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              color: 'var(--zf-text-primary)',
            }}
          >
            {decodeURIComponent(categoryName || '')}
          </h2>
          <div
            style={{
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 12px',
                borderRadius: 'var(--zf-r-full)',
                fontSize: 'var(--zf-fs-xs)',
                fontWeight: 600,
                color: 'var(--zf-primary-300)',
                background: 'rgba(139,92,246,.18)',
                border: '1px solid rgba(139,92,246,.30)',
              }}
            >
              共 {total} 册
            </span>
            <span style={{ color: 'var(--zf-text-muted)', fontSize: 'var(--zf-fs-sm)' }}>
              {isFemale ? '女生频道' : '男生频道'} · {sortLabel}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ============== NovelCard 网格 ============== */}
      {novels.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            padding: 'var(--zf-s12)',
            borderRadius: 'var(--zf-r-xl)',
            background: 'var(--zf-glass-bg)',
            border: '1px solid var(--zf-glass-border)',
            textAlign: 'center',
            color: 'var(--zf-text-muted)',
          }}
        >
          暂无小说数据，换个分类或状态试试
        </motion.div>
      ) : (
        <div className="zf-cd-grid">
          {novels.map((novel, idx) => (
            <NovelCard
              key={novel.id || idx}
              novel={novel}
              index={idx}
              color={primaryColor}
              glassMode={glassMode}
              isDarkMode={isDarkMode}
              onClick={() => handleClick(novel)}
            />
          ))}
        </div>
      )}

      {/* ============== 分页 ============== */}
      {total > 0 && (
        <Pager
          current={currentPage}
          total={total}
          pageSize={PAGE_SIZE}
          onChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default CategoryDetail;
