import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LeftOutlined, AppstoreOutlined } from '@ant-design/icons';
import { ZfPageShell, ZfGrid, ZfPageHeader, ZfPill, ZfCoverCard, ZfSkeletonGrid, ZfEmptyState } from '@zifeng/ui/components';
import { variants } from '@zifeng/ui/motion';
import { ThemeContext } from '../App';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import { proxyImageUrl } from '../utils/apiClient';
import { useBreakpoint } from '@zifeng/ui/hooks';
import axios from 'axios';

/* ============================================================
   紫枫免费小说 · 分类详情页（P2 迁移）
   - 容器 ZfPageShell size="lg"、页头 ZfPageHeader（含返回）、
     网格 ZfCoverCard、骨架 ZfSkeletonGrid、空态 ZfEmptyState
   - 频道蓝/品红渐变头部 → 品牌紫（页头不再自带渐变底，色相交给标题图标）
   - 内联 style 标签块与 780 魔数断点 → useBreakpoint()
   - 保留：useParams、外部书源 /novel?sort=1&page=*&categoryId=*&isComplete=*、
           categoryCache、页码 localStorage、bookUrl 解析 + saveNovelCache + navigate
   ============================================================ */

const categoryCache = new Map();
const getCacheKey = (categoryId, sort, page) =>
  `category_${categoryId}_sort${sort}_page${page}`;

const MAX_PAGES = 10;
const PAGE_SIZE = 15;

/** 从 localStorage 恢复用户上次浏览的页码 */
const getSavedPage = (categoryId, sortNum) => {
  try {
    const key = `category_page_${categoryId}_sort${sortNum}`;
    const saved = localStorage.getItem(key);
    const page = saved ? Number(saved) : 1;
    return page >= 1 && page <= MAX_PAGES ? page : 1;
  } catch {
    return 1;
  }
};

/** 保存当前页码到 localStorage */
const savePage = (categoryId, sortNum, page) => {
  try {
    const key = `category_page_${categoryId}_sort${sortNum}`;
    localStorage.setItem(key, String(page));
  } catch {
    /* 忽略存储错误 */
  }
};

function parseHeaders(headerStr) {
  try {
    return headerStr ? JSON.parse(headerStr.replace(/'/g, '"')) : {};
  } catch {
    return {};
  }
}

/* —— 分页器：active 走品牌渐变底 + --zf-on-accent 文字 —— */
const PAGE_BTN = {
  minWidth: 36,
  height: 36,
  padding: '0 10px',
  borderRadius: 'var(--zf-r-sm)',
  border: '1px solid var(--zf-glass-border)',
  background: 'var(--zf-glass-1)',
  color: 'var(--zf-text-secondary)',
  fontSize: 'var(--zf-fs-sm)',
  fontWeight: 600,
  cursor: 'pointer',
  fontVariantNumeric: 'tabular-nums',
  transition: 'background var(--zf-dur-fast) var(--zf-ease-out), color var(--zf-dur-fast) var(--zf-ease-out)',
};

const PAGE_BTN_ACTIVE = {
  ...PAGE_BTN,
  color: 'var(--zf-on-accent)',
  border: '1px solid transparent',
  background: 'var(--zf-grad-brand)',
  boxShadow: 'var(--zf-glow-brand)',
};

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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--zf-s2)', flexWrap: 'wrap' }}>
      <button style={PAGE_BTN} disabled={current <= 1} onClick={() => onChange(current - 1)} aria-label="上一页">
        <LeftOutlined />
      </button>
      {withDots.map((p, i) =>
        p === '...' ? (
          <span key={`dot-${i}`} className="zf-num" style={{ padding: '0 4px', color: 'var(--zf-text-muted)' }}>
            ...
          </span>
        ) : (
          <button
            key={p}
            aria-current={p === current ? 'page' : undefined}
            style={p === current ? PAGE_BTN_ACTIVE : PAGE_BTN}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button style={PAGE_BTN} disabled={current >= totalPages} onClick={() => onChange(current + 1)} aria-label="下一页">
        <LeftOutlined style={{ transform: 'rotate(180deg)' }} />
      </button>
    </div>
  );
}

const CategoryDetail = () => {
  const { channel, sort, categoryId, categoryName } = useParams();
  const navigate = useNavigate();
  const { glassMode } = useContext(ThemeContext);
  const { up, isMobile } = useBreakpoint();

  const sortNum = Number(sort);
  const channelNum = Number(channel);

  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => getSavedPage(categoryId, sortNum));
  const [total, setTotal] = useState(0);
  const [maxKnownPage, setMaxKnownPage] = useState(1);

  const fetchingRef = useRef(false);
  const isInitialMount = useRef(true);

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

        const response = await axios.get('/api/proxy', {
          params: {
            url,
            headers: JSON.stringify(parseHeaders(ds.header)),
          },
          timeout: 15000,
        });

        if (response.data && response.data.code === 200 && response.data.data) {
          const rawData = response.data.data;
          const data = rawData.map((novel, index) => ({
            id: novel.novelId || index + 1,
            name: novel.novelName || '未知标题',
            author: novel.authorName || '未知作者',
            cover: proxyImageUrl(novel.cover || ''),
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
      return; // 首次挂载时跳过重置，使用 localStorage 中保存的页码
    }
    setCurrentPage(1);
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

  const sortLabel = sortNum === 2 ? '完结' : sortNum === 3 ? '连载' : '全部';
  const cols = up('lg') ? 5 : isMobile ? 2 : 4;

  /* 注意：ZfPageShell 的 header 插槽落在容器之外（全宽出血），
     这里要让页头与内容同宽，所以直接作为 children 首元素。 */
  const header = (
    <ZfPageHeader
      back="/category"
      icon={<AppstoreOutlined />}
      title={decodeURIComponent(categoryName || '')}
      subtitle={`${channelNum === 2 ? '女生频道' : '男生频道'} · ${sortLabel} · 共 ${total || 0} 册`}
      extra={total > 0 ? <ZfPill tone="brand">第 {currentPage} 页</ZfPill> : null}
    />
  );

  /* —— 加载态：与 ZfCoverCard 同比例的骨架网格，避免加载完成时跳动 —— */
  if (loading && novels.length === 0) {
    return (
      <ZfPageShell size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s6)' }}>
          {header}
          <ZfSkeletonGrid count={isMobile ? 4 : 10} />
        </div>
      </ZfPageShell>
    );
  }

  return (
    <ZfPageShell size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s8)' }}>
        {header}

        {novels.length === 0 ? (
          <ZfEmptyState
            icon={<AppstoreOutlined />}
            title="这个分类下暂时没有书"
            description="换个分类或调整「全部 / 完结 / 连载」筛选再试试。"
            action={
              <button style={PAGE_BTN_ACTIVE} onClick={() => navigate('/category')}>
                返回分类
              </button>
            }
          />
        ) : (
          <motion.div variants={variants.fadeUp} initial="initial" animate="animate">
            <ZfGrid columns={cols} gap="var(--zf-s4)">
              {novels.map((novel, idx) => (
                <ZfCoverCard
                  key={novel.id || idx}
                  novel={novel}
                  size="md"
                  glass={glassMode}
                  onOpen={handleClick}
                />
              ))}
            </ZfGrid>
          </motion.div>
        )}

        {total > 0 && novels.length > 0 ? (
          <Pager
            current={currentPage}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={(page) => {
              setCurrentPage(page);
              savePage(categoryId, sortNum, page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        ) : null}
      </div>
    </ZfPageShell>
  );
};

export default CategoryDetail;
