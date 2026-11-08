import { act, renderHook } from '@testing-library/react';
import { DEBOUNCE_MS } from '@/lib/cityQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('начальное значение доступно сразу', () => {
    const { result } = renderHook(() => useDebouncedValue('Мос'));

    expect(result.current).toBe('Мос');
  });

  test('отдаёт новое значение через 200 мс по умолчанию', () => {
    expect(DEBOUNCE_MS).toBe(200);
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'М' },
    });

    rerender({ value: 'Мо' });
    expect(result.current).toBe('М');

    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('М');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('Мо');
  });

  test('промежуточные значения не проходят при быстром вводе', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: '' },
    });

    rerender({ value: 'Мо' });
    act(() => {
      jest.advanceTimersByTime(100);
    });

    rerender({ value: 'Мос' });
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_MS - 1);
    });
    expect(result.current).toBe('');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('Мос');
  });

  test('поддерживает кастомную задержку', () => {
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 500), {
      initialProps: { value: 'М' },
    });

    rerender({ value: 'Мо' });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(result.current).toBe('М');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('Мо');
  });

  test('очищает таймер при размонтировании', () => {
    const clearSpy = jest.spyOn(global, 'clearTimeout');
    const { rerender, unmount } = renderHook(({ value }) => useDebouncedValue(value), {
      initialProps: { value: 'М' },
    });

    rerender({ value: 'Мо' });
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
