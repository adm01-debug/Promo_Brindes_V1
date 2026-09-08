import { useEffect, useRef, useState, type CSSProperties } from 'react';

import './GlitchText.css';

interface GlitchTextProps {
  children: string;
  className?: string;
  speed?: number;
}

interface GlitchStyles extends CSSProperties {
  '--glitch-after-duration': string;
  '--glitch-before-duration': string;
}

/**
 * Restrained, accessible adaptation of React Bits' Glitch Text.
 * It plays once on entry and once per hover, never as a permanent loop.
 * @see https://reactbits.dev/text-animations/glitch-text
 */
export function GlitchText({ children, className = '', speed = 1 }: GlitchTextProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    let resetTimer: number | undefined;
    const reveal = () => {
      setActive(true);
      resetTimer = window.setTimeout(() => setActive(false), Math.max(1000, speed * 1300));
    };

    if (!('IntersectionObserver' in window)) {
      reveal();
      return () => window.clearTimeout(resetTimer);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        reveal();
        observer.disconnect();
      },
      { threshold: 0.7 },
    );

    observer.observe(root);
    return () => {
      observer.disconnect();
      window.clearTimeout(resetTimer);
    };
  }, [speed]);

  const styles: GlitchStyles = {
    '--glitch-after-duration': `${speed * 1.05}s`,
    '--glitch-before-duration': `${speed * 0.85}s`,
  };

  return (
    <span
      ref={rootRef}
      className={`glitch-text ${active ? 'glitch-text--active' : ''} ${className}`.trim()}
      data-text={children}
      style={styles}
    >
      {children}
    </span>
  );
}
