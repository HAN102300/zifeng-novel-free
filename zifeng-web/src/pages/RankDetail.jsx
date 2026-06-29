import React, { useState, useEffect } from 'react';
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
} from '@ant-design/icons';
import BackButton from '../components/BackButton';
import RankItem from '../components/RankItem';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import axios from 'axios';

/* ============================================================
   紫枫免费小说 · 榜单详情页（Task 10 重构）
   - 榜单头部：渐变背景 + 图标方块 72×72 + 标题 + 统计
   - 左侧栏（200px sticky）：排序，active 紫色渐变 + 光晕
   - 右侧列表：RankItem 渲染，序号金/银/铜，top3 在读脉冲
   - 分页：自定义 Pager，紫色渐变 active
   - 保留：/module/rank?type=* 数据获取、useParams；筛选状态改用 useState（避免返回键逐级回退）
   参考：design/zifeng-pages-deep-dive.html .rank-detail-*
   ============================================================ */

const REVEAL_EASE = [0.16, 1, 0.3, 1];

/* —— rankConfig：key 对应字符串路由，type 对应 API 数字 —— */
const rankConfig = {
  mustRead: { title: '必读榜', icon: 'trophy', subtitle: '精选好书推荐', type: 1 },
  potential: { title: '潜力榜', icon: 'rise', subtitle: 'rising stars', type: 5 },
  completed: { title: '完结榜', icon: 'check', subtitle: '已完结精品', type: 2 },
  updated: { title: '更新榜', icon: 'clock', subtitle: '最近更新', type: 3 },
  search: { title: '搜索榜', icon: 'fire', subtitle: '热搜排行', type: 4 },
  comment: { title: '评论榜', icon: 'comment', subtitle: '热门讨论', type: 6 },
};

/* —— 数字 type 反查（Home.jsx 用 /rank/1..6 数字路由，rankConfig 键是字符串） —— */
const rankConfigByType = Object.values(rankConfig).reduce((acc, cfg) => {
  acc[cfg.type] = cfg;
  return acc;
}, {});

/* —— ICON_SQUARE 渐变映射（72×72 图标方块） —— */
const ICON_SQUARE = {
  fire: {
    Icon: FireOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-magenta), #BE123C)',
    boxShadow: 'var(--zf-glow-magenta)',
  },
  trophy: {
    Icon: TrophyOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-amber), #B45309)',
    boxShadow: '0 0 24px rgba(245,158,11,.45)',
  },
  rise: {
    Icon: RiseOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-cyan), #0E7490)',
  },
  check: {
    Icon: CheckCircleOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-emerald), #047857)',
  },
  clock: {
    Icon: ClockCircleOutlined,
    background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
  },
  comment: {
    Icon: CommentOutlined,
    background: 'linear-gradient(135deg, #A855F7, #6D28D9)',
  },
};

/* —— 缓存机制 —— */
const rankCache = new Map();
const PAGE_SIZE = 15;
const MAX_TOTAL = 75;

/* —— 骨架占位块（基于 skel keyframe） —— */
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

