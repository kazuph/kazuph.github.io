import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["test/**/*.spec.ts"],
    poolOptions: {
      workers: {
        // Rooms get their own DO namespace entries per test, so per-test
        // storage isolation is unnecessary (and pending DO timers/alarms
        // would otherwise race with the storage teardown).
        isolatedStorage: false,
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          // Short timers so time-based rules can be exercised quickly.
          bindings: {
            QUESTION_MS: "1500",
            ANSWER_MS: "700",
            REVEAL_MS: "500",
          },
        },
      },
    },
  },
});
