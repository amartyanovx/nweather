import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { authenticate } from './auth';

/** Значение метрики — число или прочерк; конкретные числа не проверяем, они генерируются. */
const VALUE_PATTERN = /(-?\d+(\.\d+)?|—)/;
const PLATE_DATE_PATTERN = /(Пн|Вт|Ср|Чт|Пт|Сб|Вс) \d{2}\.\d{2}/;

// Скрытые маршруты Activity остаются в DOM, поэтому все проверки скоупятся видимой областью,
// а не документом: иначе локаторы совпадут с display:none копией.
const dayCard = (page: Page) => page.getByRole('region', { name: 'Погода на день' });
const metric = (page: Page, label: string): Locator =>
  dayCard(page).locator('p', { hasText: label });
const combobox = (page: Page): Locator => page.getByRole('combobox', { name: 'Город' });
const cityLink = (page: Page, name: string): Locator => page.getByRole('link', { name });
const backLink = (page: Page): Locator => page.getByRole('link', { name: /Назад/ });
const week = (page: Page): Locator => page.getByRole('list', { name: 'Прогноз на неделю' });

const expectFormattedValue = async (locator: Locator, label: string, unit: string) => {
  await expect(locator).toHaveText(new RegExp(`^${label}: .*${unit}$`));
  const text = (await locator.textContent()) ?? '';
  expect(text.replace(`${label}: `, '').replace(unit, '')).toMatch(VALUE_PATTERN);
};

test.beforeEach(async ({ page }) => {
  await authenticate(page);
});

/** Ввод запроса, ожидание подсказки и выбор города кликом по ней. */
const chooseCity = async (page: Page, query: string, cityName: string) => {
  const input = combobox(page);
  await expect(input).toBeVisible();
  await input.fill(query);

  const option = page.getByRole('option', { name: new RegExp(cityName) });
  await expect(option).toBeVisible();

  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/forecast') && resp.status() === 200),
    option.click(),
  ]);
};

test('выбор города показывает ссылку на страницу города и прогноз на сегодня', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Мос', 'Москва');

  await expect(cityLink(page, 'Москва')).toHaveAttribute('href', '/city/moscow');
  await expect(dayCard(page)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('heading', { level: 3 })).toContainText('Сегодня');
  await expect(page.getByRole('list', { name: 'Прогноз на неделю' })).toHaveCount(0);

  await expectFormattedValue(
    metric(page, 'Максимальная температура'),
    'Максимальная температура',
    '°C',
  );
  await expectFormattedValue(
    metric(page, 'Минимальная температура'),
    'Минимальная температура',
    '°C',
  );
  await expectFormattedValue(metric(page, 'Осадки'), 'Осадки', 'мм');
  await expectFormattedValue(metric(page, 'Давление'), 'Давление', 'гПа');
  await expectFormattedValue(metric(page, 'Влажность'), 'Влажность', '%');
  await expectFormattedValue(metric(page, 'Ветер'), 'Ветер', 'м/с');
  await expect(metric(page, 'Время суток')).toHaveText(/^Время суток: (День|Ночь)$/);
});

test('страница города показывает данные из базы и прогноз на семь дней', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Мос', 'Москва');
  await cityLink(page, 'Москва').click();

  await expect(page).toHaveURL(/\/city\/moscow$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Москва' })).toBeVisible();
  await expect(page.getByText('Россия')).toBeVisible();
  await expect(page.getByText('Moscow', { exact: true })).toBeVisible();
  await expect(page.getByText('55.7558, 37.6173')).toBeVisible();
  await expect(page.getByText('Europe/Moscow')).toBeVisible();

  const plates = week(page).getByRole('listitem');
  await expect(plates).toHaveCount(7);
  for (const text of await plates.allTextContents()) {
    expect(text).toMatch(PLATE_DATE_PATTERN);
    expect(text).toContain('Ветер:');
  }
  await expect(plates.filter({ hasText: 'Сегодня' })).toHaveCount(1);
});

test('кнопка назад доступна, пока прогноз города загружается', async ({ page }) => {
  await page.route('**/api/forecast**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });

  await page.goto('/city/moscow');

  await expect(backLink(page)).toBeVisible();
  await expect(page.getByRole('status', { name: 'Загрузка прогноза' })).toBeVisible();
  await expect(week(page).getByRole('listitem')).toHaveCount(7, { timeout: 15000 });
});

test('кнопка назад ведёт на экран поиска при прямом открытии города', async ({ page }) => {
  await page.goto('/city/moscow');
  await expect(week(page).getByRole('listitem')).toHaveCount(7, { timeout: 15000 });

  await backLink(page).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(combobox(page)).toBeVisible();
  await expect(combobox(page)).toHaveValue('');
});

test('назад всегда возвращает на экран поиска', async ({ page }) => {
  await page.goto('/');

  // Activity держит не больше трёх маршрутов, поэтому выбор города после нескольких
  // посещений не гарантирован — проверяется только возврат на экран поиска.
  const visits = [
    ['Мос', 'Москва'],
    ['Санкт', 'Санкт-Петербург'],
    ['Каз', 'Казань'],
  ] as const;

  for (const [query, name] of visits) {
    await chooseCity(page, query, name);
    await cityLink(page, name).click();
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await backLink(page).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(combobox(page)).toBeVisible();
  }
});

test('крестик очищает поле и скрывает прогноз', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Мос', 'Москва');
  await expect(cityLink(page, 'Москва')).toBeVisible();

  await page.getByRole('button', { name: 'Очистить город' }).click();

  await expect(combobox(page)).toHaveValue('');
  await expect(cityLink(page, 'Москва')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(0);
});

test('поиск по английскому названию находит город', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Mos', 'Москва');

  await expect(cityLink(page, 'Москва')).toBeVisible({ timeout: 15000 });
  await expect(dayCard(page)).toBeVisible();
});

test('при отсутствии совпадений показывает «Ничего не найдено»', async ({ page }) => {
  await page.goto('/');

  await combobox(page).fill('ццц');

  await expect(page.getByText('Ничего не найдено')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(0);
});

test('один символ не открывает список подсказок', async ({ page }) => {
  await page.goto('/');

  await combobox(page).fill('М');
  await page.waitForTimeout(300);

  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(page.getByRole('option')).toHaveCount(0);
});
