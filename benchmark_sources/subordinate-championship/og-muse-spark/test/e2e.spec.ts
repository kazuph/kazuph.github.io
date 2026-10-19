import { test, expect, type Browser, type Page } from "@playwright/test";

// ヘルパー: 新規コンテキストでホーム画面を開く
async function newPlayer(browser: Browser, name: string): Promise<{ page: Page; close: () => Promise<void> }> {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.fill("#nameInput", name);
  return { page, close: () => ctx.close() };
}

async function createRoom(page: Page): Promise<string> {
  await page.click("#btnCreate");
  await expect(page.locator("#screen-lobby")).toBeVisible({ timeout: 15000 });
  const code = (await page.locator("#lobbyCode").textContent()) ?? "";
  expect(code.trim().length).toBeGreaterThanOrEqual(4);
  return code.trim();
}

async function joinRoom(page: Page, code: string): Promise<void> {
  await page.fill("#codeInput", code);
  await page.click("#btnJoin");
  await expect(page.locator("#screen-lobby")).toBeVisible({ timeout: 15000 });
}

test("4人が同じ部屋に入って開始できる", async ({ browser }) => {
  const host = await newPlayer(browser, "ホスト");
  const code = await createRoom(host.page);
  const others: { page: Page; close: () => Promise<void> }[] = [];
  for (const n of ["B", "C", "D"]) {
    const p = await newPlayer(browser, n);
    await joinRoom(p.page, code);
    others.push(p);
  }
  // 全員のロビーに4人表示
  for (const p of [host, ...others]) {
    await expect(p.page.locator("#lobbyPlayers .prow")).toHaveCount(4, { timeout: 10000 });
  }
  // ホストが開始 → 全員の画面が出題中に遷移
  await host.page.click("#btnStart");
  for (const p of [host, ...others]) {
    await expect(p.page.locator("#screen-game")).toBeVisible({ timeout: 10000 });
    await expect(p.page.locator("#btnBuzz")).toBeVisible();
  }
  await host.close();
  for (const p of others) await p.close();
});

test("同時押しで1人だけが回答権を得る", async ({ browser }) => {
  const host = await newPlayer(browser, "ホスト");
  const code = await createRoom(host.page);
  const b = await newPlayer(browser, "B");
  await joinRoom(b.page, code);
  await host.page.click("#btnStart");
  await expect(host.page.locator("#screen-game")).toBeVisible({ timeout: 10000 });
  await expect(b.page.locator("#screen-game")).toBeVisible({ timeout: 10000 });

  // ほぼ同時に押す → どちらか1人だけ選択肢が出る
  await Promise.all([host.page.click("#btnBuzz"), b.page.click("#btnBuzz")]);
  await host.page.waitForTimeout(1200);
  const hostChoices = await host.page.locator("#choices:not(.hidden) .choice").count();
  const bChoices = await b.page.locator("#choices:not(.hidden) .choice").count();
  expect(hostChoices + bChoices).toBe(4); // 合計4択=どちらか一方だけ
  // 回答者が確定したら点数・回答者名が両画面で一致する
  await host.page.waitForTimeout(500);
  const norm = (t: string | null) => (t ?? "").replace(/（あなた）/g, "");
  const ht = norm(await host.page.locator("#scoreboard").textContent());
  const bt = norm(await b.page.locator("#scoreboard").textContent());
  expect(ht).toBe(bt);
  await host.close();
  await b.close();
});

test("再読み込みで同じプレイヤーとして復帰できる", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/");
  await page.fill("#nameInput", "復帰太郎");
  const code = await createRoom(page);
  const b = await newPlayer(browser, "B");
  await joinRoom(b.page, code);
  await page.click("#btnStart");
  await expect(page.locator("#screen-game")).toBeVisible({ timeout: 10000 });
  // Bが押してわざと不正解（Q1の正解はchoice 0なので1を選ぶ）→ B: -5点
  await expect(b.page.locator("#screen-game")).toBeVisible({ timeout: 10000 });
  await b.page.click("#btnBuzz");
  await expect(b.page.locator("#choices:not(.hidden) .choice")).toHaveCount(4, { timeout: 8000 });
  await b.page.locator(".choice").nth(1).click();
  await expect(b.page.locator("#notice")).toContainText("不正解", { timeout: 8000 });
  const before = await b.page.locator("#scoreboard").textContent();
  expect(before).toContain("-5点");
  // Bが再読み込み → 点数を保ったまま復帰
  await b.page.reload();
  await expect(b.page.locator("#screen-game")).toBeVisible({ timeout: 15000 });
  const after = await b.page.locator("#scoreboard").textContent();
  expect(after).toContain("-5点");
  await ctx.close();
  await b.close();
});

test("5人目は満員の理由とともに入れない", async ({ browser }) => {
  const host = await newPlayer(browser, "ホスト");
  const code = await createRoom(host.page);
  const others: { page: Page; close: () => Promise<void> }[] = [];
  for (const n of ["B", "C", "D"]) {
    const p = await newPlayer(browser, n);
    await joinRoom(p.page, code);
    others.push(p);
  }
  const e = await newPlayer(browser, "E");
  await e.page.fill("#codeInput", code);
  await e.page.click("#btnJoin");
  await expect(e.page.locator("#homeErr")).toContainText("満員", { timeout: 10000 });
  await host.close();
  for (const p of others) await p.close();
  await e.close();
});

test("10問終えたら最終順位が出る（2人で全問正解プレイ）", async ({ browser }) => {
  const host = await newPlayer(browser, "ホスト");
  const code = await createRoom(host.page);
  const b = await newPlayer(browser, "B");
  await joinRoom(b.page, code);
  await host.page.click("#btnStart");
  await expect(host.page.locator("#screen-game")).toBeVisible({ timeout: 10000 });

  // 正解リスト（内蔵問題の順番固定に対応）
  const answers = [0, 2, 1, 3, 1, 1, 2, 2, 0, 1];
  for (let qi = 0; qi < 10; qi++) {
    // 出題中になるまで待つ（reveal→次問の遷移待ち）
    await expect(host.page.locator("#btnBuzz:not([disabled])")).toBeVisible({ timeout: 25000 });
    await host.page.click("#btnBuzz");
    const choices = host.page.locator("#choices:not(.hidden) .choice");
    await expect(choices).toHaveCount(4, { timeout: 8000 });
    await choices.nth(answers[qi]).click();
    // 正解表示を確認（最終問以外）
    if (qi < 9) {
      await expect(host.page.locator("#notice")).toContainText("正解は", { timeout: 8000 });
    }
  }
  await expect(host.page.locator("#screen-result")).toBeVisible({ timeout: 15000 });
  await expect(host.page.locator("#ranks")).toContainText("ホスト");
  const ranks = await host.page.locator("#ranks").textContent();
  expect(ranks).toContain("100点");
  // B側にも同じ最終結果
  await expect(b.page.locator("#screen-result")).toBeVisible({ timeout: 15000 });
  await host.close();
  await b.close();
});
