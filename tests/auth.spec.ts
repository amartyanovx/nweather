import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const AUTH_STORAGE_KEY = 'nweather.auth';

const loginInput = (page: Page) => page.getByLabel('Логин');
const passwordInput = (page: Page) => page.getByLabel('Пароль');
const submitButton = (page: Page) => page.getByRole('button', { name: 'Войти' });
// Next.js держит на странице свой role="alert" (route announcer), поэтому ошибку ищем по тексту.
const errorAlert = (page: Page) =>
  page.getByRole('alert').filter({ hasText: 'Неверный логин или пароль' });

const submitCredentials = async (page: Page, login: string, password: string) => {
  await loginInput(page).fill(login);
  await passwordInput(page).fill(password);
  await submitButton(page).click();
};

test.describe('Экран входа', () => {
  test('после трёх ошибок блокирует вход до перезагрузки страницы', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();

    await submitCredentials(page, 'admin', 'wrong');
    await expect(errorAlert(page)).toHaveText('Неверный логин или пароль. Осталось попыток: 2.');

    await submitCredentials(page, 'admin', 'wrong');
    await expect(errorAlert(page)).toHaveText('Неверный логин или пароль. Осталось попыток: 1.');

    await submitCredentials(page, 'admin', 'wrong');
    await expect(page.getByRole('heading', { name: 'Доступ запрещён' })).toBeVisible();
    await expect(submitButton(page)).toHaveCount(0);

    await page.reload();

    // Счётчик попыток не сохраняется: после перезагрузки снова доступна форма входа.
    await expect(page.getByRole('heading', { name: 'Вход' })).toBeVisible();
    await expect(page.getByText('Доступ запрещён')).toHaveCount(0);
  });

  test('верные данные открывают приложение и сохраняются в sessionStorage', async ({ page }) => {
    await page.goto('/');
    await submitCredentials(page, 'admin', '123456');

    await expect(page.getByRole('combobox', { name: 'Город' })).toBeVisible();
    expect(await page.evaluate((key) => window.sessionStorage.getItem(key), AUTH_STORAGE_KEY)).toBe(
      'true',
    );

    await page.reload();

    // В той же вкладке вход сохраняется, форма повторно не показывается.
    await expect(page.getByRole('combobox', { name: 'Город' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Вход' })).toHaveCount(0);
  });
});
