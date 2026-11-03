import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', workers: 1, fullyParallel: false, retries: 0,
  timeout: 120_000, expect: {timeout: 10_000},
  reporter: [['list'], ['json', {outputFile: '.artifacts/e2e-results.json'}]],
  use: { baseURL: 'http://localhost:8783', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:8783', reuseExistingServer: true, timeout: 60_000 },
});
