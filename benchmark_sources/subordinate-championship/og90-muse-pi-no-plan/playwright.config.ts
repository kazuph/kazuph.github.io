import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  timeout: 240_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://localhost:8787",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx wrangler dev --port 8787 --ip 127.0.0.1",
    url: "http://localhost:8787/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
