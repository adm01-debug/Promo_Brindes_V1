import { act, renderHook } from '@testing-library/react';
import { useInitialSuccessScroll } from './useInitialSuccessScroll';

describe('rolagem inicial da confirmação', () => {
  it('reposiciona apenas na entrada do sucesso, não em atualizações posteriores', async () => {
    vi.useFakeTimers();
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    const requestAnimationFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const cancelAnimationFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const { rerender, unmount } = renderHook(({ active }) => useInitialSuccessScroll(active), { initialProps: { active: false } });

    rerender({ active: true });
    await act(async () => vi.runAllTimers());
    expect(scrollTo).toHaveBeenCalled();

    scrollTo.mockClear();
    rerender({ active: true });
    await act(async () => vi.runAllTimers());
    expect(scrollTo).not.toHaveBeenCalled();

    unmount();
    scrollTo.mockRestore();
    requestAnimationFrame.mockRestore();
    cancelAnimationFrame.mockRestore();
    vi.useRealTimers();
  });
});
