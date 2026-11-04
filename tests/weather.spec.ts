import { test, expect } from '@playwright/test';

test('weather data displays correctly for selected cities', async ({ page }) => {
  await page.goto('/');
  // Wait until the city select is visible
  const select = page.locator('select');
  await expect(select).toBeVisible();

  // Get list of options (excluding placeholder)
  const options = await select.locator('option').allTextContents();
  // Pick the first real city
  if (options.length > 1) {
    const city = options[1];

    // Set up response interception before selecting
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/api/weather') && resp.status() === 200),
      select.selectOption({ label: city }),
    ]);

    // Wait for the weather info to appear by looking for 'Город:' text with city name
    await expect(page.locator(`text=Город: ${city}`)).toBeVisible({ timeout: 10000 });
  }
});
