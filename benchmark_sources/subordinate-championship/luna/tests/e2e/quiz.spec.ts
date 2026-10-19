import { expect, test, type Browser, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { QUESTIONS } from "../../src/questions";

let browserErrors: string[] = [];
let expectedConflictLogs = 0;

test.beforeEach(() => { browserErrors = []; expectedConflictLogs = 0; });
test.afterEach(() => {
  expect(browserErrors, "unexpected browser errors").toEqual([]);
  expect(expectedConflictLogs, "expected capacity response was logged").toBe(0);
});

test("4人が同じローカル対戦に参加し、同時押し・誤答・再読み込み後もサーバー状態がそろう", async ({ browser }) => {
  const players = await createPlayers(browser, 5);
  try {
    const roomCode = await createRoom(players[0], "あかり");
    await expect(players[0].getByRole("button", { name: "ゲームを開始" })).toBeDisabled();
    await joinRoom(players[1], roomCode, "みなと");
    await expect(players[1].getByRole("button", { name: "ゲームを開始" })).toHaveCount(0);
    await joinRoom(players[2], roomCode, "さくら");
    await joinRoom(players[3], roomCode, "れん");
    await players[4].goto("/");
    await players[4].getByLabel("部屋コード").fill(roomCode);
    await players[4].locator('#join-form input[name="name"]').fill("5人目");
    expectedConflictLogs += 1;
    await players[4].getByRole("button", { name: "部屋に参加する" }).click();
    await expect(players[4].getByRole("alert")).toContainText("満員");
    for (const page of players.slice(0, 4)) await expect(page.getByText("対戦ロビー")).toBeVisible();
    await expect(players[0].getByRole("button", { name: "ゲームを開始" })).toBeEnabled();

    await players[0].getByRole("button", { name: "ゲームを開始" }).click();
    for (const page of players.slice(0, 4)) await expect(page.getByText(QUESTIONS[0].prompt)).toBeVisible();
    await expect(players[0].locator(".timer")).toHaveText(/^00:(20|19)$/);
    const timerValues = await Promise.all(players.slice(0, 4).map((page) => page.locator(".timer").textContent()));
    const timerSeconds = timerValues.map((value) => Number(value?.split(":").at(-1)));
    expect(Math.max(...timerSeconds) - Math.min(...timerSeconds)).toBeLessThanOrEqual(1);

    await Promise.all(players.slice(0, 4).map((page) => page.getByRole("button", { name: "早押し！" }).click()));
    for (const page of players.slice(0, 4)) {
      await expect(page.locator(".player-name small", { hasText: "ANSWERING" })).toHaveCount(1);
    }
    const answererIndex = await Promise.all(players.slice(0, 4).map(async (page, index) =>
      (await page.locator(".turn-callout").textContent())?.includes("あなたの番") ? index : -1
    )).then((indexes) => indexes.find((index) => index >= 0));
    if (answererIndex === undefined) throw new Error("同時押し後に回答権を持つプレイヤーがいません。");
    await submitAnswerWithForgedScore(players[answererIndex], 0, 1000);
    await expect(players[answererIndex].locator(".player-row").filter({ hasText: ["あかり", "みなと", "さくら", "れん"][answererIndex] })).toContainText("-5");
    await expect(players[answererIndex].getByText("この問題では回答済みです。次の問題を待ちましょう。")).toBeVisible();

    const nextPlayer = (answererIndex + 1) % 4;
    await players[nextPlayer].getByRole("button", { name: "早押し！" }).click();
    await players[nextPlayer].locator(`button[data-action="answer"][data-choice="${QUESTIONS[0].answer}"]`).click();
    for (const page of players.slice(0, 4)) await expect(page.getByText(QUESTIONS[1].prompt)).toBeVisible();
    for (const page of players.slice(0, 4)) {
      await expect(page.locator(".announcement")).toContainText(`第1問の正解：${QUESTIONS[0].choices[QUESTIONS[0].answer]}`);
    }

    await players[nextPlayer].reload();
    await expect(players[nextPlayer].getByText(QUESTIONS[1].prompt)).toBeVisible();
    await expect(players[nextPlayer].locator(".player-row").filter({ hasText: ["あかり", "みなと", "さくら", "れん"][nextPlayer] })).toContainText("10");
    await expect(players[nextPlayer].getByText("接続中")).toBeVisible();
    await players[nextPlayer].context().setOffline(true);
    await expect(players[nextPlayer].getByText("接続が切れました")).toBeVisible();
    await players[nextPlayer].context().setOffline(false);
    await expect(players[nextPlayer].getByText("接続中")).toBeVisible({ timeout: 10_000 });
  } finally {
    await closePages(players);
  }
});

test("全員が誤答すると正解を表示して次の問題へ進み、全員に減点を反映する", async ({ browser }) => {
  const players = await createPlayers(browser, 2);
  try {
    const roomCode = await createRoom(players[0], "一人目");
    await joinRoom(players[1], roomCode, "二人目");
    await players[0].getByRole("button", { name: "ゲームを開始" }).click();
    await players[0].getByRole("button", { name: "早押し！" }).click();
    await players[0].locator('button[data-action="answer"][data-choice="0"]').click();
    await players[1].getByRole("button", { name: "早押し！" }).click();
    await players[1].locator('button[data-action="answer"][data-choice="0"]').click();
    for (const page of players) {
      await expect(page.getByText(QUESTIONS[1].prompt)).toBeVisible();
      await expect(page.getByText(`第1問の正解：${QUESTIONS[0].choices[QUESTIONS[0].answer]}`)).toBeVisible();
      await expect(page.locator(".player-row").filter({ hasText: "一人目" })).toContainText("-5");
      await expect(page.locator(".player-row").filter({ hasText: "二人目" })).toContainText("-5");
    }
  } finally {
    await closePages(players);
  }
});

test("10問に正解すると、全員にサーバー採点の最終順位を表示する", async ({ browser }) => {
  const players = await createPlayers(browser, 2);
  try {
    const roomCode = await createRoom(players[0], "連勝さん");
    await joinRoom(players[1], roomCode, "チャレンジャー");
    await players[0].getByRole("button", { name: "ゲームを開始" }).click();

    for (const question of QUESTIONS) {
      for (const page of players) await expect(page.getByText(question.prompt)).toBeVisible();
      await players[0].getByRole("button", { name: "早押し！" }).click();
      await players[0].locator(`button[data-action="answer"][data-choice="${question.answer}"]`).click();
    }

    for (const page of players) {
      await expect(page.getByRole("heading", { name: "最終ランキング" })).toBeVisible();
      await expect(page.locator(".result-row").first()).toContainText("連勝さん");
      await expect(page.locator(".result-row").first()).toContainText("100");
      await expect(page.getByText("GAME COMPLETE · 10 QUESTIONS")).toBeVisible();
    }
  } finally {
    await closePages(players);
  }
});

test("10秒で回答権が切れ、20秒で問題が締め切られて正解が表示される", async ({ browser }) => {
  const players = await createPlayers(browser, 2);
  try {
    const roomCode = await createRoom(players[0], "タイマー係");
    await joinRoom(players[1], roomCode, "待つ人");
    await players[0].getByRole("button", { name: "ゲームを開始" }).click();
    await players[0].getByRole("button", { name: "早押し！" }).click();
    await expect(players[1].getByText("タイマー係 さんが回答中です。判定を待ちましょう。")).toBeVisible();
    await expect(players[0].locator(".timer")).toHaveText(/^00:(10|09)$/);
    await expect(players[1].getByRole("button", { name: "早押し！" })).toBeEnabled({ timeout: 12_000 });
    await expect(players[1].getByText("タイマー係 さんが回答中です。判定を待ちましょう。")).toHaveCount(0);
    await expect(players[0].locator(".player-row").filter({ hasText: "タイマー係" }).locator(".player-score")).toHaveText("0");
    await expect(players[0].getByRole("button", { name: "回答済み" })).toBeDisabled();

    const nextQuestion = QUESTIONS[1];
    await expect(players[0].getByText(nextQuestion.prompt)).toBeVisible({ timeout: 22_000 });
    await expect(players[1].getByText(`第1問の正解：${QUESTIONS[0].choices[QUESTIONS[0].answer]}`)).toBeVisible();
  } finally {
    await closePages(players);
  }
});

test("PC幅とスマホ幅でロビー・出題中・回答中・結果の画面証拠を保存する", async ({ browser }) => {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  attachDiagnostics(desktop);
  attachDiagnostics(mobile);
  const pages = [desktop, mobile];
  try {
    await desktop.goto("/");
    await mobile.goto("/");
    const roomCode = await createRoom(desktop, "ホスト");
    await joinRoom(mobile, roomCode, "ゲスト");
    await Promise.all(pages.map((page, index) => saveScreenshot(page, `lobby-${index ? "mobile" : "desktop"}`)));
    await desktop.getByRole("button", { name: "ゲームを開始" }).click();
    await Promise.all(pages.map((page) => expect(page.getByText(QUESTIONS[0].prompt)).toBeVisible()));
    await Promise.all(pages.map((page, index) => saveScreenshot(page, `question-${index ? "mobile" : "desktop"}`)));
    await desktop.getByRole("button", { name: "早押し！" }).click();
    await expect(desktop.getByText("あなたの番です。10秒以内に回答してください。")).toBeVisible();
    await expect(mobile.getByText("ホスト さんが回答中です。判定を待ちましょう。")).toBeVisible();
    await saveScreenshot(desktop, "answering-desktop");
    await saveScreenshot(mobile, "answering-observer-mobile");
    await desktop.locator(`button[data-action="answer"][data-choice="${QUESTIONS[0].answer}"]`).click();
    await mobile.getByRole("button", { name: "早押し！" }).click();
    await expect(mobile.getByText("あなたの番です。10秒以内に回答してください。")).toBeVisible();
    await expect(desktop.getByText("ゲスト さんが回答中です。判定を待ちましょう。")).toBeVisible();
    await saveScreenshot(mobile, "answering-mobile");
    await saveScreenshot(desktop, "answering-observer-desktop");
    await mobile.locator(`button[data-action="answer"][data-choice="${QUESTIONS[1].answer}"]`).click();
    for (const question of QUESTIONS.slice(2)) {
      await desktop.getByRole("button", { name: "早押し！" }).click();
      await desktop.locator(`button[data-action="answer"][data-choice="${question.answer}"]`).click();
    }
    await Promise.all(pages.map((page) => expect(page.getByRole("heading", { name: "最終ランキング" })).toBeVisible()));
    await Promise.all(pages.map((page, index) => saveScreenshot(page, `results-${index ? "mobile" : "desktop"}`)));
  } finally {
    await closePages(pages);
  }
});

async function createPlayers(browser: Browser, count: number): Promise<Page[]> {
  const pages = await Promise.all(Array.from({ length: count }, () => browser.newPage()));
  pages.forEach(attachDiagnostics);
  return pages;
}

function attachDiagnostics(page: Page): void {
  page.on("pageerror", (error) => browserErrors.push(`${page.url()}: ${error.message}`));
  page.on("console", (message) => {
    const text = message.text();
    if (message.type() !== "error" || text.includes("WebSocket connection")) return;
    if (text.includes("status of 409 (Conflict)") && expectedConflictLogs > 0) {
      expectedConflictLogs -= 1;
      return;
    }
    browserErrors.push(`${page.url()}: ${text}`);
  });
}

async function createRoom(page: Page, name: string): Promise<string> {
  await page.goto("/");
  await page.getByLabel("プレイヤー名").first().fill(name);
  await page.getByRole("button", { name: "部屋を作る" }).click();
  await expect(page.getByText("対戦ロビー")).toBeVisible();
  await expect(page.getByText("接続中")).toBeVisible();
  return (await page.locator(".room-code").textContent())!.trim();
}

async function joinRoom(page: Page, code: string, name: string): Promise<void> {
  await page.goto("/");
  await page.getByLabel("プレイヤー名").last().fill(name);
  await page.getByLabel("部屋コード").fill(code);
  await page.getByRole("button", { name: "部屋に参加する" }).click();
  await expect(page.getByText("対戦ロビー")).toBeVisible();
  await expect(page.getByText("接続中")).toBeVisible();
}

async function saveScreenshot(page: Page, label: string): Promise<void> {
  await mkdir(".artifacts/screenshots", { recursive: true });
  const layout = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
  expect(layout.content).toBeLessThanOrEqual(layout.viewport);
  const state = label.split("-")[0];
  const contrast = await page.evaluate((stage) => {
    const selectors = stage === "lobby"
      ? [".eyebrow", ".empty-slot", ".start-help", ".button-primary", ".room-code"]
      : stage === "question"
        ? [".question-counter", ".buzz-button", ".player-rank", ".player-name"]
        : stage === "answering"
          ? [".answer-choice", ".turn-callout", ".player-rank", ".player-name"]
          : [".result-heading", ".result-rank", ".result-name", ".result-score", ".footer"];
    const luminance = (color: string) => {
      const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      const linear = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return linear.length === 3 ? 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] : null;
    };
    return selectors.flatMap((selector) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return [];
      const foreground = getComputedStyle(element).color;
      let background: Element | null = element;
      while (background && getComputedStyle(background).backgroundColor === "rgba(0, 0, 0, 0)") background = background.parentElement;
      const backColor = background ? getComputedStyle(background).backgroundColor : "rgb(255, 255, 255)";
      const foregroundLum = luminance(foreground);
      const backgroundLum = luminance(backColor);
      if (foregroundLum === null || backgroundLum === null) return [{ selector, ratio: 0, required: 4.5 }];
      const ratio = (Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05);
      const style = getComputedStyle(element);
      const fontSize = Number.parseFloat(style.fontSize);
      const fontWeight = Number.parseInt(style.fontWeight, 10);
      const required = fontSize >= 24 || (fontSize >= 18.67 && fontWeight >= 700) ? 3 : 4.5;
      return [{ selector, ratio, required }];
    });
  }, state);
  expect(contrast.filter((item) => item.ratio < item.required), `${label} text contrast: ${JSON.stringify(contrast)}`).toEqual([]);
  await page.screenshot({ path: `.artifacts/screenshots/${label}.png`, fullPage: true });
}

async function submitAnswerWithForgedScore(page: Page, choice: number, score: number): Promise<void> {
  await page.evaluate(async ({ choice, score }) => {
    const saved = localStorage.getItem("quiz-session");
    if (!saved) throw new Error("player token is missing");
    const session = JSON.parse(saved);
    const socket = new WebSocket(`${location.origin.replace(/^http/, "ws")}/ws/${encodeURIComponent(session.code)}?token=${encodeURIComponent(session.token)}`);
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        socket.close();
        reject(new Error("forged answer was not acknowledged"));
      }, 5_000);
      socket.addEventListener("open", () => socket.send(JSON.stringify({ type: "answer", choice, score })));
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.type === "state" && message.state.phase === "question") {
          window.clearTimeout(timeout);
          socket.close();
          resolve();
        }
      });
      socket.addEventListener("error", () => {
        window.clearTimeout(timeout);
        reject(new Error("forged answer socket failed"));
      });
    });
  }, { choice, score });
}

async function closePages(pages: Page[]): Promise<void> {
  await Promise.all(pages.map((page) => page.close()));
}
