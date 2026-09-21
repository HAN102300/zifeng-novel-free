/* ============================================================
   特效分级 Provider
   把 tier 判定收敛到一处，写到 html[data-fx]，CSS 侧靠 --zf-fx-* 承接。
   这样「更炫」有预算而不是无节制堆叠：
     0 基础  reduced-motion / 弱硬件（只能显式判定，探针不参与）
     1 标准  触屏 / 窄屏 / 核数少
     2 全效  其余桌面

   ★两条踩过的坑，改动时请保留：
   ① 探针最低只降到 tier 1。tier 0 只由系统偏好或弱硬件显式决定，
      否则一次偶发卡顿就会把用户永久关到无特效。
   ② 探针结论只影响内存，不落 localStorage；落盘的只有用户显式选择。
      早先版本把探针结果写盘，冷启动两个慢窗口就把用户钉死在 tier 0 ——
      而本项目要的恰恰是更丰富的动效。
   ============================================================ */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { TIERS } from '../tokens/fx.js';

const STORAGE_KEY = 'zifeng_fx_tier';
/** 连续多少个慢窗口才降一档，用于吸收冷启动与瞬时抖动 */
const BAD_WINDOW_STREAK = 3;
/** 连续多少个健康窗口后允许回升一档 */
const GOOD_WINDOW_STREAK = 2;
const SAMPLE_MS = 2000;
const FPS_FLOOR = 40;
/** 页面静置多久后才开始采样，避开首屏编译与图片解码 */
const ARM_DELAY_MS = 2500;

function detectBaseTier() {
  if (typeof window === 'undefined') return TIERS.FULL;
  const mm = (q) => window.matchMedia?.(q).matches ?? false;
  const nav = navigator;
  if (mm('(prefers-reduced-motion: reduce)')) return TIERS.BASE;
  if ((nav.deviceMemory ?? 8) <= 2) return TIERS.BASE;
  if ((nav.hardwareConcurrency ?? 8) <= 4) return TIERS.STANDARD;
  if (mm('(pointer: coarse)') || window.innerWidth < 768) return TIERS.STANDARD;
  return TIERS.FULL;
}

const FxContext = createContext({
  tier: TIERS.FULL,
  setTier: () => {},
  clearOverride: () => {},
  reduced: false,
  auto: true,
  enabled: () => true,
});

export function FxProvider({ children }) {
  /** 显式判定出的档位（系统偏好 / 硬件 / 视口） */
  const [baseTier, setBaseTier] = useState(detectBaseTier);
  /** 探针得出的上限，仅存内存 */
  const [probeCap, setProbeCap] = useState(TIERS.FULL);
  /** 用户手动指定则完全尊重，不再自动调 */
  const [userTier, setUserTier] = useState(() => {
    if (typeof window === 'undefined') return null;
    /* 注意：不能用 Number(getItem(k))。键不存在时 getItem 返回 null，
       而 Number(null) === 0 且 0 是合法 tier —— 于是「从没设置过」会被
       误判成「用户显式选了 tier 0（全关）」，每个新访客都会失去所有动效。 */
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null || raw === '') return null;
    const saved = Number(raw);
    return Number.isInteger(saved) && saved >= TIERS.BASE && saved <= TIERS.FULL ? saved : null;
  });

  const reduced = usePrefersReducedMotion(setBaseTier);
  const tier = userTier ?? Math.min(baseTier, probeCap);

  const setTier = useCallback((next) => {
    setUserTier(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const clearOverride = useCallback(() => {
    setUserTier(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /* 写 html[data-fx]，CSS 令牌随之切换。
     同时把判定输入暴露出来，便于排查「为什么我的动效没开」。 */
  useEffect(() => {
    const el = document.documentElement;
    el.setAttribute('data-fx', String(tier));
    el.setAttribute('data-fx-base', String(baseTier));
    el.setAttribute('data-fx-cap', String(probeCap));
    el.setAttribute('data-fx-user', userTier === null ? 'auto' : String(userTier));
  }, [tier, baseTier, probeCap, userTier]);

  /* 视口变化时重算显式档位（转屏、窗口缩到窄屏） */
  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setBaseTier(detectBaseTier()));
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useFpsProbe({ tier, enabled: userTier === null, setProbeCap });

  const value = useMemo(
    () => ({
      tier,
      baseTier,
      probeCap,
      setTier,
      clearOverride,
      auto: userTier === null,
      reduced,
      tiers: TIERS,
      /** 供组件判断是否启用某项特效，如 enabled('tilt') */
      enabled: (feature) => {
        if (tier === TIERS.BASE) return false;
        if (feature === 'cursorHalo' || feature === 'tilt' || feature === 'parallax') {
          return tier === TIERS.FULL;
        }
        return true;
      },
    }),
    [tier, baseTier, probeCap, setTier, clearOverride, userTier, reduced],
  );

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}

/** 系统「减少动效」偏好，变化时同步 */
function usePrefersReducedMotion(setBaseTier) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const apply = () => {
      setReduced(mq.matches);
      setBaseTier(mq.matches ? TIERS.BASE : detectBaseTier());
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [setBaseTier]);

  return reduced;
}

/**
 * FPS 探针：页面静置后采样。连续 BAD_WINDOW_STREAK 个慢窗口才降一档，
 * 下限锁 tier 1；连续 GOOD_WINDOW_STREAK 个健康窗口则回升一档。
 */
function useFpsProbe({ tier, enabled, setProbeCap }) {
  const tierRef = useRef(tier);
  tierRef.current = tier;

  useEffect(() => {
    if (!enabled || tier === TIERS.BASE) return undefined;

    let raf = 0;
    let frames = 0;
    let windowStart = 0;
    let badStreak = 0;
    let goodStreak = 0;
    let stopped = false;

    const tick = (now) => {
      if (stopped) return;
      if (!windowStart) {
        windowStart = now;
        frames = 0;
      }
      frames += 1;

      if (now - windowStart >= SAMPLE_MS) {
        const fps = (frames * 1000) / (now - windowStart);
        windowStart = 0;

        if (fps < FPS_FLOOR) {
          goodStreak = 0;
          badStreak += 1;
          if (badStreak >= BAD_WINDOW_STREAK) {
            badStreak = 0;
            /* 探针永不下到 tier 0 */
            setProbeCap((cap) => Math.max(TIERS.STANDARD, Math.min(cap, tierRef.current) - 1));
          }
        } else {
          badStreak = 0;
          goodStreak += 1;
          if (goodStreak >= GOOD_WINDOW_STREAK) {
            goodStreak = 0;
            setProbeCap((cap) => Math.min(TIERS.FULL, cap + 1));
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    const armTimer = setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, ARM_DELAY_MS);

    return () => {
      stopped = true;
      clearTimeout(armTimer);
      cancelAnimationFrame(raf);
    };
  }, [enabled, tier, setProbeCap]);
}

export function useFx() {
  return useContext(FxContext);
}

export default FxProvider;
