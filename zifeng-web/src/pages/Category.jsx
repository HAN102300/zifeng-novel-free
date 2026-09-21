import { useContext, useMemo, useState } from 'react';
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
  RightOutlined,
} from '@ant-design/icons';
import { NovelContext } from '../App';
import { ZfPageShell, ZfGrid, ZfSectionTitle, ZfPill } from '@zifeng/ui/components';
import { variants, EASE, DUR } from '@zifeng/ui/motion';
import { useBreakpoint } from '@zifeng/ui/hooks';

/* ============================================================
   紫枫免费小说 · 分类页（P2 迁移）
   - 全站色彩失控最严重的一页收敛回品牌紫：tab、频道横幅、9 张分类卡的
     图标底全部走 --zf-grad-brand，只靠图形区分，不再一人一个色相
   - 两种「全部」胶囊统一为 ZfPill；白字一律走 --zf-on-accent / --zf-on-tint
   - 分类卡：收紧高度、去掉右上角无意义装饰圆，改为「有真实在榜书才渲染」
     的封面预览（数据取自 App 已拉取的六大榜单 NovelContext，不造假数据）
   - 内联 style 标签块与 780/1024 魔数断点 → useBreakpoint()
   ============================================================ */

/* —— 男生频道分类：图标只作区分，色相统一由品牌渐变承担 —— */
const maleCategories = [
  { name: '玄幻', categoryId: 'lejRej', icon: FireOutlined, desc: '修仙悟道，逆天改命' },
  { name: '武侠', categoryId: 'nel5aK', icon: ThunderboltOutlined, desc: '快意恩仇，仗剑天涯' },
  { name: '都市', categoryId: 'mbk5ez', icon: BankOutlined, desc: '都市风云，纵横捭阖' },
  { name: '仙侠', categoryId: 'vbmOeY', icon: CloudOutlined, desc: '仙道飘渺，御剑飞行' },
  { name: '军事', categoryId: 'penRe7', icon: AimOutlined, desc: '铁血军魂，保家卫国' },
  { name: '历史', categoryId: 'xbojag', icon: HistoryOutlined, desc: '穿越古今，纵横天下' },
  { name: '游戏', categoryId: 'mep2bM', icon: CustomerServiceOutlined, desc: '虚拟世界，无限可能' },
  { name: '科幻', categoryId: 'zbq2dp', icon: RocketOutlined, desc: '星辰大海，未来可期' },
  { name: '轻小说', categoryId: 'YerEdO', icon: ExperimentOutlined, desc: '轻松阅读，趣味横生' },
];

/* —— 女生频道分类 —— */
const femaleCategories = [
  { name: '现代言情', categoryId: '9avmeG', icon: HeartOutlined, desc: '都市情缘，甜蜜爱恋' },
  { name: '古代言情', categoryId: 'DdwRb1', icon: CrownOutlined, desc: '宫闱情深，凤舞九天' },
  { name: '幻想言情', categoryId: '7ax9by', icon: BulbOutlined, desc: '奇幻世界，浪漫邂逅' },
  { name: '青春校园', categoryId: 'Pdy7aQ', icon: SmileOutlined, desc: '青春校园，懵懂心动' },
  { name: '唯美纯爱', categoryId: 'kazYeJ', icon: StarOutlined, desc: '纯爱至上，温暖治愈' },
  { name: '同人衍生', categoryId: '9aAOdv', icon: SafetyOutlined, desc: '同人创作，衍生无限' },
];

/* —— 状态筛选 —— */
const SORT_OPTIONS = [
  { label: '全部', value: 1 },
  { label: '完结', value: 2 },
  { label: '连载', value: 3 },
];

/* —— 频道文案：两档共用同一套品牌色，只剩文字不同 —— */
const CHANNELS = {
  1: { label: '男生频道', Icon: FireOutlined, subtitle: '玄幻武侠 · 都市仙侠 · 科幻游戏' },
  2: { label: '女生频道', Icon: HeartOutlined, subtitle: '现代言情 · 古代言情 · 青春校园' },
};

const SORT_LABEL = { 1: '全部', 2: '完结', 3: '连载' };

