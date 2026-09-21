/* ============================================================
   紫枫免费小说 · 深色/主题模式 Hook
   统一处理 localStorage 读写 和 data-theme 属性同步
   ============================================================ */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { themeConfigs } from '../config/themes';
import { normalizeBrand } from '@zifeng/ui/tokens';

/** 每 60 秒比对一次当前时间与夜间时段，跨分钟即生效 */
const NIGHT_CHECK_INTERVAL_MS = 60 * 1000;

/** 'HH:mm' → 当日分钟数 */
const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** 是否落在夜间时段内。start > end 表示跨零点（如 20:00 → 07:00） */
export function isWithinNightWindow(config, now = new Date()) {
  const start = toMinutes(config.startTime);
  const end = toMinutes(config.endTime);
  const current = now.getHours() * 60 + now.getMinutes();
  return start > end
    ? current >= start || current < end
    : current >= start && current < end;
}

function readAutoNightConfig() {
  try {
    const config = JSON.parse(localStorage.getItem('zifeng_auto_night_mode') || 'null');
    if (!config?.enabled || !config.startTime || !config.endTime) return null;
    /* 手动开关一旦拨过就以它为准，直到用户在设置页重新启用排程 */
    if (localStorage.getItem('zifeng_manual_dark_override') === 'true') return null;
    return config;
  } catch {
    return null;
  }
}

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('zifeng_theme') || 'purple';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (localStorage.getItem('zifeng_manual_dark_override') === 'true') {
      return localStorage.getItem('zifeng_dark_mode') === 'true';
    }
    const config = readAutoNightConfig();
    return config ? isWithinNightWindow(config) : false;
  });

  const [globalFontSize, setGlobalFontSize] = useState(() => {
    const saved = localStorage.getItem('zifeng_font_size');
    return saved ? parseInt(saved, 10) : 14;
  });

  // 默认开启玻璃态：此前默认 false，新用户首访看到的是无品牌身份的实底态
  const [glassMode, setGlassMode] = useState(() => {
    const saved = localStorage.getItem('zifeng_glass_mode');
    return saved === null ? true : saved === 'true';
  });

  // 同步 data-theme 属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  /* data-brand 驱动 tokens.css 里穷举好的 5 套色阶 ——
     CSS 侧的渐变/光晕/滚动条/选区全部自动跟随，
     不再需要 Setting 页那段 setProperty 补丁。 */
  const brand = useMemo(() => normalizeBrand(currentTheme), [currentTheme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-brand', brand);
  }, [brand]);

  // 玻璃开关落到 html 上，供 CSS 的 [data-glass='off'] 分支承接
  useEffect(() => {
    document.documentElement.setAttribute('data-glass', glassMode ? 'on' : 'off');
  }, [glassMode]);

  // 持久化状态
  useEffect(() => {
    localStorage.setItem('zifeng_dark_mode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('zifeng_theme', currentTheme);
  }, [currentTheme]);

  // 全局字体大小
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-size', `${globalFontSize}px`);
    document.documentElement.style.fontSize = `${globalFontSize}px`;
  }, [globalFontSize]);

  const handleManualDarkModeToggle = useCallback((value) => {
    setIsDarkMode(value);
    localStorage.setItem('zifeng_dark_mode', String(value));
    localStorage.setItem('zifeng_manual_dark_override', 'true');
  }, []);

  /* 排程切换走裸 setter：若复用 handleManualDarkModeToggle，一次自动切换
     就会写入 manual override，把排程永久关掉。 */
  const refreshAutoNightMode = useCallback(() => {
    const config = readAutoNightConfig();
    if (config) setIsDarkMode(isWithinNightWindow(config));
  }, []);

  /* 定时器挂在 App 生命周期上，而不是设置页：离开设置页也要按点切换。
     首帧不需要在这里再判一次 —— isDarkMode 的惰性初值已经按排程算过了。 */
  useEffect(() => {
    const timer = setInterval(refreshAutoNightMode, NIGHT_CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refreshAutoNightMode]);

  /** 重新启用或改时间段时调用：用户刚改过排程，此前手动拨过的开关应让路 */
  const clearManualDarkOverride = useCallback(() => {
    localStorage.removeItem('zifeng_manual_dark_override');
  }, []);

  const handleGlobalFontSizeChange = useCallback((value) => {
    const clampedValue = Math.min(value, 24);
    setGlobalFontSize(clampedValue);
    localStorage.setItem('zifeng_font_size', String(clampedValue));
  }, []);

  const handleGlassModeToggle = useCallback((value) => {
    setGlassMode(value);
    localStorage.setItem('zifeng_glass_mode', String(value));
  }, []);

  const currentThemeConfig = themeConfigs[currentTheme] || themeConfigs.purple;

  return {
    currentTheme, setCurrentTheme,
    isDarkMode, setIsDarkMode: handleManualDarkModeToggle,
    refreshAutoNightMode, clearManualDarkOverride,
    globalFontSize, setGlobalFontSize: handleGlobalFontSizeChange,
    glassMode, setGlassMode, handleGlassModeToggle,
    currentThemeConfig, themeConfigs,
    /** 归一化后的品牌键（violet/jade/amber/crimson/azure），供 buildAntdTheme 用 */
    brand,
  };
}
