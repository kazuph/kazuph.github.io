import { chromium, expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * ブラウザ E2E: 4人が実際にブラウザから参加し、10問を最後までプレイする。
 * 各場面のスクリーンショットを .artifacts/screens/<label>/ に保存する。
 * (npm run test:e2e で実行)
 */

const __dirname2 = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dirname2, "..", ".artifacts", "screens");
const NAMES = ["ホスト", "さくら", "たろう", "みかん"];

function code4() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	return [...crypto.getRandomValues(new Uint8Array(4))]
		.map((n) => chars[n % chars.length])
		.join("");
}

async function shot(page: Page, path: string) {
	await page.screenshot({ path });
	process.stdout.write(`saved ${path}\n`);
}

async function joinPlayers(pages: Page[]) {
	const code = code4();
	await pages[0].goto(`http://localhost:8787/#/room/${code}`);
	await pages[0].getByLabel("なまえ").fill(NAMES[0]);
	await pages[0].getByRole("button", { name: "部屋を作る" }).click();
	await expect(pages[0].locator(".room-code")).toHaveText(/^[A-Z0-9]{4}$/);
	const actualCode = (await pages[0].locator(".room-code").textContent())!;

	for (let i = 1; i < 4; i++) {
		await pages[i].goto(`http://localhost:8787/#/room/${actualCode}`);
		await pages[i].getByLabel("なまえ").fill(NAMES[i]);
		await pages[i].getByRole("button", { name: "参加する" }).click();
	}
	for (const p of pages) {
		await expect(p.locator(".player-chip")).toHaveCount(4);
	}
}

/** 1問分: 早押し→回答を繰り返し、reveal(正解表示)になったら抜ける */
async function answerOneQuestion(pages: Page[], q: number) {
	for (let turn = 0; ; turn++) {
		const winner = pages[turn % 4];
		await winner.getByRole("button", { name: "押す!" }).click();
		await expect(winner.locator("#status-line")).toContainText("回答権", { timeout: 10000 });

		if (q === 0 && turn === 0) {
			// 「回答中」の画面: 回答権者と、それを見ている他のプレイヤー
			await expect(pages[(turn + 1) % 4].locator("#status-line")).toContainText("回答中", {
				timeout: 10000,
			});
			await shot(winner, join(SHOTS, DIR, "03-answering.png"));
			await shot(pages[(turn + 1) % 4], join(SHOTS, DIR, "03-answering-others.png"));
		}

		await winner.locator(".choice").first().click();
		// 正解なら reveal フェーズへ。全員が押せなくなっても reveal へ。
		const revealed = await winner
			.waitForSelector("body.reveal", { timeout: 9000 })
			.then(() => true)
			.catch(() => false);
		if (revealed) {
			if (q === 0) {
				await shot(pages[0], join(SHOTS, DIR, "03b-reveal.png"));
			}
			return;
		}
		// はずれ → 残りの人で早押しを再開 (次の turn へ)
	}
}

let DIR = "pc";

async function playGame(pages: Page[]) {
	// ロビー
	await shot(pages[0], join(SHOTS, DIR, "01-lobby.png"));

	// 開始 (2〜4人でホストだけが押せる)
	await pages[0].getByRole("button", { name: "ゲーム開始" }).click();
	for (const p of pages) {
		await expect(p.locator(".question-card")).toBeVisible();
	}

	for (let q = 0; q < 10; q++) {
		if (q === 0) {
			await shot(pages[0], join(SHOTS, DIR, "02-question.png"));
		}
		await answerOneQuestion(pages, q);
		// 次の問題(または結果)を待つ
		await expect
			.poll(
				() =>
					pages[0].evaluate(
						() => document.body.classList.contains("question") || document.body.classList.contains("finished"),
					),
				{ timeout: 15000 },
			)
			.toBe(true);
	}
	await expect(pages[0].locator("#screen-result")).toBeVisible({ timeout: 20000 });
	await expect(pages[0].locator(".ranking li")).toHaveCount(4);
	await shot(pages[0], join(SHOTS, DIR, "04-result.png"));
}

test.describe("早押しクイズ E2E", () => {
	test("再読み込みしても同じプレイヤーとして復帰できる", async ({ browser }) => {
		test.setTimeout(120_000);
		const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "ja-JP" });
		const p1 = await ctx.newPage();
		const p2 = await ctx.newPage();

		await p1.goto("http://localhost:8787/");
		await p1.getByLabel("なまえ").fill(NAMES[0]);
		await p1.getByRole("button", { name: "部屋を作る" }).click();
		await expect(p1.locator(".room-code")).toHaveText(/^[A-Z0-9]{4}$/);
		const code = (await p1.locator(".room-code").textContent())!;

		await p2.goto(`http://localhost:8787/#/room/${code}`);
		await p2.getByLabel("なまえ").fill(NAMES[1]);
		await p2.getByRole("button", { name: "参加する" }).click();
		await expect(p1.locator(".player-chip")).toHaveCount(2);

		await p1.getByRole("button", { name: "ゲーム開始" }).click();
		await expect(p2.locator(".question-card")).toBeVisible();

		// 出題中にブラウザ再読み込み → 同じプレイヤーとしてゲームに復帰する
		await p2.reload();
		await expect(p2.locator(".question-card")).toBeVisible();
		await expect(p2.locator(".player-chip")).toHaveCount(2);
		await expect(p2.locator(".player-chip.me")).toContainText(NAMES[1]);

		// 復帰後も早押しできる
		await p2.getByRole("button", { name: "押す!" }).click();
		await expect(p2.locator("#status-line")).toContainText("回答権");
		await ctx.close();
	});

	for (const [label, viewport] of [
		["pc", { width: 1280, height: 800 }],
		["sp", { width: 390, height: 844 }],
	] as const) {
		test(`4人で最後まで遊べる (${label})`, async ({ browser }) => {
			test.setTimeout(300_000);
			DIR = label;
			mkdirSync(join(SHOTS, label), { recursive: true });
			const ctx = await browser.newContext({ viewport, locale: "ja-JP" });
			const pages = await Promise.all([...Array(4)].map(() => ctx.newPage()));
			await joinPlayers(pages);
			await playGame(pages);
			await ctx.close();
		});
	}
});
