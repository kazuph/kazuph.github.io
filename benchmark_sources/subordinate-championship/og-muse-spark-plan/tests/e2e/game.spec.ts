import { expect, test, type Browser, type Page } from "@playwright/test";
import { QUESTIONS } from "../../src/questions.js";
import * as fs from "node:fs";

test.describe.configure({ mode: "serial" });

const PC = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };

function shots(name: string): string {
  fs.mkdirSync(".artifacts", { recursive: true });
  return `.artifacts/${name}`;
}

async function newPlayer(
  browser: Browser,
  name: string,
  viewport: { width: number; height: number },
): Promise<{ page: Page; ctx: import("@playwright/test").BrowserContext }> {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByLabel(/あなたの名前/).fill(name);
  return { page, ctx };
}

async function createRoom(page: Page): Promise<string> {
  await page.getByRole("button", { name: "部屋を作る" }).click();
  await expect(page.locator("#view-lobby")).toBeVisible({ timeout: 15000 });
  const code = (await page.locator("#lobby-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code;
}

async function joinRoom(page: Page, code: string): Promise<void> {
  await page.getByLabel(/部屋コード/).fill(code);
  await page.getByRole("button", { name: "参加する" }).click();
  await expect(page.locator("#view-lobby")).toBeVisible({ timeout: 15000 });
}

function stateOf(page: Page): Promise<any> {
  return page.evaluate(() => (window as any).__bq?.state);
}

async function waitGame(page: Page): Promise<void> {
  await expect(page.locator("#view-game")).toBeVisible({ timeout: 15000 });
}

async function currentQuestion(page: Page): Promise<string> {
  await expect
    .poll(async () => ((await page.locator("#question-text").textContent()) ?? "").trim(), {
      timeout: 15000,
    })
    .not.toBe("");
  return ((await page.locator("#question-text").textContent()) ?? "").trim();
}

function correctChoice(text: string): number {
  const q = QUESTIONS.find((x) => x.text === text);
  if (!q) throw new Error(`unknown question: ${text}`);
  return q.answer;
}

/** 4人が同時に押す。戻り値は回答権を得たページの index。 */
async function buzzAll(pages: Page[]): Promise<number> {
  await Promise.all(pages.map((p) => p.locator("#buzz-btn").click()));
  // サーバーの判定と全画面への反映を待ってから数える
  await expect
    .poll(
      async () => {
        const cs = await Promise.all(
          pages.map((p) => p.locator(".choice:not([disabled])").count()),
        );
        return cs.reduce((a, b) => a + b, 0);
      },
      { timeout: 15000 },
    )
    .toBeGreaterThan(0);
  const enabledCounts = await Promise.all(
    pages.map((p) => p.locator(".choice:not([disabled])").count()),
  );
  const winners = enabledCounts
    .map((c, i) => (c > 0 ? i : -1))
    .filter((i) => i >= 0);
  expect(winners).toHaveLength(1);
  return winners[0]!;
}

async function answerCorrectly(pages: Page[], winner: number): Promise<string> {
  const text = await currentQuestion(pages[winner]!);
  const choice = correctChoice(text);
  await pages[winner]!.locator(`.choice[data-i="${choice}"]`).click();
  return text;
}

test("1. 4人参加と5人目の満員（PC3+スマホ1）", async ({ browser }) => {
  const a = await newPlayer(browser, "ホスト", PC);
  const b = await newPlayer(browser, "あきら", PC);
  const c = await newPlayer(browser, "さくら", PC);
  const d = await newPlayer(browser, "れん", MOBILE);
  try {
    const code = await createRoom(a.page);
    await joinRoom(b.page, code);
    await joinRoom(c.page, code);
    await joinRoom(d.page, code);
    for (const p of [a, b, c, d]) {
      await expect(p.page.locator("#player-list li")).toHaveCount(4, {
        timeout: 15000,
      });
    }
    // 5人目は満員で入れない
    const e = await newPlayer(browser, "ごろう", PC);
    try {
      await e.page.getByLabel(/部屋コード/).fill(code);
      await e.page.getByRole("button", { name: "参加する" }).click();
      await expect(e.page.locator("#entry-error")).toContainText("満員", {
        timeout: 15000,
      });
    } finally {
      await e.ctx.close();
    }
    await a.page.screenshot({ path: shots("lobby-pc.png") });
    await d.page.screenshot({ path: shots("lobby-mobile.png") });
  } finally {
    await Promise.all([a.ctx.close(), b.ctx.close(), c.ctx.close(), d.ctx.close()]);
  }
});

test("2-8. 4人で同時押し・不正解・復帰・再接続・時間切れ・完走", async ({
  browser,
}) => {
  const names = ["ホスト", "あきら", "さくら", "れん"];
  const ctxs = [];
  const pages: Page[] = [];
  try {
    for (let i = 0; i < 4; i++) {
      const { page, ctx } = await newPlayer(
        browser,
        names[i]!,
        i === 3 ? MOBILE : PC,
      );
      ctxs.push(ctx);
      pages.push(page);
    }
    const code = await createRoom(pages[0]!);
    await joinRoom(pages[1]!, code);
    await joinRoom(pages[2]!, code);
    await joinRoom(pages[3]!, code);

    // ホストが開始
    await pages[0]!.getByRole("button", { name: "ゲーム開始" }).click();
    for (const p of pages) await waitGame(p);
    const q1 = await currentQuestion(pages[0]!);
    expect(q1.length).toBeGreaterThan(0);

    // 出題中のスクショ（PC・スマホ）
    await pages[0]!.screenshot({ path: shots("question-pc.png") });
    await pages[3]!.screenshot({ path: shots("question-mobile.png") });
    // スマホ幅: 問題文と早押しボタンがスクロールせず1画面に見える
    const vis = await pages[3]!.evaluate(() => {
      const q = document.getElementById("question-text")!.getBoundingClientRect();
      const b = document.getElementById("buzz-btn")!.getBoundingClientRect();
      return { q, b, vh: window.innerHeight };
    });
    expect(vis.q.top).toBeGreaterThanOrEqual(0);
    expect(vis.b.bottom).toBeLessThanOrEqual(vis.vh);

    // 2. 同時押し→1人だけ回答権（3問くり返す: 2問正解）
    let winner = await buzzAll(pages);
    // 回答中のスクショ（PC幅=pages[0]・スマホ幅=pages[3]で確定）
    await pages[0]!.screenshot({ path: shots("answering-pc.png") });
    await pages[3]!.screenshot({ path: shots("answering-mobile.png") });
    // 全員の画面に「○○さんが回答中」
    for (let i = 0; i < 4; i++) {
      if (i === winner) {
        await expect(pages[i]!.locator("#status-line")).toContainText(
          "あなたが回答中",
          { timeout: 10000 },
        );
      } else {
        await expect(pages[i]!.locator("#status-line")).toContainText(
          "さんが回答中",
          { timeout: 10000 },
        );
      }
    }
    const before = (await stateOf(pages[0]!)).qIndex;
    await answerCorrectly(pages, winner);
    await expect
      .poll(async () => (await stateOf(pages[0]!)).qIndex, { timeout: 15000 })
      .toBe(before + 1);

    winner = await buzzAll(pages);
    await answerCorrectly(pages, winner);
    await expect
      .poll(async () => (await stateOf(pages[0]!)).qIndex, { timeout: 15000 })
      .toBe(before + 2);

    // 点数・回答者が全員の画面でそろっている
    const states = await Promise.all(pages.map(stateOf));
    expect(states.map((s) => s.qIndex)).toEqual([before + 2, before + 2, before + 2, before + 2]);
    const scores = states.map((s) =>
      s.players.map((p: any) => `${p.name}:${p.score}`).join(","),
    );
    expect(new Set(scores).size).toBe(1);

    // 3. 不正解で -5・ボタン無効
    winner = await buzzAll(pages);
    const wtext = await currentQuestion(pages[winner]!);
    const wrong = (correctChoice(wtext) + 1) % 4;
    const loserName = names[winner]!;
    const loserState = await stateOf(pages[winner]!);
    const loserBefore: number = loserState.players.find(
      (p: any) => p.id === loserState.you,
    ).score;
    await pages[winner]!.locator(`.choice[data-i="${wrong}"]`).click();
    // 全員の画面で -5
    await expect
      .poll(
        async () =>
          (await stateOf(pages[0]!)).players.find((p: any) => p.name === loserName)
            .score,
        { timeout: 15000 },
      )
      .toBe(loserBefore - 5);
    // その人のボタンは無効・「回答済み」
    await expect(pages[winner]!.locator("#buzz-btn")).toBeDisabled({
      timeout: 10000,
    });
    await expect(pages[winner]!.locator("#status-line")).toContainText(
      "回答済み",
      { timeout: 10000 },
    );

    // この問題を終わらせる（残りの誰かが正解）
    const st2 = await stateOf(pages[winner]!);
    const rest = [0, 1, 2, 3].filter((i) => i !== winner);
    const qNow: number = st2.qIndex;
    // 残りの人で同時押し
    await Promise.all(rest.map((i) => pages[i]!.locator("#buzz-btn").click()));
    await pages[0]!.waitForTimeout(1500);
    const st3 = await stateOf(pages[0]!);
    if (st3.phase === "answering") {
      // 回答者ページを探して正解する
      for (let i = 0; i < 4; i++) {
        const n = await pages[i]!.locator(".choice:not([disabled])").count();
        if (n > 0) {
          const t = (
            await pages[i]!.locator("#question-text").textContent()
          )?.trim();
          await pages[i]!
            .locator(`.choice[data-i="${correctChoice(t!)}"]`)
            .click();
          break;
        }
      }
    }
    await expect
      .poll(async () => (await stateOf(pages[0]!)).qIndex, { timeout: 20000 })
      .toBe(qNow + 1);

    // 4. 再読み込みでも同じ名前・同じ点数で復帰
    const preReload = await stateOf(pages[1]!);
    const preScore: number = preReload.players.find(
      (p: any) => p.name === "あきら",
    ).score;
    await pages[1]!.reload();
    await expect(pages[1]!.locator("#view-game")).toBeVisible({ timeout: 20000 });
    await expect
      .poll(
        async () =>
          (await stateOf(pages[1]!))?.players.find((p: any) => p.name === "あきら")
            ?.score,
        { timeout: 20000 },
      )
      .toBe(preScore);

    // 5. 回線を5秒切って戻すと自動再接続
    await ctxs[2]!.setOffline(true);
    await expect(pages[0]!.locator("#score-list")).toContainText(
      "接続が切れています",
      { timeout: 15000 },
    );
    await pages[0]!.waitForTimeout(5000);
    await ctxs[2]!.setOffline(false);
    await expect(pages[0]!.locator("#score-list")).not.toContainText(
      "接続が切れています",
      { timeout: 20000 },
    );

    // 7. 4画面の残り時間の差が1秒以内
    const secs: number[] = [];
    for (const p of pages) {
      const t = (await p.locator("#timer-text").textContent()) ?? "";
      const m = t.match(/残り ([\d.]+) 秒/);
      expect(m).not.toBeNull();
      secs.push(parseFloat(m![1]!));
    }
    expect(Math.max(...secs!) - Math.min(...secs!)).toBeLessThanOrEqual(1);

    // 8. 10問最後まで遊び、4画面に同じ最終順位
    const finishBy = Date.now() + 150_000;
    for (;;) {
      const s = await stateOf(pages[0]!);
      if (s?.phase === "finished") break;
      if (Date.now() > finishBy) throw new Error("ゲームが終わりません");
      if (!s || s.phase === "reveal") {
        await pages[0]!.waitForTimeout(500);
        continue;
      }
      if (s.phase === "question") {
        await Promise.all(
          pages.map(async (p) => {
            if (await p.locator("#buzz-btn").isEnabled()) {
              await p.locator("#buzz-btn").click();
            }
          }),
        );
        await pages[0]!.waitForTimeout(800);
        continue;
      }
      if (s.phase === "answering") {
        let answered = false;
        for (let i = 0; i < 4; i++) {
          const n = await pages[i]!.locator(".choice:not([disabled])").count();
          if (n > 0) {
            const t = (
              await pages[i]!.locator("#question-text").textContent()
            )?.trim();
            if (t) {
              await pages[i]!
                .locator(`.choice[data-i="${correctChoice(t)}"]`)
                .click();
              answered = true;
            }
            break;
          }
        }
        await pages[0]!.waitForTimeout(answered ? 600 : 1000);
        continue;
      }
      await pages[0]!.waitForTimeout(500);
    }
    for (const p of pages) {
      await expect(p.locator("#view-result")).toBeVisible({ timeout: 60000 });
    }
    const results = await Promise.all(
      pages.map((p) => p.locator("#result-list").textContent()),
    );
    // 「（あなた）」の表示だけが画面ごとに違うので取り除いて比べる
    const normalized = results.map((t) =>
      (t ?? "").replaceAll("（あなた）", "").trim(),
    );
    expect(new Set(normalized).size).toBe(1);
    expect(results[0]).toContain("ホスト");
    await pages[0]!.screenshot({ path: shots("result-pc.png") });
    await pages[3]!.screenshot({ path: shots("result-mobile.png") });
  } finally {
    await Promise.all(ctxs.map((c) => c.close()));
  }
});

test("6. 誰も押さないと20秒で正解表示・回答放置で10秒-5", async ({
  browser,
}) => {
  const a = await newPlayer(browser, "ホスト", PC);
  const b = await newPlayer(browser, "あきら", PC);
  try {
    const code = await createRoom(a.page);
    await joinRoom(b.page, code);
    await a.page.getByRole("button", { name: "ゲーム開始" }).click();
    await waitGame(a.page);
    await waitGame(b.page);
    await currentQuestion(a.page);
    // 誰も押さない→20秒実時間で正解表示
    await expect(a.page.locator("#status-line")).toContainText("正解は", {
      timeout: 30000,
    });
    await expect(b.page.locator("#status-line")).toContainText("正解は", {
      timeout: 10000,
    });
    // 次の問題で回答権を得て放置→10秒実時間で -5
    await expect
      .poll(async () => (await stateOf(a.page)).phase, { timeout: 15000 })
      .toBe("question");
    await a.page.locator("#buzz-btn").click();
    await expect(a.page.locator("#status-line")).toContainText("あなたが回答中", {
      timeout: 10000,
    });
    const pre: number = (await stateOf(a.page)).players.find(
      (p: any) => p.name === "ホスト",
    ).score;
    await expect
      .poll(
        async () =>
          (await stateOf(a.page)).players.find((p: any) => p.name === "ホスト")
            .score,
        { timeout: 20000 },
      )
      .toBe(pre - 5);
  } finally {
    await a.ctx.close();
    await b.ctx.close();
  }
});
