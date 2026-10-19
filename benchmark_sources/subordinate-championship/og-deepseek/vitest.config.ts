import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.toml" },
      miniflare: {
        bindings: {
          ROOM_QUESTION_MS: "1500",
          ROOM_ANSWER_MS: "500",
          ROOM_REVEAL_MS: "250",
        },
      },
    }),
  ],
  test: {
    include: ["tests/unit/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
