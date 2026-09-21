/* ============================================================
   共享 hooks
   收编现状：Navbar.jsx:34-43 自写 window.innerWidth 监听、
   useResponsive.js 默认 1100 却没人用、断点 7 个魔数。
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { breakpoints } from '../tokens/layout.js';

/** 单条媒体查询，命中变化才 re-render（不做 resize 节流那套） */
export function useMediaQuery(query) {
  const get = () => (typeof window === 'undefined' ? false : window.matchMedia?.(query).matches ?? false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}

/**
 * 断点名 → 布尔。取代散落的 `window.innerWidth < 880` 这类判断。
 *   const { isMobile, isDesktop, up } = useBreakpoint();
 *   if (up('lg')) ...
 */
export function useBreakpoint() {
  const queries = useMemo(
    () => ({
      xs: `(max-width: ${breakpoints.xs - 1}px)`,
      sm: `(max-width: ${breakpoints.sm - 1}px)`,
      md: `(max-width: ${breakpoints.md - 1}px)`,
      lg: `(max-width: ${breakpoints.lg - 1}px)`,
      xl: `(max-width: ${breakpoints.xl - 1}px)`,
    }),
    [],
  );

  const isXs = useMediaQuery(queries.xs);
  const isSm = useMediaQuery(queries.sm);
  const isMd = useMediaQuery(queries.md);
  const isLg = useMediaQuery(queries.lg);
  const isXl = useMediaQuery(queries.xl);

  return useMemo(
    () => ({
      isXs,
      isSm,
      isMd,
      isLg,
      isXl,
      isMobile: isMd,
      isTablet: isLg && !isMd,
      isDesktop: !isLg,
      /** 视口宽度 ≥ 给定断点 */
      up: (name) => {
        const v = breakpoints[name];
        if (!v) return true;
        return !isBelow(v);
      },
      down: (name) => {
        const v = breakpoints[name];
        if (!v) return false;
        return isBelow(v);
      },
    }),
    [isXs, isSm, isMd, isLg, isXl],
  );
}

const isBelow = (px) =>
  typeof window !== 'undefined' && window.innerWidth < px;

/** 粗指针（触屏）判定，供特效分级与手势交互使用 */
export function useCoarsePointer() {
  return useMediaQuery('(pointer: coarse)');
}

/**
 * 全站单例的 pointermove / scroll 广播。
 * 现状每张卡各挂 listener、并用 onMouseEnter 直接改 DOM style
 * （Home.jsx:383-388、Navbar.jsx:224-233，后者卸载时还不复位）。
 * 改为订阅这一个 rAF，组件只拿归一化坐标。
 *
 *   const { pointer } = useTicker();          // 共享
 *   useTicker({ onFrame: (t) => ... })        // 需要逐帧时
 */
const listeners = new Set();
let tickerState = { running: false, pointer: { x: 0, y: 0, nx: 0, ny: 0 }, scrollY: 0 };

function ensureTicker() {
  if (typeof window === 'undefined' || tickerState.running) return;
  tickerState.running = true;
  let queued = false;

  const flush = () => {
    queued = false;
    const now = performance.now();
    listeners.forEach((l) => {
      try {
        l.cb(now, tickerState);
      } catch {
        /* 单个订阅者出错不应中断整条广播 */
      }
    });
  };
  const schedule = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(flush);
    }
  };

  const onPointer = (e) => {
    tickerState.pointer = {
      x: e.clientX,
      y: e.clientY,
      nx: e.clientX / window.innerWidth,
      ny: e.clientY / window.innerHeight,
    };
    schedule();
  };
  const onScroll = () => {
    tickerState.scrollY = window.scrollY;
    schedule();
  };

  window.addEventListener('pointermove', onPointer, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
}

export function useTicker({ onFrame } = {}) {
  const cbRef = useRef(onFrame);
  cbRef.current = onFrame;

  useEffect(() => {
    if (!onFrame) return undefined;
    ensureTicker();
    const entry = { cb: (now, state) => cbRef.current?.(now, state) };
    listeners.add(entry);
    return () => listeners.delete(entry);
  }, [onFrame != null]);

  return { pointer: tickerState.pointer, scrollY: tickerState.scrollY };
}

/**
 * 元素进入视口一次后回调 —— 用于「一次性入场动画」与 CountUp 触发，
 * 避免常驻 rAF（现状 ShinyText.jsx:26 无 IO 暂停）。
 */
export function useInViewOnce({ rootMargin = '0px 0px -10% 0px', threshold = 0.15 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin, threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold]);

  return [ref, inView];
}

/** 元素相对视口的进度 0→1，供滚动驱动视差使用（不逐帧 setState） */
export function useScrollProgress(ref) {
  const [progress, setProgress] = useState(0);

  const compute = useCallback(() => {
    const el = ref?.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    const total = rect.height + vh;
    const passed = vh - rect.top;
    setProgress(Math.min(1, Math.max(0, passed / total)));
  }, [ref]);

  useEffect(() => {
    compute();
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(compute);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [compute]);

  return progress;
}
