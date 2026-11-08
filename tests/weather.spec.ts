import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

/** Значение метрики — число или прочерк; конкретные числа не проверяем, они генерируются. */
const VALUE_PATTERN = /(-?\d+(\.\d+)?|—)/;
const TAB_LABEL_PATTERN = /^(Пн|Вт|Ср|Чт|Пт|Сб|Вс) \d{2}\.\d{2}$/;

const metric = (page: Page, label: string): Locator => page.locator('p', { hasText: label });

const expectFormattedValue = async (locator: Locator, label: string, unit: string) => {
  await expect(locator).toHaveText(new RegExp(`^${label}: .*${unit}$`));
  const text = (await locator.textContent()) ?? '';
  expect(text.replace(`${label}: `, '').replace(unit, '')).toMatch(VALUE_PATTERN);
};

const combobox = (page: Page): Locator => page.getByRole('combobox', { name: 'Город' });

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

test('выбор города через подсказки показывает недельный прогноз', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Мос', 'Москва');

  await expect(page.getByText('Город: Москва')).toBeVisible({ timeout: 15000 });

  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(7);
  for (const label of await tabs.allTextContents()) {
    expect(label).toMatch(TAB_LABEL_PATTERN);
  }

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

test('переключение дня меняет заголовок карточки', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Мос', 'Москва');

  const cardTitle = page.getByRole('heading', { level: 3 });
  await expect(cardTitle).toBeVisible({ timeout: 15000 });

  const tabs = page.getByRole('tab');
  const labels = await tabs.allTextContents();
  const targetIndex = 0;
  const datePart = labels[targetIndex].split(' ')[1];

  // force: в фоновой странице (параллельные воркеры) Playwright не дожидается «стабильности» бокса,
  // потому что rAF троттлится; видимость и результат клика проверяются отдельно.
  await tabs.nth(targetIndex).click({ force: true });

  await expect(cardTitle).toContainText(datePart);
  await expect(tabs.nth(targetIndex)).toHaveAttribute('aria-selected', 'true');
});

test('крестик очищает поле и скрывает прогноз', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Мос', 'Москва');
  await expect(page.getByRole('tab')).toHaveCount(7);

  await page.getByRole('button', { name: 'Очистить город' }).click();

  await expect(combobox(page)).toHaveValue('');
  await expect(page.getByRole('tab')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(0);
});

test('поиск по английскому названию находит город', async ({ page }) => {
  await page.goto('/');
  await chooseCity(page, 'Mos', 'Москва');

  await expect(page.getByText('Город: Москва')).toBeVisible({ timeout: 15000 });
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
