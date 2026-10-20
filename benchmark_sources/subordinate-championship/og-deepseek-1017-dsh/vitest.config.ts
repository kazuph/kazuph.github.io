import { defineConfig } from "vitest/config";

/**
 * 純粋ロジック (src/game.ts, src/questions.ts) のユニットテスト。
 * Worker ランタイムは不要なので通常の Node 環境で実行する。
 */
export default defineConfig({
  test: {
    include: ["test/unit/**/*.test.ts"],
    environment: "node",
  },
});
