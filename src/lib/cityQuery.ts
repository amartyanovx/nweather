import type { CityDTO } from '@/types/weather';

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 50;
export const DEBOUNCE_MS = 200;
export const SUGGESTION_LIMIT = 8;

const DISALLOWED_CHARS = /[^A-Za-zА-Яа-яЁё '-]/g;
const SPACE_RUN = / {2,}/g;
const WORD_SEPARATORS = /[\s'-]+/;

/** Хвостовой пробел не срезается — иначе нельзя набрать «Санкт Петербург». */
export const sanitizeCityInput = (value: string): string =>
  value.replace(DISALLOWED_CHARS, '').replace(SPACE_RUN, ' ').slice(0, MAX_QUERY_LENGTH);

export const normalizeForSearch = (value: string): string =>
  value.toLowerCase().replace(/ё/g, 'е').trim();

const splitWords = (value: string): string[] =>
  value.split(WORD_SEPARATORS).filter((word) => word.length > 0);

interface ScoredCity {
  city: CityDTO;
  startsWithName: boolean;
}

/** Каждый токен — префикс слова в `name` или `nameEn`; совпадение с начала `name` идёт выше. */
export const searchCities = (cities: CityDTO[], query: string): CityDTO[] => {
  const normalized = normalizeForSearch(query);

  if (normalized.length < MIN_QUERY_LENGTH) return [];

  const tokens = splitWords(normalized);
  if (tokens.length === 0) return [];

  const joinedQuery = tokens.join(' ');
  const matches: ScoredCity[] = [];

  for (const city of cities) {
    const nameWords = splitWords(normalizeForSearch(city.name));
    const enWords = splitWords(normalizeForSearch(city.nameEn));
    const words = [...nameWords, ...enWords];

    if (!tokens.every((token) => words.some((word) => word.startsWith(token)))) continue;

    matches.push({ city, startsWithName: nameWords.join(' ').startsWith(joinedQuery) });
  }

  return matches
    .sort((a, b) =>
      a.startsWithName === b.startsWithName
        ? a.city.name.localeCompare(b.city.name, 'ru')
        : Number(b.startsWithName) - Number(a.startsWithName),
    )
    .slice(0, SUGGESTION_LIMIT)
    .map(({ city }) => city);
};
