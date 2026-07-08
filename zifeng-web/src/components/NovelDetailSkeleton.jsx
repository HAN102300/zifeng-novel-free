import React from 'react';

function SkelBox({ height, width = '100%', radius = 'var(--zf-r-md)' }) {
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

function NovelDetailSkeleton() {
  return (
    <div style={{ padding: '20px 0' }}>
      <SkelBox height={32} width={80} radius="var(--zf-r-sm)" />
      <div
        style={{
          marginTop: 24,
          padding: '32px 24px',
          borderRadius: 16,
          background: 'var(--zf-glass-bg)',
          border: '1px solid var(--zf-glass-border)',
          backdropFilter: 'var(--zf-blur-glass)',
        }}
      >
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 200px' }}>
            <SkelBox height={280} width={200} />
          </div>
          <div style={{ flex: 1, minWidth: 250 }}>
            <SkelBox height={28} width="70%" />
            <SkelBox height={16} width="40%" />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <SkelBox height={24} width={60} radius="var(--zf-r-full)" />
              <SkelBox height={24} width={80} radius="var(--zf-r-full)" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 20 }}>
              <SkelBox height={40} />
              <SkelBox height={40} />
              <SkelBox height={40} />
              <SkelBox height={40} />
            </div>
            <SkelBox height={80} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <SkelBox height={48} width={140} radius="var(--zf-r-full)" />
              <SkelBox height={48} width={140} radius="var(--zf-r-full)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NovelDetailSkeleton;
