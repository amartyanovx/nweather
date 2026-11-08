/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import {
  MAX_QUERY_LENGTH,
  MIN_QUERY_LENGTH,
  SUGGESTION_LIMIT,
  normalizeForSearch,
  sanitizeCityInput,
  searchCities,
} from '@/lib/cityQuery';
import type { CityDTO } from '@/types/weather';

const city = (slug: string, name: string, nameEn: string): CityDTO => ({
  slug,
  name,
  nameEn,
  country: 'Тестландия',
  lat: 0,
  lon: 0,
});

const MOSCOW = city('moscow', 'Москва', 'Moscow');
const MONTREAL = city('montreal', 'Монреаль', 'Montreal');
const SPB = city('saint-petersburg', 'Санкт-Петербург', 'Saint Petersburg');
const KOROLEV = city('korolev', 'Королёв', 'Korolev');
const NEW_YORK = city('new-york', 'Нью-Йорк', 'New York');

const CITIES = [MOSCOW, MONTREAL, SPB, KOROLEV, NEW_YORK];

const names = (cities: CityDTO[]) => cities.map((item) => item.name);

describe('sanitizeCityInput', () => {
  test('сохраняет буквы ru/en, пробел, дефис и апостроф', () => {
    expect(sanitizeCityInput("Санкт-Петербург O'Brien")).toBe("Санкт-Петербург O'Brien");
  });

  test('убирает цифры и посторонние знаки', () => {
    expect(sanitizeCityInput('Мос1ква!@#')).toBe('Москва');
    expect(sanitizeCityInput('Санкт_Петербург!')).toBe('СанктПетербург');
  });

  test('схлопывает повторные пробелы', () => {
    expect(sanitizeCityInput('Санкт    Петербург')).toBe('Санкт Петербург');
  });

  test('не срезает хвостовой пробел — иначе не набрать «Санкт Петербург»', () => {
    expect(sanitizeCityInput('Санкт ')).toBe('Санкт ');
  });

  test('обрезает ввод по лимиту длины', () => {
    const result = sanitizeCityInput('а'.repeat(MAX_QUERY_LENGTH + 20));

    expect(result).toHaveLength(MAX_QUERY_LENGTH);
  });

  test('лимит действует уже после фильтра символов', () => {
    const result = sanitizeCityInput(`${'а'.repeat(MAX_QUERY_LENGTH)}1!`);

    expect(result).toBe('а'.repeat(MAX_QUERY_LENGTH));
  });
});

describe('normalizeForSearch', () => {
  test('приводит регистр и приравнивает ё к е', () => {
    expect(normalizeForSearch('КоролЁв')).toBe('королев');
    expect(normalizeForSearch('MOSCOW')).toBe('moscow');
  });

  test('срезает пробелы по краям', () => {
    expect(normalizeForSearch('  Москва  ')).toBe('москва');
  });
});

describe('searchCities', () => {
  test('скрывает подсказки для запроса короче минимальной длины', () => {
    expect(MIN_QUERY_LENGTH).toBe(2);
    expect(searchCities(CITIES, '')).toEqual([]);
    expect(searchCities(CITIES, 'м')).toEqual([]);
    // Пробелы не считаются: после нормализации остаётся один символ.
    expect(searchCities(CITIES, ' м ')).toEqual([]);
  });

  test('находит город по русскому названию с двух символов', () => {
    expect(names(searchCities(CITIES, 'Мо'))).toEqual(['Монреаль', 'Москва']);
  });

  test('находит город по английскому названию', () => {
    expect(names(searchCities(CITIES, 'mos'))).toEqual(['Москва']);
  });

  test('совпадает с началом слова, а не с серединой', () => {
    // «скв» есть внутри «Москва», но не в начале слова.
    expect(searchCities(CITIES, 'скв')).toEqual([]);
    expect(names(searchCities(CITIES, 'петер'))).toEqual(['Санкт-Петербург']);
  });

  test('приравнивает ё к е', () => {
    expect(names(searchCities(CITIES, 'королев'))).toEqual(['Королёв']);
    expect(names(searchCities(CITIES, 'королёв'))).toEqual(['Королёв']);
  });

  test('каждый токен запроса ищется отдельно', () => {
    expect(names(searchCities(CITIES, 'санкт п'))).toEqual(['Санкт-Петербург']);
    expect(names(searchCities(CITIES, 'нью й'))).toEqual(['Нью-Йорк']);
    expect(searchCities(CITIES, 'санкт м')).toEqual([]);
  });

  test('ставит совпадение с начала name выше совпадений внутри названия', () => {
    const prefixMatch = city('nizhny', 'Нижний Новгород', 'Nizhny Novgorod');
    const insideMatch = city('ani', 'Ани-Ни', 'Ani-Ni');

    // «Ани-Ни» раньше по алфавиту, но совпадение у него во втором слове названия.
    expect(names(searchCities([prefixMatch, insideMatch], 'ни'))).toEqual([
      'Нижний Новгород',
      'Ани-Ни',
    ]);
  });

  test('сравнивает с началом name всё название, а не отдельные слова', () => {
    const spb = city('spb', 'Санкт-Петербург', 'Saint Petersburg');
    const longName = city('academic', 'Академический Санкт-Петербург', 'Academic Saint Petersburg');

    // Запрос целиком открывает только «Санкт-Петербург», хотя по алфавиту он второй.
    expect(names(searchCities([longName, spb], 'санкт петербург'))).toEqual([
      'Санкт-Петербург',
      'Академический Санкт-Петербург',
    ]);
  });

  test('сортирует совпадения по алфавиту', () => {
    expect(names(searchCities(CITIES, 'мо'))).toEqual(['Монреаль', 'Москва']);
  });

  test('ограничивает число подсказок', () => {
    const many = Array.from({ length: SUGGESTION_LIMIT + 4 }, (_, index) =>
      city(`city-${index}`, `Город${index}`, `City${index}`),
    );

    expect(searchCities(many, 'го')).toHaveLength(SUGGESTION_LIMIT);
  });

  test('возвращает пустой список для пустого набора городов', () => {
    expect(searchCities([], 'мо')).toEqual([]);
  });

  test('игнорирует запрос без слов', () => {
    // Дефисы и апострофы — разделители, поэтому слов в запросе нет.
    expect(searchCities(CITIES, "-'")).toEqual([]);
  });
});
