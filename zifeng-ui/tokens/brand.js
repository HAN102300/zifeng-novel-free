/* ============================================================
   OKLCH → sRGB 与品牌色阶派生
   唯一职责：给定 (hue, chroma) 产出一套 10 级色阶及派生值。
   RAMP 的 L/C 数值是从现网 --zf-primary-* 实测反解而来，
   因此 violet 分支能逐位复迁 #8B5CF6 / #7C3AED / #6D28D9 等既有值，
   迁移过程中不会发生视觉突变。
   ============================================================ */

/** 色阶曲线：[lightness, chromaMultiplier]，索引对应 50..900 */
export const RAMP = [
  [0.9691, 0.0653], // 50
  [0.9433, 0.1152], // 100
  [0.8800, 0.2514], // 200
  [0.8112, 0.4108], // 300
  [0.7090, 0.6456], // 400
  [0.6056, 0.8877], // 500  ← 主色
  [0.5413, 1.0000], // 600
  [0.4907, 0.9781], // 700
  [0.4320, 0.8540], // 800
  [0.3796, 0.7230], // 900
];

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const to255 = (v) => Math.round(clamp01(v) * 255);

function oklchToLinearRgb(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (rgb) => rgb.every((v) => v >= -0.0001 && v <= 1.0001);

/** 超出色域时收缩 chroma 而非直接截断通道，避免色相偏移 */
function oklchToRgbTriplet(L, C, H) {
  let lo = 0;
  let hi = C;
  let best = oklchToLinearRgb(L, C, H).map(gamma);
  if (!inGamut(oklchToLinearRgb(L, C, H))) {
    for (let i = 0; i < 18; i += 1) {
      const mid = (lo + hi) / 2;
      const lin = oklchToLinearRgb(L, mid, H);
      if (inGamut(lin)) lo = mid;
      else hi = mid;
    }
    best = oklchToLinearRgb(L, lo, H).map(gamma);
  }
  return best.map((v) => to255(v));
}

const hex2 = (n) => n.toString(16).padStart(2, '0');

export function oklchToHex(L, C, H) {
  const [r, g, b] = oklchToRgbTriplet(L, C, H);
  return `#${hex2(r)}${hex2(g)}${hex2(b)}`.toUpperCase();
}

/**
 * 派生一套品牌色阶 + 常用组合。
 * @param {{hue:number, chroma:number}} brand
 */
export function deriveRamp(brand) {
  const { hue, chroma } = brand;
  const hex = {};
  const rgb = {};
  RAMP.forEach(([L, cm], i) => {
    const step = STEPS[i];
    const triplet = oklchToRgbTriplet(L, chroma * cm, hue);
    hex[step] = `#${triplet.map((v) => hex2(v)).join('')}`.toUpperCase();
    rgb[step] = triplet.join(' ');
  });

  const tri = (s) => rgb[s];
  return {
    hex,
    rgb,
    b300: hex[300],
    b400: hex[400],
    b500: hex[500],
    b600: hex[600],
    b700: hex[700],
    b900: hex[900],
    gradBrand: `linear-gradient(135deg, ${hex[700]}, ${hex[500]})`,
    gradBrandSoft: `linear-gradient(135deg, ${hex[600]}, ${hex[400]})`,
    gradBrandInk: `linear-gradient(120deg, ${hex[400]}, #EC4899 52%, ${hex[600]})`,
    gradSheen: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,.5) 50%, transparent 70%)',
    glowBrand: `0 0 24px rgb(${tri(500)} / .45)`,
    glowSoft: `0 0 60px rgb(${tri(500)} / .18)`,
    ringBrand: `0 0 0 4px rgb(${tri(500)} / .18)`,
    tint5: `rgb(${tri(500)} / .05)`,
    tint8: `rgb(${tri(500)} / .08)`,
    tint10: `rgb(${tri(500)} / .10)`,
    tint16: `rgb(${tri(500)} / .16)`,
    tint25: `rgb(${tri(500)} / .25)`,
    tint35: `rgb(${tri(500)} / .35)`,
  };
}
