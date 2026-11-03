import { Browser, BrowserContext, expect, Page } from "@playwright/test";
import { QUESTIONS } from "../../src/questions";

export interface Client {
  page: Page;
  context: BrowserContext;
  name: string;
}

export async function openClients(
  browser: Browser,
  viewports: { width: number; height: number }[],
  names: string[],
): Promise<Client[]> {
  const out: Client[] = [];
  for (let i = 0; i < viewports.length; i++) {
    const context = await browser.newContext({ viewport: viewports[i] });
    const page = await context.newPage();
    out.push({ page, context, name: names[i] });
  }
  return out;
}

export async function closeClients(clients: Client[]): Promise<void> {
  for (const c of clients) {
    await c.context.close().catch(() => undefined);
  }
}

/** UI から部屋を作り、部屋コードを返す */
export async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("create-btn").click();
  await expect(page.getByTestId("lobby")).toBeVisible({ timeout: 15000 });
  const code = (await page.getByTestId("room-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code;
}

/** UI から部屋に参加する */
export async function joinRoom(
  page: Page,
  name: string,
  code: string,
): Promise<void> {
  await page.goto("/");
  await page.getByTestId("name-input").fill(name);
  await page.getByTestId("code-input").fill(code);
  await page.getByTestId("join-btn").click();
  await expect(page.getByTestId("lobby")).toBeVisible({ timeout: 15000 });
}

export function correctChoice(questionText: string): number {
  const q = QUESTIONS.find((x) => x.q === questionText.trim());
  if (!q) throw new Error(`unknown question: ${questionText}`);
  return q.answer;
}

/** 全員の早押しボタンを同時に押す */
export async function buzzAll(clients: Client[]): Promise<void> {
  await Promise.all(
    clients.map((c) => c.page.getByTestId("buzz-btn").click()),
  );
}

/**
 * 待ちなしで全員の早押しボタンを押す（最終ループ用）。
 * 無効なボタンへの click() は何も送らない。reveal/finished 中は
 * 全員無効なので何も起きない。
 */
export async function buzzAllFast(clients: Client[]): Promise<void> {
  await Promise.all(
    clients.map((c) =>
      c.page.evaluate(() => {
        (document.getElementById("buzz-btn") as HTMLButtonElement).click();
      }),
    ),
  );
}

/** 回答権を得たクライアント（4択が有効＝「あなたが回答中」）を探す */
export async function findAnswerer(clients: Client[]): Promise<Client> {
  for (const c of clients) {
    const banner = c.page.getByTestId("answering-banner");
    try {
      await expect(banner).toContainText("あなたが回答中", { timeout: 3000 });
      return c;
    } catch {
      // 次へ
    }
  }
  throw new Error("answerer not found");
}

/** 全員の画面で回答者が1人だけに定まるまで待つ */
export async function waitAnswerer(clients: Client[]): Promise<Client> {
  let last: Client | null = null;
  await expect
    .poll(
      async () => {
        const found: Client[] = [];
        for (const c of clients) {
          const banner = c.page.getByTestId("answering-banner");
          if (!(await banner.isVisible().catch(() => false))) continue;
          const txt = (await banner.textContent()) ?? "";
          if (txt.includes("あなたが回答中")) found.push(c);
        }
        last = found.length === 1 ? found[0] : null;
        return found.length;
      },
      { timeout: 15000 },
    )
    .toBe(1);
  return last!;
}

export async function currentQuestion(page: Page): Promise<string> {
  return ((await page.getByTestId("question").textContent()) ?? "").trim();
}

/** 自分の点数（参加者欄の「（あなた）」行）を読む */
export async function myScore(page: Page): Promise<number> {
  const pts = await page.locator(".score-row.me .pts").textContent();
  const m = (pts ?? "").match(/(-?\d+)/);
  if (!m) throw new Error(`score not found in: ${pts}`);
  return parseInt(m[1], 10);
}

export async function waitPhase(
  page: Page,
  phase: "game" | "result",
  timeout = 30000,
): Promise<void> {
  await expect(page.getByTestId(phase)).toBeVisible({ timeout });
}

export const PC = { width: 1280, height: 800 };
export const MOBILE = { width: 390, height: 844 };
