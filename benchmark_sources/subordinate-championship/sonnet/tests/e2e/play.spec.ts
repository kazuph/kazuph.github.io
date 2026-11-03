import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { QUESTIONS } from "../../src/questions";

const SHOTS = ".artifacts/screenshots";
mkdirSync(SHOTS, { recursive: true });

const NAMES = ["あおい", "ひなた", "れん", "さくら"];

async function choiceTexts(p: Page): Promise<string[]> {
  return p.locator('[data-testid^="choice-"] span:nth-child(2)').allInnerTexts();
}
async function correctIndex(p: Page): Promise<number> {
  const text = (await p.getByTestId("question-text").innerText()).trim();
  const q = QUESTIONS.find((x) => x.text === text)!;
  return (await choiceTexts(p)).indexOf(q.choices[q.answer]);
}
async function score(p: Page, name: string): Promise<number> {
  return Number(await p.locator(`[data-testid="pcard"][data-name="${name}"]`).getAttribute("data-score"));
}

async function newPlayer(browser: Browser, viewport: { width: number; height: number }, name: string): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ viewport, hasTouch: viewport.width < 600, isMobile: viewport.width < 600 });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByTestId("name-input").fill(name);
  return { ctx, page };
}

async function journey(browser: Browser, tag: "pc" | "sp", viewport: { width: number; height: number }) {
  const shot = (p: Page, n: string) => p.screenshot({ path: `${SHOTS}/${tag}-${n}.png`, fullPage: true });
  const players: { ctx: BrowserContext; page: Page; name: string }[] = [];

  // 1. ホストが部屋を作る
  const host = await newPlayer(browser, viewport, NAMES[0]);
  await host.page.getByTestId("create-btn").click();
  const code = (await host.page.getByTestId("room-code").innerText()).trim();
  expect(code).toMatch(/^[A-Z2-9]{4}$/);
  players.push({ ...host, name: NAMES[0] });
  await shot(host.page, "00-entry-after-create-lobby-1p");

  // 2. 3人が部屋コードで参加
  for (const name of NAMES.slice(1)) {
    const pl = await newPlayer(browser, viewport, name);
    await pl.page.getByTestId("code-input").fill(code.toLowerCase());
    await pl.page.getByTestId("join-btn").click();
    await expect(pl.page.getByTestId("room-code")).toHaveText(code);
    players.push({ ...pl, name });
  }
  const pages = players.map((p) => p.page);
  for (const p of pages) await expect(p.getByTestId("lobby-player")).toHaveCount(4);
  await shot(pages[0], "01-lobby");

  // 3. 5人目は入れず、理由が画面に出る
  const fifth = await newPlayer(browser, viewport, "ごにんめ");
  await fifth.page.getByTestId("code-input").fill(code);
  await fifth.page.getByTestId("join-btn").click();
  await expect(fifth.page.getByTestId("entry-error")).toContainText("満員");
  await shot(fifth.page, "02-full-error");
  await fifth.ctx.close();
  // 参加者側には開始ボタンが無く、ホストのみ
  await expect(pages[1].getByTestId("start-btn")).toHaveCount(0);
  await pages[0].getByTestId("start-btn").click();

  // 4. 出題 → 全員に早押しボタン
  for (const p of pages) {
    await expect(p.getByTestId("qnum")).toContainText("第 1 問");
    await expect(p.getByTestId("buzz-btn")).toBeEnabled();
  }
  await shot(pages[0], "03-question");
  // 残り時間は全員の画面でそろっている（サーバー時刻の締め切りから計算しているため、端末間の差は通信の揺れ程度）
  const remains = await Promise.all(pages.map(async (p) => parseFloat(await p.getByTestId("timer").innerText())));
  expect(Math.max(...remains) - Math.min(...remains)).toBeLessThan(1.5);

  // 5. 4人が同時に押す → 回答権を得るのは1人だけ
  await Promise.all(pages.map((p) => p.getByTestId("buzz-btn").click({ timeout: 1000 }).catch(() => {})));
  await expect(pages[0].getByTestId("banner")).toBeVisible();
  for (const p of pages) await expect(p.getByTestId("banner")).toContainText("回答");
  const liveCounts = await Promise.all(pages.map((p) => p.locator(".choice.live").count()));
  expect(liveCounts.filter((n) => n === 4)).toHaveLength(1);
  const winnerIdx = liveCounts.findIndex((n) => n === 4);
  const winner = players[winnerIdx];
  // 全員の画面で「誰が回答中か」がそろっている
  for (const p of pages) await expect(p.locator('[data-testid="pcard"][data-answering="true"]')).toHaveAttribute("data-name", winner.name);
  await shot(winner.page, "04-answering-self");
  const other = players[(winnerIdx + 1) % 4];
  await shot(other.page, "05-answering-other");

  // 6. 不正解 → -5点、押せなくなる。残りで再開
  const wrong = ((await correctIndex(winner.page)) + 1) % 4;
  await winner.page.getByTestId(`choice-${wrong}`).click();
  for (const p of pages) await expect.poll(() => score(p, winner.name)).toBe(-5);
  await expect(winner.page.getByTestId("buzz-btn")).toBeDisabled();
  await expect(other.page.getByTestId("buzz-btn")).toBeEnabled();
  await shot(winner.page, "06-locked-out");

  // 7. 別の人が正解 → +10、正解表示
  await other.page.getByTestId("buzz-btn").click();
  await expect(other.page.locator(".choice.live")).toHaveCount(4);
  await other.page.getByTestId(`choice-${await correctIndex(other.page)}`).click();
  for (const p of pages) await expect(p.getByTestId("reveal-answer")).toBeVisible();
  for (const p of pages) await expect.poll(() => score(p, other.name)).toBe(10);
  await shot(pages[0], "07-reveal");
  await expect(pages[0].locator(".choice.correct")).toHaveCount(1);

  // 8. 次の問題で、1人が再読み込み → 同じプレイヤーのまま点数を保って復帰
  for (const p of pages) await expect(p.getByTestId("qnum")).toContainText("第 2 問");
  const reloader = players[winnerIdx];
  await reloader.page.reload();
  await expect(reloader.page.getByTestId("qnum")).toContainText("第 2 問");
  await expect.poll(() => score(reloader.page, reloader.name)).toBe(-5);
  await expect(reloader.page.locator(`[data-testid="pcard"].me`)).toHaveAttribute("data-name", reloader.name);
  for (const p of pages) await expect(p.getByTestId("pcard")).toHaveCount(4);

  // 9. 残り9問（第2問から）を順番に正解で進めて最終結果へ
  for (let q = 2; q <= 10; q++) {
    for (const p of pages) await expect(p.getByTestId("qnum")).toContainText(`第 ${q} 問`);
    const who = players[q % 4];
    await who.page.getByTestId("buzz-btn").click();
    await expect(who.page.locator(".choice.live")).toHaveCount(4);
    await who.page.getByTestId(`choice-${await correctIndex(who.page)}`).click();
    await expect(who.page.getByTestId("reveal-answer")).toBeVisible();
  }
  for (const p of pages) await expect(p.getByTestId("final-title")).toBeVisible({ timeout: 15_000 });
  const rows = pages[0].getByTestId("rank-row");
  await expect(rows).toHaveCount(4);
  const ranking = await rows.evaluateAll((els) => els.map((e) => ({ name: e.getAttribute("data-name"), score: Number(e.getAttribute("data-score")), rank: Number(e.getAttribute("data-rank")) })));
  expect(ranking.map((r) => r.score)).toEqual([...ranking.map((r) => r.score)].sort((a, b) => b - a));
  expect(ranking.reduce((s, r) => s + r.score, 0)).toBe(10 * 10 - 5);
  for (const p of pages) await expect(p.getByTestId("rank-row")).toHaveCount(4);
  await shot(pages[0], "08-final");
  for (const pl of players) await pl.ctx.close();
}

