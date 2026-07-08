import React from 'react';

/**
 * 通用骨架组件
 * @param {number} height - 高度
 * @param {string} width - 宽度，默认 '100%'
 * @param {string} radius - 圆角，默认 'var(--zf-r-md)'
 * @param {number} count - 重复次数，默认1
 * @param {number} gap - 间距，默认8
 */
function Skeleton({ height = 20, width = '100%', radius = 'var(--zf-r-md)', count = 1, gap = 8 }) {
  if (count === 1) {
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          style={{
            width,
            height,
            borderRadius: radius,
            background:
              'linear-gradient(90deg, var(--zf-glass-bg) 25%, var(--zf-glass-bg-strong) 50%, var(--zf-glass-bg) 75%)',
            backgroundSize: '200% 100%',
            animation: 'skel 1.4s ease-in-out infinite',
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}

export default React.memo(Skeleton);
