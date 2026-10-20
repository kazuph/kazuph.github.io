import { test, expect, type Page } from "@playwright/test";

/**
 * ブラウザE2Eテスト（実ブラウザ × wrangler dev）
 * - 4人が同時に遊べる（フルゲームを完走）
 * - 5人目は入れず理由が画面に出る
 * - 再読み込みで同じプレイヤーとして復帰できる
 */

const TOP = "/";

async function register(page: Page, name: string, code?: string) {
  await page.goto(TOP);
  await page.fill("#input-name", name);
  if (code) {
    await page.fill("#input-code", code);
    await page.click("#btn-join");
  } else {
    await page.click("#btn-create");
  }
}

async function getRoomCode(page: Page): Promise<string> {
  await expect(page.locator("#lobby-code")).toBeVisible();
  const code = (await page.locator("#lobby-code").textContent()) ?? "";
  return code.trim();
}

/** 出題中の早押しボタンが押せるようになるのを待つ */
async function waitBuzzable(page: Page) {
  await page.waitForFunction(
    () => {
      const btn = document.querySelector<HTMLButtonElement>("#btn-buzz");
      const screen = document.querySelector<HTMLElement>("#screen-quiz");
      return screen && !screen.hidden && btn && !btn.disabled;
    },
    undefined,
    { timeout: 120_000, polling: 120 }
  );
}

/** 結果画面になるまで全員で自動プレイ（全員が早押しを狙い、回答者はAを選ぶ） */
async function autoPlay(pages: Page[], questionCount = 10) {
  const deadline = Date.now() + 200_000;
  let answered = 0;
  while (Date.now() < deadline) {
    const done = await Promise.all(
      pages.map(async (p) => p.evaluate(() => {
        const s = document.querySelector<HTMLElement>("#screen-result");
        return !!s && !s.hidden;
      }))
    );
    if (done.every(Boolean)) return;

    for (const p of pages) {
      const state = await p.evaluate(() => {
        const quiz = document.querySelector<HTMLElement>("#screen-quiz");
        const result = document.querySelector<HTMLElement>("#screen-result");
        if (result && !result.hidden) return "result" as const;
        if (!quiz || quiz.hidden) return "other" as const;
        const buzz = document.querySelector<HTMLButtonElement>("#btn-buzz");
        if (buzz && !buzz.hidden && !buzz.disabled) return "buzzable" as const;
        if (document.querySelector(".choice.selectable")) return "my-answer" as const;
        return "waiting" as const;
      });
      if (state === "buzzable") {
        // 誰かが先に押して回答者が出るとボタンが消えるので、負けた側は短時間で諦める
        await p.click("#btn-buzz", { timeout: 700 }).catch(() => {});
      } else if (state === "my-answer") {
        await p.locator(".choice.selectable").first().click({ timeout: 700 }).catch(() => {});
        answered++;
      }
    }
    await pages[0].waitForTimeout(150);
  }
  throw new Error(`autoPlay timed out (answers made: ${answered})`);
}

test.describe("4人オンライン対戦", () => {
  test("4人が同時に遊んで最終順位まで完走できる", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await register(pageA, "としき");
    const code = await getRoomCode(pageA);

    const others: Page[] = [];
    for (const name of ["みか", "けんた", "ゆい"]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await register(page, name, code);
      others.push(page);
    }

    // ロビーに4人揃う
    for (const p of [pageA, ...others]) {
      await expect(p.locator("#lobby-players .player-row")).toHaveCount(4);
    }
    await expect(pageA.locator("#btn-start")).toBeEnabled();
    await pageA.click("#btn-start");

    // 全員の画面に出題が始まる
    for (const p of [pageA, ...others]) {
      await expect(p.locator("#screen-quiz")).toBeVisible({ timeout: 20_000 });
      await expect(p.locator("#btn-buzz")).toBeVisible();
    }

    // 自動プレイで10問完走
    await autoPlay([pageA, ...others]);

    // 最終順位が全員に表示される
    for (const p of [pageA, ...others]) {
      await expect(p.locator("#screen-result")).toBeVisible({ timeout: 20_000 });
      await expect(p.locator("#result-list .result-row")).toHaveCount(4);
      await expect(p.locator("#screen-result .screen-title")).toContainText("最終結果");
    }
    // スコア順に並んでいる
    const scores = await pageA.locator("#result-list .r-score").allTextContents();
    const nums = scores.map((s) => parseInt(s, 10));
    expect(nums).toHaveLength(4);
    for (let i = 1; i < nums.length; i++) expect(nums[i - 1]).toBeGreaterThanOrEqual(nums[i]);
  });

  test("5人目は参加できず、理由が画面に出る", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await register(pageA, "ホスト郎");
    const code = await getRoomCode(pageA);

    const pages: Page[] = [];
    for (const name of ["二郎", "三郎", "四郎"]) {
      const ctx = await browser.newContext();
      const page = await ctx.newPage();
      await register(page, name, code);
      pages.push(page);
    }
    await expect(pageA.locator("#lobby-players .player-row")).toHaveCount(4);

    // 5人目
    const ctx5 = await browser.newContext();
    const page5 = await ctx5.newPage();
    await register(page5, "五郎", code);
    await expect(page5.locator("#top-error")).toBeVisible();
    await expect(page5.locator("#top-error")).toContainText("満員");
    await expect(page5.locator("#screen-top")).toBeVisible();
  });

  test("ゲーム中に再読み込みしても同じプレイヤーとして復帰できる", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await register(pageA, "れいじ");
    const code = await getRoomCode(pageA);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await register(pageB, "さくら", code);

    await expect(pageA.locator("#lobby-players .player-row")).toHaveCount(2);
    await expect(pageA.locator("#btn-start")).toBeEnabled();
    await pageA.click("#btn-start");

    await waitBuzzable(pageB);
    // 早押しして回答権を得てから再読み込み
    await pageB.click("#btn-buzz", { timeout: 1_500 });
    // 回答権を得たら自分の 4 択が押せる（= 回答中）
    await expect(pageB.locator(".choice.selectable").first()).toBeVisible({ timeout: 10_000 });
    await pageB.locator(".choice.selectable").first().click({ timeout: 1_500 });

    // 自分の得点を記録しておく（正解 +10 / 不正解 -5 のどちらでもよい）。回答がサーバーに届いたことを見たいので 0pt でなくなるのを待つ
    const chip = pageB
      .locator("#scoreboard .score-chip", { hasText: "さくら" })
      .locator(".s-score");
    await expect.poll(async () => (await chip.textContent())?.trim(), { timeout: 10_000 }).not.toBe("0pt");
    const before = await chip.textContent();

    await pageB.reload();

    // 復帰: 自動再接続して同じプレイヤーとして同じ得点でゲームに戻る
    await expect(pageB.locator("#screen-quiz:not([hidden]), #screen-result:not([hidden])")).toBeVisible({ timeout: 20_000 });
    await expect(pageB.locator("#scoreboard")).toContainText("さくら");
    await expect(pageB.locator("#connection-note")).toBeHidden();
    const after = await pageB
      .locator("#scoreboard .score-chip", { hasText: "さくら" })
      .locator(".s-score")
      .textContent();
    expect(after?.trim()).toBe(before?.trim());

    // 復帰後もゲームが続行できる（残りを自動プレイで完走）
    await autoPlay([pageA, pageB]);
    await expect(pageA.locator("#screen-result")).toBeVisible({ timeout: 60_000 });
    await expect(pageB.locator("#screen-result")).toBeVisible({ timeout: 20_000 });
  });
});
