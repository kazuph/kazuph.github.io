import { defineConfig } from "vitest/config";

// 単体テストは Node 上で純粋関数（src/game.ts）を確かめる。
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
