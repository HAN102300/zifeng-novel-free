/* ============================================================
   ZfSectionTitle —— 统一区块标题
   解决两件事：
   ① 现状有三种页头分割线样式（详情页「简介」那条穿过文字的线、
      antd Card 默认下分割线、首页 SectionHeader），此处收敛为 variant。
   ② `.zf-font-serif + fontSize + fontWeight:900 + lineHeight:1.1 + margin:0`
      这段内联组合在 Category/Shelf/Home 等至少 5 处逐字复制。
   ============================================================ */

import React from 'react';
import { motion } from 'framer-motion';
import { variants } from '../motion/index.js';

/**
 * @param {'line'|'ink'|'bare'} variant
 *   line 底部细线（工具型区块）
 *   ink  左侧品牌竖条（沿用现状「简介」观感，但不再压到文字）
 *   bare 无分割线
 */
export default function ZfSectionTitle({
  title,
  sub,
  icon,
  extra,
  variant = 'line',
  as: Tag = 'h2',
  animated = true,
  style,
  className = '',
}) {
  const heading = (
    <Tag
      className="zf-h3"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--zf-s2)',
        margin: 0,
        color: 'var(--zf-text-primary)',
      }}
    >
      {icon ? (
        <span
          aria-hidden="true"
          style={{ display: 'inline-flex', color: 'var(--zf-brand-500)', fontSize: 'var(--zf-fs-lg)' }}
        >
          {icon}
        </span>
      ) : null}
      {title}
    </Tag>
  );

  const Wrapper = animated ? motion.div : 'div';
  const wrapperProps = animated ? { variants: variants.fadeUp, initial: 'initial', animate: 'animate' } : {};

  return (
    <Wrapper
      className={`zf-section-title ${className}`}
      style={{
        display: 'flex',
        alignItems: sub ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: 'var(--zf-s4)',
        paddingBottom: variant === 'line' ? 'var(--zf-s3)' : 0,
        borderBottom:
          variant === 'line' ? '1px solid var(--zf-glass-border)' : undefined,
        ...style,
      }}
      {...wrapperProps}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        {variant === 'ink' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)' }}>
            <span
              aria-hidden="true"
              style={{
                width: 3,
                height: '1.05em',
                borderRadius: 'var(--zf-r-full)',
                background: 'var(--zf-grad-brand)',
                flexShrink: 0,
              }}
            />
            {heading}
          </div>
        ) : (
          heading
        )}
        {sub ? (
          <span className="zf-caption" style={{ paddingLeft: variant === 'ink' ? 'var(--zf-s4)' : 0 }}>
            {sub}
          </span>
        ) : null}
      </div>
      {extra ? <div style={{ flexShrink: 0 }}>{extra}</div> : null}
    </Wrapper>
  );
}
