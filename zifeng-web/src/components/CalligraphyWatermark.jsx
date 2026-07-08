import React from 'react';

/**
 * 书法水印组件 — 在角落显示超低透明度的书法汉字
 * @param {string} char - 水印汉字（如"阅"、"墨"、"藏"）
 * @param {Object} position - 位置 {top, right, bottom, left}
 * @param {number} size - 字号，默认 120
 * @param {string} color - 颜色，默认使用主题紫色
 */
function CalligraphyWatermark({
  char = '墨',
  position = { top: '8%', right: '5%' },
  size = 120,
  color = 'rgba(139, 92, 246, 0.06)',
}) {
  if (!char) return null;

  return (
    <div
      style={{
        position: 'absolute',
        ...position,
        fontFamily: 'var(--zf-font-serif), "Noto Serif SC", serif',
        fontSize: size,
        fontWeight: 900,
        color,
        lineHeight: 1,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 0,
      }}
    >
      {char}
    </div>
  );
}

export default React.memo(CalligraphyWatermark);