/* —— 卡片/胶囊共用版式 —— */
const ICON_SQUARE = {
  display: 'grid',
  placeItems: 'center',
  flexShrink: 0,
  borderRadius: 'var(--zf-r-md)',
  background: 'var(--zf-grad-brand)',
  color: 'var(--zf-on-accent)',
  boxShadow: 'var(--zf-glow-brand-soft)',
};

const ROW = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', minWidth: 0 };

/* 分类卡外壳：高度由内容决定，不再有 40% 的黑色空腔与右上角装饰圆 */
const CAT_CARD = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--zf-s3)',
  padding: 'var(--zf-s4)',
  borderRadius: 'var(--zf-r-lg)',
  background: 'var(--zf-glass-1)',
  border: '1px solid var(--zf-glass-border)',
  boxShadow: 'var(--zf-shadow-1), var(--zf-glass-edge-top)',
  cursor: 'pointer',
  minWidth: 0,
  textAlign: 'left',
};

const MUTED_XS = { fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' };
const GO_ICON = { marginLeft: 'auto', fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-brand-500)' };
const CAT_NAME = {
  fontFamily: 'var(--zf-font-display)',
  fontSize: 'var(--zf-fs-md)',
  fontWeight: 700,
  color: 'var(--zf-text-primary)',
  lineHeight: 'var(--zf-lh-snug)',
};

/** 真实在榜书的迷你封面：无封面时退化为书名首字，不占位造假 */
function MiniCover({ book }) {
  return (
    <span
      title={book.name}
      style={{
        width: 26,
        height: 35,
        flexShrink: 0,
        borderRadius: 'var(--zf-r-xs)',
        overflow: 'hidden',
        border: '1px solid var(--zf-glass-border)',
        background: 'var(--zf-glass-2)',
        display: 'grid',
        placeItems: 'center',
        fontSize: 'var(--zf-fs-2xs)',
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
        String(book.name).slice(0, 1)
      )}
    </span>
  );
}

/**
 * 可点击胶囊：ZfPill 只渲染 span（共享层无 button 变体），
 * 这里补 role/tabIndex/键盘，避免筛选器变成纯鼠标可操作。
 */
function FilterChip({ active, children, onClick }) {
  return (
    <ZfPill
      tone={active ? 'solid' : 'neutral'}
      size="md"
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {children}
    </ZfPill>
  );
}

const readSaved = (key, fallback) => {
  try {
    const saved = sessionStorage.getItem(key);
    return saved ? Number(saved) : fallback;
  } catch {
    return fallback;
  }
};

const Category = () => {
  const navigate = useNavigate();
  const { novels } = useContext(NovelContext);
  const { up, isMobile } = useBreakpoint();

  /* —— 保留 sessionStorage 读写 —— */
  const [channel, setChannel] = useState(() => readSaved('category_channel', 1));
  const [sort, setSort] = useState(() => readSaved('category_sort', 1));

  const categories = channel === 1 ? maleCategories : femaleCategories;
  const cfg = CHANNELS[channel] || CHANNELS[1];
  const ChannelIcon = cfg.Icon;

  /* —— 真实在榜封面：按分类名索引六大榜单已取到的书目，没有就不渲染 —— */
  const booksByCategory = useMemo(() => {
    const map = new Map();
    Object.values(novels || {}).forEach((list) => {
      (list || []).forEach((n) => {
        if (!n?.category || !n?.name) return;
        if (!map.has(n.category)) map.set(n.category, []);
        const arr = map.get(n.category);
        if (arr.some((x) => x.id === n.id)) return;
        arr.push(n);
      });
    });
    return map;
  }, [novels]);

  const cols = up('xl') ? 4 : up('md') ? 3 : 2;

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
    <ZfPageShell size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s6)' }}>
        {/* ============== 频道 Tab：两档同一品牌渐变 ============== */}
        <motion.div
          variants={variants.fadeUp}
          initial="initial"
          animate="animate"
          style={{ display: 'flex', justifyContent: 'center' }}
        >
          <div
            role="tablist"
            style={{
              position: 'relative',
              display: 'inline-flex',
              padding: 'var(--zf-s1)',
              gap: 'var(--zf-s1)',
              borderRadius: 'var(--zf-r-full)',
              background: 'var(--zf-glass-1)',
              border: '1px solid var(--zf-glass-border)',
            }}
          >
            {[1, 2].map((value) => {
              const isActive = channel === value;
              const item = CHANNELS[value];
              return (
                <motion.button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleChannelChange(value)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 'var(--zf-s2) var(--zf-s6)',
                    borderRadius: 'var(--zf-r-full)',
                    fontFamily: 'var(--zf-font-display)',
                    fontSize: 'var(--zf-fs-md)',
                    fontWeight: 700,
                    color: isActive ? 'var(--zf-on-accent)' : 'var(--zf-text-muted)',
                    transition: `color var(--zf-dur-fast) var(--zf-ease-out)`,
                  }}
                >
                  {isActive ? (
                    <motion.span
                      layoutId="catTabIndicator"
                      transition={{ duration: DUR.base / 1000, ease: EASE.glide }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: -1,
                        borderRadius: 'var(--zf-r-full)',
                        background: 'var(--zf-grad-brand)',
                        boxShadow: 'var(--zf-glow-brand)',
                      }}
                    />
                  ) : null}
                  {item.label}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ============== 频道横幅：压缩到一行高度，只承担「我在哪个频道」 ============== */}
        <ZfSectionTitle
          animated={false}
          variant="line"
          title={cfg.label}
          sub={cfg.subtitle}
          icon={
            <span aria-hidden="true" style={{ ...ICON_SQUARE, width: 30, height: 30, fontSize: 'var(--zf-fs-md)' }}>
              <ChannelIcon />
            </span>
          }
          extra={<ZfPill tone="brand">共 {categories.length} 个分类 · {SORT_LABEL[sort]}</ZfPill>}
        />

        {/* ============== 状态筛选 ============== */}
        <div style={ROW}>
          <span className="zf-label" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-faint)' }}>
            状态筛选
          </span>
          <div style={{ ...ROW, flexWrap: 'wrap' }}>
            {SORT_OPTIONS.map((opt) => (
              <FilterChip key={opt.value} active={sort === opt.value} onClick={() => handleSortChange(opt.value)}>
                {opt.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {/* ============== 分类网格 ============== */}
        <ZfGrid columns={cols} gap="var(--zf-s4)">
          <AnimatePresence mode="popLayout" initial={false}>
            {categories.map((category) => {
              const Icon = category.icon;
              const inRank = (booksByCategory.get(category.name) || []).slice(0, 3);
              return (
                <motion.div
                  key={category.categoryId}
                  layout
                  variants={variants.cardIn}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0, scale: 0.94 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  whileHover={{ y: -6, boxShadow: 'var(--zf-shadow-3), var(--zf-glass-edge-top)' }}
                  whileTap={{ scale: 0.98 }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${category.name} · ${cfg.label}`}
                  onClick={() => handleCategoryClick(category)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleCategoryClick(category);
                    }
                  }}
                  style={CAT_CARD}
                >
                  <div style={ROW}>
                    <span
                      aria-hidden="true"
                      style={{ ...ICON_SQUARE, width: 36, height: 36, fontSize: 'var(--zf-fs-lg)' }}
                    >
                      <Icon />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="zf-truncate" style={CAT_NAME}>
                        {category.name}
                      </div>
                      <div className="zf-caption">
                        {SORT_LABEL[sort]}
                        {inRank.length > 0 ? ` · 在榜 ${inRank.length} 本` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="zf-clamp-2" style={MUTED_XS}>
                    {category.desc}
                  </div>

                  {/* 真实在榜书封面：数据来自 App 已取到的六大榜单，没有就不渲染 */}
                  <div style={{ ...ROW, justifyContent: 'flex-end' }}>
                    {inRank.length > 0 ? (
                      <div style={{ ...ROW, gap: 'var(--zf-s1)' }}>
                        {inRank.map((b) => (
                          <MiniCover key={b.id} book={b} />
                        ))}
                      </div>
                    ) : null}
                    <RightOutlined style={GO_ICON} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </ZfGrid>

        {isMobile ? (
          <p className="zf-caption" style={{ margin: 0 }}>
            选择分类后进入榜单页，可按「全部 / 完结 / 连载」筛选。
          </p>
        ) : null}
      </div>
    </ZfPageShell>
  );
};

export default Category;
