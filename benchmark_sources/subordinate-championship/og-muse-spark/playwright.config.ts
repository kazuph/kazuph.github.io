import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "test",
  testMatch: ["e2e.spec.ts"],
  timeout: 240_000,
  workers: 1,
  fullyParallel: false,
  use: { baseURL: "http://localhost:18887" },
  webServer: {
    command: "npx wrangler dev --port 18887",
    url: "http://localhost:18887/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
