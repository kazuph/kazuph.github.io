// Cloudflare Workers ランタイム内で動く結合テスト（@cloudflare/vitest-pool-workers）
import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

export default defineConfig({
  plugins: [
    cloudflareTest({
      singleWorker: true,
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    include: ["test/integration/**/*.test.ts"],
    testTimeout: 30_000,
  },
});
