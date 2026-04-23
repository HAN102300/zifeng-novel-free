import React, { useContext, useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeContext } from '../App';

const SummaryText = ({ text, maxRows = 2, style = {} }) => {
  const { themeConfigs, currentTheme, isDarkMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].primaryColor;
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, width: 0 });
  const hideTimerRef = useRef(null);
  const textRef = useRef(null);

  const handleMouseEnter = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (textRef.current) {
      const rect = textRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top,
        left: rect.left,
        width: rect.width
      });
    }
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hideTimerRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 120);
  }, []);

  const tooltipBg = isDarkMode
    ? 'rgba(30, 30, 30, 0.96)'
    : 'rgba(255, 255, 255, 0.98)';
  const tooltipBorder = isDarkMode
    ? `1px solid rgba(255,255,255,0.1)`
    : `1px solid rgba(0,0,0,0.06)`;
  const tooltipShadow = isDarkMode
    ? `0 8px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 20px ${color}15`
    : `0 8px 30px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02), 0 0 20px ${color}10`;
  const tooltipColor = isDarkMode ? '#d0d0d0' : '#444';

  const tooltipEl = showTooltip ? (
    <AnimatePresence>
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{
            duration: 0.2,
            ease: [0.22, 1, 0.36, 1]
          }}
          style={{
            position: 'fixed',
            top: tooltipPos.top - 8,
            left: tooltipPos.left,
            width: Math.min(Math.max(tooltipPos.width, 220), 360),
            transform: 'translateY(-100%)',
            padding: '10px 14px',
            paddingTop: 14,
            borderRadius: 10,
            backgroundColor: tooltipBg,
            border: tooltipBorder,
            boxShadow: tooltipShadow,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            color: tooltipColor,
            fontSize: 13,
            lineHeight: 1.6,
            zIndex: 9999,
            pointerEvents: 'auto',
            overflow: 'hidden',
            wordBreak: 'break-word',
            maxHeight: 13 * 1.6 * 2 + 20 + 4
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div style={{
            position: 'absolute',
            bottom: -5,
            left: 20,
            width: 10,
            height: 10,
            backgroundColor: tooltipBg,
            transform: 'rotate(45deg)',
            borderRight: tooltipBorder,
            borderBottom: tooltipBorder
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            borderRadius: '10px 10px 0 0',
            background: `linear-gradient(90deg, ${color}, ${color}60)`,
            opacity: 0.8
          }} />
          <div style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {text}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  ) : null;

  return (
    <>
      <div
        ref={textRef}
        style={{ position: 'relative', ...style }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.6,
            color: isDarkMode ? '#999' : '#888',
            display: '-webkit-box',
            WebkitLineClamp: maxRows,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            cursor: 'default'
          }}
        >
          {text}
        </div>
      </div>
      {createPortal(tooltipEl, document.body)}
    </>
  );
};

export default SummaryText;
