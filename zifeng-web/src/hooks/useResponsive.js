import { useState, useEffect } from 'react';

/**
 * 响应式断点检测 hook
 * @param {number} breakpoint - 断点阈值，默认 1100
 * @returns {{ isLargeScreen: boolean, isMobile: boolean }}
 *
 * isLargeScreen: 屏幕宽度 >= breakpoint
 * isMobile: 屏幕宽度 < 768
 */
export function useResponsive(breakpoint = 1100) {
  const [isLargeScreen, setIsLargeScreen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia(`(min-width: ${breakpoint}px)`).matches;
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });

  useEffect(() => {
    const largeMql = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const mobileMql = window.matchMedia('(max-width: 767px)');
    const largeHandler = (e) => setIsLargeScreen(e.matches);
    const mobileHandler = (e) => setIsMobile(e.matches);
    largeMql.addEventListener('change', largeHandler);
    mobileMql.addEventListener('change', mobileHandler);
    return () => {
      largeMql.removeEventListener('change', largeHandler);
      mobileMql.removeEventListener('change', mobileHandler);
    };
  }, [breakpoint]);

  return { isLargeScreen, isMobile };
}

export default useResponsive;
