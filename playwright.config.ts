import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:3000',
    // Use headless by default.
    viewport: { width: 1280, height: 720 },
  },
    projects: [
      {
        name: 'chromium',
        use: { ...devices['Desktop Chromium'] },
      },
    ],
});