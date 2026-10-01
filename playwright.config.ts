import { defineConfig, devices } from '@playwright/test'
const port = process.env.E2E_PORT || '3000'
const baseURL = `http://127.0.0.1:${port}`
export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port ${port}`,
    reuseExistingServer: true,
    url: baseURL,
  },
})
