import { defineConfig, devices } from '@playwright/test';

/**
 * E2E テスト（ブラウザ実機）
 *
 * - テスト用の開発サーバーは 8790 番で一時的に起動する（常駐するのは 8787）
 * - PC 幅とスマホ幅の両方で実行する
 */
const PORT = Number(process.env.E2E_PORT || 8790);

export default defineConfig({
  testDir: '.',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: `npx wrangler dev --port ${PORT} --inspector-port ${PORT + 100}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'pc',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
  ],
});
