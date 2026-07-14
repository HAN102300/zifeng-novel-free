import { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NovelContext, ThemeContext } from '../App';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import NovelCard from '../components/NovelCard';
import SectionHeader from '../components/SectionHeader';
import CalligraphyWatermark from '../components/CalligraphyWatermark';

/* ============================================================
   紫枫免费小说 · 首页（Task 8 重构）
   - Hero 渐变标题（gradFlow 流动渐变）
   - 六大榜单分区：左大图特色卡 + 右 4 列网格
   - framer-motion 错峰揭示 + 响应式（≤880px 单列）
   - 保留 NovelContext/ThemeContext 取数与 handleClick 跳转
   参考：design/zifeng-pages-deep-dive.html .home-hero / .rank-section
   ============================================================ */

/* 六大榜单配置：key 对应 novels 字段，icon 映射 SectionHeader，
   rankType 对应 App.jsx rankUrls 中的 type（/rank/:rankType） */
const RANK_SECTIONS = [
  { key: 'mustRead',  icon: 'fire',    title: '必读榜', subtitle: '精选好书',     rankType: 1 },
  { key: 'potential', icon: 'rise',    title: '潜力榜', subtitle: 'rising stars', rankType: 5 },
  { key: 'completed', icon: 'check',   title: '完结榜', subtitle: '已完结精品',   rankType: 2 },
  { key: 'updated',   icon: 'clock',   title: '更新榜', subtitle: '最近更新',     rankType: 3 },
  { key: 'search',    icon: 'trophy',  title: '搜索榜', subtitle: '热搜排行',     rankType: 4 },
  { key: 'comment',   icon: 'comment', title: '评论榜', subtitle: '热门讨论',     rankType: 6 },
];

const REVEAL_EASE = [0.16, 1, 0.3, 1];

/* —— 骨架占位块（基于 skel keyframe，不用全屏 Spin） —— */
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

