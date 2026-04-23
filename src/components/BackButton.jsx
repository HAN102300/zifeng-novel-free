import React, { useContext } from 'react';
import { motion } from 'framer-motion';
import { LeftOutlined } from '@ant-design/icons';
import { ThemeContext } from '../App';

const BackButton = ({ onClick, text, style = {} }) => {
  const { themeConfigs, currentTheme, isDarkMode } = useContext(ThemeContext);
  const color = themeConfigs[currentTheme].primaryColor;

  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ x: -4, scale: 1.04 }}
      whileTap={{ scale: 0.92 }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: text ? '8px 18px' : '10px',
        borderRadius: text ? 24 : 14,
        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
        border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        color: isDarkMode ? '#ccc' : '#555',
        fontSize: text ? 14 : 16,
        cursor: 'pointer',
        outline: 'none',
        boxShadow: isDarkMode
          ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, color 0.3s ease',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `${color}18`;
        e.currentTarget.style.borderColor = `${color}50`;
        e.currentTarget.style.color = color;
        e.currentTarget.style.boxShadow = `0 4px 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.1)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
        e.currentTarget.style.borderColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
        e.currentTarget.style.color = isDarkMode ? '#ccc' : '#555';
        e.currentTarget.style.boxShadow = isDarkMode
          ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
          : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8)';
      }}
    >
      <LeftOutlined style={{ fontSize: text ? 13 : 15 }} />
      {text && <span>{text}</span>}
    </motion.button>
  );
};

export default BackButton;
