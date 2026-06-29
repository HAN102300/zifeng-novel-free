/**
 * NovelCard —— 小说卡片（统一组件库 Task 4）
 * 用于网格展示小说：封面区 + 排名徽章（top-left）+ 角标（top-right）+
 * 底部信息（标题 / 作者 / 分类 / 阅读量）。
 * 纯展示组件：不调用 API、不修改全局状态。
 * 参考：design/zifeng-pages-deep-dive.html .novel-card / .rank-badge-sm
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { glassCardStyle } from '../utils/glassStyle';

/* —— 排名徽章渐变（gold/silver/bronze/purple） —— */
const RANK_BADGE_STYLES = {
  1: {
    background: 'linear-gradient(135deg, var(--zf-accent-amber), #F97316)',
    boxShadow: '0 0 18px rgba(245,158,11,.7)',
    animation: 'pulseGold 2s ease-in-out infinite',
  },
  2: { background: 'linear-gradient(135deg, #94A3B8, #64748B)' },
  3: { background: 'linear-gradient(135deg, #B45309, #92400E)' },
};

/* —— 角标（hot / new） —— */
const CORNER_BADGE = {
  hot: { background: 'linear-gradient(135deg, var(--zf-accent-magenta), #BE123C)', text: 'HOT' },
  new: { background: 'linear-gradient(135deg, var(--zf-accent-cyan), #0E7490)', text: 'NEW' },
};

const HOVER_EASE = [0.16, 1, 0.3, 1];

/* 阅读量格式化：>=10000 显示为「x.x 万」 */
function formatReadCount(count) {
  if (count === undefined || count === null) return '0';
  const n = Number(count);
  if (Number.isNaN(n)) return String(count);
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  return String(n);
}

/* 选取卡片简介：desc/intro > 有意义的 rankInfo > category */
function getSummary(novel) {
  const intro = novel?.desc ?? novel?.intro ?? '';
  if (intro) return intro;
  const rankInfo = novel?.rankInfo ?? '';
  if (rankInfo && String(rankInfo) !== String(novel?.rank)) return rankInfo;
  return novel?.category ?? '';
}

export default function NovelCard({ novel, index = 0, color, glassMode, isDarkMode, onClick }) {
  const [imgHover, setImgHover] = useState(false);

  const name = novel?.name ?? novel?.novelName ?? '未命名';
  const author = novel?.author ?? novel?.authorName ?? '佚名';
  const summary = getSummary(novel);
  const rank = novel?.rank;
  const badge = novel?.badge;
  const score = novel?.score;
  const hasCover = !!novel?.cover;

  const rankStyle =
    RANK_BADGE_STYLES[rank] || {
      background: 'linear-gradient(135deg, var(--zf-primary-600), var(--zf-primary-500))',
    };
  const corner = badge ? CORNER_BADGE[badge] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: HOVER_EASE, delay: (index || 0) * 0.08 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setImgHover(true)}
      onHoverEnd={() => setImgHover(false)}
      onClick={onClick}
      style={{
        ...glassCardStyle(glassMode, isDarkMode),
        position: 'relative',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 'var(--zf-r-md)',
        overflow: 'hidden',
        border: '1px solid var(--zf-glass-border)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* —— 封面区 —— */}
      <div
        style={{
          position: 'relative',
          height: 180,
          overflow: 'hidden',
          flexShrink: 0,
          background: `linear-gradient(135deg, var(--zf-primary-700), ${color || 'var(--zf-primary-500)'})`,
        }}
      >
        {hasCover ? (
          <img
            src={novel.cover}
            alt={name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: imgHover ? 'scale(1.12)' : 'scale(1)',
              transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 64,
              fontWeight: 900,
              color: 'rgba(255,255,255,.9)',
              textShadow: '0 4px 16px rgba(0,0,0,.3)',
              userSelect: 'none',
            }}
          >
            {name.charAt(0)}
          </div>
        )}

        {/* 排名徽章（top-left） */}
        {rank ? (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 24,
              height: 30,
              borderRadius: 5,
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--zf-font-serif)',
              fontWeight: 900,
              fontSize: 14,
              color: '#fff',
              ...rankStyle,
            }}
          >
            {rank}
          </div>
        ) : null}

        {/* 角标（top-right） */}
        {corner ? (
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.5,
              color: '#fff',
              background: corner.background,
            }}
          >
            {corner.text}
          </div>
        ) : null}
      </div>

      {/* —— 卡片信息区（垂直均匀分布，避免大面积留白） —— */}
      <div
        style={{
          padding: '12px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 6,
          minHeight: 0,
        }}
      >
        {/* 标题 */}
        <div
          style={{
            fontFamily: 'var(--zf-font-serif)',
            fontSize: 'var(--zf-fs-base)',
            fontWeight: 700,
            color: 'var(--zf-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.35,
          }}
        >
          {name}
        </div>

        {/* 作者 + 评分 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minHeight: 0,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: 'var(--zf-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flex: 1,
            }}
          >
            {author}
          </span>
          {Number(score) > 0 ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                flexShrink: 0,
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--zf-accent-amber)',
              }}
            >
              <span style={{ fontSize: 10 }}>★</span>
              {Number(score).toFixed(1)}
            </span>
          ) : null}
        </div>

        {/* 简介 / 榜单信息 */}
        <div
          style={{
            fontSize: 12,
            color: 'var(--zf-text-secondary)',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: 36,
          }}
        >
          {summary}
        </div>

        {/* 分类标签 + 阅读量 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            fontSize: 11,
            color: 'var(--zf-text-secondary)',
          }}
        >
          {novel?.category ? (
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 600,
                background: 'rgba(139,92,246,.15)',
                color: 'var(--zf-primary-400)',
                flexShrink: 0,
              }}
            >
              {novel.category}
            </span>
          ) : (
            <span />
          )}
          {Number(novel?.readCount) > 0 ? (
            <span style={{ whiteSpace: 'nowrap' }}>{formatReadCount(novel?.readCount)} 阅读量</span>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
