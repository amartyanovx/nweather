import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useCityForecast } from '@/hooks/useCityForecast';
import { jsonFetcher } from '@/lib/fetcher';
import type { ForecastResponse } from '@/types/weather';

jest.mock('swr');

const FORECAST: ForecastResponse = {
  city: { slug: 'moscow', name: 'Москва', timezone: 'Europe/Moscow' },
  weekStart: '2026-11-09',
  days: [],
};

describe('useCityForecast', () => {
  test('строит ключ SWR по slug города', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: FORECAST, error: undefined, isLoading: false });

    renderHook(() => useCityForecast('moscow'));

    expect(useSWR).toHaveBeenCalledWith('/api/forecast?city=moscow', jsonFetcher);
  });

  test('кодирует slug в ключе запроса', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: undefined, error: undefined, isLoading: true });

    renderHook(() => useCityForecast('a b/c'));

    expect(useSWR).toHaveBeenCalledWith('/api/forecast?city=a%20b%2Fc', jsonFetcher);
  });

  test('отключает запрос ключом null без выбранного города', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: undefined, error: undefined, isLoading: false });

    renderHook(() => useCityForecast(null));

    expect(useSWR).toHaveBeenCalledWith(null, jsonFetcher);
  });

  test('пробрасывает данные, ошибку, загрузку и mutate', () => {
    const mutate = jest.fn();
    const error = new Error('Ошибка 404');
    (useSWR as jest.Mock).mockReturnValue({ data: FORECAST, error, isLoading: true, mutate });

    const { result } = renderHook(() => useCityForecast('moscow'));

    expect(result.current).toEqual({ data: FORECAST, error, isLoading: true, mutate });
  });

  test('не отдаёт лишние поля SWR', () => {
    (useSWR as jest.Mock).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      isValidating: true,
    });

    const { result } = renderHook(() => useCityForecast('moscow'));

    expect(Object.keys(result.current).sort()).toEqual(['data', 'error', 'isLoading', 'mutate']);
  });
});
