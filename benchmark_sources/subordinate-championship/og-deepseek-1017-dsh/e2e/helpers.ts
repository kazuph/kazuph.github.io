import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

/** UI に仕込んだ data-* から現在のフェーズを読む。 */
export async function phaseOf(page: Page): Promise<string> {
  return (await page.evaluate(() => document.body.dataset.phase || "")) || "";
}

export async function questionIndexOf(page: Page): Promise<number> {
  return Number(await page.evaluate(() => document.body.dataset.question ?? "-1"));
}

export async function answererOf(page: Page): Promise<string> {
  return (await page.evaluate(() => document.body.dataset.answerer || "")) || "";
}

export async function meOf(page: Page): Promise<string> {
  return (await page.evaluate(() => document.body.dataset.me || "")) || "";
}

export async function openHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#screen-home")).toBeVisible();
}

export async function createRoomAs(page: Page, name: string): Promise<string> {
  await openHome(page);
  await page.fill("#input-name", name);
  await page.click("#btn-create");
  await expect(page.locator("#screen-lobby")).toBeVisible();
  await expect(page.locator("#lobby-players [data-player-id]")).toHaveCount(1);
  const code = (await page.locator("#lobby-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  return code;
}

export async function joinRoomAs(page: Page, name: string, code: string): Promise<void> {
  await openHome(page);
  await page.fill("#input-name", name);
  await page.click("#tab-join");
  await page.fill("#input-code", code);
  await page.click("#btn-join");
  await expect(page.locator("#screen-lobby")).toBeVisible();
}

export interface Party {
  contexts: BrowserContext[];
  pages: Page[];
  code: string;
}

/** 新しいコンテキストで `count` 人を1部屋に集める。先頭がホスト。 */
export async function gather(
  browser: Browser,
  names: string[],
  options: { viewport?: { width: number; height: number } } = {},
): Promise<Party> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  for (let i = 0; i < names.length; i++) {
    const context = await browser.newContext(
      options.viewport ? { viewport: options.viewport } : undefined,
    );
    contexts.push(context);
    pages.push(await context.newPage());
  }
  const code = await createRoomAs(pages[0], names[0]);
  for (let i = 1; i < pages.length; i++) {
    await joinRoomAs(pages[i], names[i], code);
    await expect(pages[0].locator("#lobby-players [data-player-id]")).toHaveCount(i + 1);
  }
  return { contexts, pages, code };
}

export async function closeParty(party: Party): Promise<void> {
  await Promise.all(party.contexts.map((context) => context.close().catch(() => undefined)));
}

/**
 * 早押しボタンを押す。
 * ボタンにはパルスのアニメーションが付いており Playwright の
 * 「stable 待ち」に引っかかるため、DOM の click() を直接呼ぶ。
 * 戻り値は「自分が回答権を得たか」。
 */
export async function pressBuzz(page: Page): Promise<boolean> {
  const armed = await page.evaluate(() => {
    const button = document.getElementById("btn-buzz");
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  if (!armed) return false;
  await page.evaluate(() => document.getElementById("btn-buzz")?.click());
  // 誰かが回答権を得る（またはフェーズが進む）まで少し待つ
  await page
    .waitForFunction(
      () => document.body.dataset.answerer !== "" || document.body.dataset.phase !== "question",
      undefined,
      { timeout: 1500 },
    )
    .catch(() => undefined);
  return (await answererOf(page)) === (await meOf(page));
}

/** 4人が手分けして早押し→回答を試み、その問題を終わらせる。 */
export async function hammerCurrentQuestion(pages: Page[]): Promise<void> {
  for (const page of pages) {
    if ((await phaseOf(page)) !== "question") return;
    const becameAnswerer = await pressBuzz(page);
    if (becameAnswerer) {
      const choices = page.locator('[data-testid="choice"]');
      const count = await choices.count();
      if (count > 0) {
        await choices
          .nth(Math.floor(Math.random() * count))
          .click({ timeout: 2000 })
          .catch(() => undefined);
      }
    }
  }
}
