import { jsonFetcher } from '@/lib/fetcher';

const FETCH_URL = 'http://localhost/api/test';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const jsonResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve(body),
});

/** Ответ, который разрешается только при получении сигнала abort. */
const pendingFetchUntilAbort =
  (createError: () => unknown) =>
  (_url: string, init?: RequestInit): Promise<Response> =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(createError()));
    });

describe('jsonFetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('returns parsed JSON data on success', async () => {
    const mockData = { name: 'test', value: 42 };
    mockFetch.mockResolvedValueOnce(jsonResponse(mockData));

    const result = await jsonFetcher<{ name: string; value: number }>(FETCH_URL);

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(FETCH_URL, {
      signal: expect.any(AbortSignal),
    });
  });

  test('clears the timeout timer after a successful request', async () => {
    jest.useFakeTimers();
    mockFetch.mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(jsonFetcher(FETCH_URL)).resolves.toEqual({ ok: true });

    // Таймер timeout-а должен быть снят, иначе он останется висеть после ответа.
    expect(jest.getTimerCount()).toBe(0);
  });

  test('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 } as Response);

    await expect(jsonFetcher(FETCH_URL)).rejects.toThrow('Ошибка 404');
  });

  test('throws error with server status when response fails with 500', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as Response);

    await expect(jsonFetcher(FETCH_URL)).rejects.toThrow('Ошибка 500');
  });

  test('throws original error for non-aborted network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network failed'));

    await expect(jsonFetcher(FETCH_URL)).rejects.toThrow('Network failed');
  });

  test('rethrows non-aborted error even when its message mentions "aborted"', async () => {
    // Сигнал не прерывался, поэтому текст ошибки нельзя подменять на timeout-сообщение.
    mockFetch.mockRejectedValueOnce(new Error('Request aborted by user'));

    await expect(jsonFetcher(FETCH_URL)).rejects.toThrow('Request aborted by user');
  });

  test('returns empty object when server returns empty JSON body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}));

    await expect(jsonFetcher<object>(FETCH_URL)).resolves.toEqual({});
  });

  test('returns null when server returns null JSON body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(null));

    await expect(jsonFetcher<unknown>(FETCH_URL)).resolves.toBeNull();
  });

  test('propagates JSON parse error when response body is invalid JSON', async () => {
    const parseError = new SyntaxError('Unexpected token < in JSON at position 0');
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(parseError),
    } as unknown as Response);

    await expect(jsonFetcher(FETCH_URL)).rejects.toThrow(parseError);
  });

  test('rejects with timeout message when request exceeds 10 seconds', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce(
      pendingFetchUntilAbort(() =>
        Object.assign(new Error('This operation was aborted'), { name: 'AbortError' }),
      ) as unknown as () => Promise<Response>,
    );

    const promise = jsonFetcher(FETCH_URL);
    jest.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow('Превышено время ожидания ответа сервера');
  });

  test('rejects with original abort message when abort marker is missing', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce(
      pendingFetchUntilAbort(
        () => new Error('socket hang up'),
      ) as unknown as () => Promise<Response>,
    );

    const promise = jsonFetcher(FETCH_URL);
    jest.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow('socket hang up');
  });

  test('falls back to generic network error when aborted error has no message', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementationOnce(
      pendingFetchUntilAbort(() => undefined) as unknown as () => Promise<Response>,
    );

    const promise = jsonFetcher(FETCH_URL);
    jest.advanceTimersByTime(10_000);

    await expect(promise).rejects.toThrow('Ошибка сети');
  });
});
