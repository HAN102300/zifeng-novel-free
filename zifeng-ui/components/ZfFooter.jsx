/* ============================================================
   ZfFooter —— 全站页脚（此前完全没有，产品感不完整）
   放在 ZfPageShell 的 footer 插槽里，由 App 层统一挂一次。
   ============================================================ */

import React from 'react';

export default function ZfFooter({ columns = [], tagline, copyright, style }) {
  const year = new Date().getFullYear();

  return (
    <footer
      className="zf-footer"
      style={{
        marginTop: 'var(--zf-s16)',
        borderTop: '1px solid var(--zf-glass-border)',
        background: 'var(--zf-glass-1)',
        ...style,
      }}
    >
      <div
        className="zf-container zf-container--lg"
        style={{ paddingBlock: 'var(--zf-s10)', display: 'flex', flexDirection: 'column', gap: 'var(--zf-s8)' }}
      >
        {columns.length ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--zf-s8)',
            }}
          >
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <div className="zf-label" style={{ marginBottom: 'var(--zf-s3)' }}>
                  {col.title}
                </div>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s2)' }}>
                  {(col.links ?? []).map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        style={{
                          color: 'var(--zf-text-secondary)',
                          fontSize: 'var(--zf-fs-sm)',
                          transition: 'color var(--zf-dur-fast) var(--zf-ease-out)',
                        }}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--zf-s4)',
            flexWrap: 'wrap',
            paddingTop: 'var(--zf-s5)',
            borderTop: '1px solid var(--zf-glass-border)',
          }}
        >
          <span className="zf-caption">{tagline ?? copyright ?? `© ${year} 紫枫免费小说`}</span>
        </div>
      </div>
    </footer>
  );
}
