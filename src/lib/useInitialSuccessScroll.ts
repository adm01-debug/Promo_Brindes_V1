import { useEffect } from 'react';

export function useInitialSuccessScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    let secondFrame: number | undefined;
    scrollToTop();
    const firstFrame = window.requestAnimationFrame(() => {
      scrollToTop();
      secondFrame = window.requestAnimationFrame(scrollToTop);
    });
    const settledLayoutTimer = window.setTimeout(() => {
      scrollToTop();
      root.style.scrollBehavior = previousScrollBehavior;
    }, 200);
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settledLayoutTimer);
      root.style.scrollBehavior = previousScrollBehavior;
    };
  }, [active]);
}
