/* ============================================================
   ZfEmptyState —— 空状态
   antd v6 的 EmptyComponentToken 是空接口 {}，无任何 token 可覆，
   所以空状态必须做成组件而不是靠主题调 —— 这是它的存在理由。
   现状后台完全没有空状态（grep Empty|emptyText|Result 零命中），
   用户端则是一个灰色收件箱图标 + 一行字。
   ============================================================ */

import React from 'react';
import { motion } from 'framer-motion';
import { variants } from '../motion/index.js';

/**
 * @param {boolean} ink 继承父级文字色。用于把空态放进非应用画布的底色上
 *   （例如阅读器的护眼绿 / 羊皮纸），此时写死 --zf-text-* 会对比度失控。
 */
export default function ZfEmptyState({
  icon,
  title = '暂无内容',
  description,
  action,
  ink = false,
  compact = false,
  style,
}) {
  const titleColor = ink ? 'inherit' : 'var(--zf-text-primary)';
  const descColor = ink ? 'inherit' : 'var(--zf-text-muted)';

  return (
    <motion.div
      variants={variants.fadeUp}
      initial="initial"
      animate="animate"
      className="zf-empty"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 'var(--zf-s3)',
        padding: compact ? 'var(--zf-s8) var(--zf-s4)' : 'var(--zf-s16) var(--zf-s5)',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: compact ? 48 : 72,
          height: compact ? 48 : 72,
          borderRadius: 'var(--zf-r-full)',
          /* 用 tint 底 + 品牌描边而非发光圆，浅色下依然看得见 */
          background: ink ? 'transparent' : 'var(--zf-tint-brand-08)',
          border: `1px solid ${ink ? 'currentColor' : 'var(--zf-glass-border)'}`,
          color: ink ? 'inherit' : 'var(--zf-brand-500)',
          opacity: ink ? 0.7 : 1,
          fontSize: compact ? 'var(--zf-fs-xl)' : 'var(--zf-fs-2xl)',
        }}
      >
        {icon ?? '◍'}
      </span>

      <div
        className="zf-h3"
        style={{ fontSize: 'var(--zf-fs-lg)', color: titleColor, margin: 0 }}
      >
        {title}
      </div>

      {description ? (
        <p
          className="zf-caption"
          style={{ maxWidth: 'var(--zf-measure-text)', margin: 0, lineHeight: 'var(--zf-lh-body)', color: descColor }}
        >
          {description}
        </p>
      ) : null}

      {action ? <div style={{ marginTop: 'var(--zf-s3)' }}>{action}</div> : null}
    </motion.div>
  );
}
