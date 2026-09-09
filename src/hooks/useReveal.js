import { useEffect, useRef, useState } from 'react';

const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Global scroll-reveal controller.
 *
 * Elements opt in with `data-reveal`. The hidden starting state is only applied
 * once this observer marks the document `reveal-ready`, so content stays visible
 * if scripting, IntersectionObserver or motion preferences rule the effect out.
 */
export function useRevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    if (prefersReduced() || !('IntersectionObserver' in window)) {
      root.classList.remove('reveal-ready');
      return;
    }
    root.classList.add('reveal-ready');

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

    const selector = ['[data-reveal]', '[data-reveal-group]', '[data-reveal-line]', '[data-reveal-bar]']
      .map(attribute => `${attribute}:not(.revealed)`)
      .join(',');
    const scan = () => {
      for (const node of document.querySelectorAll(selector)) observer.observe(node);
    };
    scan();

    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove('reveal-ready');
    };
  }, []);
}

/**
 * Counts a number up once it scrolls into view. Returns a ref for the element
 * and the display value, which is the final figure when motion is reduced.
 */
export function useCountUp(target, { duration = 1500, decimals = 0 } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(() => (prefersReduced() ? target : 0));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (prefersReduced() || !('IntersectionObserver' in window)) { setValue(target); return; }

    let frame = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0]?.isIntersecting) return;
      observer.disconnect();
      const started = performance.now();
      const step = now => {
        const progress = Math.min(1, (now - started) / duration);
        setValue(target * (1 - (1 - progress) ** 3));
        if (progress < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    }, { threshold: 0.35 });

    observer.observe(node);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [target, duration]);

  return [ref, Number(value).toFixed(decimals)];
}

/** Tracks how far the page has scrolled, for the reading progress indicator. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(100, Math.max(0, window.scrollY / scrollable * 100)) : 0);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return progress;
}
