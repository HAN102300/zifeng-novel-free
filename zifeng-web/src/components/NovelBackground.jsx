import React from 'react';
import CalligraphyWatermark from './CalligraphyWatermark';

/**
 * 小说主题背景层 — 水墨墨团浮动 + 书法水印
 * @param {string} char - 水印汉字
 * @param {string} variant - 'ink' | 'calligraphy' | 'both'，默认 'both'
 * @param {string} primaryColor - 主色，默认紫色
 * @param {string[]} colors - 辅助色数组
 */
function NovelBackground({
  char = '墨',
  variant = 'both',
  primaryColor = '#8B5CF6',
  colors = [],
}) {
  const showInk = variant === 'ink' || variant === 'both';
  const showCalligraphy = variant === 'calligraphy' || variant === 'both';

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {showInk && (
        <>
          <div
            style={{
              position: 'absolute',
              top: '10%',
              right: '8%',
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primaryColor}20 0%, transparent 70%)`,
              filter: 'blur(60px)',
              animation: 'inkFlow 25s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              left: '5%',
              width: 250,
              height: 250,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${(colors[2] || primaryColor)}18 0%, transparent 70%)`,
              filter: 'blur(50px)',
              animation: 'inkFlow 30s ease-in-out infinite reverse',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '45%',
              left: '40%',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 70%)`,
              filter: 'blur(45px)',
              animation: 'inkFlow 22s ease-in-out infinite',
              animationDelay: '5s',
            }}
          />
        </>
      )}
      {showCalligraphy && (
        <>
          <CalligraphyWatermark
            char={char}
            position={{ top: '6%', right: '4%' }}
            size={140}
            color={`${primaryColor}10`}
          />
          <CalligraphyWatermark
            char={char}
            position={{ bottom: '8%', left: '4%' }}
            size={100}
            color={`${(colors[1] || primaryColor)}0a`}
          />
        </>
      )}
    </div>
  );
}

export default React.memo(NovelBackground);
