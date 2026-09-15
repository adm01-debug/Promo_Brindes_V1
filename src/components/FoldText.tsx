import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';

import './FoldText.css';

type SplitBy = 'char' | 'word' | 'line';
type Hinge = 'top' | 'bottom' | 'left' | 'right';

export interface FoldTextProps {
  text: string;
  splitBy?: SplitBy;
  hinge?: Hinge;
  duration?: number;
  stagger?: number;
  ease?: string;
  perspective?: number;
  creaseShading?: number;
  className?: string;
  style?: CSSProperties;
}

type HingeConfig = {
  origin: string;
  rotateX: number;
  rotateY: number;
};

const HINGE_CONFIG: Record<Hinge, HingeConfig> = {
  top: { origin: '50% 0%', rotateX: -92, rotateY: 0 },
  bottom: { origin: '50% 100%', rotateX: 92, rotateY: 0 },
  left: { origin: '0% 50%', rotateX: 0, rotateY: 92 },
  right: { origin: '100% 50%', rotateX: 0, rotateY: -92 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const renderWhitespace = (value: string, key: string): ReactNode[] =>
  value.split(/(\n)/).map((part, index) => {
    if (part === '\n') return <br key={`${key}-br-${index}`} />;
    if (!part) return null;

    return (
      <span className="fold-text-whitespace" key={`${key}-space-${index}`}>
        {part.replace(/ /g, '\u00A0')}
      </span>
    );
  });

/**
 * Adapted for Promo Brindes from React Bits' Fold Text component.
 * The animation is intentionally one-shot and fully disabled for reduced motion.
 * @see https://reactbits.dev/text-animations/fold-text
 */
export function FoldText({
  text,
  splitBy = 'word',
  hinge = 'top',
  duration = 0.7,
  stagger = 0.055,
  ease = 'power3.out',
  perspective = 760,
  creaseShading = 0.5,
  className = '',
  style = {},
}: FoldTextProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const hingeConfig = HINGE_CONFIG[hinge];
  const safeCrease = clamp(creaseShading, 0, 1);
  const safePerspective = Math.max(120, perspective);

  const segments = useMemo(() => {
    let segmentIndex = 0;

    const renderSegment = (content: string, key: string, split: SplitBy = splitBy): ReactNode => {
      segmentIndex += 1;
      return (
        <span
          className="fold-text-segment"
          data-fold-split={split}
          key={key}
          style={{ '--fold-perspective': `${safePerspective}px` } as CSSProperties}
        >
          <span
            className="fold-text-piece"
            data-fold-hinge={hinge}
            style={{ transformOrigin: hingeConfig.origin, '--fold-crease': 0 } as CSSProperties}
          >
            {content || '\u00A0'}
          </span>
        </span>
      );
    };

    if (splitBy === 'line') {
      return text.split('\n').map((line, index) => (
        <span className="fold-text-line" key={`line-${index}`}>
          {renderSegment(line || '\u00A0', `segment-line-${index}`, 'line')}
        </span>
      ));
    }

    if (splitBy === 'word') {
      return text.split(/(\s+)/).flatMap((part, index) => {
        if (!part) return [];
        if (/^\s+$/.test(part)) return renderWhitespace(part, `ws-${index}`);
        return renderSegment(part, `segment-word-${segmentIndex}`);
      });
    }

    return Array.from(text).map((char, index) => {
      if (char === '\n') return <br key={`br-${index}`} />;
      return renderSegment(char === ' ' ? '\u00A0' : char, `segment-char-${index}`);
    });
  }, [hinge, hingeConfig.origin, safePerspective, splitBy, text]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const pieces = Array.from(root.querySelectorAll<HTMLElement>('.fold-text-piece'));
    if (!pieces.length) return;

    // O texto já nasce legível no HTML e no CSS. GSAP é um aprimoramento
    // decorativo: carregá-lo somente depois da pintura remove a biblioteca do
    // caminho crítico e deixa o título íntegro em redes lentas ou se o chunk
    // falhar. A preferência de movimento reduzido também não baixa o módulo.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let disposed = false;
    let cleanupAnimation = () => {};
    void import('gsap').then(({ gsap }) => {
      if (disposed) return;
      const timeline = gsap.timeline();
      timeline.fromTo(
        pieces,
        {
          opacity: 0,
          rotateX: hingeConfig.rotateX,
          rotateY: hingeConfig.rotateY,
          '--fold-crease': safeCrease,
          transformOrigin: hingeConfig.origin,
          willChange: 'transform, opacity',
          force3D: true,
        },
        {
          opacity: 1,
          rotateX: 0,
          rotateY: 0,
          '--fold-crease': 0,
          duration,
          ease,
          stagger,
          clearProps: 'willChange',
        },
      );
      cleanupAnimation = () => {
        timeline.kill();
        gsap.killTweensOf(pieces);
      };
    }).catch(() => {
      // A versão estática já visível é o fallback de produto para uma falha
      // eventual do chunk de animação.
    });

    return () => {
      disposed = true;
      cleanupAnimation();
    };
  }, [duration, ease, hingeConfig, safeCrease, stagger, text]);

  return (
    <span ref={rootRef} className={`fold-text ${className}`.trim()} style={style}>
      <span className="fold-text-sr-only">{text}</span>
      <span className="fold-text-visual" aria-hidden="true">
        {segments}
      </span>
    </span>
  );
}
