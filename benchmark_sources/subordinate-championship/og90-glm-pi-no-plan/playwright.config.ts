import { defineConfig } from "@playwright/test";

// ブラウザE2Eテスト。wrangler dev を playwright が起動・破棄する（常駐しない）。
export default defineConfig({
  testDir: "test/e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8787",
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: "npx wrangler dev --port 8787 --inspector-port 17929",
    url: "http://localhost:8787/api/health",
    reuseExistingServer: true,
    timeout: 90_000,
  },
});
