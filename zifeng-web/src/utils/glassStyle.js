/* ============================================================
   紫枫免费小说 · 玻璃拟态样式工具
   - 既有函数（glassCardStyle / glassItemStyle / glassContainerStyle /
     glassNavbarStyle / glassHeroStyle）保留签名：
       glassMode=false  → 沿用原逻辑（不依赖令牌）
       glassMode=true   → 改用 --zf-glass-* 设计令牌
   - 新增函数（基于设计令牌）：
       glassNavbar(scrolled, isDarkMode)    滚动收缩态导航栏
       glassNavIndicator()                  磁吸下划线渐变 + 光晕
       glassButton(variant)                primary/glass/ghost/danger 变体
   ============================================================ */

const transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

// glass 模式下统一引用设计令牌的过渡曲线
const zfTransition = `all var(--zf-dur-normal) var(--zf-ease-out)`;
const zfTransitionSpring = `left var(--zf-dur-normal) var(--zf-ease-spring), width var(--zf-dur-normal) var(--zf-ease-spring)`;

/* ---------- 既有函数（保留签名，glass 模式改用令牌） ---------- */

function glassCardStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      background: isDarkMode ? '#141414' : '#ffffff',
      transition,
    };
  }
  return {
    background: 'var(--zf-glass-bg-strong)',
    backdropFilter: 'var(--zf-blur-glass)',
    WebkitBackdropFilter: 'var(--zf-blur-glass)',
    border: '1px solid var(--zf-glass-border)',
    boxShadow: 'var(--zf-shadow-md), inset 0 1px 0 var(--zf-glass-highlight)',
    transition: zfTransition,
  };
}

function glassItemStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      background: isDarkMode ? '#1f1f1f' : '#ffffff',
      transition,
    };
  }
  return {
    background: 'var(--zf-glass-bg)',
    backdropFilter: 'var(--zf-blur-glass)',
    WebkitBackdropFilter: 'var(--zf-blur-glass)',
    border: '1px solid var(--zf-glass-border)',
    boxShadow: 'var(--zf-shadow-sm), inset 0 1px 0 var(--zf-glass-highlight)',
    transition: zfTransition,
  };
}

function glassContainerStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      background: isDarkMode ? '#0d0d0d' : '#f5f5f5',
      transition,
    };
  }
  return {
    background: 'var(--zf-glass-bg)',
    backdropFilter: 'var(--zf-blur-light)',
    WebkitBackdropFilter: 'var(--zf-blur-light)',
    border: '1px solid var(--zf-glass-border)',
    transition: zfTransition,
  };
}

// 保留原签名 (glassMode, isDarkMode) 以兼容 App.jsx 现有调用
function glassNavbarStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      background: isDarkMode ? '#141414' : '#ffffff',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      borderBottom: isDarkMode ? '1px solid #262626' : '1px solid #f0f0f0',
      transition,
    };
  }
  return {
    background: 'var(--zf-glass-bg-strong)',
    backdropFilter: 'var(--zf-blur-glass)',
    WebkitBackdropFilter: 'var(--zf-blur-glass)',
    boxShadow: 'var(--zf-shadow-md)',
    borderBottom: '1px solid var(--zf-glass-border)',
    transition: zfTransition,
  };
}

function glassHeroStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      transition,
    };
  }
  return {
    background: 'var(--zf-glass-bg)',
    backdropFilter: 'var(--zf-blur-glass)',
    WebkitBackdropFilter: 'var(--zf-blur-glass)',
    border: '1px solid var(--zf-glass-border)',
    borderRadius: 'var(--zf-r-xl)',
    transition: zfTransition,
  };
}

/* ---------- 新增函数（基于设计令牌） ---------- */

/**
 * 滚动收缩态导航栏样式
 * @param {boolean} scrolled - 是否已滚动收缩
 * @param {boolean} isDarkMode - 兼容签名（token 模式下浅/深色由 [data-theme] 自动切换）
 * @returns {Object} React 内联样式对象
 */
function glassNavbar(scrolled, isDarkMode) {
  const base = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--zf-s6)',
    margin: 'var(--zf-s4) 0 var(--zf-s8)',
    background: 'var(--zf-glass-bg)',
    backdropFilter: 'var(--zf-blur-glass)',
    WebkitBackdropFilter: 'var(--zf-blur-glass)',
    border: '1px solid var(--zf-glass-border)',
    borderRadius: 'var(--zf-r-xl)',
    transition: zfTransition,
  };
  if (scrolled) {
    return {
      ...base,
      padding: '10px var(--zf-s6)',
      background: 'var(--zf-glass-bg-strong)',
      boxShadow: 'var(--zf-shadow-lg)',
    };
  }
  return {
    ...base,
    padding: '14px var(--zf-s6)',
    boxShadow: 'var(--zf-shadow-md)',
  };
}

/**
 * 导航磁吸下划线样式（紫→品红渐变 + 紫色光晕）
 * @returns {Object} React 内联样式对象
 */
function glassNavIndicator() {
  return {
    position: 'absolute',
    bottom: '2px',
    height: '3px',
    borderRadius: '3px',
    background: 'linear-gradient(90deg, var(--zf-primary-500), var(--zf-accent-magenta))',
    boxShadow: 'var(--zf-glow-primary)',
    transition: zfTransitionSpring,
    pointerEvents: 'none',
  };
}

/**
 * 按钮变体样式
 * @param {'primary'|'glass'|'ghost'|'danger'} variant - 按钮变体
 * @returns {Object} React 内联样式对象
 */
function glassButton(variant = 'primary') {
  const base = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--zf-s2)',
    padding: '11px 22px',
    fontSize: 'var(--zf-fs-base)',
    fontWeight: 600,
    fontFamily: 'var(--zf-font-ui)',
    border: '1px solid transparent',
    borderRadius: 'var(--zf-r-full)',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: `transform var(--zf-dur-fast) var(--zf-ease-out), box-shadow var(--zf-dur-fast) var(--zf-ease-out), background var(--zf-dur-fast) var(--zf-ease-out), border-color var(--zf-dur-fast) var(--zf-ease-out)`,
  };
  switch (variant) {
    case 'glass':
      return {
        ...base,
        background: 'var(--zf-glass-bg-strong)',
        color: 'var(--zf-text-primary)',
        border: '1px solid var(--zf-glass-border-strong)',
        backdropFilter: 'var(--zf-blur-light)',
        WebkitBackdropFilter: 'var(--zf-blur-light)',
      };
    case 'ghost':
      return {
        ...base,
        background: 'transparent',
        color: 'var(--zf-primary-400)',
        border: '1px solid var(--zf-primary-500)',
      };
    case 'danger':
      return {
        ...base,
        background: 'linear-gradient(135deg, var(--zf-accent-rose), #BE123C)',
        color: '#fff',
      };
    case 'primary':
    default:
      return {
        ...base,
        background: 'linear-gradient(135deg, var(--zf-primary-600), var(--zf-primary-500))',
        color: '#fff',
        boxShadow: '0 4px 14px rgba(139,92,246,.4)',
      };
  }
}

export {
  glassCardStyle,
  glassItemStyle,
  glassContainerStyle,
  glassNavbarStyle,
  glassHeroStyle,
  glassNavbar,
  glassNavIndicator,
  glassButton,
};
