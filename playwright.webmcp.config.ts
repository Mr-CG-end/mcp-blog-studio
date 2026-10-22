import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'webmcp.e2e.spec.ts',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  outputDir: '.local/webmcp-acceptance/results',
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${process.env.E2E_PORT || '3100'}`,
    channel: 'chrome',
    headless: true,
    launchOptions: { args: ['--enable-experimental-web-platform-features', '--enable-features=WebMCP'] },
    // Bounded Chrome CDP evidence capture is handled explicitly by this suite.
    screenshot: 'off',
    // Login requests contain ephemeral fixture credentials; keep traces off.
    trace: 'off',
  },
})
