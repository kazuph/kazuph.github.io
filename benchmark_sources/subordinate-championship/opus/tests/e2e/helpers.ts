import { type Browser, type BrowserContext, expect, type Page } from "@playwright/test";

export interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

/** プレイヤー1人 = 独立したブラウザ（Cookie・保存領域が別）1つ */
export async function newPlayer(browser: Browser, name: string, viewport = { width: 1280, height: 800 }): Promise<Player> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  return { name, context, page };
}

export async function createRoom(p: Player): Promise<string> {
  await p.page.goto("/");
  await p.page.getByPlaceholder("例: たろう").fill(p.name);
  await p.page.getByRole("button", { name: "部屋を作る" }).click();
  const code = (await p.page.getByTestId("room-code").innerText()).replace(/\s/g, "");
  expect(code).toMatch(/^[A-Z2-9]{5}$/);
  return code;
}

export async function joinRoom(p: Player, code: string) {
  await p.page.goto("/");
  await p.page.getByPlaceholder("例: たろう").fill(p.name);
  await p.page.getByLabel("部屋コード（5文字）").fill(code);
  await p.page.getByRole("button", { name: "参加する" }).click();
}

export async function setupRoom(browser: Browser, names: string[], viewport?: { width: number; height: number }) {
  const players: Player[] = [];
  for (const n of names) players.push(await newPlayer(browser, n, viewport));
  const code = await createRoom(players[0]!);
  for (const p of players.slice(1)) {
    await joinRoom(p, code);
    await expect(p.page.getByTestId("room-code")).toBeVisible();
  }
  await expect(players[0]!.page.getByText(`参加者 ${names.length} / 4`)).toBeVisible();
  return { code, players };
}

export async function startGame(players: Player[]) {
  await players[0]!.page.getByRole("button", { name: "▶ ゲーム開始" }).click();
  await Promise.all(players.map((p) => expect(p.page.getByTestId("question-text")).toBeVisible({ timeout: 10_000 })));
}

export const buzzer = (p: Player) => p.page.locator("button.buzzer");

/** 画面の得点表から {名前: 点数} を読む */
export async function scoresOf(p: Player): Promise<Record<string, number>> {
  return p.page.evaluate(() => {
    const out: Record<string, number> = {};
    document.querySelectorAll("[data-testid=scoreboard] .seat").forEach((el) => {
      const name = el.querySelector(".seat-name")?.textContent ?? "";
      const score = Number.parseInt(el.querySelector(".seat-score")?.firstChild?.textContent ?? "NaN", 10);
      out[name] = score;
    });
    return out;
  });
}

/**
 * 今の問題を解く。正解は画面に出ていないので、押せる人が順に別の選択肢を選ぶ。
 * 4つの選択肢を別々に試すので、4回以内に必ず誰かが正解する。正解者の名前を返す。
 */
export async function solveCurrentQuestion(players: Player[]): Promise<string | null> {
  const tried = new Set<number>();
  for (const p of players) {
    const live = p.page.locator("button.buzzer.is-live");
    try {
      await live.waitFor({ timeout: 2000 });
    } catch {
      continue;
    }
    await live.click();
    const mine = p.page.locator(".banner-me");
    try {
      await mine.waitFor({ timeout: 3000 });
    } catch {
      continue;
    }
    const choice = [0, 1, 2, 3].find((c) => !tried.has(c))!;
    tried.add(choice);
    await p.page.locator(`.choice[data-choice="${choice}"]`).click();
    await p.page.waitForFunction(() => document.querySelector(".banner-reveal, .banner-miss"));
    if (await p.page.locator(".banner-reveal.has-winner").isVisible()) return p.name;
  }
  // 全員が外した場合も正解発表になる
  await expect(players[0]!.page.locator(".banner-reveal")).toBeVisible();
  return null;
}

export async function closeAll(players: Player[]) {
  await Promise.all(players.map((p) => p.context.close()));
}
