import { defineConfig } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dataDir = mkdtempSync(join(tmpdir(), 'alexcart-e2e-'))
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: 'http://127.0.0.1:8788/AlexCart/',
    viewport: { width: 390, height: 844 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run server',
    url: 'http://127.0.0.1:8788/api/health',
    reuseExistingServer: false,
    env: { PORT: '8788', ALEXCART_DATA_DIR: dataDir, ALLOWED_ORIGINS: 'http://127.0.0.1:8788' },
    timeout: 15000,
  },
})
