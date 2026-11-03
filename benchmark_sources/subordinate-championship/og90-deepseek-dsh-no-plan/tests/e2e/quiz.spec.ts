import { mkdirSync } from "node:fs";
import {
  expect,
  test,
  devices,
  type Browser,
  type BrowserContext,
  type Page,
  type BrowserContextOptions,
} from "@playwright/test";

/**
 * ブラウザ E2E。実際の wrangler dev に対して 4 ブラウザ（4 コンテキスト）で
 * ひとつの部屋に入り、フルゲームを最後まで遊ぶ。
 * 途中のロビー・出題中・回答中・結果を PC 幅 / スマホ幅でスクリーンショット保存する。
 */

const ARTIFACTS = ".artifacts";
mkdirSync(ARTIFACTS, { recursive: true });

/** src/questions.ts と同じ並びの正解インデックス（E2E の操作にのみ使用） */
const ANSWERS = [2, 1, 3, 0, 2, 1, 3, 0, 2, 1];

const DESKTOP: BrowserContextOptions = { viewport: { width: 1280, height: 820 } };
const MOBILE: BrowserContextOptions = { ...devices["Pixel 7"] };

/** スクリーンショット保存。スマホ幅は全体が入るよう fullPage で撮る。 */
async function shot(page: Page, name: string, suffix: "desktop" | "mobile"): Promise<void> {
  await page.screenshot({
    path: `${ARTIFACTS}/${name}-${suffix}.png`,
    fullPage: suffix === "mobile",
  });
}

interface Player {
  context: BrowserContext;
  page: Page;
}

async function openPlayer(browser: Browser, options: BrowserContextOptions): Promise<Player> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("#screen-home")).toBeVisible();
  return { context, page };
}

async function createRoom(page: Page, name: string): Promise<string> {
  await page.fill("#name-input", name);
  await page.click("#create-btn");
  await expect(page.locator("#screen-lobby")).toBeVisible();
  const code = (await page.locator("#lobby-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  return code;
}

async function joinRoom(page: Page, name: string, code: string): Promise<void> {
  await page.fill("#name-input", name);
  await page.fill("#code-input", code);
  await page.click("#join-btn");
  await expect(page.locator("#screen-lobby")).toBeVisible();
}

/** サーバーが公開している状態（読み取り専用フック） */
function readState(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__quiz.getState());
}

async function waitUntilAnswerer(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const quiz = (window as any).__quiz;
      const state = quiz.getState();
      const me = quiz.getSession();
      return state?.phase === "answering" && state.answererId === me?.playerId;
    },
    undefined,
    { timeout: 15_000 },
  );
}

/**
 * 4 人が入室して 1 ゲームを最後まで遊び、各画面をスクリーンショット保存する。
 */
async function playFullGame(browser: Browser, options: BrowserContextOptions, suffix: "desktop" | "mobile") {
  const names = ["あおい", "きいろ", "みどり", "あか"];
  const players: Player[] = [];
  for (let i = 0; i < 4; i++) players.push(await openPlayer(browser, options));
  const [p0, p1, p2, p3] = players as [Player, Player, Player, Player];

  const code = await createRoom(p0.page, names[0]!);
  for (let i = 1; i < 4; i++) await joinRoom(players[i]!.page, names[i]!, code);

  // 全員の画面で 4 人が見えるまで待つ
  for (const p of players) {
    await expect(p.page.locator("#lobby-players .player-slot:not(.empty)")).toHaveCount(4);
  }
  await expect(p0.page.locator("#lobby-count")).toHaveText("4 / 4");
  await shot(p0.page, "lobby", suffix);

  // ---- 開始 ----
  await p0.page.click("#start-btn");
  for (const p of players) {
    await expect(p.page.locator("#screen-game")).toBeVisible();
    await expect(p.page.locator("#question-text")).not.toBeEmpty();
    await expect(p.page.locator("#buzz-btn")).toBeEnabled();
  }
  await expect(p0.page.locator("#q-index")).toHaveText("1");
  await expect(p0.page.locator("#phase-badge")).toHaveText("早押し受付中");

  // 「出題中」のスクリーンショット（全員に早押しボタンが出ている状態）
  await shot(p0.page, "question", suffix);

  // ---- 4 人でほぼ同時に早押し ----
  // Playwright の click は無効化を待ってしまうので、押下イベントを同時に発火させる
  await Promise.all(
    players.map((p) =>
      p.page.evaluate(() => (document.getElementById("buzz-btn") as HTMLButtonElement).click()),
    ),
  );
  await p0.page.waitForFunction(() => (window as any).__quiz.getState()?.phase === "answering");

  const playerIds = await Promise.all(
    players.map((p) => p.page.evaluate(() => (window as any).__quiz.getSession().playerId as string)),
  );
  const answererId = (await readState(p0.page)).answererId;
  const answererIndex = playerIds.indexOf(answererId);
  expect(answererIndex, "同時押しで回答権を得た人がちょうど 1 人いる").toBeGreaterThanOrEqual(0);
  const answerer = players[answererIndex]!;
  expect(playerIds.filter((id) => id === answererId)).toHaveLength(1);

  // 回答権を得ていない人の画面では「○○さんが回答中」でボタンが無効
  const nonAnswerers = players.filter((p) => p !== answerer);
  for (const p of nonAnswerers) {
    await expect(p.page.locator("#buzz-btn")).toBeDisabled();
    await expect(p.page.locator("#answer-banner")).toContainText("さんが回答中");
  }

  // 「回答中」のスクリーンショット（回答権を得た人の画面）
  await expect(answerer!.page.locator("#answer-banner")).toContainText("あなたが回答権");
  await shot(answerer!.page, "answering", suffix);

  // 1 問目に正解して先へ進む
  await answerer!.page.click(`[data-choice="${ANSWERS[0]}"]`);
  await expect(p0.page.locator("#phase-badge")).toHaveText("正解発表");
  await expect(p0.page.locator(".choice.correct")).toHaveCount(1);

  // ---- 残り 9 問は p0 が早押し→正解を繰り返す ----
  for (let q = 1; q < ANSWERS.length; q++) {
    await expect(p0.page.locator("#q-index")).toHaveText(String(q + 1), { timeout: 20_000 });
    await expect(p0.page.locator("#buzz-btn")).toBeEnabled({ timeout: 20_000 });
    await p0.page.click("#buzz-btn");
    await waitUntilAnswerer(p0.page);
    await p0.page.click(`[data-choice="${ANSWERS[q]}"]`);
    await expect(p0.page.locator("#phase-badge")).toHaveText("正解発表");
  }

  // ---- 結果 ----
  for (const p of players) {
    await expect(p.page.locator("#screen-result")).toBeVisible({ timeout: 25_000 });
  }
  const rankingRows = p0.page.locator("#ranking .rank-row");
  await expect(rankingRows).toHaveCount(4);
  await expect(p0.page.locator("#ranking .rank-row.rank-1 .rank-name")).toHaveText("あおい");
  await shot(p0.page, "result", suffix);

  for (const p of players) await p.context.close();
}