/* —— 加载态：Hero + 三组分区骨架 —— */
function HomeSkeleton() {
  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <div
        style={{
          padding: 'var(--zf-s12)',
          borderRadius: 'var(--zf-r-xl)',
          background: 'linear-gradient(135deg, rgba(124,58,237,.18), rgba(236,72,153,.10))',
          border: '1px solid var(--zf-glass-border)',
          marginBottom: 'var(--zf-s8)',
        }}
      >
        <Skel height={44} width={260} radius="var(--zf-r-sm)" />
        <div style={{ marginTop: 12 }}>
          <Skel height={18} width={320} radius="var(--zf-r-sm)" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ marginBottom: 'var(--zf-s10)' }}>
          <div style={{ marginBottom: 'var(--zf-s5)' }}>
            <Skel height={42} width={220} radius="var(--zf-r-lg)" />
          </div>
          <div className="zf-rank-layout">
            <Skel height={300} radius="var(--zf-r-lg)" />
            <div className="zf-rank-grid">
              {[0, 1, 2, 3].map((j) => (
                <Skel key={j} height={290} radius="var(--zf-r-md)" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const Home = () => {
  const { novels, loading } = useContext(NovelContext);
  const { currentTheme, themeConfigs, isDarkMode, glassMode } = useContext(ThemeContext);
  const navigate = useNavigate();

  const colors = themeConfigs[currentTheme].colors;
  const primaryColor = themeConfigs[currentTheme].primaryColor;

  /* —— 跳转小说详情（保留原逻辑：默认书源 + 缓存 + navigate） —— */
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
    navigate(`/novel/${novel.id}?${params.toString()}`);
  };

  const handleViewAll = (rankType) => {
    navigate(`/rank/${rankType}`);
  };

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* —— 响应式布局：≤880px 特色卡置顶、网格变 2 列 —— */}
      <style>{`
        .zf-rank-layout{display:grid;grid-template-columns:280px 1fr;gap:var(--zf-s5)}
        .zf-rank-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:var(--zf-s4)}
        @media (max-width:880px){
          .zf-rank-layout{grid-template-columns:1fr}
          .zf-rank-grid{grid-template-columns:repeat(2,1fr)}
          .zf-hero-books{display:none!important}
        }
        @keyframes zfParticleFloat{
          0%,100%{transform:translateY(0) translateX(0);opacity:.2}
          50%{transform:translateY(-18px) translateX(8px);opacity:.7}
        }
        .zf-hero-particle{animation:zfParticleFloat ease-in-out infinite}
      `}</style>

      {/* ============== Hero 区（左右分栏：文字 + 浮动书本） ============== */}
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
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--zf-s6)',
          minHeight: 220,
        }}
      >
        {/* —— 背景层：水墨墨团浮动 —— */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            right: '3%',
            width: 280,
            height: 280,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 70%)`,
            filter: 'blur(55px)',
            animation: 'inkFlow 25s ease-in-out infinite',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '5%',
            left: '2%',
            width: 220,
            height: 220,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${(colors[2] || primaryColor)}18 0%, transparent 70%)`,
            filter: 'blur(45px)',
            animation: 'inkFlow 30s ease-in-out infinite reverse',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        {/* —— 书法水印"阅" —— */}
        <CalligraphyWatermark
          char="阅"
          position={{ top: '2%', right: '2%' }}
          size={180}
          color={`${primaryColor}0a`}
        />

        {/* —— 粒子飘动 —— */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="zf-hero-particle"
            style={{
              position: 'absolute',
              width: 3 + (i % 3) * 2,
              height: 3 + (i % 3) * 2,
              borderRadius: '50%',
              background: i % 2 === 0 ? primaryColor : (colors[1] || primaryColor),
              left: `${8 + i * 11}%`,
              top: `${15 + (i * 9) % 65}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${4 + (i % 3) * 1.5}s`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        ))}

        {/* —— 左侧：标题 + 副标题 + 装饰线 —— */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: REVEAL_EASE }}
            style={{
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 'var(--zf-fs-4xl)',
              fontWeight: 900,
              lineHeight: 1.1,
              margin: 0,
              marginBottom: 14,
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
              紫枫免费小说
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: REVEAL_EASE }}
            style={{
              color: 'var(--zf-text-secondary)',
              maxWidth: 480,
              margin: 0,
              fontSize: 'var(--zf-fs-lg)',
            }}
          >
            海量书源 · 免费阅读 · 极致体验
          </motion.p>
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 80, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4, ease: REVEAL_EASE }}
            style={{
              height: 4,
              borderRadius: 2,
              marginTop: 18,
              background:
                'linear-gradient(90deg, var(--zf-primary-500), var(--zf-accent-magenta))',
            }}
          />
        </div>

        {/* —— 右侧：浮动书本图标群 —— */}
        <div
          className="zf-hero-books"
          style={{
            flex: '0 0 220px',
            height: 200,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {[
            { x: 10, y: 15, rotate: -10, delay: 0, grad: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', z: 3, label: '紫' },
            { x: 85, y: 5, rotate: 8, delay: 0.2, grad: 'linear-gradient(135deg, #EC4899, #BE123C)', z: 2, label: '枫' },
            { x: 48, y: 70, rotate: -4, delay: 0.4, grad: 'linear-gradient(135deg, #06B6D4, #0891B2)', z: 1, label: '阅' },
          ].map((book, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: book.y }}
              transition={{ duration: 0.6, delay: 0.3 + book.delay, ease: REVEAL_EASE }}
              style={{
                position: 'absolute',
                left: book.x,
                top: 0,
                width: 72,
                height: 100,
                borderRadius: '4px 10px 10px 4px',
                background: book.grad,
                boxShadow:
                  '0 10px 30px rgba(0,0,0,.28), inset 5px 0 0 rgba(0,0,0,.18), inset 0 0 20px rgba(255,255,255,.08)',
                zIndex: book.z,
                overflow: 'hidden',
              }}
            >
              {/* 书本封面光泽 */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 5,
                  right: 0,
                  bottom: 0,
                  background:
                    'linear-gradient(105deg, transparent 40%, rgba(255,255,255,.12) 50%, transparent 60%)',
                  pointerEvents: 'none',
                }}
              />
              {/* 浮动动画层 */}
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [book.rotate, book.rotate + 2, book.rotate] }}
                transition={{ duration: 3.5 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `rotate(${book.rotate}deg)`,
                }}
              >
                <span
                  style={{
                    color: 'rgba(255,255,255,.75)',
                    fontSize: 28,
                    fontWeight: 900,
                    fontFamily: 'var(--zf-font-serif), serif',
                    textShadow: '0 2px 4px rgba(0,0,0,.3)',
                  }}
                >
                  {book.label}
                </span>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============== 六大榜单分区 ============== */}
      {RANK_SECTIONS.map((section) => {
        const list = novels?.[section.key];
        if (!list || list.length === 0) return null;

        const feature = list[0];
        const rest = list.slice(1, 5); // 第 2-5 本（4 本）

        return (
          <motion.section
            key={section.key}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, ease: REVEAL_EASE }}
            style={{ marginBottom: 'var(--zf-s10)' }}
          >
            <SectionHeader
              icon={section.icon}
              title={section.title}
              subtitle={section.subtitle}
              onViewAll={() => handleViewAll(section.rankType)}
            />

            <div className="zf-rank-layout">
              {/* —— 左：大图特色卡（取榜单第 1 本） —— */}
              <div
                onClick={() => handleClick(feature)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                style={{
                  position: 'relative',
                  borderRadius: 'var(--zf-r-lg)',
                  overflow: 'hidden',
                  height: 300,
                  cursor: 'pointer',
                  transition: 'transform var(--zf-dur-normal) var(--zf-ease-spring)',
                  background: `linear-gradient(135deg, var(--zf-primary-700), ${primaryColor})`,
                }}
              >
                {feature.cover ? (
                  <img
                    src={feature.cover}
                    alt={feature.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : null}

                {/* 底部渐变遮罩 + 标题/简介/标签 */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(180deg, transparent 30%, rgba(11,8,20,.95))',
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                  }}
                >
                  {/* 金色 "1" 光晕徽章（pulseGold） */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 16,
                      left: 16,
                      width: 44,
                      height: 52,
                      borderRadius: 8,
                      background: 'linear-gradient(135deg, var(--zf-accent-amber), #F97316)',
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--zf-font-serif)',
                      fontWeight: 900,
                      fontSize: 24,
                      color: '#fff',
                      animation: 'pulseGold 2s ease-in-out infinite',
                    }}
                  >
                    1
                  </div>

                  <div
                    style={{
                      fontFamily: 'var(--zf-font-serif)',
                      fontSize: 'var(--zf-fs-xl)',
                      fontWeight: 700,
                      color: '#fff',
                      marginBottom: 6,
                    }}
                  >
                    {feature.name}
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--zf-fs-sm)',
                      color: 'rgba(255,255,255,.8)',
                      marginBottom: 12,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {feature.author}
                    {feature.category ? ` · ${feature.category}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {feature.category ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'rgba(139,92,246,.30)',
                          color: '#fff',
                        }}
                      >
                        {feature.category}
                      </span>
                    ) : null}
                    {feature.score ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'rgba(245,158,11,.30)',
                          color: '#FDE68A',
                        }}
                      >
                        {feature.score} 分
                      </span>
                    ) : null}
                    {feature.rankInfo ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: 5,
                          fontSize: 11,
                          fontWeight: 600,
                          background: 'rgba(236,72,153,.30)',
                          color: '#FBCFE8',
                        }}
                      >
                        {feature.rankInfo}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* —— 右：4 列网格（第 2-5 本，index 从 1 起错峰入场） —— */}
              <div className="zf-rank-grid">
                {rest.map((novel, idx) => (
                  <NovelCard
                    key={novel.id}
                    novel={novel}
                    index={idx + 1}
                    color={colors[0]}
                    glassMode={glassMode}
                    isDarkMode={isDarkMode}
                    onClick={() => handleClick(novel)}
                  />
                ))}
              </div>
            </div>
          </motion.section>
        );
      })}
    </div>
  );
};

export default Home;
