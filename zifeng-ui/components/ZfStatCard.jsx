/* ============================================================
   ZfStatCard —— 统一统计卡
   收编现状：web 1 套（BookSourcePage 三张居中卡）+ 后台 3 套
   （SourceStats 图标在左、FeedbackList 图标在右、Overview 干脆没有）。
   数字统一用文本色 + tabular-nums，不再「一人一色」。
   ============================================================ */

import React from 'react';
import { motion } from 'framer-motion';
import { variants } from '../motion/index.js';
import ZfSkeleton from './ZfSkeleton.jsx';

export default function ZfStatCard({
  label,
  value,
  suffix,
  delta,
  icon,
  tone = 'brand',
  loading = false,
  onClick,
  style,
}) {
  const accent =
    tone === 'success'
      ? 'var(--zf-status-success)'
      : tone === 'warning'
        ? 'var(--zf-status-warning)'
        : tone === 'error'
          ? 'var(--zf-status-error)'
          : 'var(--zf-brand-500)';

  const clickable = typeof onClick === 'function';

  return (
    <motion.div
      variants={variants.cardIn}
      initial="initial"
      animate="animate"
      whileHover={clickable && onClick ? { y: -3, transition: variants.hoverLift.transition } : undefined}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      className="zf-stat-card zf-glass zf-glass--2"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--zf-s4)',
        padding: 'var(--zf-s5)',
        borderRadius: 'var(--zf-r-lg)',
        border: '1px solid var(--zf-glass-border)',
        boxShadow: 'var(--zf-shadow-1), var(--zf-glass-edge-top)',
        cursor: clickable ? 'pointer' : undefined,
        ...style,
      }}
    >
      {icon ? (
        <span
          aria-hidden="true"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 'var(--zf-r-md)',
            background: 'var(--zf-tint-brand-10)',
            color: accent,
            fontSize: 'var(--zf-fs-lg)',
          }}
        >
          {icon}
        </span>
      ) : null}

      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          className="zf-caption zf-truncate"
          style={{ marginBottom: 2 }}
        >
          {label}
        </div>
        {loading ? (
          <ZfSkeleton variant="text" width={72} height={26} />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 4,
              fontSize: 'var(--zf-fs-2xl)',
              fontWeight: 700,
              lineHeight: 1.1,
              color: 'var(--zf-text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {value}
            {suffix ? (
              <span style={{ fontSize: 'var(--zf-fs-sm)', fontWeight: 500, color: 'var(--zf-text-muted)' }}>
                {suffix}
              </span>
            ) : null}
          </div>
        )}
        {delta != null && delta !== '' ? (
          <div
            style={{
              marginTop: 2,
              fontSize: 'var(--zf-fs-xs)',
              fontVariantNumeric: 'tabular-nums',
              color: String(delta).startsWith('-') ? 'var(--zf-status-error)' : 'var(--zf-status-success)',
            }}
          >
            {delta}
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
