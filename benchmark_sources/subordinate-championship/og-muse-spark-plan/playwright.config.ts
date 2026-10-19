import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 300_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:18787" },
  webServer: {
    command: "npx wrangler dev --port 18787 --inspector-port 0",
    url: "http://127.0.0.1:18787",
    reuseExistingServer: true,
    timeout: 90_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
