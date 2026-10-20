// E2E テスト共通のヘルパー。
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const PC = { viewport: { width: 1280, height: 800 } };
export const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

export interface Client {
  ctx: BrowserContext;
  page: Page;
  name: string;
  code?: string;
}

/** localStorage を空にして（前のテストの再接続情報を消す）入口画面を開く */
async function freshPage(ctx: BrowserContext): Promise<Page> {
  // 新しい context なので localStorage は空。reload 時に消さないこと。
  return ctx.newPage();
}

export async function openHost(
  browser: Browser,
  name: string,
  opts = PC
): Promise<Client> {
  const ctx = await browser.newContext(opts);
  const page = await freshPage(ctx);
  await page.goto("/");
  await page.fill("#name", name);
  await page.click("#create-btn");
  await page.waitForSelector("#lobby-code");
  const code = ((await page.textContent("#lobby-code")) ?? "").trim();
  expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  return { ctx, page, name, code };
}

/** 参加（想定どおりのエラーで弾かれることもある） */
export async function openJoinerExpectError(
  browser: Browser,
  code: string,
  name: string,
  opts = PC
): Promise<Client> {
  const ctx = await browser.newContext(opts);
  const page = await freshPage(ctx);
  await page.goto("/");
  await page.fill("#name", name);
  await page.fill("#code", code);
  await page.click("#join-btn");
  await page.waitForSelector("#entry-error");
  return { ctx, page, name, code };
}

export async function openJoiner(
  browser: Browser,
  code: string,
  name: string,
  opts = PC
): Promise<Client> {
  const ctx = await browser.newContext(opts);
  const page = await freshPage(ctx);
  await page.goto("/");
  await page.fill("#name", name);
  await page.fill("#code", code);
  await page.click("#join-btn");
  await page.waitForSelector("#lobby-code");
  return { ctx, page, name, code };
}

/** 部屋を作って name1〜n の count 人が入る */
export async function makeRoom(
  browser: Browser,
  count = 4,
  opts: { viewport: { width: number; height: number }; isMobile?: boolean; hasTouch?: boolean } = PC
): Promise<{ code: string; clients: Client[] }> {
  const host = await openHost(browser, "ホスト太郎", opts);
  const clients: Client[] = [host];
  for (let i = 1; i < count; i++) {
    clients.push(await openJoiner(browser, host.code!, `参加者${i}`, opts));
  }
  return { code: host.code!, clients };
}
/** 現在の「第n問」ラベルを得る */
export async function roundText(page: Page): Promise<string> {
  return ((await page.textContent("#round-label")) ?? "").trim();
}

/** 全員のロビーがプレイヤー名を表示するまで待つ */
export async function allLobbyReady(clients: Client[]): Promise<void> {
  await Promise.all(
    clients.map((c) =>
      expect
        .poll(async () => (await c.page.textContent("#lobby-players")) ?? "")
        .toContain(c.name),
    ),
  );
}

export async function startGame(host: Page): Promise<void> {
  await host.click("#start-btn");
  await expect(host.locator("#screen-game")).toBeVisible();
}

/** 第n問 になるまで待つ */
export async function waitRound(page: Page, n: number, timeout = 35000): Promise<void> {
  await page.waitForFunction(
    (target) => document.querySelector("#round-label")?.textContent?.trim() === `第${target}問`,
    n,
    { timeout }
  );
}

export async function waitQuestionShown(page: Page, timeout = 35000): Promise<void> {
  await expect
    .poll(
      async () => {
        const t = await page.textContent("#question-text");
        return (t ?? "").trim().length;
      },
      { timeout, intervals: [250] }
    )
    .toBeGreaterThan(0);
}

/** 全員で同時に早押し。失敗しても別の人が押しただけなので無視する */
export async function buzzAll(pages: Page[]): Promise<void> {
  await Promise.all(
    pages.map((p) =>
      p.locator("#buzz:not([disabled])").first().click({ timeout: 2500 }).catch(() => {}),
    ),
  );
}

/** 回答中の画面（buzz が「回答中」になっている人）を見つける */
export async function findAnswerer(pages: Page[], timeout = 10000): Promise<{ page: Page; index: number } | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (let i = 0; i < pages.length; i++) {
      // state が来て 화面が更新されているときだけ判定する
      const txt = await pages[i]!.locator("#buzz").textContent().catch(() => null);
      if (txt === "回答中") {
        return { page: pages[i]!, index: i };
      }
    }
    await pages[0]!.waitForTimeout(250);
  }
  return null;
}

/** 回答中の問題の choice を最初の有効なものから選ぶ */
export async function clickChoice(page: Page, index: number): Promise<void> {
  await page.locator(".choice:not([disabled])").nth(index).click();
}

/** 正解表示が出るまで待つ（全員の画面で同じ正解） */
export async function waitReveal(pages: Page[], timeout = 35000): Promise<number> {
  await expect
    .poll(
      async () => {
        for (const p of pages) {
          if (await p.locator(".choice.correct").isVisible().catch(() => false)) {
            const choices = p.locator(".choice");
            const n = await choices.count();
            for (let i = 0; i < n; i++) {
              if ((await choices.nth(i).getAttribute("class"))?.includes("correct")) return i;
            }
          }
        }
        return -1;
      },
      { timeout, intervals: [250] }
    )
    .toBeGreaterThanOrEqual(0);
  return await waitRevealCorrectIndex(pages[0]!);
}

async function waitRevealCorrectIndex(page: Page): Promise<number> {
  const choices = page.locator(".choice");
  const n = await choices.count();
  for (let i = 0; i < n; i++) {
    if ((await choices.nth(i).getAttribute("class"))?.includes("correct")) return i;
  }
  return -1;
}

/** 残り秒数の文字（例：「18秒」）を数字で得る */
export async function timerSeconds(page: Page): Promise<number> {
  const raw = ((await page.textContent("#timer-sec")) ?? "").replace("秒", "").trim();
  return raw ? Number(raw) : -1;
}

export async function closeClients(clients: Client[]): Promise<void> {
  for (const c of clients) await c.ctx.close();
}

export { expect };

/** 現在のラウンドが終わる（次の問題 or 結果）のを待つ */
export async function waitRoundGone(page: Page, round: number, timeout = 45000): Promise<void> {
  await page.waitForFunction(
    (r) => {
      const label = document.querySelector("#round-label")?.textContent?.trim() ?? "";
      const result = !document.getElementById("screen-result")?.hidden;
      return result || label !== `第${r}問`;
    },
    round,
    { timeout }
  );
}

export async function resultVisible(page: Page): Promise<boolean> {
  return page.evaluate(() => !document.getElementById("screen-result")?.hidden);
}

/** 10問を最後まで遊ぶ（結果が画面に出るまで）*/
export async function playFullGame(pages: Page[], fromRound = 1): Promise<void> {
  for (let round = fromRound; round <= 10; round++) {
    await waitRound(pages[0]!, round, 45000);
    await waitQuestionShown(pages[0]!);
    for (;;) {
      await buzzAll(pages);
      const answerer = await findAnswerer(pages);
      if (answerer) {
        await clickChoice(answerer.page, 0);
      }
      await waitRoundGone(pages[0]!, round, 45000);
      if (await resultVisible(pages[0]!)) return;
      const label = ((await pages[0]!.textContent("#round-label")) ?? "").trim();
      if (label === `第${round + 1}問`) break;
      await pages[0]!.waitForTimeout(400);
    }
  }
}
