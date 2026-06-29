export const fadeInUp = (targets) => {
  if (!targets) return;
  const elements = Array.isArray(targets) ? targets : [targets];
  elements.forEach((el, i) => {
    if (!el || !el.style) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `opacity 600ms ease ${i * 60}ms, transform 600ms ease ${i * 60}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });
};

export const staggerFadeIn = (targets, staggerDelay = 60) => {
  if (!targets) return;
  const elements = Array.isArray(targets) ? targets : Array.from(targets);
  elements.forEach((el, i) => {
    if (!el || !el.style) return;
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = `opacity 500ms ease ${i * staggerDelay}ms, transform 500ms ease ${i * staggerDelay}ms`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });
};
