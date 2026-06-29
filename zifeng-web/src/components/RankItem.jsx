/**
 * RankItem —— 榜单详情列表项（统一组件库 Task 5）
 * 用于榜单详情页横向列表：序号 + 封面 + 信息（书名/简介/标签）+ 统计（阅读量/评分）。
 * 纯展示组件：不调用 API、不修改全局状态。
 * 参考：design/zifeng-pages-deep-dive.html .rank-detail-item
 */
import { useState } from 'react';
import { motion } from 'framer-motion';

/* —— 序号着色（金/银/铜/muted） —— */
const RANK_NUM_STYLES = {
  1: { color: 'var(--zf-accent-amber)', textShadow: '0 0 16px rgba(245,158,11,.7)' },
  2: { color: '#CBD5E1' },
  3: { color: '#B45309' },
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

export default function RankItem({ rank, novel, onClick }) {
  const [hovered, setHovered] = useState(false);

  const name = novel?.name ?? novel?.novelName ?? '未命名';
  const desc = novel?.desc ?? novel?.intro ?? '';
  const rawTags = novel?.tags
    ? novel.tags
    : novel?.category
      ? [novel.category]
      : [];
  const tags = Array.isArray(rawTags) ? rawTags : [];
  const readCount = novel?.readCount;
  const score = novel?.score;
  const reading = novel?.reading === true;

  const numStyle = RANK_NUM_STYLES[rank] || { color: 'var(--zf-text-muted)' };

  return (
    <motion.div
      whileHover={{ x: 6 }}
      transition={{ duration: 0.18, ease: HOVER_EASE }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--zf-s4)',
        padding: '14px 18px',
        borderRadius: 'var(--zf-r-md)',
        background: 'var(--zf-glass-bg)',
        border: '1px solid ' + (hovered ? 'var(--zf-primary-400)' : 'var(--zf-glass-border)'),
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color var(--zf-dur-fast) var(--zf-ease-out), background var(--zf-dur-fast) var(--zf-ease-out)',
      }}
    >
      {/* —— 序号 —— */}
      <div
        style={{
          width: 36,
          textAlign: 'center',
          fontFamily: 'var(--zf-font-serif)',
          fontWeight: 900,
          fontSize: 24,
          flexShrink: 0,
          ...numStyle,
        }}
      >
        {rank ?? '-'}
      </div>

      {/* —— 封面 —— */}
      {novel?.cover ? (
        <img
          src={novel.cover}
          alt={name}
          style={{
            width: 54,
            height: 72,
            borderRadius: 7,
            objectFit: 'cover',
            flexShrink: 0,
            border: '1px solid var(--zf-glass-border)',
            display: 'block',
          }}
        />
      ) : (
        <div
          style={{
            width: 54,
            height: 72,
            borderRadius: 7,
            flexShrink: 0,
            border: '1px solid var(--zf-glass-border)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'var(--zf-font-serif)',
            fontWeight: 900,
            fontSize: 24,
            color: '#fff',
            background: 'linear-gradient(135deg, var(--zf-primary-700), var(--zf-primary-500))',
            userSelect: 'none',
          }}
        >
          {name.charAt(0)}
        </div>
      )}

      {/* —— 信息区 —— */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'var(--zf-font-serif)',
            fontWeight: 700,
            fontSize: 'var(--zf-fs-md)',
            color: 'var(--zf-text-primary)',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
          {reading ? (
            <span
              title="在读"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--zf-accent-emerald)',
                flexShrink: 0,
                animation: 'livePulse 1.6s ease-in-out infinite',
              }}
            />
          ) : null}
        </div>

        {desc ? (
          <div
            style={{
              fontSize: 12,
              color: 'var(--zf-text-muted)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              marginTop: 3,
            }}
          >
            {desc}
          </div>
        ) : null}

        {tags.length ? (
          <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
            {tags.slice(0, 3).map((t, i) => (
              <span
                key={i}
                style={{
                  padding: '1px 7px',
                  borderRadius: 5,
                  fontSize: 10,
                  fontWeight: 600,
                  background: 'rgba(139,92,246,.15)',
                  color: 'var(--zf-primary-400)',
                }}
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* —— 统计区 —— */}
      <div
        style={{
          display: 'flex',
          gap: 14,
          fontSize: 12,
          color: 'var(--zf-text-secondary)',
          flexShrink: 0,
          textAlign: 'right',
        }}
      >
        {readCount !== undefined && readCount !== null && Number(readCount) > 0 ? (
          <div>
            <strong
              style={{
                display: 'block',
                color: 'var(--zf-text-primary)',
                fontSize: 15,
                fontFamily: 'var(--zf-font-serif)',
              }}
            >
              {formatReadCount(readCount)}
            </strong>
            阅读量
          </div>
        ) : null}
        {score !== undefined && score !== null ? (
          <div>
            <strong
              style={{
                display: 'block',
                color: 'var(--zf-text-primary)',
                fontSize: 15,
                fontFamily: 'var(--zf-font-serif)',
              }}
            >
              {score}
            </strong>
            评分
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
