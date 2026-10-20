import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 240_000,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8793",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8793",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
