import { useContext } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, Input } from 'antd';
import {
  FireOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  CommentOutlined,
  RightOutlined,
  ReadOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { NovelContext, ThemeContext } from '../App';
import { getDefaultSource, saveNovelCache } from '../utils/novelConfig';
import {
  ZfPageShell,
  ZfGrid,
  ZfSectionTitle,
  ZfGlassSurface,
  ZfPill,
  ZfCoverCard,
  ZfSkeleton,
  ZfSkeletonGrid,
} from '@zifeng/ui/components';
import { variants, EASE, DUR } from '@zifeng/ui/motion';
import { useFx } from '@zifeng/ui/motion/FxContext';
import { useBreakpoint } from '@zifeng/ui/hooks';
import { hasScore, formatScore } from '@zifeng/ui/format';

/* ============================================================
   紫枫免费小说 · 首页（P2 迁移）
   - Hero 改为「内容驱动」：主推书的真实封面/书名/分类/评分 + 详情入口
     + 搜索入口 + 搜索榜热门词，替换原先那块零信息量的三色假书堆
   - ★ 合成器铁律：光球与粒子的 infinite 动画全部移出玻璃卡，
     做成兄弟层（.zf-ambient__orb + .zf-anim-*），玻璃层内部不再有
     infinite 子动画 → 不再每帧重采样 backdrop
   - 六大榜单统一 ZfSectionTitle（品牌渐变底 + 白色图标，靠图标区分）
     与 ZfCoverCard（五张同一内部结构，文字基线对齐）
   - 断点走 useBreakpoint()，缓动走 EASE.out，页面内不再有内联 style 标签块
   ============================================================ */

/* 六大榜单配置：key 对应 novels 字段，rankType 对应 /rank/:rankType */
const RANK_SECTIONS = [
  { key: 'mustRead',  Icon: FireOutlined,        title: '必读榜', subtitle: '精选好书',     rankType: 1 },
  { key: 'potential', Icon: RiseOutlined,        title: '潜力榜', subtitle: 'rising stars', rankType: 5 },
  { key: 'completed', Icon: CheckCircleOutlined, title: '完结榜', subtitle: '已完结精品',   rankType: 2 },
  { key: 'updated',   Icon: ClockCircleOutlined, title: '更新榜', subtitle: '最近更新',     rankType: 3 },
  { key: 'search',    Icon: TrophyOutlined,      title: '搜索榜', subtitle: '热搜排行',     rankType: 4 },
  { key: 'comment',   Icon: CommentOutlined,     title: '评论榜', subtitle: '热门讨论',     rankType: 6 },
];

/* Hero 光球：兄弟层内的两团墨，色相全部走品牌 tint 令牌 */
const HERO_ORBS = [
  { top: '-14%', right: '-3%', width: 300, height: 300, tint: 'var(--zf-tint-brand-35)', delay: '0s' },
  { bottom: '-18%', left: '-2%', width: 240, height: 240, tint: 'var(--zf-tint-brand-25)', delay: '-9s' },
];

/* Hero 氛围粒子：位点写死而非 Math.random()，否则每次 render 都在重排 */
const HERO_PARTICLES = [
  { left: '6%',  top: '24%', size: 5, dur: '7s',   delay: '0s' },
  { left: '19%', top: '70%', size: 7, dur: '8.5s', delay: '-1.4s' },
  { left: '36%', top: '14%', size: 4, dur: '6.5s', delay: '-2.6s' },
  { left: '55%', top: '82%', size: 6, dur: '9s',   delay: '-3.2s' },
  { left: '73%', top: '18%', size: 4, dur: '7.5s', delay: '-0.8s' },
  { left: '88%', top: '64%', size: 8, dur: '10s',  delay: '-2.1s' },
];

/* —— 榜单图标：统一品牌渐变底 + 白色图标，靠图形而非色相区分 —— */
function RankBadge({ Icon }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
        borderRadius: 'var(--zf-r-md)',
        background: 'var(--zf-grad-brand)',
        color: 'var(--zf-on-accent)',
        fontSize: 'var(--zf-fs-md)',
        boxShadow: 'var(--zf-glow-brand-soft)',
      }}
    >
      <Icon />
    </span>
  );
}

/* —— 加载态：Hero 骨架 + 两组榜单骨架 —— */
function HomeSkeleton() {
  const { isMobile } = useBreakpoint();
  return (
    <ZfPageShell size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s8)' }}>
        <ZfSkeleton variant="block" height={isMobile ? 320 : 240} />
        {[0, 1].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)' }}>
            <ZfSkeleton variant="text" width={200} height={22} />
            <ZfSkeletonGrid count={isMobile ? 4 : 5} />
          </div>
        ))}
      </div>
    </ZfPageShell>
  );
}

