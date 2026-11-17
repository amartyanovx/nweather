import type { Page } from '@playwright/test';

export const AUTH_STORAGE_KEY = 'nweather.auth';

/**
 * Вход до первой отрисовки приложения: sessionStorage живёт в пределах вкладки,
 * поэтому init script подставляет сессию на каждой навигации теста.
 */
export const authenticate = async (page: Page) => {
  await page.addInitScript((key: string) => {
    window.sessionStorage.setItem(key, 'true');
  }, AUTH_STORAGE_KEY);
};
