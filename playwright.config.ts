import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // A suíte usa rotas lazy, imagens e dois viewports. Dois workers mantêm os
  // tempos determinísticos no CI sem criar falsos negativos por saturação.
  workers: 2,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'VITE_SITE_SUPABASE_URL=https://xlzmclcjdncjfdrjxclt.supabase.co VITE_SITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_playwright_test VITE_CUSTOMER_ADJUSTMENTS_ENABLED=true VITE_QUOTE_DECISION_GROUPS_ENABLED=true VITE_PERSISTENT_SHARED_SELECTIONS_ENABLED=true npm run build && npm run preview -- --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
