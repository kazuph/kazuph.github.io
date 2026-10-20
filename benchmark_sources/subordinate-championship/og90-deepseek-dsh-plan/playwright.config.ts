import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 8787);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "off",
  },
  webServer: {
    command: `npx wrangler dev --ip 127.0.0.1 --port ${port} --inspector-port 0 --log-level warn`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
