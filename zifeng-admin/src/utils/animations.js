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
