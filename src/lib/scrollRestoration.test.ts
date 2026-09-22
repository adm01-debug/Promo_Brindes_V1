import { describe, expect, it, vi } from 'vitest';
import { restoreScrollPosition, type ScrollRestorationAdapter } from './scrollRestoration';

function scenario(initialMax: number) {
  let current = 0;
  let maximum = initialMax;
  let clock = 0;
  let nextFrame = 0;
  const callbacks = new Map<number, FrameRequestCallback>();
  const scrollTo = vi.fn((top: number) => { current = Math.min(top, maximum); });
  const adapter: ScrollRestorationAdapter = {
    currentY: () => current,
    maxY: () => maximum,
    scrollTo,
    requestFrame: (callback) => { nextFrame += 1; callbacks.set(nextFrame, callback); return nextFrame; },
    cancelFrame: (id) => { callbacks.delete(id); },
    now: () => clock,
  };
  return {
    adapter,
    scrollTo,
    growTo: (value: number) => { maximum = value; },
    advance: (milliseconds = 16) => {
      clock += milliseconds;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(clock));
    },
    pending: () => callbacks.size,
    current: () => current,
  };
}

describe('restauração de rolagem', () => {
  it('aguarda uma rota assíncrona crescer antes de concluir a posição salva', () => {
    const state = scenario(120);
    restoreScrollPosition(900, state.adapter);
    expect(state.current()).toBe(120);
    expect(state.pending()).toBe(1);

    state.growTo(920);
    state.advance();
    expect(state.current()).toBe(900);
    expect(state.pending()).toBe(0);
  });

  it('para no limite de tempo quando a página não alcança a altura anterior', () => {
    const state = scenario(80);
    restoreScrollPosition(900, state.adapter, 20);
    state.advance(16);
    state.advance(16);
    expect(state.current()).toBe(80);
    expect(state.pending()).toBe(0);
  });

  it('cancela frames pendentes quando a rota muda ou a pessoa interage', () => {
    const state = scenario(100);
    const cancel = restoreScrollPosition(900, state.adapter);
    expect(state.pending()).toBe(1);
    cancel();
    expect(state.pending()).toBe(0);
    state.growTo(1_000);
    state.advance();
    expect(state.scrollTo).toHaveBeenCalledTimes(1);
  });
});
