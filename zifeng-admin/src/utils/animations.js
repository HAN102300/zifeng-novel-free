import anime from 'animejs/lib/anime.es.js';

export const fadeInUp = (targets, delay = 0) => {
  return anime({
    targets,
    translateY: [16, 0],
    opacity: [0, 1],
    duration: 500,
    delay,
    easing: 'easeOutCubic',
  });
};

export const staggerFadeIn = (targets, staggerDelay = 80) => {
  return anime({
    targets,
    translateY: [20, 0],
    opacity: [0, 1],
    duration: 550,
    delay: anime.stagger(staggerDelay),
    easing: 'cubicBezier(0.25, 0.1, 0.25, 1)',
  });
};

export const cardHover = (element, isDarkMode = false) => {
  const hoverShadow = isDarkMode
    ? '0 12px 32px rgba(102, 126, 234, 0.25)'
    : '0 12px 32px rgba(102, 126, 234, 0.15)';
  anime({
    targets: element,
    translateY: -6,
    scale: 1.01,
    boxShadow: hoverShadow,
    duration: 280,
    easing: 'cubicBezier(0.25, 0.1, 0.25, 1)',
  });
};

export const cardLeave = (element, isDarkMode = false) => {
  const idleShadow = isDarkMode
    ? '0 2px 12px rgba(0,0,0,0.3)'
    : '0 2px 12px rgba(0,0,0,0.06)';
  anime({
    targets: element,
    translateY: 0,
    scale: 1,
    boxShadow: idleShadow,
    duration: 280,
    easing: 'cubicBezier(0.25, 0.1, 0.25, 1)',
  });
};

export const pulseEffect = (element) => {
  anime({
    targets: element,
    scale: [1, 1.05, 1],
    opacity: [0.8, 1, 0.8],
    duration: 2000,
    easing: 'easeInOutSine',
    loop: true,
  });
};

export const slideInLeft = (targets, delay = 0) => {
  return anime({
    targets,
    translateX: [-20, 0],
    opacity: [0, 1],
    duration: 400,
    delay,
    easing: 'easeOutCubic',
  });
};

export const tableRowStagger = (targets, staggerDelay = 30) => {
  return anime({
    targets,
    translateY: [12, 0],
    opacity: [0, 1],
    duration: 400,
    delay: anime.stagger(staggerDelay, { start: 100 }),
    easing: 'cubicBezier(0.25, 0.1, 0.25, 1)',
  });
};
