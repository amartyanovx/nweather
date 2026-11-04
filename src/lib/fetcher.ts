const DEFAULT_TIMEOUT_MS = 10_000; // 10 секунд

export const jsonFetcher = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`Ошибка ${res.status}`);
    return res.json();
  } catch (err) {
    if (!controller.signal.aborted) throw err; // не перезабрасываем timeout-ошибку дважды
    const abortedErr = err as Error | undefined;
    throw new Error(
      abortedErr?.message && abortedErr.message.includes('aborted')
        ? 'Превышено время ожидания ответа сервера'
        : abortedErr?.message || 'Ошибка сети',
    );
  }
};
