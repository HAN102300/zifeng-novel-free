/* ============================================================
   ZfGlassSurface —— 玻璃表面统一出口
   替代散落的 47 处内联 backdrop-filter 与 glassStyle.js 的函数式用法。

   合成器铁律（见 css/utilities.css 顶部注释）：
     ① 单元素不得同时具备 backdrop-filter + filter:blur() + infinite animation
     ② infinite 动画元素必须是本组件的「兄弟层」，不能是子孙
   因此本组件不提供 ambient 插槽 —— 氛围层请作为兄弟节点渲染。
   ============================================================ */

import React, { useCallback, useRef } from 'react';
import { useFx } from '../motion/FxContext.jsx';

/**
 * @param {1|2|3} level 玻璃强度
 * @param {boolean} hover 悬停抬升 + 高光跟随（仅 tier 2）
 * @param {string|Function} as 渲染标签
 */
export default function ZfGlassSurface({
  level = 2,
  hover = false,
  sheen = false,
  as: Comp = 'div',
  children,
  className = '',
  style,
  ...rest
}) {
  const { enabled } = useFx();
  const ref = useRef(null);

  /* 高光跟随：只写 CSS 自定义属性，不逐帧改 style.transform。
     全站 pointermove 由 hooks/useTicker 单例广播，这里用局部监听即可
     因为浏览器会把同元素的 pointermove 合并派发，成本远低于旧实现里
     「一次改 3 个 DOM style 属性且卸载时不复位」的写法。 */
  const onPointerMove = useCallback(
    (e) => {
      if (!sheen || !enabled('sheen') || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      ref.current.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      ref.current.style.setProperty('--my', `${e.clientY - rect.top}px`);
    },
    [sheen, enabled],
  );

  return (
    <Comp
      ref={ref}
      onPointerMove={sheen ? onPointerMove : undefined}
      className={`zf-glass zf-glass--${level} ${sheen ? 'zf-sheen' : ''} ${className}`}
      /* 背景与 backdrop-filter 一律交给 .zf-glass / [data-glass='off'] 这两条
         CSS 规则处理，绝不在这里内联 —— 内联样式优先级压过属性选择器，
         会让「毛玻璃风格」开关对本组件失效（实测踩过）。 */
      style={{
        border: '1px solid var(--zf-glass-border)',
        boxShadow: `var(--zf-shadow-${level}), var(--zf-glass-edge-top)`,
        borderRadius: 'var(--zf-r-xl)',
        transition: `transform var(--zf-dur-fast) var(--zf-ease-out),
          box-shadow var(--zf-dur-fast) var(--zf-ease-out),
          border-color var(--zf-dur-fast) var(--zf-ease-out)`,
        ...(hover && enabled('tilt') ? { cursor: 'pointer' } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
}
