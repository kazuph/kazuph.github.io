import { defineConfig, devices } from "@playwright/test";

/**
 * ブラウザE2E (Playwright)。
 *
 * アプリ本体は 8787 だが、テストでは衝突を避けるため 8899 を使う
 * （課題の「テスト内で一時的に別ポートを使うのは可」に従う）。
 * webServer が wrangler dev を起動し、時間設定を短縮して流れを速くする。
 */
const PORT = Number(process.env.E2E_PORT || 8899);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: ".artifacts/playwright-report" }]],
  outputDir: ".artifacts/test-results",
  use: {
    baseURL: BASE_URL,
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `node scripts/dev.mjs --port ${PORT} --var QUESTION_MS:6000 --var ANSWER_MS:5000 --var REVEAL_MS:1000`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
