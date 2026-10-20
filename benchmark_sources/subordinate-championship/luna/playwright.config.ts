import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:8787",
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:8787",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  },
  outputDir: "test-results"
});
