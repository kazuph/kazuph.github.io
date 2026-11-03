import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 単体テストだけを走らせる（tests/e2e は Playwright が担当）
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
  },
});
