/**
 * @jest-environment @stryker-mutator/jest-runner/jest-env/node
 */
import cities from '../../src/data/cities.json';

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

describe('фикстура городов', () => {
  test('содержит ровно 100 городов', () => {
    expect(cities).toHaveLength(100);
  });

  test('не повторяет slug и названия', () => {
    const slugs = new Set(cities.map((city) => city.slug));
    const names = new Set(cities.map((city) => city.name));

    expect(slugs.size).toBe(cities.length);
    expect(names.size).toBe(cities.length);
  });

  test('использует slug в kebab-case и заполненные названия', () => {
    for (const city of cities) {
      expect(city.slug).toMatch(SLUG_PATTERN);
      expect(city.name.trim()).not.toBe('');
      expect(city.nameEn.trim()).not.toBe('');
      expect(city.country.trim()).not.toBe('');
    }
  });

  test('указывает только известные IANA-таймзоны', () => {
    const supported = new Set(Intl.supportedValuesOf('timeZone'));

    for (const city of cities) {
      expect(supported.has(city.timezone)).toBe(true);
    }
  });

  test('держит координаты в допустимых диапазонах', () => {
    for (const city of cities) {
      expect(city.lat).toBeGreaterThanOrEqual(-90);
      expect(city.lat).toBeLessThanOrEqual(90);
      expect(city.lon).toBeGreaterThanOrEqual(-180);
      expect(city.lon).toBeLessThanOrEqual(180);
    }
  });
});
