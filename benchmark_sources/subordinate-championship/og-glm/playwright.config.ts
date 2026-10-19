import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	timeout: 240_000,
	expect: { timeout: 15_000 },
	webServer: {
		command: "npx wrangler dev --port 8787 --inspector-port 19229",
		port: 8787,
		reuseExistingServer: true,
		timeout: 180_000,
	},
});
