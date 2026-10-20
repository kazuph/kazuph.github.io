import { defineConfig } from "@playwright/test";

const PORT = 18878;
export const TEST_PORT = PORT;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 420_000,
  expect: { timeout: 30_000 },
  // 実時間の締め切りを使う長時間テストのため、負荷競合を避けて直列実行する
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `npx wrangler dev --port ${PORT} --inspector-port 0`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
