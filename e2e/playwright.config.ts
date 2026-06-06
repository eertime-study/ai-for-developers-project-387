import { defineConfig, devices } from '@playwright/test'

/**
 * Фиксированный момент времени для бэкенда: понедельник, 1 июня 2026, 09:00 UTC
 * (= 12:00 в Europe/Moscow владельца). При нём 14-дневная сетка слотов содержит
 * available-слоты в первой колонке — тест опирается на детерминированную раскладку.
 */
const FIXED_CLOCK_ISO = '2026-06-01T09:00:00Z'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  /**
   * Поднимаем оба сервиса автоматически.
   * - backend: `reuseExistingServer: false` — он держит in-memory; иначе остатки
   *   прошлого прогона (уже забронированный слот) дают флапы. Каждый прогон — чистый.
   * - frontend preview stateless, можно переиспользовать локально.
   */
  webServer: [
    {
      command: 'npm start',
      cwd: '../backend',
      url: 'http://localhost:3000/owner',
      env: {
        PORT: '3000',
        FIXED_CLOCK_ISO,
      },
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
    },
    {
      command: 'npm run preview -- --port 4173 --strictPort',
      cwd: '../frontend',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000,
    },
  ],
})