const Home = () => {
  const { novels, loading } = useContext(NovelContext);
  /* glassMode 关闭时页面不能用玻璃底：ZfGlassSurface / ZfCoverCard 的
     background 与 backdrop-filter 是内联的，压过 [data-glass='off'] 的
     CSS 分支，所以这一层必须在页面里显式接管。 */
  const { glassMode } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { up, isMobile } = useBreakpoint();
  const { tier } = useFx();

  /* —— 榜单一行 5 张（窄屏 2 列），全部同一内部结构 —— */
  const cols = up('lg') ? 5 : isMobile ? 2 : 3;
  const featured = novels?.mustRead?.[0];
  const hotWords = (novels?.search || []).slice(0, 4);
  const particles = HERO_PARTICLES.slice(0, tier >= 2 ? 6 : tier >= 1 ? 3 : 0);

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

  const handleViewAll = (rankType) => navigate(`/rank/${rankType}`);

  const goSearch = (value) => {
    const kw = String(value || '').trim();
    if (kw) navigate(`/search?keyword=${encodeURIComponent(kw)}`);
  };

  if (loading) return <HomeSkeleton />;

  return (
    <ZfPageShell size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s10)' }}>
        {/* ============== Hero：内容驱动（真实主推书 + 搜索入口） ============== */}
        <section style={{ position: 'relative' }}>
          {/* ★ 氛围兄弟层：infinite 动画不得落在带 backdrop-filter 的卡内部 */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              pointerEvents: 'none',
              borderRadius: 'var(--zf-r-xl)',
            }}
          >
            {HERO_ORBS.map((o, i) => (
              <span
                key={i}
                className="zf-ambient__orb zf-anim-ink-flow"
                style={{
                  top: o.top,
                  right: o.right,
                  bottom: o.bottom,
                  left: o.left,
                  width: o.width,
                  height: o.height,
                  animationDelay: o.delay,
                  background: `radial-gradient(circle, ${o.tint}, transparent 70%)`,
                }}
              />
            ))}
            {particles.map((p, i) => (
              <span
                key={i}
                className="zf-anim-float"
                style={{
                  position: 'absolute',
                  left: p.left,
                  top: p.top,
                  width: p.size,
                  height: p.size,
                  borderRadius: 'var(--zf-r-full)',
                  background: i % 2 ? 'var(--zf-brand-400)' : 'var(--zf-brand-600)',
                  opacity: 0.45,
                  animationDuration: p.dur,
                  animationDelay: p.delay,
                }}
              />
            ))}
          </div>

          <ZfGlassSurface
            level={2}
            style={{
              position: 'relative',
              padding: isMobile ? 'var(--zf-s6)' : 'var(--zf-s10) var(--zf-s8)',
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(300px, 380px)',
              alignItems: 'center',
              gap: 'var(--zf-s8)',
              ...(glassMode
                ? null
                : {
                    background: 'var(--zf-surface-1)',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                  }),
            }}
          >
            {/* —— 左：身份 + 口号 + 搜索入口 + 热搜书名 —— */}
            <motion.div
              variants={variants.fadeUp}
              initial="initial"
              animate="animate"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s4)', minWidth: 0 }}
            >
              <ZfPill
                tone="brand"
                size="sm"
                icon={<ReadOutlined />}
                style={{ alignSelf: 'flex-start' }}
              >
                免费阅读 · 无需登录
              </ZfPill>

              {/* Hero 主标题：品牌水墨渐变。刻意不加 zf-anim-grad-flow ——
                  玻璃卡内的 infinite 动画会让 backdrop 每帧重采样，
                  静态渐变已足够撑起身份，动效预算全部交给兄弟层光球 */}
              <h1 className="zf-h1 zf-h1--fluid zf-grad-text">紫枫免费小说</h1>

              <p className="zf-lede" style={{ margin: 0, maxWidth: 'var(--zf-measure-text)' }}>
                聚合书源、纯净无广告。六大榜单每日精选，从玄幻到言情，点开就能一路读完。
              </p>

              <Input.Search
                placeholder="搜索书名 / 作者"
                enterButton
                size="large"
                onSearch={goSearch}
                style={{ maxWidth: 'var(--zf-container-xs)' }}
              />

              {hotWords.length > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', flexWrap: 'wrap' }}>
                  <span className="zf-caption" style={{ textTransform: 'uppercase', letterSpacing: 'var(--zf-ls-wide)' }}>
                    搜索榜热门
                  </span>
                  {hotWords.map((n) => (
                    <Button
                      key={n.id}
                      size="small"
                      classNames={{ root: 'zf-btn zf-btn--ghost' }}
                      onClick={() => goSearch(n.name)}
                    >
                      {n.name}
                    </Button>
                  ))}
                </div>
              ) : null}
            </motion.div>

            {/* —— 右：必读榜首名的真实封面与信息（替掉假书堆） —— */}
            {featured ? (
              <motion.aside
                variants={variants.scaleIn}
                initial="initial"
                animate="animate"
                transition={{ duration: DUR.slow / 1000, ease: EASE.out, delay: 0.12 }}
                aria-label={`必读榜首名《${featured.name}》`}
                onClick={() => handleClick(featured)}
                style={{
                  /* 内层刻意不再叠 backdrop-filter：嵌套玻璃会让重采样翻倍 */
                  display: 'flex',
                  gap: 'var(--zf-s4)',
                  padding: 'var(--zf-s4)',
                  borderRadius: 'var(--zf-r-lg)',
                  background: 'var(--zf-tint-brand-08)',
                  border: '1px solid rgb(var(--zf-brand-rgb-500) / 0.28)',
                  minWidth: 0,
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 'var(--zf-s24)',
                    flexShrink: 0,
                    aspectRatio: '3 / 4',
                    borderRadius: 'var(--zf-r-md)',
                    overflow: 'hidden',
                    background: 'var(--zf-glass-1)',
                  }}
                >
                  {featured.cover ? (
                    <img
                      src={featured.cover}
                      alt={featured.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <span
                      className="zf-h3"
                      aria-hidden="true"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--zf-text-faint)',
                      }}
                    >
                      {String(featured.name || '').slice(0, 1)}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s1)', minWidth: 0, flex: 1 }}>
                  <ZfPill tone="solid" size="xs" icon={<TrophyOutlined />} style={{ alignSelf: 'flex-start' }}>
                    必读榜第 1 名
                  </ZfPill>
                  <h2 className="zf-h3 zf-truncate" style={{ fontSize: 'var(--zf-fs-lg)' }} title={featured.name}>
                    {featured.name}
                  </h2>
                  <div className="zf-caption zf-truncate">{featured.author}</div>
                  <div style={{ display: 'flex', gap: 'var(--zf-s2)', flexWrap: 'wrap' }}>
                    {featured.category ? <ZfPill size="xs">{featured.category}</ZfPill> : null}
                    {hasScore(featured.score) ? (
                      <ZfPill size="xs" tone="warning">
                        {formatScore(featured.score)}
                      </ZfPill>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--zf-s2)', marginTop: 'auto', paddingTop: 'var(--zf-s3)' }}>
                    <Button
                      size="small"
                      classNames={{ root: 'zf-btn zf-btn--brand' }}
                      icon={<BookOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick(featured);
                      }}
                    >
                      开始阅读
                    </Button>
                    <Button
                      size="small"
                      classNames={{ root: 'zf-btn zf-btn--ghost' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/rank/1');
                      }}
                    >
                      完整榜单
                    </Button>
                  </div>
                </div>
              </motion.aside>
            ) : null}
          </ZfGlassSurface>
        </section>

        {/* ============== 六大榜单分区 ============== */}
        {RANK_SECTIONS.map((section, si) => {
          const list = novels?.[section.key];
          if (!list || list.length === 0) return null;

          return (
            <motion.section
              key={section.key}
              variants={variants.reveal}
              custom={si}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)' }}
            >
              <ZfSectionTitle
                animated={false}
                variant="line"
                title={section.title}
                sub={section.subtitle}
                icon={<RankBadge Icon={section.Icon} />}
                extra={
                  <Button
                    type="text"
                    size="small"
                    classNames={{ root: 'zf-btn zf-btn--ghost' }}
                    onClick={() => handleViewAll(section.rankType)}
                  >
                    查看全部 <RightOutlined />
                  </Button>
                }
              />

              <ZfGrid columns={cols} gap="var(--zf-s4)">
                {list.slice(0, 5).map((novel, i) => (
                  <ZfCoverCard
                    key={novel.id ?? i}
                    novel={novel}
                    rank={i + 1}
                    size="md"
                    glass={glassMode}
                    onOpen={handleClick}
                  />
                ))}
              </ZfGrid>
            </motion.section>
          );
        })}
      </div>
    </ZfPageShell>
  );
};

export default Home;
