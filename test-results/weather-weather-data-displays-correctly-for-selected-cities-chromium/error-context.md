# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: weather.spec.ts >> weather data displays correctly for selected cities
- Location: tests\weather.spec.ts:3:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.weatherInfo')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('.weatherInfo') with timeout 5000ms
  - waiting for locator('.weatherInfo')

```

```yaml
- heading "Погода" [level=1]
- combobox:
  - option "Выберите город"
  - option "Лунный Берег" [selected]
  - option "Водяной Пик"
  - option "Звёздный Край"
  - option "Туманное Утро"
  - option "Кристальный Хребет"
  - option "Серебряный Путь"
  - option "Бурный Город"
- paragraph: "Город: Лунный Берег"
- paragraph: "Максимальная температура: 22°C"
- paragraph: "Минимальная температура: 12°C"
- paragraph: "Осадки: 5 мм"
- paragraph: "Давление: 1012 гПа"
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('weather data displays correctly for selected cities', async ({ page }) => {
  4  |   await page.goto('/');
  5  |   // Wait until the city select is visible
  6  |   const select = page.locator('select');
  7  |   await expect(select).toBeVisible();
  8  | 
  9  |   // Get list of options (excluding placeholder)
  10 |   const options = await select.locator('option').allTextContents();
  11 |   // Pick the first real city
  12 |   if (options.length > 1) {
  13 |     const city = options[1];
  14 |     await select.selectOption({ label: city });
  15 | 
  16 |     // Wait for loading indicator to disappear and weather info to appear
  17 |     const weatherInfo = page.locator('.weatherInfo');
> 18 |     await expect(weatherInfo).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  19 |     // Simple check that the city name appears in the info
  20 |     await expect(weatherInfo).toContainText(city);
  21 |   }
  22 | });
```