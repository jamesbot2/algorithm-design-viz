import { defineConfig, devices } from '@playwright/test'
import fs from 'fs'

const PORT = 5173
const BASE = `http://127.0.0.1:${PORT}/algorithm-design-viz/`

const chromePath =
  process.env.PLAYWRIGHT_CHROME_PATH ||
  (fs.existsSync('/usr/bin/google-chrome')
    ? '/usr/bin/google-chrome'
    : fs.existsSync('/usr/bin/google-chrome-stable')
      ? '/usr/bin/google-chrome-stable'
      : undefined)

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['json', { outputFile: 'docs/traces/v4/playwright-report.json' }]],
  use: {
    baseURL: BASE,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    ...(chromePath
      ? { launchOptions: { executablePath: chromePath } }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx vite --host 127.0.0.1 --port ${PORT}`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
