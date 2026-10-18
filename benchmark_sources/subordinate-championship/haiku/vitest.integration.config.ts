import { defineConfig } from 'vitest/config';

// 結合テスト：テスト専用の wrangler dev（8790）に対して、WebSocket で本物の挙動を確かめる
export default defineConfig({
  test: {
    include: ['tests/**/*.integration.test.ts'],
    environment: 'node',
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
