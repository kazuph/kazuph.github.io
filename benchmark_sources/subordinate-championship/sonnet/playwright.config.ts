import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freePort } from "./tests/free-port";

// ブラウザE2E用に、開発サーバーとは空きポートで時間を短縮した wrangler dev を一時的に起動する。
const persist = mkdtempSync(join(tmpdir(), "quiz-e2e-"));
// ワーカープロセスも設定を読み直すので、決めたポートは環境変数で引き継ぐ。
process.env.E2E_PORT ??= String(await freePort());
export const E2E_PORT = Number(process.env.E2E_PORT);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${E2E_PORT}`, locale: "ja-JP" },
  webServer: {
    command: `npx wrangler dev --port ${E2E_PORT} --inspector-port 0 --persist-to ${persist} --var QUESTION_MS:90000 --var ANSWER_MS:60000 --var REVEAL_MS:1800 --var LOBBY_GRACE_MS:4000`,
    url: `http://localhost:${E2E_PORT}`,
    env: { WRANGLER_SEND_METRICS: "false", CI: "1" },
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
