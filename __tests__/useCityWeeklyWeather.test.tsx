import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useCityWeeklyWeather } from '@/hooks/useCityWeeklyWeather';

jest.mock('swr');

describe('useCityWeeklyWeather', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls useSWR with city URL and returns daily data', () => {
    const mockDaily = [
      { day: 'Понедельник', maxTempC: 20, minTempC: 15 },
      { day: 'Вторник', maxTempC: 22, minTempC: 16 },
    ];
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: { name: 'Москва', daily: mockDaily },
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useCityWeeklyWeather('Москва'));

    expect(useSWR).toHaveBeenCalledWith(
      '/api/weather?city=%D0%9C%D0%BE%D1%81%D0%BA%D0%B2%D0%B0',
      expect.any(Function),
    );
    expect(result.current.data).toEqual(mockDaily);
  });

  test('returns undefined daily when city is null', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useCityWeeklyWeather(null));

    expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function));
    expect(result.current.data).toBeUndefined();
  });

  test('returns error and loading state from useSWR', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: undefined,
      error: new Error('City not found'),
      isLoading: true,
    });

    const { result } = renderHook(() => useCityWeeklyWeather('Москва'));

    expect(result.current.error).toEqual(new Error('City not found'));
    expect(result.current.isLoading).toBe(true);
  });

  test('does not call useSWR (null key) when city is empty string', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useCityWeeklyWeather(''));

    // empty string is falsy, so SWR key becomes null and fetch is skipped
    expect(useSWR).toHaveBeenCalledWith(null, expect.any(Function));
    expect(result.current.data).toBeUndefined();
  });

  test('returns undefined daily while SWR has no data yet', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: null,
      error: undefined,
      isLoading: true,
    });

    const { result } = renderHook(() => useCityWeeklyWeather('Москва'));

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });

  test('encodes city name with spaces and special characters in the URL', () => {
    const city = 'Санкт-Петербург / Тест';
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: { name: city, daily: [] },
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useCityWeeklyWeather(city));

    expect(useSWR).toHaveBeenCalledWith(
      `/api/weather?city=${encodeURIComponent(city)}`,
      expect.any(Function),
    );
    expect(result.current.data).toEqual([]);
  });
});
