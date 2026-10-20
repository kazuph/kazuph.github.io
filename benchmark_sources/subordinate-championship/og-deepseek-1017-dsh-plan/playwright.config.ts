import { defineConfig, devices } from "@playwright/test";

/**
 * ブラウザの E2E テスト。`wrangler dev` を localhost:8787 で起動してから
 * 本物のブラウザで操作する。テストは実時間（20秒 / 10秒 / 3秒）をそのまま使う。
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180_000,
  expect: { timeout: 20_000 },
  // 重い通しプレイのテストどうしが同時に走ってCPUを取り合わないよう、
  // 同じファイルのテストは順番に実行する（ファイル単位では並列）。
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8787",
    headless: true,
    actionTimeout: 10_000,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx wrangler dev --ip 127.0.0.1 --port 8787",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
