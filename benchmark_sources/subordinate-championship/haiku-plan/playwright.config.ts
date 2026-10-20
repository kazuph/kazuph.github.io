import { defineConfig } from "@playwright/test";

// wrangler dev は 8792 番だけで起動する（ほかのエージェントのポートと衝突させない）
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 150_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8792",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx wrangler dev --port 8792 --inspector-port 0",
    url: "http://localhost:8792/",
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
