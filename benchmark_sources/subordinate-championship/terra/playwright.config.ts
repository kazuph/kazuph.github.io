import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests/e2e',workers:1,timeout:180000,use:{baseURL:'http://localhost:8788',channel:'chrome'},webServer:{command:'npm run dev',url:'http://localhost:8788',reuseExistingServer:true,timeout:60000}});
