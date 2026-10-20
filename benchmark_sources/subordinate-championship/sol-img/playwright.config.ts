import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', timeout: 150_000, workers: 1, retries: 0,
  reporter: [['list'], ['json', {outputFile: '.artifacts/e2e-results.json'}]],
  use: { baseURL: 'http://localhost:8784', browserName:'chromium', trace:'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {} },
  webServer: { command:'npm run dev', url:'http://localhost:8784', reuseExistingServer:true, timeout:60_000 }
});
