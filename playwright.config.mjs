import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:4173',
    timezoneId: 'America/Vancouver',
    serviceWorkers: 'block',
  },
  projects: [
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node scripts/serve.mjs',
    env: { PORT: '4173' },
    url: 'http://localhost:4173/index.html',
    reuseExistingServer: !process.env.CI,
  },
});
