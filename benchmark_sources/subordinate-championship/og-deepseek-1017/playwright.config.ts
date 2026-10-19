import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

// この VM ではブラウザが /ms-playwright に同梱されている。
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/ms-playwright")) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/ms-playwright";
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 40_000,
  expect: { timeout: 8_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:8787",
    trace: "retain-on-failure",
    launchOptions: { args: ["--no-sandbox"] },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx wrangler dev --port 8787",
    url: "http://127.0.0.1:8787/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
