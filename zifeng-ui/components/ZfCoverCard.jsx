/* ============================================================
   ZfCoverCard —— 统一书籍封面卡
   收编三套并存的卡片语言：NovelCard(玻璃)、antd <Card>(搜索结果/设置/
   用户中心 18 处)、.zf-shelf-list-item(书架列表视图)。

   ★ 关键设计决定：所有位次共用同一内部结构（封面在上、信息在下）。
   现状第 1 名用「满血封面 + 底部渐变遮罩叠字」、2-5 名用「白底卡 +
   封面在上 + 文字在下」，两种结构并排导致文字基线对不齐，且 2-5 名
   被拉伸到与第 1 名等高后卡内下方出现大片失衡留白、标签胶囊像被甩在
   左下角。这里改为：位次差异只体现在尺寸与光晕，不体现在布局结构。
   ============================================================ */

import React from 'react';
import { motion } from 'framer-motion';
import { variants } from '../motion/index.js';
import { formatReadCount, hasScore } from '../format/index.js';
import ZfPill from './ZfPill.jsx';
import { useFx } from '../motion/FxContext.jsx';

const SIZE = {
  md: { cover: '3 / 4', title: 'var(--zf-fs-base)', clamp: 1 },
  lg: { cover: '3 / 4', title: 'var(--zf-fs-md)', clamp: 2 },
  feature: { cover: '4 / 5', title: 'var(--zf-fs-lg)', clamp: 2 },
};

export default function ZfCoverCard({
  novel,
  rank,
  size = 'md',
  glass = true,
  onOpen,
  footer,
  style,
  className = '',
}) {
  const { enabled } = useFx();
  const s = SIZE[size] ?? SIZE.md;

  const name = novel?.name ?? novel?.novelName ?? '未命名';
  const author = novel?.author ?? novel?.authorName ?? '未知作者';
  const cover = novel?.cover ?? novel?.coverUrl ?? novel?.bookCoverUrl;
  const category = novel?.category ?? novel?.categoryNames?.[0]?.className;
  const score = novel?.score ?? novel?.averageScore;
  const readCount = novel?.readCount ?? novel?.heat;
  const latest = novel?.latestChapterTitle ?? novel?.lastChapter?.chapterName ?? novel?.lastChapter;

  const interactive = typeof onOpen === 'function';

  return (
    <motion.article
      layout
      onClick={interactive ? () => onOpen(novel) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen(novel);
              }
            }
          : undefined
      }
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      whileHover={enabled('tilt') && interactive ? { y: -6 } : undefined}
      whileTap={interactive ? { scale: 0.99 } : undefined}
      transition={variants.hoverLift.transition}
      className={`zf-cover-card ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--zf-s3)',
        padding: 'var(--zf-s3)',
        borderRadius: 'var(--zf-r-lg)',
        background: glass ? 'var(--zf-glass-2)' : 'var(--zf-surface-1)',
        backdropFilter: glass ? 'var(--zf-blur-glass)' : undefined,
        WebkitBackdropFilter: glass ? 'var(--zf-blur-glass)' : undefined,
        border: `1px solid ${Number.isFinite(rank) && rank === 1 ? 'rgb(var(--zf-brand-rgb-500) / 0.38)' : 'var(--zf-glass-border)'}`,
        boxShadow:
          Number.isFinite(rank) && rank === 1
            ? 'var(--zf-shadow-3), var(--zf-glass-edge-top)'
            : 'var(--zf-shadow-1), var(--zf-glass-edge-top)',
        cursor: interactive ? 'pointer' : undefined,
        minWidth: 0,
        ...style,
      }}
    >
      {/* 封面：固定比例，避免各源站封面比例不一导致的视觉跳动 */}
      <div
        style={{
          position: 'relative',
          aspectRatio: s.cover,
          borderRadius: 'var(--zf-r-md)',
          overflow: 'hidden',
          background: 'var(--zf-glass-1)',
        }}
      >
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span
            aria-hidden="true"
            className="zf-h3"
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--zf-fs-xl)',
              color: 'var(--zf-text-faint)',
            }}
          >
            {name.slice(0, 1)}
          </span>
        )}

        {Number.isFinite(rank) && rank > 0 ? (
          <ZfPill
            rank={rank}
            size="xs"
            style={{ position: 'absolute', top: 'var(--zf-s2)', left: 'var(--zf-s2)', minWidth: 22, justifyContent: 'center' }}
          >
            {rank}
          </ZfPill>
        ) : null}
      </div>

      {/* 信息区：flex-grow 让所有卡片的底部标签行自然对齐，不再靠拉伸制造留白 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
        <h3
          className="zf-truncate"
          style={{
            fontSize: s.title,
            fontWeight: 600,
            lineHeight: 'var(--zf-lh-snug)',
            color: 'var(--zf-text-primary)',
            margin: 0,
          }}
          title={name}
        >
          {name}
        </h3>

        <div className="zf-truncate" style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' }}>
          {author}
        </div>

        {latest ? (
          <div
            className="zf-truncate"
            style={{ fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-faint)', marginTop: 2 }}
            title={latest}
          >
            最新 · {latest}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 'var(--zf-s2)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--zf-s2)',
            flexWrap: 'wrap',
          }}
        >
          {category ? <ZfPill size="xs">{category}</ZfPill> : null}
          {hasScore(score) ? (
            <ZfPill size="xs" tone="warning">
              {Number(score).toFixed(1)}
            </ZfPill>
          ) : null}
          {readCount != null ? (
            <span
              className="zf-num"
              style={{ marginLeft: 'auto', fontSize: 'var(--zf-fs-2xs)', color: 'var(--zf-text-faint)' }}
            >
              {formatReadCount(readCount)}
            </span>
          ) : null}
        </div>

        {footer}
      </div>
    </motion.article>
  );
}
