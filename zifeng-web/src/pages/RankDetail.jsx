import { useCallback, useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FireOutlined,
  TrophyOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  LeftOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  TableOutlined,
} from '@ant-design/icons';
import {
  ZfPageShell,
  ZfGrid,
  ZfPageHeader,
  ZfSectionTitle,
  ZfPill,
  ZfCoverCard,
  ZfSkeleton,
  ZfEmptyState,
  ZfErrorState,
} from '@zifeng/ui/components';
import { variants, EASE, DUR } from '@zifeng/ui/motion';
import { useBreakpoint } from '@zifeng/ui/hooks';
import { hasScore, formatScore } from '@zifeng/ui/format';
import { ThemeContext } from '../App';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import axios from 'axios';

/* ============================================================
   紫枫免费小说 · 榜单详情页（P2 迁移）
   - 头部：ZfPageHeader（品牌渐变图标底 + 白字走 --zf-on-accent），
     六种榜单只靠图形区分，不再各配一套色相与光晕
   - 三视图（列表 / 网格 / 表格）全部落到同一套信息结构：
     列表与表格用行式布局 + ZfPill rank（金银铜→中性），网格用 ZfCoverCard
   - 骨架 → ZfSkeleton variant="row"；空态/错误态 → ZfEmptyState / ZfErrorState
   - 内联 style 标签块、780 魔数、rgba 字面量全部清除；缓动走 EASE.out
   - 保留：/module/rank?type=*&channel=1&page=* 取数、rankCache、
           bookUrl 解析 + saveNovelCache + navigate、视图偏好 localStorage
   ============================================================ */

/* —— rankConfig：key 对应字符串路由，type 对应 API 数字 —— */
const RANK_CONFIG = {
  mustRead: { title: '必读榜', Icon: TrophyOutlined, subtitle: '精选好书推荐', type: 1 },
  potential: { title: '潜力榜', Icon: RiseOutlined, subtitle: 'rising stars', type: 5 },
  completed: { title: '完结榜', Icon: CheckCircleOutlined, subtitle: '已完结精品', type: 2 },
  updated: { title: '更新榜', Icon: ClockCircleOutlined, subtitle: '最近更新', type: 3 },
  search: { title: '搜索榜', Icon: FireOutlined, subtitle: '热搜排行', type: 4 },
  comment: { title: '评论榜', Icon: CommentOutlined, subtitle: '热门讨论', type: 6 },
};

/* —— 数字 type 反查（Home.jsx 用 /rank/1..6 数字路由） —— */
const RANK_CONFIG_BY_TYPE = Object.values(RANK_CONFIG).reduce((acc, cfg) => {
  acc[cfg.type] = cfg;
  return acc;
}, {});

const PAGE_SIZE = 15;
const MAX_TOTAL = 75;

/* —— 缓存机制 —— */
const rankCache = new Map();

/* —— 视图切换器 —— */
const VIEW_OPTIONS = [
  { mode: 'list', Icon: UnorderedListOutlined, label: '列表' },
  { mode: 'grid', Icon: AppstoreOutlined, label: '网格' },
  { mode: 'table', Icon: TableOutlined, label: '表格' },
];

/* —— 复用版式（表格无 <style> 块，单元格样式收敛为常量） —— */
const TH = {
  textAlign: 'left',
  padding: 'var(--zf-s2) var(--zf-s3)',
  fontSize: 'var(--zf-fs-xs)',
  fontWeight: 700,
  color: 'var(--zf-text-faint)',
  letterSpacing: 'var(--zf-ls-wide)',
  borderBottom: '1px solid var(--zf-glass-border-strong)',
  background: 'var(--zf-glass-1)',
};

const TD = {
  padding: 'var(--zf-s2) var(--zf-s3)',
  borderBottom: '1px solid var(--zf-glass-border)',
  verticalAlign: 'middle',
  color: 'var(--zf-text-secondary)',
};

