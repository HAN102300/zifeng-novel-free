const transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

function glassCardStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      background: isDarkMode ? '#141414' : '#ffffff',
      transition,
    };
  }
  return {
    background: isDarkMode ? 'rgba(20,20,20,0.55)' : 'rgba(255,255,255,0.5)',
    backdropFilter: 'blur(24px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
    boxShadow: isDarkMode
      ? '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)'
      : '0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.4)',
    transition,
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
    background: isDarkMode ? 'rgba(30,30,30,0.45)' : 'rgba(255,255,255,0.4)',
    backdropFilter: 'blur(18px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    boxShadow: isDarkMode
      ? '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)'
      : '0 4px 16px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.3)',
    transition,
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
    background: isDarkMode ? 'rgba(18,18,18,0.4)' : 'rgba(245,245,245,0.4)',
    backdropFilter: 'blur(12px) saturate(1.1)',
    WebkitBackdropFilter: 'blur(12px) saturate(1.1)',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}`,
    transition,
  };
}

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
    background: isDarkMode ? 'rgba(20,20,20,0.6)' : 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(28px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(28px) saturate(1.4)',
    boxShadow: `0 2px 20px ${isDarkMode ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)'}`,
    borderBottom: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
    transition,
  };
}

function glassHeroStyle(glassMode, isDarkMode) {
  if (!glassMode) {
    return {
      transition,
    };
  }
  return {
    background: isDarkMode ? 'rgba(20,20,20,0.35)' : 'rgba(255,255,255,0.3)',
    backdropFilter: 'blur(16px) saturate(1.2)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
    border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
    borderRadius: 20,
    transition,
  };
}

export { glassCardStyle, glassItemStyle, glassContainerStyle, glassNavbarStyle, glassHeroStyle };
