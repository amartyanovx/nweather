import { test, expect } from '@playwright/test';

test('иконки приложения подключены в head и отдаются сервером', async ({ request }) => {
  const html = await (await request.get('/')).text();

  expect(html).toContain('rel="icon"');
  expect(html).toContain('type="image/x-icon"');
  expect(html).toContain('type="image/svg+xml"');

  const ico = await request.get('/favicon.ico');
  expect(ico.status()).toBe(200);
  expect(ico.headers()['content-type']).toBe('image/x-icon');
  expect((await ico.body()).byteLength).toBeGreaterThan(1000);

  const svg = await request.get('/icon.svg');
  expect(svg.status()).toBe(200);
  expect(svg.headers()['content-type']).toBe('image/svg+xml');
  expect(await svg.text()).toContain('<svg');
});