const PAGER_BTN = {
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

const PAGER_BTN_ACTIVE = {
  ...PAGER_BTN,
  color: 'var(--zf-on-accent)',
  border: '1px solid transparent',
  background: 'var(--zf-grad-brand)',
  boxShadow: 'var(--zf-glow-brand)',
};

/** 榜单行：列表与表格外壳共用，位次差异只落在徽章与描边亮度上 */
function RankRow({ novel, onOpen, glass }) {
  const top = novel.rank <= 3;
  return (
    <motion.article
      variants={variants.listRise}
      initial="initial"
      animate="animate"
      whileHover={{ x: 4 }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(novel)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(novel);
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--zf-s4)',
        padding: 'var(--zf-s3) var(--zf-s4)',
        borderRadius: 'var(--zf-r-lg)',
        background: glass ? 'var(--zf-glass-1)' : 'var(--zf-surface-1)',
        border: `1px solid ${top ? 'rgb(var(--zf-brand-rgb-500) / 0.3)' : 'var(--zf-glass-border)'}`,
        boxShadow: top ? 'var(--zf-shadow-2), var(--zf-glass-edge-top)' : 'var(--zf-shadow-1)',
        cursor: 'pointer',
        minWidth: 0,
      }}
    >
      <ZfPill rank={novel.rank} size="md" style={{ minWidth: 34, justifyContent: 'center', flexShrink: 0 }}>
        {novel.rank}
      </ZfPill>

      <div
        style={{
          width: 44,
          height: 59,
          flexShrink: 0,
          borderRadius: 'var(--zf-r-sm)',
          overflow: 'hidden',
          background: 'var(--zf-glass-2)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 'var(--zf-fs-xs)',
          color: 'var(--zf-text-faint)',
        }}
      >
        {novel.cover ? (
          <img
            src={novel.cover}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          String(novel.name || '').slice(0, 1)
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="zf-truncate"
          style={{
            fontFamily: 'var(--zf-font-display)',
            fontSize: 'var(--zf-fs-md)',
            fontWeight: 700,
            color: 'var(--zf-text-primary)',
            lineHeight: 'var(--zf-lh-snug)',
          }}
          title={novel.name}
        >
          {novel.name}
        </div>
        <div className="zf-truncate" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>
          {novel.author}
          {novel.category ? ` · ${novel.category}` : ''}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', flexShrink: 0 }}>
        {novel.rankInfo ? <ZfPill size="xs">{novel.rankInfo}</ZfPill> : null}
        {hasScore(novel.score) ? (
          <ZfPill size="xs" tone="warning">
            {formatScore(novel.score)}
          </ZfPill>
        ) : null}
      </div>
    </motion.article>
  );
}

/* —— 自定义 Pager：active 走品牌渐变 —— */
function Pager({ current, total, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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
      <button style={PAGER_BTN} disabled={current <= 1} onClick={() => onChange(current - 1)} aria-label="上一页">
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
            style={p === current ? PAGER_BTN_ACTIVE : PAGER_BTN}
            onClick={() => onChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button style={PAGER_BTN} disabled={current >= totalPages} onClick={() => onChange(current + 1)} aria-label="下一页">
        <LeftOutlined style={{ transform: 'rotate(180deg)' }} />
      </button>
    </div>
  );
}

const RankDetail = () => {
  const { rankType } = useParams();
  const navigate = useNavigate();
  const { glassMode } = useContext(ThemeContext);
  const { isMobile, up } = useBreakpoint();

  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(MAX_TOTAL);

  /* —— 视图模式：list / grid / table，默认 table，localStorage 记忆 —— */
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('rank_layout_mode') || 'table';
    } catch {
      return 'table';
    }
  });

  const handleViewChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('rank_layout_mode', mode);
    } catch {
      /* 忽略存储错误 */
    }
  };

  /* —— 安全 fallback：字符串键 OR 数字 type 反查 —— */
  const config = RANK_CONFIG[rankType] || RANK_CONFIG_BY_TYPE[Number(rankType)];

  /* —— 数据获取：保留 /module/rank 外部书源调用 —— */
  const fetchData = useCallback(() => {
    if (!config) {
      setError('无效的榜单类型');
      setLoading(false);
      return;
    }

    const cacheKey = `${rankType}_${currentPage}`;
    if (rankCache.has(cacheKey)) {
      const cached = rankCache.get(cacheKey);
      setNovels(cached.novels);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    const run = async () => {
      setLoading(true);
      try {
        const ds = getDefaultSource();
        const headers = (() => {
          try {
            return JSON.parse((ds.header || '{}').replace(/'/g, '"'));
          } catch {
            return {};
          }
        })();

        /* —— 严格保留默认 URL：channel=1，不加 isComplete —— */
        const url = `${ds.bookSourceUrl}/module/rank?type=${config.type}&channel=1&page=${currentPage}`;
        const response = await axios.get(url, { headers });

        if (response.data && response.data.data) {
          const data = response.data.data.map((novel, index) => {
            const rank = (currentPage - 1) * PAGE_SIZE + index + 1;
            const author = novel.authorName || '未知作者';
            const category =
              novel.categoryNames && novel.categoryNames.length > 0
                ? novel.categoryNames[0].className
                : '未知分类';
            return {
              id: novel.novelId || index + 1,
              name: novel.novelName || '未知标题',
              author,
              cover: novel.cover || '',
              category,
              score: novel.averageScore || 0,
              rankInfo: novel.rankInfo || '',
              rank,
            };
          });

          let newTotal = MAX_TOTAL;
          if (data.length === 0) {
            newTotal = Math.min((currentPage - 1) * PAGE_SIZE, MAX_TOTAL);
          }
          setNovels(data);
          setTotal(newTotal);
          rankCache.set(cacheKey, { novels: data, total: newTotal });
        } else {
          const newTotal = Math.min((currentPage - 1) * PAGE_SIZE, MAX_TOTAL);
          setNovels([]);
          setTotal(newTotal);
          rankCache.set(cacheKey, { novels: [], total: newTotal });
        }
      } catch (err) {
        console.error('获取榜单数据失败:', err);
        setError('获取榜单数据失败');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [rankType, currentPage, config]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* —— 点击跳转小说详情：完整保留 bookUrlTemplate 解析 + saveNovelCache + navigate —— */
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
    params.set('from', 'rank');
    navigate(`/novel/${novel.id}?${params.toString()}`);
  };

  const shell = (children) => (
    <ZfPageShell size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s6)' }}>{children}</div>
    </ZfPageShell>
  );

  /* —— 无效榜单类型 —— */
  if (!config) {
    return shell(<ZfEmptyState title="无效的榜单类型" description="这条榜单地址可能已经变更。" />);
  }

  /* —— 错误态 —— */
  if (error) {
    return shell(
      <ZfErrorState
        title={error}
        description="可以重试，或检查书源状态是否正常。"
        action={
          <div style={{ display: 'flex', gap: 'var(--zf-s2)' }}>
            <button type="button" style={PAGER_BTN_ACTIVE} onClick={fetchData}>
              重试
            </button>
            <button type="button" style={PAGER_BTN} onClick={() => navigate('/')}>
              回到首页
            </button>
          </div>
        }
      />
    );
  }

  const HeadIcon = config.Icon;
  const cols = up('lg') ? 6 : isMobile ? 3 : 5;
  /* 窄屏下表格横向溢出且信息价值低于列表，直接不呈现该档 */
  const viewOptions = isMobile ? VIEW_OPTIONS.filter((v) => v.mode !== 'table') : VIEW_OPTIONS;
  const activeMode = viewOptions.some((v) => v.mode === viewMode) ? viewMode : 'list';

  const header = (
    <ZfPageHeader
      back="/"
      icon={
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            borderRadius: 'var(--zf-r-md)',
            background: 'var(--zf-grad-brand)',
            color: 'var(--zf-on-accent)',
            fontSize: 'var(--zf-fs-lg)',
            boxShadow: 'var(--zf-glow-brand-soft)',
          }}
        >
          <HeadIcon />
        </span>
      }
      title={config.title}
      subtitle={config.subtitle}
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)', flexWrap: 'wrap' }}>
          <ZfPill tone="brand">共 {total} 本</ZfPill>
          <div
            role="group"
            aria-label="视图切换"
            style={{
              display: 'flex',
              gap: 'var(--zf-s1)',
              padding: 'var(--zf-s1)',
              borderRadius: 'var(--zf-r-full)',
              border: '1px solid var(--zf-glass-border)',
              background: 'var(--zf-glass-1)',
            }}
          >
            {viewOptions.map(({ mode, Icon, label }) => {
              const isActive = activeMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleViewChange(mode)}
                  title={label}
                  aria-label={label}
                  aria-pressed={isActive}
                  style={{
                    width: 32,
                    height: 32,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 'var(--zf-r-full)',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 'var(--zf-fs-md)',
                    color: isActive ? 'var(--zf-on-accent)' : 'var(--zf-text-secondary)',
                    background: isActive ? 'var(--zf-grad-brand)' : 'transparent',
                    boxShadow: isActive ? 'var(--zf-glow-brand)' : 'none',
                    transition: `background var(--zf-dur-fast) var(--zf-ease-out), color var(--zf-dur-fast) var(--zf-ease-out)`,
                  }}
                >
                  <Icon />
                </button>
              );
            })}
          </div>
        </div>
      }
    />
  );

  /* —— 加载态：行式骨架，与列表视图同比例 —— */
  if (loading && novels.length === 0) {
    return shell(
      <>
        {header}
        <ZfSkeleton variant="row" count={8} gap="var(--zf-s3)" />
      </>
    );
  }

  return shell(
    <>
      {header}

      {novels.length === 0 ? (
        <ZfEmptyState
          icon={<TrophyOutlined />}
          title="本榜暂无数据"
          description="这个页码上暂时没有书目，换一页或稍后再看看。"
        />
      ) : (
        <motion.div
          key={activeMode}
          variants={variants.fadeIn}
          initial="initial"
          animate="animate"
          transition={{ duration: DUR.fast / 1000, ease: EASE.out }}
        >
          {activeMode === 'list' ? (
            <ZfGrid columns={1} gap="var(--zf-s3)">
              {novels.map((novel, idx) => (
                <RankRow key={novel.id || idx} novel={novel} glass={glassMode} onOpen={handleClick} />
              ))}
            </ZfGrid>
          ) : null}

          {activeMode === 'grid' ? (
            <ZfGrid columns={cols} gap="var(--zf-s4)">
              {novels.map((novel, idx) => (
                <ZfCoverCard
                  key={novel.id || idx}
                  novel={novel}
                  rank={novel.rank}
                  size="md"
                  glass={glassMode}
                  onOpen={handleClick}
                />
              ))}
            </ZfGrid>
          ) : null}

          {activeMode === 'table' ? (
            <div
              style={{
                overflowX: 'auto',
                borderRadius: 'var(--zf-r-lg)',
                border: '1px solid var(--zf-glass-border)',
                background: 'var(--zf-glass-1)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--zf-fs-sm)' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: 64, textAlign: 'center' }}>排名</th>
                    <th style={{ ...TH, width: 56 }}>封面</th>
                    <th style={TH}>书名 / 作者</th>
                    <th style={TH}>分类</th>
                    <th style={TH}>上榜信息</th>
                    <th style={{ ...TH, textAlign: 'right' }}>评分</th>
                  </tr>
                </thead>
                <tbody>
                  {novels.map((novel, idx) => (
                    <motion.tr
                      key={novel.id || idx}
                      variants={variants.listRise}
                      initial="initial"
                      animate="animate"
                      onClick={() => handleClick(novel)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ ...TD, textAlign: 'center' }}>
                        <ZfPill rank={novel.rank} size="xs" style={{ minWidth: 24, justifyContent: 'center' }}>
                          {novel.rank}
                        </ZfPill>
                      </td>
                      <td style={TD}>
                        {novel.cover ? (
                          <img
                            src={novel.cover}
                            alt=""
                            loading="lazy"
                            style={{
                              width: 40,
                              height: 53,
                              borderRadius: 'var(--zf-r-sm)',
                              objectFit: 'cover',
                              display: 'block',
                              background: 'var(--zf-glass-2)',
                            }}
                          />
                        ) : (
                          <span style={{ width: 40, height: 53, display: 'block', borderRadius: 'var(--zf-r-sm)', background: 'var(--zf-glass-2)' }} />
                        )}
                      </td>
                      <td style={TD}>
                        <div style={{ fontWeight: 700, color: 'var(--zf-text-primary)' }}>{novel.name}</div>
                        <div style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>{novel.author}</div>
                      </td>
                      <td style={TD}>{novel.category}</td>
                      <td style={TD}>{novel.rankInfo || '—'}</td>
                      <td style={{ ...TD, textAlign: 'right' }} className="zf-num">
                        {hasScore(novel.score) ? formatScore(novel.score, { suffix: '' }) : '—'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </motion.div>
      )}

      <ZfSectionTitle
        animated={false}
        variant="bare"
        title={`第 ${currentPage} 页 · 共 ${Math.max(1, Math.ceil(total / PAGE_SIZE))} 页`}
        sub="榜单每页 15 本，翻到空页即到底"
      />

      <Pager
        current={currentPage}
        total={total}
        onChange={(page) => {
          setCurrentPage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </>
  );
};

export default RankDetail;
