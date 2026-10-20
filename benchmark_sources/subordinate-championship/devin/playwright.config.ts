import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:8785",
    locale: "ja-JP",
  },
  webServer: {
    command: "npx wrangler dev --port 8785 --inspector-port 0",
    url: "http://localhost:8785",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
