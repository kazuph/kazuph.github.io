import { defineConfig } from "vitest/config";
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";

/**
 * 結合テスト用: wrangler.jsonc と同じ構成で workerd を起動する。
 * タイマー関連の環境変数だけ短く上書きし、20秒/10秒の遷移も
 * 実ロジックのまま短時間で検証できるようにしている。
 */
export default defineConfig({
	plugins: [
		cloudflareTest({
			main: "./src/index.ts",
			wrangler: { configPath: "./wrangler.jsonc", environment: "test" },
		}),
	],
	test: {
		testTimeout: 30000,
		exclude: [...(await import("vitest/config")).defaultExclude ?? [], "e2e/**"],
	},
});
