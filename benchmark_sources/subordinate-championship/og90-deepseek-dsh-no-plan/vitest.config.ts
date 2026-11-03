import { defineConfig } from "vitest/config";

/**
 * ユニットテスト（純粋なゲームロジック）用。
 * 実行: npm run test:unit
 */
export default defineConfig({
  test: {
    name: "unit",
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
