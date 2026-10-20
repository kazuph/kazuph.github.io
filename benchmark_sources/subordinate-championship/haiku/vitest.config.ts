import { defineConfig } from 'vitest/config';

// 単体テスト：ゲームのルールを純粋関数で確かめる（サーバー不要）
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/**/*.integration.test.ts'],
    environment: 'node',
  },
});
