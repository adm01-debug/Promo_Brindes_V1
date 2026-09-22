export interface ScrollRestorationAdapter {
  currentY(): number;
  maxY(): number;
  scrollTo(top: number): void;
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  now(): number;
}

const DEFAULT_MAX_WAIT_MS = 1_500;
const POSITION_TOLERANCE_PX = 2;

/**
 * Restaura uma posição salva mesmo quando uma rota lazy ainda está aumentando a
 * altura do documento. O primeiro scroll usa o máximo disponível e os frames
 * seguintes completam a restauração assim que o conteúdo chega. Qualquer gesto
 * explícito da pessoa cancela o processo no componente chamador.
 */
export function restoreScrollPosition(
  target: number,
  adapter: ScrollRestorationAdapter,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
): () => void {
  const safeTarget = Math.max(0, Math.round(target));
  const startedAt = adapter.now();
  let frame: number | undefined;
  let cancelled = false;

  const restore = () => {
    if (cancelled) return;
    const reachable = Math.min(safeTarget, Math.max(0, adapter.maxY()));
    adapter.scrollTo(reachable);
    const targetReached = Math.abs(adapter.currentY() - safeTarget) <= POSITION_TOLERANCE_PX;
    if (!targetReached && adapter.now() - startedAt < maxWaitMs) {
      frame = adapter.requestFrame(restore);
    }
  };

  restore();
  return () => {
    cancelled = true;
    if (frame !== undefined) adapter.cancelFrame(frame);
  };
}

export function browserScrollRestorationAdapter(): ScrollRestorationAdapter {
  return {
    currentY: () => window.scrollY,
    maxY: () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    scrollTo: (top) => window.scrollTo({ top, behavior: 'auto' }),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
    now: () => performance.now(),
  };
}
