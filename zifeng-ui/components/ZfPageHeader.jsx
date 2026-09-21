/* ============================================================
   ZfPageHeader —— 页级标题区
   后台原先每个页头被裁掉一半（根因是 Content 的 content-box 高度模型，
   已在 css/reset.css 修），此处再统一标题/描述/操作位的排布，
   替掉各页自己写的 <h2 className="page-title"> + 魔法 marginBottom。
   ============================================================ */

import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * @param {boolean|string|Function} back
 *   true   → history.back()
 *   string → navigate(该路径)
 *   Function → 自定义（例如返回前先中止在途请求）
 */
export default function ZfPageHeader({
  title,
  subtitle,
  extra,
  back,
  icon,
  sticky = false,
  style,
}) {
  const navigate = useNavigate();
  const onBack =
    typeof back === 'function' ? back
    : typeof back === 'string' ? () => navigate(back)
    : back === true ? () => navigate(-1)
    : null;

  return (
    <div
      className="zf-page-header"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 'var(--zf-s4)',
        flexWrap: 'wrap',
        position: sticky ? 'sticky' : undefined,
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 'var(--zf-z-sticky)' : undefined,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)', minWidth: 0 }}>
        {onBack ? (
          <button type="button" className="zf-btn-icon" onClick={onBack} aria-label="返回">
            ←
          </button>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <h1
            className="zf-h2"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--zf-s2)',
              fontSize: 'var(--zf-fs-xl)',
              lineHeight: 'var(--zf-lh-snug)',
              color: 'var(--zf-text-primary)',
            }}
          >
            {icon}
            {title}
          </h1>
          {subtitle ? (
            <p className="zf-caption" style={{ marginTop: 4 }}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {extra ? <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)' }}>{extra}</div> : null}
    </div>
  );
}
