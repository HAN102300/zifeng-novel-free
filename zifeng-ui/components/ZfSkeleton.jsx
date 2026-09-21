/* ============================================================
   ZfSkeleton —— 骨架屏家族
   收编现状 7 份各写一份的实现：
     components/Skeleton.jsx:22、NovelDetailSkeleton.jsx:13、
     Home.jsx:43、RankDetail.jsx:97、Shelf.jsx:116、
     CategoryDetail.jsx:72，以及后台整页 Spin。
   微光走 --zf-fx-shimmer 总闸，tier 0 静止但仍保留底色对比。
   ============================================================ */

import React from 'react';

const base = {
  borderRadius: 'var(--zf-r-md)',
  background: 'var(--zf-glass-1)',
};

/** 封面卡骨架：比例与 ZfCoverCard 一致，避免加载完成时布局跳动 */
function Cover() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
      <div className="zf-skeleton" style={{ ...base, aspectRatio: '3 / 4', width: '100%' }} />
      <div className="zf-skeleton" style={{ ...base, height: 14, width: '72%' }} />
      <div className="zf-skeleton" style={{ ...base, height: 12, width: '48%' }} />
    </div>
  );
}

/** 榜单行骨架：小封面 + 两行文字 */
function Row() {
  return (
    <div style={{ display: 'flex', gap: 'var(--zf-s3)', alignItems: 'center' }}>
      <div className="zf-skeleton" style={{ ...base, width: 52, height: 68, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="zf-skeleton" style={{ ...base, height: 14, width: '62%' }} />
        <div className="zf-skeleton" style={{ ...base, height: 12, width: '38%' }} />
        <div className="zf-skeleton" style={{ ...base, height: 12, width: '80%' }} />
      </div>
    </div>
  );
}

function Text({ width = '100%', height = 14 }) {
  return <div className="zf-skeleton" style={{ ...base, width, height }} />;
}

function Block({ height = 120 }) {
  return <div className="zf-skeleton" style={{ ...base, width: '100%', height }} />;
}

/** 详情页头骨架 */
function Detail() {
  return (
    <div style={{ display: 'flex', gap: 'var(--zf-s6)' }}>
      <div className="zf-skeleton" style={{ ...base, width: 150, height: 200, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="zf-skeleton" style={{ ...base, height: 28, width: '45%' }} />
        <div className="zf-skeleton" style={{ ...base, height: 14, width: '28%' }} />
        <div className="zf-skeleton" style={{ ...base, height: 14, width: '70%' }} />
        <div className="zf-skeleton" style={{ ...base, height: 72, width: '100%' }} />
      </div>
    </div>
  );
}

/** 阅读器正文骨架：行宽错落，模拟真实段落 */
function Reader() {
  const widths = ['96%', '100%', '92%', '100%', '78%', '94%', '100%', '62%'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s4)' }}>
      <div className="zf-skeleton" style={{ ...base, height: 22, width: '40%' }} />
      {widths.map((w, i) => (
        <div key={i} className="zf-skeleton" style={{ ...base, height: 14, width: w }} />
      ))}
    </div>
  );
}

const VARIANTS = { cover: Cover, row: Row, text: Text, block: Block, detail: Detail, reader: Reader };

/**
 * @param {'cover'|'row'|'text'|'block'|'detail'|'reader'} variant
 * @param {number} count 重复次数（cover/row 常用）
 * @param {number|string} width text 变体用
 * @param {number} height text 变体用
 */
export default function ZfSkeleton({ variant = 'block', count = 1, width, height, gap = 'var(--zf-s4)', style }) {
  const Comp = VARIANTS[variant] ?? Block;
  const single = <Comp width={width} height={height} />;

  if (count <= 1) return single;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: count }, (_, i) => (
        <React.Fragment key={i}>{single}</React.Fragment>
      ))}
    </div>
  );
}

/** 网格排布的封面骨架，配合 ZfGrid 使用 */
export function ZfSkeletonGrid({ count = 10, style }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 'var(--zf-s4)',
        ...style,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Cover key={i} />
      ))}
    </div>
  );
}
