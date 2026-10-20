/**
 * ブラウザテストの共通部品。
 * 1人 = 1つの独立したブラウザコンテキスト（別のブラウザと同じ扱い）。
 */
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { QUESTIONS } from "../../src/questions";

export const DESKTOP = { width: 1280, height: 800 };
export const MOBILE = { width: 390, height: 844 };

export interface Session {
  code: string;
  playerId: string;
  token: string;
  name: string;
}

export interface Client {
  name: string;
  context: BrowserContext;
  page: Page;
  session: Session;
}

export async function newClient(
  browser: Browser,
  name: string,
  viewport: { width: number; height: number } = DESKTOP,
): Promise<Client> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  return { name, context, page, session: { code: "", playerId: "", token: "", name } };
}

async function seedSession(page: Page, session: Session): Promise<void> {
  await page.addInitScript((value: Session) => {
    localStorage.setItem("buzzer.session.v1", JSON.stringify(value));
    localStorage.setItem("buzzer.name.v1", value.name);
  }, session);
}

/** API で部屋を作り、その token でページを開く。 */
export async function hostRoom(client: Client): Promise<Session> {
  const response = await client.context.request.post("/api/rooms", {
    data: { name: client.name },
  });
  expect(response.ok()).toBe(true);
  const session = (await response.json()) as Session;
  client.session = session;
  await seedSession(client.page, session);
  await client.page.goto("/");
  return session;
}

/** API で部屋に入り、その token でページを開く。 */
export async function joinRoom(client: Client, code: string): Promise<Session> {
  const response = await client.context.request.post(`/api/rooms/${code}/join`, {
    data: { name: client.name },
  });
  expect(response.ok()).toBe(true);
  const session = (await response.json()) as Session;
  client.session = session;
  await seedSession(client.page, session);
  await client.page.goto("/");
  return session;
}

/** 入口画面から「部屋を作る」。 */
export async function createRoomFromUi(client: Client): Promise<string> {
  await client.page.goto("/");
  await client.page.fill("#name-input", client.name);
  await client.page.click("#create-room-btn");
  await expect(client.page.locator("#screen-lobby")).toBeVisible();
  const code = (await client.page.locator("#lobby-code").textContent())?.trim() ?? "";
  client.session = { ...client.session, code };
  return code;
}

/** 入口画面から「部屋コードで参加する」。 */
export async function joinRoomFromUi(client: Client, code: string): Promise<void> {
  await client.page.goto("/");
  await client.page.fill("#name-input", client.name);
  await client.page.fill("#code-input", code);
  await client.page.click("#join-room-btn");
  await expect(client.page.locator("#screen-lobby")).toBeVisible();
}

export interface Room {
  code: string;
  clients: Client[];
  host: Client;
}

/** 4人（または指定人数）で部屋を作り、ゲーム開始前のロビーまで進める。 */
export async function setupLobby(
  browser: Browser,
  names: string[],
  viewports: ({ width: number; height: number } | undefined)[] = [],
): Promise<Room> {
  const clients: Client[] = [];
  for (let i = 0; i < names.length; i += 1) {
    clients.push(await newClient(browser, names[i], viewports[i] ?? DESKTOP));
  }
  const session = await hostRoom(clients[0]);
  for (let i = 1; i < clients.length; i += 1) {
    await joinRoom(clients[i], session.code);
  }
  for (const client of clients) {
    await expect(client.page.locator("#screen-lobby")).toBeVisible();
  }
  return { code: session.code, clients, host: clients[0] };
}

/** ロビーでホストが「開始」を押し、全員がゲーム画面になるまで待つ。 */
export async function startGame(room: Room): Promise<void> {
  await room.host.page.click("#start-btn");
  for (const client of room.clients) {
    await expect(client.page.locator("#screen-game")).toBeVisible();
  }
}

export async function setupGame(
  browser: Browser,
  names: string[] = ["あか", "あお", "きいろ", "みどり"],
  viewports: ({ width: number; height: number } | undefined)[] = [],
): Promise<Room> {
  const room = await setupLobby(browser, names, viewports);
  await startGame(room);
  return room;
}

/**
 * 4つの画面から「同時」に早押しする。
 * クリック相当のイベントを同時に発火させる（サーバー側で最初の1つだけが通ることを見る）。
 */
export async function buzzSimultaneously(clients: Client[]): Promise<void> {
  await Promise.all(
    clients.map((client) => client.page.locator("#buzz-btn").dispatchEvent("click")),
  );
}

/** 回答権を持っている画面の数。 */export async function countAnswerers(clients: Client[]): Promise<number> {
  let count = 0;
  for (const client of clients) {
    const value = await client.page.locator("body").getAttribute("data-answerer");
    if (value === "true") count += 1;
  }
  return count;
}

/** 回答権を持っている画面を返す。 */
export async function findAnswerer(clients: Client[]): Promise<Client> {
  for (const client of clients) {
    const value = await client.page.locator("body").getAttribute("data-answerer");
    if (value === "true") return client;
  }
  throw new Error("回答権を持っている画面が見つかりません");
}

/** いま表示されている問題文から正解の番号を引く（問題はアプリ内蔵のものだけ）。 */
export async function correctChoice(page: Page): Promise<number> {
  const text = (await page.locator("#question-text").textContent())?.trim() ?? "";
  const question = QUESTIONS.find((q) => q.text === text);
  if (!question) throw new Error(`問題文が見つかりません: ${text}`);
  return question.answer;
}

export async function waitForPhase(
  clients: Client[],
  phase: string,
  timeout = 20_000,
): Promise<void> {
  for (const client of clients) {
    await expect(client.page.locator("body")).toHaveAttribute("data-phase", phase, {
      timeout,
    });
  }
}
