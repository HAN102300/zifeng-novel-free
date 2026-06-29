/* ============================================================
   紫枫免费小说 · 颜色工具函数
   ============================================================ */

/**
 * 将十六进制颜色转换为 RGB 字符串，用于 rgba() 使用
 * @param {string} hex - 颜色值，如 "#8B5CF6"
 * @returns {string} - 如 "139,92,246"
 */
export function getPrimaryRgb(hex) {
  if (!hex) return '139,92,246';
  const match = hex.replace('#', '').match(/.{2}/g);
  if (!match) return '139,92,246';
  return match.map(c => parseInt(c, 16)).join(',');
}
