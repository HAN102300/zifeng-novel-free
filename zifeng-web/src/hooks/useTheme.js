/* ============================================================
   紫枫免费小说 · 深色/主题模式 Hook
   统一处理 localStorage 读写 和 data-theme 属性同步
   ============================================================ */

import { useState, useEffect, useCallback } from 'react';
import { themeConfigs } from '../config/themes';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('zifeng_theme') || 'purple';
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const manualOverride = localStorage.getItem('zifeng_manual_dark_override');
    if (manualOverride === 'true') {
      return localStorage.getItem('zifeng_dark_mode') === 'true';
    }
    const autoConfig = localStorage.getItem('zifeng_auto_night_mode');
    if (autoConfig) {
      try {
        const config = JSON.parse(autoConfig);
        if (config.enabled) {
          const now = new Date();
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const [startH, startM] = config.startTime.split(':').map(Number);
          const [endH, endM] = config.endTime.split(':').map(Number);
          const startMinutes = startH * 60 + startM;
          const endMinutes = endH * 60 + endM;
          if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes < endMinutes;
          }
          return currentMinutes >= startMinutes && currentMinutes < endMinutes;
        }
      } catch { /* ignore */ }
    }
    return false;
  });

  const [globalFontSize, setGlobalFontSize] = useState(() => {
    const saved = localStorage.getItem('zifeng_font_size');
    return saved ? parseInt(saved, 10) : 14;
  });

  const [glassMode, setGlassMode] = useState(() => {
    return localStorage.getItem('zifeng_glass_mode') === 'true';
  });

  // 同步 data-theme 属性
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
    globalFontSize, setGlobalFontSize: handleGlobalFontSizeChange,
    glassMode, setGlassMode, handleGlassModeToggle,
    currentThemeConfig, themeConfigs,
  };
}
