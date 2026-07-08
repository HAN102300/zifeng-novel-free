/**
 * 将阿拉伯数字转为中文数字
 * @param {number|string} num - 输入数字
 * @param {Object} options
 * @param {string} options.unit - 固定后缀单位（如"章"）
 * @param {boolean} options.simplified - 超大数字是否简写
 * @returns {string} 中文数字字符串
 *
 * 示例:
 *   numberToChinese(1321) → "一千三百二十一"
 *   numberToChinese(1321, { unit: '章' }) → "一千三百二十一章"
 *   numberToChinese(1285000) → "一百二十八万五千"
 *   numberToChinese(1285000, { unit: '字' }) → "一百二十八万五千字"
 */
const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
const CHINESE_UNITS = ['', '十', '百', '千'];
const CHINESE_BIG_UNITS = ['', '万', '亿', '兆'];

function fourDigitsToChinese(num) {
  if (num === 0) return '';
  const result = [];
  const str = String(num).padStart(4, '0');
  let hasPrev = false;
  for (let i = 0; i < 4; i++) {
    const digit = parseInt(str[i]);
    const unit = CHINESE_UNITS[3 - i];
    if (digit === 0) {
      if (hasPrev) result.push('零');
      hasPrev = false;
    } else {
      if (digit === 1 && unit === '十' && i === 2 && num < 100) {
        result.push('十');
      } else {
        result.push(CHINESE_DIGITS[digit] + unit);
      }
      hasPrev = true;
    }
  }
  return result.join('').replace(/零+$/, '');
}

export function numberToChinese(num, { unit = '', simplified = false } = {}) {
  if (num === null || num === undefined || num === '未知') return unit || '未知';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return String(num) + unit;
  if (n === 0) return '零' + unit;

  if (simplified && n >= 10000) {
    const wan = Math.floor(n / 10000);
    const remainder = n % 10000;
    const wanStr = wan < 10 ? CHINESE_DIGITS[wan] + '万' : numberToChinese(wan, { simplified: true }) + '万';
    if (remainder === 0) return wanStr + unit;
    const remStr = remainder >= 1000
      ? fourDigitsToChinese(remainder)
      : (remainder >= 100 ? CHINESE_DIGITS[Math.floor(remainder / 100)] + '百' : '');
    return wanStr + (remStr || '') + unit;
  }

  const parts = [];
  let remaining = Math.floor(Math.abs(n));
  let bigUnitIndex = 0;

  while (remaining > 0) {
    const chunk = remaining % 10000;
    if (chunk > 0) {
      const chunkStr = fourDigitsToChinese(chunk);
      const bigUnit = CHINESE_BIG_UNITS[bigUnitIndex];
      parts.unshift(chunkStr + bigUnit);
    }
    remaining = Math.floor(remaining / 10000);
    bigUnitIndex++;
  }

  let result = parts.join('').replace(/零+$/, '');
  result = result.replace(/零+/g, '零').replace(/零([万亿兆])/g, '$1');
  if (n < 0) result = '负' + result;
  return result + unit;
}

export default numberToChinese;
