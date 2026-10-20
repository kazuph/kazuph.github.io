import { defineConfig } from "vitest/config";

/**
 * 結合テスト用。実際に `wrangler dev`（Cloudflare 公式ローカル実行）を
 * テスト内だけ別ポートで起動し、本物の Workers ランタイム + Durable Objects +
 * WebSocket に対して 4 クライアントで接続して検証する。
 *
 * 実行: npm run test:integration
 */
export default defineConfig({
  test: {
    name: "integration",
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
