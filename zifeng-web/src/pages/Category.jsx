import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FireOutlined,
  ThunderboltOutlined,
  BankOutlined,
  CloudOutlined,
  AimOutlined,
  HistoryOutlined,
  CustomerServiceOutlined,
  RocketOutlined,
  ExperimentOutlined,
  HeartOutlined,
  CrownOutlined,
  BulbOutlined,
  SmileOutlined,
  SafetyOutlined,
  StarOutlined,
} from '@ant-design/icons';

/* ============================================================
   紫枫免费小说 · 分类页（Task 11 重构）
   - 男生 / 女生 Tab（蓝渐变 / 品红渐变 + layoutId 滑动指示器）
   - 分类 Banner：图标 84×84 圆角 24px，男蓝 / 女品红渐变
   - 分类网格：cat-card 用 --card-color / --card-shadow，hover 上浮 + 装饰光斑放大
   - 状态筛选 chips：active 紫色渐变
   - 保留：sessionStorage channel/sort、useNavigate 跳转 CategoryDetail
   参考：design/zifeng-pages-deep-dive.html .cat-tabs / .cat-banner / .cat-grid
   ============================================================ */

const REVEAL_EASE = [0.16, 1, 0.3, 1];

/* —— 男生频道分类 —— */
const maleCategories = [
  { name: '玄幻', categoryId: 'lejRej', icon: FireOutlined, desc: '修仙悟道，逆天改命', color: '#EF4444' },
  { name: '武侠', categoryId: 'nel5aK', icon: ThunderboltOutlined, desc: '快意恩仇，仗剑天涯', color: '#F97316' },
  { name: '都市', categoryId: 'mbk5ez', icon: BankOutlined, desc: '都市风云，纵横捭阖', color: '#3B82F6' },
  { name: '仙侠', categoryId: 'vbmOeY', icon: CloudOutlined, desc: '仙道飘渺，御剑飞行', color: '#8B5CF6' },
  { name: '军事', categoryId: 'penRe7', icon: AimOutlined, desc: '铁血军魂，保家卫国', color: '#10B981' },
  { name: '历史', categoryId: 'xbojag', icon: HistoryOutlined, desc: '穿越古今，纵横天下', color: '#EC4899' },
  { name: '游戏', categoryId: 'mep2bM', icon: CustomerServiceOutlined, desc: '虚拟世界，无限可能', color: '#06B6D4' },
  { name: '科幻', categoryId: 'zbq2dp', icon: RocketOutlined, desc: '星辰大海，未来可期', color: '#2563EB' },
  { name: '轻小说', categoryId: 'YerEdO', icon: ExperimentOutlined, desc: '轻松阅读，趣味横生', color: '#F59E0B' },
];

/* —— 女生频道分类 —— */
const femaleCategories = [
  { name: '现代言情', categoryId: '9avmeG', icon: HeartOutlined, desc: '都市情缘，甜蜜爱恋', color: '#EC4899' },
  { name: '古代言情', categoryId: 'DdwRb1', icon: CrownOutlined, desc: '宫闱情深，凤舞九天', color: '#EF4444' },
  { name: '幻想言情', categoryId: '7ax9by', icon: BulbOutlined, desc: '奇幻世界，浪漫邂逅', color: '#8B5CF6' },
  { name: '青春校园', categoryId: 'Pdy7aQ', icon: SmileOutlined, desc: '青春校园，懵懂心动', color: '#F97316' },
  { name: '唯美纯爱', categoryId: 'kazYeJ', icon: StarOutlined, desc: '纯爱至上，温暖治愈', color: '#06B6D4' },
  { name: '同人衍生', categoryId: '9aAOdv', icon: SafetyOutlined, desc: '同人创作，衍生无限', color: '#2563EB' },
];

/* —— 排序选项 —— */
const sortOptions = [
  { label: '全部', value: 1 },
  { label: '完结', value: 2 },
  { label: '连载', value: 3 },
];

/* —— Tab 配置：男蓝渐变 / 女品红渐变 —— */
const TAB_CONFIG = {
  1: {
    label: '男生频道',
    tabBg: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    tabGlow: '0 4px 14px rgba(59,130,246,.45)',
    bannerBg: 'linear-gradient(135deg, rgba(59,130,246,.25), rgba(139,92,246,.15))',
    iconBg: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
    iconGlow: '0 0 28px rgba(59,130,246,.45)',
    bannerTitle: '男生频道',
    bannerSubtitle: '玄幻武侠 · 都市仙侠 · 科幻游戏',
    accent: '#3B82F6',
  },
  2: {
    label: '女生频道',
    tabBg: 'linear-gradient(135deg, var(--zf-accent-magenta), #BE123C)',
    tabGlow: '0 4px 14px rgba(236,72,153,.45)',
    bannerBg: 'linear-gradient(135deg, rgba(236,72,153,.22), rgba(245,158,11,.12))',
    iconBg: 'linear-gradient(135deg, var(--zf-accent-magenta), #BE123C)',
    iconGlow: '0 0 28px rgba(236,72,153,.45)',
    bannerTitle: '女生频道',
    bannerSubtitle: '现代言情 · 古代言情 · 青春校园',
    accent: 'var(--zf-accent-magenta)',
  },
};