test.describe("4人オンライン早押しクイズ", () => {
  test("PC幅で4人フルゲーム + スクリーンショット @screenshots", async ({ browser }) => {
    await playFullGame(browser, DESKTOP, "desktop");
  });

  test("スマホ幅で4人フルゲーム + スクリーンショット @screenshots", async ({ browser }) => {
    await playFullGame(browser, MOBILE, "mobile");
  });

  test("5人目は入れず、画面に理由が出る", async ({ browser }) => {
    const players: Player[] = [];
    for (let i = 0; i < 4; i++) players.push(await openPlayer(browser, DESKTOP));
    const code = await createRoom(players[0]!.page, "ホスト");
    for (let i = 1; i < 4; i++) await joinRoom(players[i]!.page, `参加者${i}`, code);

    const fifth = await openPlayer(browser, DESKTOP);
    await fifth.page.fill("#name-input", "5人目");
    await fifth.page.fill("#code-input", code);
    await fifth.page.click("#join-btn");
    await expect(fifth.page.locator("#home-error")).toContainText("満員");
    await expect(fifth.page.locator("#screen-home")).toBeVisible();

    for (const p of players) await p.context.close();
    await fifth.context.close();
  });

  test("ゲーム中に再読み込みしても同じプレイヤー・同じ点数で復帰する", async ({ browser }) => {
    const p0 = await openPlayer(browser, DESKTOP);
    const p1 = await openPlayer(browser, DESKTOP);
    const code = await createRoom(p0.page, "ホスト");
    await joinRoom(p1.page, "ゲスト", code);
    await expect(p1.page.locator("#lobby-players .player-slot:not(.empty)")).toHaveCount(2);

    await p0.page.click("#start-btn");
    await expect(p0.page.locator("#buzz-btn")).toBeEnabled();
    await p0.page.click("#buzz-btn");
    await waitUntilAnswerer(p0.page);
    await p0.page.click(`[data-choice="${ANSWERS[0]}"]`);
    await expect(p0.page.locator("#score-list .score-row.me .s-score")).toHaveText("10");

    // ブラウザを再読み込み（回線断からの復帰に相当）
    await p1.page.reload();
    await expect(p1.page.locator("#screen-game")).toBeVisible({ timeout: 20_000 });
    await p0.page.reload();
    await expect(p0.page.locator("#screen-game")).toBeVisible({ timeout: 20_000 });
    await expect(p0.page.locator("#connection-banner")).toBeHidden();
    await expect(p0.page.locator("#score-list .score-row.me .s-score")).toHaveText("10");
    await expect(p0.page.locator("#screen-result")).toBeHidden();

    // 4 人部屋に膨らんでいない（同じ席に戻っている）
    const state = await readState(p0.page);
    expect(state.players).toHaveLength(2);

    await p0.context.close();
    await p1.context.close();
  });
});
