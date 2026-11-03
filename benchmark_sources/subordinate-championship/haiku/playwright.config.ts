import { defineConfig } from '@playwright/test';

// E2E：テスト専用の wrangler dev（8790）に対して、実ブラウザで遊ぶ。PC幅とスマホ幅の2種類。
export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 240_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8790',
    trace: 'off',
  },
  webServer: {
    command:
      'node_modules/.bin/wrangler dev --port 8790 --inspector-port 9790 --ip 127.0.0.1 --persist-to .wrangler/test-state',
    url: 'http://127.0.0.1:8790',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'pc',
      use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
    },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    },
  ],
});
