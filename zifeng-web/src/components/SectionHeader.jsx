/**
 * SectionHeader —— 区块标题（统一组件库 Task 6）
 * 用于榜单 / 分类等区块的标题栏：图标方块 + 标题 + 副标题 + 「查看全部 →」。
 * 纯展示组件：不调用 API、不修改全局状态。
 * 参考：design/zifeng-pages-deep-dive.html .rank-section-head / .rank-icon
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FireOutlined,
  TrophyOutlined,
  RiseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  RightOutlined,
} from '@ant-design/icons';

/* —— 六套图标变体（渐变背景 + 光晕） —— */
const ICON_CONFIG = {
  fire: {
    Icon: FireOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-magenta), #BE123C)',
    boxShadow: 'var(--zf-glow-magenta)',
  },
  trophy: {
    Icon: TrophyOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-amber), #B45309)',
  },
  rise: {
    Icon: RiseOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-cyan), #0E7490)',
  },
  check: {
    Icon: CheckCircleOutlined,
    background: 'linear-gradient(135deg, var(--zf-accent-emerald), #047857)',
  },
  clock: {
    Icon: ClockCircleOutlined,
    background: 'linear-gradient(135deg, #3B82F6, #1E40AF)',
  },
  comment: {
    Icon: CommentOutlined,
    background: 'linear-gradient(135deg, var(--zf-primary-400), var(--zf-primary-700))',
  },
};

export default function SectionHeader({ icon = 'fire', title, subtitle, onViewAll }) {
  const [moreHover, setMoreHover] = useState(false);
  const config = ICON_CONFIG[icon] || ICON_CONFIG.fire;
  const { Icon } = config;
  const showMore = typeof onViewAll === 'function';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderRadius: 'var(--zf-r-lg)',
        background: 'var(--zf-glass-bg)',
        border: '1px solid var(--zf-glass-border)',
        backdropFilter: 'var(--zf-blur-light)',
        WebkitBackdropFilter: 'var(--zf-blur-light)',
        marginBottom: 'var(--zf-s5)',
      }}
    >
      {/* —— 左侧：图标 + 标题 —— */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 11,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            flexShrink: 0,
            fontSize: 18,
            background: config.background,
            boxShadow: config.boxShadow,
          }}
        >
          <Icon />
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--zf-font-serif)',
              fontSize: 'var(--zf-fs-lg)',
              fontWeight: 700,
              color: 'var(--zf-text-primary)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          {subtitle ? (
            <div
              style={{
                fontSize: 'var(--zf-fs-xs)',
                color: 'var(--zf-text-muted)',
                marginTop: 1,
              }}
            >
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>

      {/* —— 右侧：查看全部 —— */}
      {showMore ? (
        <motion.div
          animate={{ gap: moreHover ? 8 : 4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setMoreHover(true)}
          onMouseLeave={() => setMoreHover(false)}
          onClick={onViewAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            color: 'var(--zf-primary-400)',
            fontSize: 'var(--zf-fs-sm)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          查看全部
          <RightOutlined />
        </motion.div>
      ) : null}
    </div>
  );
}
