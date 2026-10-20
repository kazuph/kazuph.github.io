import { defineConfig } from "@playwright/test";

// E2E は開発用の 8786 とは別に、テスト専用の wrangler dev を一時的に立てて行う。
// 保存先も分けるので、開発中の部屋とは混ざらない。
const PORT = 18796;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: ".artifacts/playwright-results",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx wrangler dev --port ${PORT} --inspector-port 18797 --persist-to .wrangler/e2e-state --show-interactive-dev-session=false`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "ignore",
  },
});
