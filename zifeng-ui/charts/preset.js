/* ============================================================
   图表主题预设（@ant-design/charts / G2 v5）
   收编现状：
     · Overview.jsx:53-59 七个高饱和彩虹色，与品牌无关
     · 尺寸四值 320/300/320/280、Pie 参数两套写法互不一致
     · 暗色靠手写 fill:'rgba(255,255,255,.65)' 逐处补，而非交给 theme
   ============================================================ */

import { chart } from '../tokens/palette.js';
import { tokens } from '../tokens/index.js';

/** 语义化序列色：品牌紫领头，其余按可分辨度交替，避免彩虹 */
export const sequenceColors = chart;

/** 单系列（趋势/面积）用的品牌渐变 */
export const areaGradient = (brandKey = 'violet') => {
  const ramp = tokens.brands[brandKey]?.ramp ?? tokens.brands.violet.ramp;
  return `linear-gradient(180deg, ${ramp.hex[500]}59 0%, ${ramp.hex[500]}00 100%)`;
};

/** 统一的图表高度档位，杜绝各页自写魔法数 */
export const chartSize = {
  compact: 200,
  standard: 260,
  featured: 320,
};

/**
 * 通用基础配置。G2 v5 的 theme 走 'classic' / 'classicDark'，
 * 明暗文字色交给它管，不要再逐处手写 fill。
 */
export function baseChartConfig({ mode = 'dark', height = chartSize.standard } = {}) {
  return {
    height,
    autoFit: true,
    theme: mode === 'dark' ? 'classicDark' : 'classic',
    axis: {
      x: { labelAutoRotate: false, labelAutoEllipsis: true, tickStroke: 'transparent' },
      y: { labelFontSize: tokens.fontSize.xs, gridLineDash: [3, 3], tickStroke: 'transparent' },
    },
    legend: { color: { position: 'top', layout: { justifyContent: 'flex-start' } } },
    tooltip: { shared: true },
  };
}

/** 柱状图：圆角只朝上，且限制最大宽度避免单柱撑满 */
export function columnConfig(opts = {}) {
  return {
    ...baseChartConfig(opts),
    style: { radiusTopLeft: 6, radiusTopRight: 6, maxWidth: 36 },
    scale: { color: { range: sequenceColors } },
    ...opts.extra,
  };
}

/**
 * 环形图：统一内半径与图例位置。
 * 现状 Overview 用 radius .85/innerRadius .6/label outside/legend right，
 * SourceStats 用 .8/.5/'spider'/legend bottom —— 这里定一套。
 */
export function donutConfig(opts = {}) {
  return {
    ...baseChartConfig(opts),
    innerRadius: 0.62,
    radius: 0.86,
    label: { textPosition: 'outside', style: { fontSize: tokens.fontSize.xs } },
    legend: { color: { position: 'bottom', layout: { justifyContent: 'center' } } },
    scale: { color: { range: sequenceColors } },
    ...opts.extra,
  };
}

/** 面积图：品牌渐变填充 + 无点 */
export function areaConfig(opts = {}) {
  return {
    ...baseChartConfig(opts),
    style: { fill: areaGradient(opts.brand), lineWidth: 2 },
    axis: {
      ...baseChartConfig(opts).axis,
      x: { labelFontSize: tokens.fontSize.xs, labelAutoRotate: false, labelAutoEllipsis: true },
    },
    ...opts.extra,
  };
}

/**
 * 数据模型护栏：数量级悬殊的指标不得同轴对比。
 * 现状把「总访问量 2206」和「在线用户 0」塞进同一根 Column，
 * 6 根柱子视觉上是 0 —— 这类指标应走 KPI 卡而非同一坐标轴。
 *
 * 选项名刻意避开 valueOf：解构默认值 `= {}` 会沿原型链取到
 * Object.prototype.valueOf，导致默认函数根本不生效（map 里以
 * undefined 为 this 调用它 → TypeError）。
 * @returns {{kpi: Array, comparable: Array}}
 */
export function splitByMagnitude(items, { readValue = (i) => Number(i.value) || 0, ratio = 20 } = {}) {
  const values = items.map(readValue).filter((v) => v > 0);
  if (values.length === 0) return { kpi: items, comparable: [] };
  const max = Math.max(...values);
  const min = Math.min(...values);
  if (max / min > ratio) {
    // 跨度过大：全部转 KPI 卡，同轴图只留最大的一项作趋势
    return { kpi: items, comparable: items.filter((i) => readValue(i) === max) };
  }
  return { kpi: [], comparable: items };
}

export const charts = {
  sequenceColors,
  areaGradient,
  chartSize,
  baseChartConfig,
  columnConfig,
  donutConfig,
  areaConfig,
  splitByMagnitude,
};

export default charts;
