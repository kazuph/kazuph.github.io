import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { QUESTIONS } from "../../src/questions";

export const BASE = "http://localhost:8792";
export const PC = { width: 1280, height: 800 };
export const SP = { width: 390, height: 844 };
export const SHOTS = fileURLToPath(new URL("../../.artifacts/screenshots/", import.meta.url));

export interface Seat {
  name: string;
  context: BrowserContext;
  page: Page;
}

export async function openSeat(
  browser: Browser,
  name: string,
  viewport: { width: number; height: number } = PC,
): Promise<Seat> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  return { name, context, page };
}

// 部屋を作り、部屋コードを返す
export async function createRoom(seat: Seat): Promise<string> {
  const p = seat.page;
  await p.goto(BASE);
  await p.fill("#name", seat.name);
  await p.click("#create");
  await expect(p.locator("#lobby")).toBeVisible();
  return ((await p.locator("#lobby-code").textContent()) ?? "").trim();
}

export async function joinRoom(seat: Seat, code: string): Promise<void> {
  const p = seat.page;
  await p.goto(BASE);
  await p.fill("#name", seat.name);
  await p.fill("#code", code);
  await p.click("#join");
}

// 全員が入るまで待ち、ホストが開始する
export async function startWith(seats: Seat[]): Promise<void> {
  for (const seat of seats) {
    await expect(seat.page.locator("#lobby-players li")).toHaveCount(seats.length);
  }
  await seats[0].page.click("#start");
  for (const seat of seats) {
    await expect(seat.page.locator("#game")).toBeVisible();
  }
}

export function questionOf(text: string) {
  const found = QUESTIONS.find((q) => q.q === text);
  if (!found) throw new Error(`問題が内蔵の問題にありません: ${text}`);
  return found;
}

export async function waitBuzzable(seats: Seat[]): Promise<void> {
  for (const seat of seats) {
    await expect(seat.page.locator("#buzz")).toBeEnabled();
  }
}

// 回答中の人の席（「あなたが回答中」を出している画面）を返す
export async function answererSeat(seats: Seat[]): Promise<Seat> {
  const found: Seat[] = [];
  await expect
    .poll(async () => {
      found.length = 0;
      for (const seat of seats) {
        if (await seat.page.locator("#status", { hasText: "あなたが回答中" }).count()) found.push(seat);
      }
      return found.length;
    })
    .toBe(1);
  return found[0];
}

export async function answerCorrectly(seat: Seat): Promise<void> {
  const text = (await seat.page.locator("#question").textContent()) ?? "";
  const correct = questionOf(text.trim()).answer;
  await seat.page.locator(`.choice[data-index="${correct}"]`).click();
}

export async function answerWrongly(seat: Seat): Promise<void> {
  const text = (await seat.page.locator("#question").textContent()) ?? "";
  const wrong = (questionOf(text.trim()).answer + 1) % 4;
  await seat.page.locator(`.choice[data-index="${wrong}"]`).click();
}

// 画面の得点一覧から、名前の人の点数表示（例: "+10" "-5" "0"）を読む
export async function scoreOn(page: Page, name: string): Promise<string> {
  const row = page.locator("#game-players li", { has: page.locator(".pname", { hasText: new RegExp(`^${name}$`) }) });
  return ((await row.locator(".score").textContent()) ?? "").trim();
}

export async function expectScore(seats: Seat[], name: string, score: string): Promise<void> {
  for (const seat of seats) {
    await expect.poll(() => scoreOn(seat.page, name), { timeout: 5_000 }).toBe(score);
  }
}
