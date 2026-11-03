import { defineConfig } from "@playwright/test";

// wrangler dev を Playwright が起動して（または既存があれば再利用して）テストする。
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false, // 部屋ごとに独立しているが、実時間に関するテストは1並列にする
  workers: 1,
  timeout: 180_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:8787",
  },
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: "http://localhost:8787/api/health",
    timeout: 90_000,
    reuseExistingServer: true,
    env: {
      WRANGLER_SEND_METRICS: "false",
      CI: "true",
    },
  },
});
