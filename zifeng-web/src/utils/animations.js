import anime from 'animejs/lib/anime.es.js';

export const fadeInUp = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [24, 0],
    duration: 600,
    delay,
    easing: 'easeOutCubic',
  });
};

export const fadeIn = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    duration: 500,
    delay,
    easing: 'easeOutCubic',
  });
};

export const scaleIn = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    scale: [0.9, 1],
    duration: 500,
    delay,
    easing: 'easeOutCubic',
  });
};

export const staggerFadeIn = (targets, staggerDelay = 60) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateY: [16, 0],
    duration: 500,
    delay: anime.stagger(staggerDelay),
    easing: 'easeOutCubic',
  });
};

export const slideInLeft = (targets, delay = 0) => {
  return anime({
    targets,
    opacity: [0, 1],
    translateX: [-20, 0],
    duration: 500,
    delay,
    easing: 'easeOutCubic',
  });
};

export const pulseEffect = (targets) => {
  return anime({
    targets,
    scale: [1, 1.05, 1],
    duration: 400,
    easing: 'easeInOutQuad',
  });
};

export { anime };
