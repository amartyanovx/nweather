import { renderHook } from '@testing-library/react';
import useSWR from 'swr';
import { useCities } from '@/hooks/useWeather';
import { jsonFetcher } from '@/lib/fetcher';

jest.mock('swr');

describe('useCities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('calls useSWR with correct arguments and returns its result', () => {
    const mockResponse = { cities: ['Москва', 'Лунный Берег'] };
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: mockResponse,
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useCities());

    expect(useSWR).toHaveBeenCalledWith('/api/weather', expect.any(Function));
    expect(result.current.data).toEqual(mockResponse);
  });

  test('returns data, error and loading state from useSWR', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: undefined,
      error: new Error('Failed to fetch'),
      isLoading: true,
    });

    const { result } = renderHook(() => useCities());

    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toEqual(new Error('Failed to fetch'));
    expect(result.current.isLoading).toBe(true);
  });

  test('returns null data when API responds with null body', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: null,
      error: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useCities());

    expect(result.current.data).toBeNull();
  });

  test('passes jsonFetcher as the SWR fetcher', () => {
    (useSWR as jest.Mock).mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: true,
    });

    renderHook(() => useCities());

    expect(useSWR).toHaveBeenCalledWith('/api/weather', jsonFetcher);
  });
});
