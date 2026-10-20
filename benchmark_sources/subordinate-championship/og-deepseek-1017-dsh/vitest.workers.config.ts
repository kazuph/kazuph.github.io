import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * Durable Object を含む結合テスト。
 * 実際の Workers ランタイム (workerd / Miniflare) 上で WebSocket を張り、
 * 「同時押しの裁定」「トークン復帰」「定員」「4人対戦」を確かめる。
 *
 * 時間設定は wrangler.test.jsonc で短縮している (QUESTION_MS=900 など)。
 */
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: {
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
