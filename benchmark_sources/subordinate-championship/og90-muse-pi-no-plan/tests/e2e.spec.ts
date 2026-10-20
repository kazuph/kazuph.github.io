import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.locator("#nameInput").fill(name);
  await page.locator("#createBtn").click();
  await expect(page.locator("#screen-lobby")).toBeVisible({ timeout: 15_000 });
  const code = (await page.locator("#roomCode").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  return code;
}

async function joinRoom(page: Page, code: string, name: string): Promise<void> {
  await page.goto(`/?room=${code}`);
  await page.locator("#nameInput").fill(name);
  await page.locator("#codeInput").fill(code);
  await page.locator("#joinBtn").click();
  await page.waitForFunction(
    () =>
      !(document.querySelector("#screen-lobby") as HTMLElement).hidden ||
      !(document.querySelector("#screen-game") as HTMLElement).hidden,
    null,
    { timeout: 15_000 },
  );
}

async function buzzEnabled(page: Page): Promise<boolean> {
  return page.locator("#buzzBtn").isEnabled().catch(() => false);
}

async function choicesEnabled(page: Page): Promise<boolean> {
  const btns = page.locator("#choices .choice:enabled");
  return (await btns.count()) > 0;
}

test("4人同時プレイ：入室→定員→開始→同時押し→完走→復帰", async ({ browser }) => {
  const ctxs = await Promise.all([0, 1, 2, 3].map(() => browser.newContext()));
  const pages = await Promise.all(ctxs.map((c) => c.newPage()));
  const [p1, p2, p3, p4] = pages;
  const names = ["ホスト", "B子", "C太", "D美"];

  // ホストが部屋作成
  const code = await createRoom(p1, names[0]);
  // 3人が参加
  await joinRoom(p2, code, names[1]);
  await joinRoom(p3, code, names[2]);
  await joinRoom(p4, code, names[3]);
  for (const p of pages) {
    await expect(p.locator("#screen-lobby")).toBeVisible({ timeout: 15_000 });
  }
  await expect(p1.locator("#memberList li")).toHaveCount(4, { timeout: 15_000 });

  // 5人目は定員エラー
  const ctx5 = await browser.newContext();
  const p5 = await ctx5.newPage();
  await p5.goto(`/?room=${code}`);
  await p5.locator("#nameInput").fill("E男");
  await p5.locator("#codeInput").fill(code);
  await p5.locator("#joinBtn").click();
  await expect(p5.locator("#homeError")).toContainText("定員", { timeout: 15_000 });
  await ctx5.close();

  // ホストが開始 → 全員に出題画面
  await p1.locator("#startBtn").click();
  for (const p of pages) {
    await expect(p.locator("#screen-game")).toBeVisible({ timeout: 15_000 });
    await expect(p.locator("#qText")).not.toBeEmpty();
  }
  // 点数・残り時間・回答中が全員に表示される
  for (const p of pages) {
    await expect(p.locator("#scoreList li")).toHaveCount(4);
    await expect(p.locator("#timerText")).toContainText("残り");
  }

  // 同時押し：4人が一斉に押す → 回答権は1人だけ
  await Promise.all(pages.map((p) => p.locator("#buzzBtn").click().catch(() => {})));
  await pages[0].waitForTimeout(1500);
  const enabledCounts = await Promise.all(pages.map(choicesEnabled));
  expect(enabledCounts.filter(Boolean)).toHaveLength(1);

  // 再読み込み復帰：回答権のないp4をリロード → 同じプレイヤーとして戻る
  const scoreBefore = await p4.locator("#scoreList li").first().textContent();
  await p4.reload();
  await expect(p4.locator("#screen-game")).toBeVisible({ timeout: 15_000 });
  await expect(p4.locator("#scoreList li")).toHaveCount(4, { timeout: 15_000 });
  expect(await p4.locator("#scoreList li").first().textContent()).toBe(scoreBefore);

  // 完走まで brute force：回答権者が選択肢を順に試す
  const deadline = Date.now() + 200_000;
  while (Date.now() < deadline) {
    if (await p1.locator("#screen-result").isVisible()) break;
    let progressed = false;
    for (const p of pages) {
      if (await p.locator("#screen-result").isVisible()) break;
      if (await choicesEnabled(p)) {
        // 有効な選択肢を1つ押す
        await p.locator("#choices .choice:enabled").first().click().catch(() => {});
        progressed = true;
        await p.waitForTimeout(700);
        break;
      }
    }
    if (!progressed) {
      // 誰も回答権を持っていなければ押せる人が押す
      for (const p of pages) {
        if (await buzzEnabled(p)) {
          await p.locator("#buzzBtn").click().catch(() => {});
          progressed = true;
          await p.waitForTimeout(500);
          break;
        }
      }
    }
    await pages[0].waitForTimeout(400);
  }

  // 最終順位が全員に表示される
  for (const p of pages) {
    await expect(p.locator("#screen-result")).toBeVisible({ timeout: 30_000 });
    await expect(p.locator("#rankList li")).toHaveCount(4);
  }
  // 全員の順位表示が一致する（「（あなた）」表記を除いて比較）
  const rankTexts = await Promise.all(
    pages.map(async (p) => (await p.locator("#rankList").textContent())?.replace(/（あなた）/g, "")),
  );
  expect(new Set(rankTexts).size).toBe(1);

  await Promise.all(ctxs.map((c) => c.close()));
});
