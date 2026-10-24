import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E & UX Performance Testing Configuration.
 * Compatible with any Next.js / React / web application.
 */
export default defineConfig({
  testDir: './e2e/specs',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false, // Runs sequential by default to support multi-role state transitions
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Ensures clean database and assignment sequencing
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: 'Mobile (390px iPhone)',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'Desktop (1280px)',
      use: {
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_TEST_BASE_URL
    ? undefined
    : {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})
