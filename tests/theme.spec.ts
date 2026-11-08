import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const LIGHT_BG = 'rgb(183, 205, 223)';
const MONOKAI_BG = 'rgb(39, 40, 34)';

const toggle = (page: Page) => page.getByRole('switch', { name: 'Тёмная тема' });
const root = (page: Page) => page.locator('html');

test('переключатель в хедере меняет светлую тему на Monokai и запоминает выбор', async ({
  page,
}) => {
  await page.goto('/');

  const switcher = page.getByRole('banner').getByRole('switch', { name: 'Тёмная тема' });
  await expect(switcher).toBeVisible();
  await expect(switcher).not.toBeChecked();
  await expect(root(page)).not.toHaveAttribute('data-theme', 'dark');
  await expect(root(page)).toHaveCSS('background-color', LIGHT_BG);

  await switcher.click({ force: true });

  await expect(root(page)).toHaveAttribute('data-theme', 'dark');
  await expect(switcher).toBeChecked();
  await expect(root(page)).toHaveCSS('background-color', MONOKAI_BG);

  await page.reload();

  // Инлайн-скрипт применяет сохранённую тему до отрисовки, поэтому слайдер сразу включён.
  await expect(toggle(page)).toBeChecked();
  await expect(root(page)).toHaveCSS('background-color', MONOKAI_BG);

  await toggle(page).click({ force: true });

  await expect(root(page)).not.toHaveAttribute('data-theme', 'dark');
  await expect(root(page)).toHaveCSS('background-color', LIGHT_BG);
});
