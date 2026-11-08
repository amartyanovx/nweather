import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useCities } from '@/hooks/useCities';
import { jsonFetcher } from '@/lib/fetcher';
import type { CityDTO } from '@/types/weather';

jest.mock('swr');

const MOSCOW: CityDTO = {
  slug: 'moscow',
  name: 'Москва',
  nameEn: 'Moscow',
  country: 'Россия',
  lat: 55.7558,
  lon: 37.6173,
};

describe('useCities', () => {
  test('запрашивает /api/cities один раз с jsonFetcher', () => {
    (useSWR as jest.Mock).mockReturnValue({ data: undefined, error: undefined, isLoading: true });

    renderHook(() => useCities());

    expect(useSWR).toHaveBeenCalledWith('/api/cities', jsonFetcher);
  });

  test('отдаёт ответ SWR целиком', () => {
    const response = {
      data: { cities: [MOSCOW] },
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate: jest.fn(),
    };
    (useSWR as jest.Mock).mockReturnValue(response);

    const { result } = renderHook(() => useCities());

    expect(result.current).toBe(response);
    expect(result.current.data).toEqual({ cities: [MOSCOW] });
  });

  test('пробрасывает ошибку загрузки городов', () => {
    const error = new Error('Ошибка 500');
    (useSWR as jest.Mock).mockReturnValue({ data: undefined, error, isLoading: false });

    const { result } = renderHook(() => useCities());

    expect(result.current.error).toBe(error);
  });
});
