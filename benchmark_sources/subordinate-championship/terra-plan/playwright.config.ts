import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'./tests/e2e', timeout: 240_000, workers: 1,
  use: { baseURL:'http://localhost:8795', headless:true, channel:'chrome' },
  webServer: { command:'npm run dev', url:'http://localhost:8795', reuseExistingServer:false, timeout:120_000 } });