test("PC幅: 4人が同時に遊び切る（作成・参加・満員・早押し・不正解・再読み込み復帰・最終順位）", async ({ browser }) => {
  await journey(browser, "pc", { width: 1280, height: 800 });
});

test("スマホ幅: 4人が同時に遊び切る", async ({ browser }) => {
  await journey(browser, "sp", { width: 390, height: 844 });
});

test("スマホ幅でも横スクロールが出ない（ロビー・出題）", async ({ browser }) => {
  const a = await newPlayer(browser, { width: 360, height: 740 }, "あ");
  await a.page.getByTestId("create-btn").click();
  const b = await newPlayer(browser, { width: 360, height: 740 }, "い");
  await b.page.getByTestId("code-input").fill(await a.page.getByTestId("room-code").innerText());
  await b.page.getByTestId("join-btn").click();
  await a.page.getByTestId("start-btn").click();
  await expect(a.page.getByTestId("buzz-btn")).toBeVisible();
  const overflow = await a.page.evaluate<number>("document.documentElement.scrollWidth - window.innerWidth");
  expect(overflow).toBeLessThanOrEqual(0);
  await a.ctx.close();
  await b.ctx.close();
});

test("接続が一時的に切れても自動で再接続し、同じプレイヤーで続けられる", async ({ browser }) => {
  const a = await newPlayer(browser, { width: 1280, height: 800 }, "あ");
  await a.page.getByTestId("create-btn").click();
  const code = await a.page.getByTestId("room-code").innerText();
  const b = await newPlayer(browser, { width: 1280, height: 800 }, "い");
  let blocked = false;
  let live: { close: (o?: { code?: number }) => void } | null = null;
  await b.page.routeWebSocket(/\/ws\//, (ws) => {
    if (blocked) return ws.close({ code: 4500 });
    ws.connectToServer();
    live = ws;
  });
  await b.page.getByTestId("code-input").fill(code);
  await b.page.getByTestId("join-btn").click();
  await a.page.getByTestId("start-btn").click();
  await b.page.getByTestId("buzz-btn").click();
  await expect(b.page.locator(".choice.live")).toHaveCount(4);
  await b.page.getByTestId(`choice-${await correctIndex(b.page)}`).click();
  await expect.poll(() => score(b.page, "い")).toBe(10);
  // 回線断を再現: 接続を落として再接続も拒否する → 相手の画面に「接続切れ」が出る → 回線が戻ると自動復帰
  blocked = true;
  live!.close({ code: 4500 });
  await expect(a.page.locator('[data-testid="pcard"][data-name="い"]')).toHaveClass(/offline/);
  await expect(b.page.locator("#conn")).toBeVisible();
  blocked = false;
  await expect(a.page.locator('[data-testid="pcard"][data-name="い"]')).not.toHaveClass(/offline/, { timeout: 15_000 });
  await expect(b.page.locator("#conn")).toBeHidden();
  await expect.poll(() => score(b.page, "い")).toBe(10);
  await expect(b.page.locator('[data-testid="pcard"].me')).toHaveAttribute("data-name", "い");
  await a.ctx.close();
  await b.ctx.close();
});

test("同じブラウザで部屋を開き直すと後のタブが引き継ぎ、先のタブには理由が出る。引き継いだ側の再読み込みでも復帰できる", async ({ browser }) => {
  const a = await newPlayer(browser, { width: 1280, height: 800 }, "あ");
  await a.page.getByTestId("create-btn").click();
  const code = await a.page.getByTestId("room-code").innerText();
  const second = await a.ctx.newPage();
  await second.goto("/");
  await expect(second.getByTestId("room-code")).toHaveText(code);
  await expect(a.page.getByTestId("entry-error")).toContainText("別のタブ");
  await second.reload();
  await expect(second.getByTestId("room-code")).toHaveText(code);
  await expect(second.getByTestId("lobby-player")).toHaveCount(1);
  await a.ctx.close();
});
