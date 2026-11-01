export const jsonFetcher = async <T>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ошибка ${res.status}`);
  return res.json();
};