function RankDetailSkeleton() {
  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <Skel height={120} radius="var(--zf-r-xl)" />
      <div className="zf-rd-layout" style={{ marginTop: 'var(--zf-s6)' }}>
        <div>
          <Skel height={36} radius="var(--zf-r-sm)" />
          <div style={{ marginTop: 8 }}>
            <Skel height={36} radius="var(--zf-r-sm)" />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skel key={i} height={88} radius="var(--zf-r-md)" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* —— 自定义 Pager：紫色渐变 active 按钮 —— */
function Pager({ current, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  /* 生成页码数组：当前页前后各 2 页，首尾强制显示 */
  const pages = [];
  const add = (p) => {
    if (p >= 1 && p <= totalPages && !pages.includes(p)) pages.push(p);
  };
  add(1);
  for (let p = current - 2; p <= current + 2; p++) add(p);
  add(totalPages);
  pages.sort((a, b) => a - b);

  /* 插入省略号 */
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
      <button
        style={btnBase}
        disabled={current <= 1}
        onClick={() => onChange(current - 1)}
      >
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
      <button
        style={btnBase}
        disabled={current >= totalPages}
        onClick={() => onChange(current + 1)}
      >
        <LeftOutlined style={{ transform: 'rotate(180deg)' }} />
      </button>
    </div>
  );
}

const RankDetail = () => {
  const { rankType } = useParams();
  const navigate = useNavigate();

  const [novels, setNovels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(MAX_TOTAL);

  /* —— 筛选状态：使用 useState 管理，不写入 URL（避免返回键逐级回退） —— */
  /* gender=male / status=all 固定：API 仅支持 channel=1，原 themes.js rankUrls 均无 isComplete —— */
  const [sort, setSort] = useState('hot');

  /* —— 安全 fallback：字符串键 OR 数字 type 反查 —— */
  const config = rankConfig[rankType] || rankConfigByType[Number(rankType)];

  const updateFilter = (key, value) => {
    if (key === 'sort') setSort(value);
    setCurrentPage(1);
  };

  /* —— 数据获取：保留 /module/rank 外部书源调用 —— */
  useEffect(() => {
    if (!config) {
      setError('无效的榜单类型');
      setLoading(false);
      return;
    }

    const cacheKey = `${rankType}_${currentPage}`;

    if (rankCache.has(cacheKey)) {
      const cached = rankCache.get(cacheKey);
      let list = cached.novels;
      /* sort=score：客户端按 score 降序重排序（不触发 refetch） */
      if (sort === 'score') {
        list = [...list].sort((a, b) => (b.score || 0) - (a.score || 0));
      }
      setNovels(list);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    const fetchRankData = async () => {
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

        /* —— 严格保留默认 URL：channel=1，不加 isComplete（与 themes.js rankUrls 一致） —— */
        let url = `${ds.bookSourceUrl}/module/rank?type=${config.type}&channel=1&page=${currentPage}`;

        const response = await axios.get(url, { headers });

        if (response.data && response.data.data) {
          const data = response.data.data.map((novel, index) => {
            const rank = (currentPage - 1) * PAGE_SIZE + index + 1;
            const author = novel.authorName || '未知作者';
            const category =
              novel.categoryNames && novel.categoryNames.length > 0
                ? novel.categoryNames[0].className
                : '未知分类';
            const rankInfo = novel.rankInfo || '';
            return {
              id: novel.novelId || index + 1,
              name: novel.novelName || '未知标题',
              author,
              cover: novel.cover || '',
              category,
              score: novel.averageScore || 0,
              rankInfo,
              rank,
              /* RankItem 显示用：desc=作者·rankInfo，tags=[分类]，top3 在读脉冲 */
              desc: rankInfo ? `${author} · ${rankInfo}` : author,
              tags: [category],
              reading: rank <= 3,
            };
          });

          let list = data;
          if (sort === 'score') {
            list = [...data].sort((a, b) => (b.score || 0) - (a.score || 0));
          }

          setNovels(list);

          let newTotal = MAX_TOTAL;
          if (data.length === 0) {
            newTotal = Math.min((currentPage - 1) * PAGE_SIZE, MAX_TOTAL);
          }
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

    fetchRankData();
  }, [rankType, sort, currentPage, config]);

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

  /* —— 错误态 —— */
  if (error) {
    return (
      <div style={{ padding: '0 0 40px 0' }}>
        <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 20 }} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: 'var(--zf-s12)',
            borderRadius: 'var(--zf-r-xl)',
            background: 'var(--zf-glass-bg)',
            border: '1px solid var(--zf-glass-border)',
            textAlign: 'center',
            color: 'var(--zf-accent-rose)',
          }}
        >
          {error}
        </motion.div>
      </div>
    );
  }

  /* —— 无效榜单类型 —— */
  if (!config) {
    return (
      <div style={{ padding: '0 0 40px 0' }}>
        <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 20 }} />
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--zf-text-muted)' }}>
          无效的榜单类型
        </div>
      </div>
    );
  }

  /* —— 加载态：骨架屏（不用全屏 Spin） —— */
  if (loading && novels.length === 0) {
    return (
      <div style={{ padding: '0 0 40px 0' }}>
        <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 20 }} />
        <RankDetailSkeleton />
      </div>
    );
  }

  const iconCfg = ICON_SQUARE[config.icon] || ICON_SQUARE.fire;
  const Icon = iconCfg.Icon;

  /* —— 筛选项配置：仅保留排序（gender/status 其他选项 API 返回空数据，已移除） —— */
  const FILTER_GROUPS = [
    {
      key: 'sort',
      label: '排序',
      options: [
        { value: 'hot', label: '热度' },
        { value: 'score', label: '评分' },
      ],
    },
  ];

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <style>{`
        .zf-rd-layout{display:grid;grid-template-columns:200px 1fr;gap:var(--zf-s6)}
        .zf-rd-sidebar{position:sticky;top:88px;align-self:start}
        .zf-sb-item{
          display:flex;align-items:center;justify-content:space-between;
          width:100%;padding:9px 14px;margin-bottom:6px;
          border-radius:var(--zf-r-sm);
          border:1px solid transparent;
          background:transparent;
          color:var(--zf-text-secondary);
          font-size:var(--zf-fs-sm);font-weight:600;
          cursor:pointer;text-align:left;
          transition:all var(--zf-dur-fast) var(--zf-ease-out);
        }
        .zf-sb-item:hover{background:var(--zf-glass-bg);color:var(--zf-text-primary)}
        .zf-sb-item.active{
          color:#fff;
          background:linear-gradient(135deg,var(--zf-primary-600),var(--zf-primary-500));
          border-color:transparent;
          box-shadow:0 4px 14px rgba(139,92,246,.4);
        }
        .zf-sb-label{
          font-size:var(--zf-fs-xs);font-weight:700;
          color:var(--zf-text-faint);
          text-transform:uppercase;letter-spacing:.08em;
          margin:14px 4px 6px;
        }
        @media (max-width:780px){
          .zf-rd-layout{grid-template-columns:1fr}
          .zf-rd-sidebar{position:static}
        }
      `}</style>

      <BackButton onClick={() => navigate(-1)} text="返回" style={{ marginBottom: 20 }} />

      {/* ============== 榜单头部 ============== */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: REVEAL_EASE }}
        style={{
          padding: 'var(--zf-s10) var(--zf-s8)',
          borderRadius: 'var(--zf-r-xl)',
          background:
            'linear-gradient(135deg, rgba(245,158,11,.18), rgba(236,72,153,.10))',
          border: '1px solid var(--zf-glass-border-strong)',
          backdropFilter: 'var(--zf-blur-glass)',
          WebkitBackdropFilter: 'var(--zf-blur-glass)',
          marginBottom: 'var(--zf-s8)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--zf-s6)',
        }}
      >
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
            background: iconCfg.background,
            boxShadow: iconCfg.boxShadow,
          }}
        >
          <Icon />
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
            {config.title}
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
            <span style={{ color: 'var(--zf-text-muted)', fontSize: 'var(--zf-fs-sm)' }}>
              {config.subtitle}
            </span>
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
              共 {total} 本
            </span>
            <span style={{ color: 'var(--zf-text-faint)', fontSize: 'var(--zf-fs-xs)' }}>
              {sort === 'score' ? '评分' : '热度'}
            </span>
          </div>
        </div>
      </motion.section>

      {/* ============== 主体：左侧栏 + 右侧列表 ============== */}
      <div className="zf-rd-layout">
        {/* —— 左侧栏 —— */}
        <aside className="zf-rd-sidebar">
          <div
            style={{
              padding: 'var(--zf-s4)',
              borderRadius: 'var(--zf-r-lg)',
              background: 'var(--zf-glass-bg)',
              border: '1px solid var(--zf-glass-border)',
              backdropFilter: 'var(--zf-blur-light)',
              WebkitBackdropFilter: 'var(--zf-blur-light)',
            }}
          >
            {FILTER_GROUPS.map((group) => (
              <div key={group.key}>
                <div className="zf-sb-label">{group.label}</div>
                {group.options.map((opt) => {
                  const isActive = group.key === 'sort' && sort === opt.value;
                  return (
                    <button
                      key={opt.value}
                      className={`zf-sb-item ${isActive ? 'active' : ''}`}
                      onClick={() => updateFilter(group.key, opt.value)}
                    >
                      <span>{opt.label}</span>
                      {isActive && (
                        <span style={{ fontSize: 12, opacity: 0.9 }}>●</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        {/* —— 右侧列表 —— */}
        <div>
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
              暂无榜单数据，换个筛选条件试试
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
              {novels.map((novel, idx) => (
                <motion.div
                  key={novel.id || idx}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5, ease: REVEAL_EASE, delay: idx * 0.04 }}
                >
                  <RankItem
                    rank={novel.rank}
                    novel={novel}
                    onClick={() => handleClick(novel)}
                  />
                </motion.div>
              ))}
            </div>
          )}

          {/* —— 分页 —— */}
          <Pager
            current={currentPage}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={setCurrentPage}
          />
        </div>
      </div>
    </div>
  );
};

export default RankDetail;
