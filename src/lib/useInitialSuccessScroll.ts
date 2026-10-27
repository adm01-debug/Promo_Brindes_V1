import { useEffect } from 'react';

export function useInitialSuccessScroll(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    let readerTookControl = false;
    const scrollToTop = () => {
      if (!readerTookControl) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };
    let secondFrame: number | undefined;
    const removeIntentListeners = () => {
      window.removeEventListener('wheel', stopRetries);
      window.removeEventListener('touchstart', stopRetries);
      window.removeEventListener('pointerdown', stopRetries);
      window.removeEventListener('keydown', stopRetries);
    };
    const stopRetries = () => {
      readerTookControl = true;
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) window.cancelAnimationFrame(secondFrame);
      window.clearTimeout(settledLayoutTimer);
      root.style.scrollBehavior = previousScrollBehavior;
      removeIntentListeners();
    };
    window.addEventListener('wheel', stopRetries, { passive: true });
    window.addEventListener('touchstart', stopRetries, { passive: true });
    window.addEventListener('pointerdown', stopRetries);
    window.addEventListener('keydown', stopRetries);
    scrollToTop();
    const firstFrame = window.requestAnimationFrame(() => {
      scrollToTop();
      secondFrame = window.requestAnimationFrame(scrollToTop);
    });
    const settledLayoutTimer = window.setTimeout(() => {
      scrollToTop();
      root.style.scrollBehavior = previousScrollBehavior;
      removeIntentListeners();
    }, 200);
    return () => {
      stopRetries();
    };
  }, [active]);
}
