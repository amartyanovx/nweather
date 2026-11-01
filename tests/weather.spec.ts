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
      await select.selectOption({ label: city });

      // Wait for the API call to complete for the selected city
      await page.waitForResponse(`http://localhost:3000/api/weather?city=${encodeURIComponent(city)}`);
      const weatherInfo = page.locator('.weatherInfo');
      await expect(weatherInfo).toBeVisible();
      // Simple check that the city name appears in the info
      await expect(weatherInfo).toContainText(city);
  }
});