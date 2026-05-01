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

export const staggerFadeIn = (targets, staggerDelay = 60) => {
  return anime({
    targets,
    translateY: [12, 0],
    opacity: [0, 1],
    duration: 450,
    delay: anime.stagger(staggerDelay),
    easing: 'easeOutCubic',
  });
};

export const countUp = (targets, endValue, duration = 800) => {
  return anime({
    targets,
    innerHTML: [0, endValue],
    round: 1,
    duration,
    easing: 'easeOutExpo',
  });
};

export const scaleIn = (targets, delay = 0) => {
  return anime({
    targets,
    scale: [0.9, 1],
    opacity: [0, 1],
    duration: 400,
    delay,
    easing: 'easeOutBack',
  });
};

export const slideInLeft = (targets, delay = 0) => {
  return anime({
    targets,
    translateX: [-20, 0],
    opacity: [0, 1],
    duration: 450,
    delay,
    easing: 'easeOutCubic',
  });
};

export const cardHover = (element) => {
  anime({
    targets: element,
    translateY: -4,
    boxShadow: ['0 2px 12px rgba(0,0,0,0.06)', '0 8px 24px rgba(0,0,0,0.12)'],
    duration: 250,
    easing: 'easeOutCubic',
  });
};

export const cardLeave = (element) => {
  anime({
    targets: element,
    translateY: 0,
    boxShadow: ['0 8px 24px rgba(0,0,0,0.12)', '0 2px 12px rgba(0,0,0,0.06)'],
    duration: 250,
    easing: 'easeOutCubic',
  });
};

export const pulseEffect = (targets) => {
  return anime({
    targets,
    scale: [1, 1.05, 1],
    duration: 600,
    easing: 'easeInOutQuad',
  });
};

export const shimmer = (targets) => {
  return anime({
    targets,
    backgroundPosition: ['200% 0', '-200% 0'],
    duration: 2000,
    easing: 'linear',
    loop: true,
  });
};

export const numberRoll = (targets, endValue, duration = 1200) => {
  return anime({
    targets,
    innerHTML: [0, endValue],
    round: 1,
    duration,
    easing: 'easeOutExpo',
  });
};

export const tableRowEnter = (targets) => {
  return anime({
    targets,
    translateX: [-8, 0],
    opacity: [0, 1],
    duration: 350,
    delay: anime.stagger(30),
    easing: 'easeOutCubic',
  });
};

export { anime };
