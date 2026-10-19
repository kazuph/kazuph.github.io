import { defineConfig, devices } from '@playwright/test';

const PORT = 8787;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // テストごとに新しい部屋を作るので、前回のローカル状態は消してから起動する。
    command: `rm -rf .wrangler/state && npx wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
