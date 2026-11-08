import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

/** Значение метрики — число или прочерк; конкретные числа не проверяем, они генерируются. */
const VALUE_PATTERN = /(-?\d+(\.\d+)?|—)/;

const metric = (page: Page, label: string): Locator => page.locator('p', { hasText: label });

const expectFormattedValue = async (locator: Locator, label: string, unit: string) => {
  await expect(locator).toHaveText(new RegExp(`^${label}: .*${unit}$`));
  const text = (await locator.textContent()) ?? '';
  expect(text.replace(`${label}: `, '').replace(unit, '')).toMatch(VALUE_PATTERN);
};

test('выбор города показывает недельный прогноз в корректном формате', async ({ page }) => {
  await page.goto('/');

  const select = page.locator('select');
  await expect(select).toBeVisible();

  const options = await select.locator('option').allTextContents();
  expect(options.length).toBeGreaterThan(1);

  const city = options[1];
  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/weather') && resp.status() === 200),
    select.selectOption({ label: city }),
  ]);

  await expect(page.locator(`text=Город: ${city}`)).toBeVisible({ timeout: 15000 });

  const tabs = page.locator('button');
  await expect(tabs).toHaveCount(7);
  expect(await tabs.allTextContents()).toEqual(DAYS);

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
});

test('переключение дня меняет карточку прогноза', async ({ page }) => {
  await page.goto('/');

  const select = page.locator('select');
  await expect(select).toBeVisible();
  const options = await select.locator('option').allTextContents();
  const city = options[1];

  await Promise.all([
    page.waitForResponse((resp) => resp.url().includes('/api/weather') && resp.status() === 200),
    select.selectOption({ label: city }),
  ]);

  const cardTitle = page.locator('h3');
  await expect(cardTitle).toBeVisible({ timeout: 15000 });

  const fridayTab = page.getByRole('button', { name: 'Пятница', exact: true });
  await expect(fridayTab).toBeVisible();
  // force: в фоновой странице (параллельные воркеры) Playwright не дожидается «стабильности» бокса,
  // потому что rAF троттлится; видимость и результат клика проверяются отдельно.
  await fridayTab.click({ force: true });

  await expect(cardTitle).toHaveText('Пятница');
  await expectFormattedValue(metric(page, 'Давление'), 'Давление', 'гПа');
});
