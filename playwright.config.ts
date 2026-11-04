import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Only run Playwright spec files, exclude Jest tests
  testMatch: /\.spec\.ts$/,
  // Automatically start the Next.js dev server before E2E tests
  webServer: {
    command: 'npm run build && npm start',
    port: 3000,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chromium'] },
    },
  ],
});
