import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', channel: 'chrome', headless: true, viewport: { width: 1440, height: 960 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] }, screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/serve.mjs', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 20000 },
})