const Category = () => {
  const navigate = useNavigate();

  /* —— 保留 sessionStorage 读写 —— */
  const [channel, setChannel] = useState(() => {
    try {
      const saved = sessionStorage.getItem('category_channel');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });
  const [sort, setSort] = useState(() => {
    try {
      const saved = sessionStorage.getItem('category_sort');
      return saved ? Number(saved) : 1;
    } catch {
      return 1;
    }
  });

  const categories = channel === 1 ? maleCategories : femaleCategories;
  const tabCfg = TAB_CONFIG[channel] || TAB_CONFIG[1];

  /* —— 保留原 handler —— */
  const handleSortChange = (value) => {
    setSort(value);
    sessionStorage.setItem('category_sort', String(value));
  };

  const handleChannelChange = (value) => {
    setChannel(value);
    sessionStorage.setItem('category_channel', String(value));
  };

  const handleCategoryClick = (category) => {
    navigate(`/category-detail/${channel}/${sort}/${category.categoryId}/${category.name}`);
  };

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <style>{`
        .cat-tabs{
          position:relative;
          display:inline-flex;
          padding:4px;
          border-radius:var(--zf-r-full);
          background:var(--zf-glass-bg);
          border:1px solid var(--zf-glass-border);
          backdrop-filter:var(--zf-blur-light);
          -webkit-backdrop-filter:var(--zf-blur-light);
        }
        .cat-tab{
          position:relative;
          z-index:2;
          padding:9px 26px;
          border:none;
          background:transparent;
          font-family:var(--zf-font-serif);
          font-size:var(--zf-fs-md);
          font-weight:700;
          color:var(--zf-text-muted);
          cursor:pointer;
          border-radius:var(--zf-r-full);
          transition:color var(--zf-dur-fast) var(--zf-ease-out);
        }
        .cat-tab.active{color:#fff}
        .cat-grid{
          display:grid;
          grid-template-columns:repeat(4, 1fr);
          gap:var(--zf-s4);
        }
        @media (max-width:1024px){.cat-grid{grid-template-columns:repeat(3, 1fr)}}
        @media (max-width:780px){.cat-grid{grid-template-columns:repeat(2, 1fr)}}
        .cat-card{
          --card-color: ${tabCfg.accent};
          --card-shadow: 0 8px 22px rgba(0,0,0,.25);
          position:relative;
          overflow:hidden;
          padding:var(--zf-s6) var(--zf-s4);
          border-radius:var(--zf-r-lg);
          background:var(--zf-glass-bg);
          border:1px solid var(--zf-glass-border);
          backdrop-filter:var(--zf-blur-light);
          -webkit-backdrop-filter:var(--zf-blur-light);
          cursor:pointer;
          text-align:center;
          transition:transform var(--zf-dur-normal) var(--zf-ease-spring),
                     box-shadow var(--zf-dur-normal) var(--zf-ease-out),
                     border-color var(--zf-dur-normal) var(--zf-ease-out);
        }
        .cat-card:hover{
          transform:translateY(-6px);
          border-color:var(--card-color);
          box-shadow:0 14px 32px rgba(0,0,0,.35), 0 0 22px color-mix(in srgb, var(--card-color) 30%, transparent);
        }
        .cat-card .cat-deco{
          position:absolute;
          top:-24px;
          right:-24px;
          width:80px;
          height:80px;
          border-radius:50%;
          background:color-mix(in srgb, var(--card-color) 18%, transparent);
          transition:transform var(--zf-dur-slow) var(--zf-ease-out), opacity var(--zf-dur-slow);
          opacity:.5;
          pointer-events:none;
        }
        .cat-card:hover .cat-deco{
          transform:scale(1.6);
          opacity:.85;
        }
        .cat-card .cat-icon-box{
          width:56px;
          height:56px;
          border-radius:14px;
          display:grid;
          place-items:center;
          margin:0 auto var(--zf-s3);
          color:#fff;
          font-size:24px;
          background:linear-gradient(135deg, var(--card-color), color-mix(in srgb, var(--card-color) 60%, #000));
          box-shadow:0 6px 14px color-mix(in srgb, var(--card-color) 35%, transparent);
          transition:transform var(--zf-dur-normal) var(--zf-ease-spring);
        }
        .cat-card:hover .cat-icon-box{transform:scale(1.1) rotate(-3deg)}
        .filter-chip{
          padding:6px 16px;
          border-radius:var(--zf-r-full);
          border:1px solid var(--zf-glass-border);
          background:var(--zf-glass-bg);
          color:var(--zf-text-secondary);
          font-size:var(--zf-fs-sm);
          font-weight:600;
          cursor:pointer;
          transition:all var(--zf-dur-fast) var(--zf-ease-out);
        }
        .filter-chip:hover{color:var(--zf-text-primary); border-color:var(--zf-primary-400)}
        .filter-chip.active{
          color:#fff;
          border-color:transparent;
          background:linear-gradient(135deg, var(--zf-primary-600), var(--zf-primary-500));
          box-shadow:0 4px 14px rgba(139,92,246,.4);
        }
      `}</style>

      {/* ============== 男女 Tab ============== */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: REVEAL_EASE }}
        style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--zf-s8)' }}
      >
        <div className="cat-tabs">
          {[1, 2].map((value) => {
            const isActive = channel === value;
            const cfg = TAB_CONFIG[value];
            return (
              <button
                key={value}
                className={`cat-tab ${isActive ? 'active' : ''}`}
                onClick={() => handleChannelChange(value)}
              >
                {isActive && (
                  <motion.div
                    layoutId="catTabIndicator"
                    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      zIndex: -1,
                      borderRadius: 'var(--zf-r-full)',
                      background: cfg.tabBg,
                      boxShadow: cfg.tabGlow,
                    }}
                  />
                )}
                {cfg.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ============== 分类 Banner ============== */}
      <motion.section
        key={`banner-${channel}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: REVEAL_EASE }}
        style={{
          padding: 'var(--zf-s10) var(--zf-s8)',
          borderRadius: 'var(--zf-r-xl)',
          background: tabCfg.bannerBg,
          border: '1px solid var(--zf-glass-border-strong)',
          backdropFilter: 'var(--zf-blur-glass)',
          WebkitBackdropFilter: 'var(--zf-blur-glass)',
          marginBottom: 'var(--zf-s6)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--zf-s6)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* 装饰光斑 */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: tabCfg.iconBg,
            opacity: 0.12,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        {/* 图标方块 84×84 圆角 24px */}
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: 38,
            flexShrink: 0,
            background: tabCfg.iconBg,
            boxShadow: tabCfg.iconGlow,
          }}
        >
          {channel === 1 ? <FireOutlined /> : <HeartOutlined />}
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
            {tabCfg.bannerTitle}
          </h2>
          <p
            style={{
              marginTop: 6,
              color: 'var(--zf-text-secondary)',
              fontSize: 'var(--zf-fs-sm)',
              margin: '6px 0 0 0',
            }}
          >
            {tabCfg.bannerSubtitle}
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 14px',
            borderRadius: 'var(--zf-r-full)',
            fontSize: 'var(--zf-fs-xs)',
            fontWeight: 600,
            color: 'var(--zf-text-primary)',
            background: 'var(--zf-glass-bg-strong)',
            border: '1px solid var(--zf-glass-border-strong)',
          }}
        >
          共 {categories.length} 个分类
        </span>
      </motion.section>

      {/* ============== 状态筛选 chips ============== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: REVEAL_EASE, delay: 0.1 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 4px',
          marginBottom: 'var(--zf-s5)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--zf-fs-xs)',
            fontWeight: 700,
            color: 'var(--zf-text-faint)',
            textTransform: 'uppercase',
            letterSpacing: '.08em',
          }}
        >
          状态筛选
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              className={`filter-chip ${sort === opt.value ? 'active' : ''}`}
              onClick={() => handleSortChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ============== 分类网格 ============== */}
      <div className="cat-grid">
        <AnimatePresence mode="popLayout">
          {categories.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.div
                key={category.categoryId}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.45, ease: REVEAL_EASE, delay: index * 0.05 }}
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.97 }}
                className="cat-card"
                onClick={() => handleCategoryClick(category)}
              >
                <div className="cat-deco" />
                <div className="cat-icon-box">
                  <Icon />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--zf-font-serif)',
                    fontSize: 'var(--zf-fs-md)',
                    fontWeight: 700,
                    color: 'var(--zf-text-primary)',
                    marginBottom: 4,
                  }}
                >
                  {category.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--zf-text-muted)',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: 30,
                  }}
                >
                  {category.desc}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    display: 'inline-block',
                    padding: '2px 10px',
                    borderRadius: 'var(--zf-r-full)',
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--card-color)',
                    background: 'color-mix(in srgb, var(--card-color) 14%, transparent)',
                  }}
                >
                  {sort === 1 ? '全部' : sort === 2 ? '完结' : '连载'}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Category;
