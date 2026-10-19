import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: "http://127.0.0.1:8787/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
