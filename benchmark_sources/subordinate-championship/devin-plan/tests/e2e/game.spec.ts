import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

const PC = { width: 1280, height: 800 };
const MOBILE = { width: 390, height: 844 };
const ARTIFACTS = ".artifacts";

interface Player {
  name: string;
  context: BrowserContext;
  page: Page;
}

async function openPlayer(browser: Browser, name: string, viewport = PC): Promise<Player> {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto("/");
  return { name, context, page };
}

async function createRoom(player: Player): Promise<string> {
  const { page } = player;
  await page.fill("#name-input", player.name);
  await page.click("#create-btn");
  await expect(page.locator("#screen-lobby")).toBeVisible();
  return (await page.locator("#room-code").innerText()).trim();
}

async function joinRoom(player: Player, code: string) {
  const { page } = player;
  await page.fill("#name-input", player.name);
  await page.fill("#code-input", code);
  await page.click("#join-btn");
  await expect(page.locator("#screen-lobby")).toBeVisible();
}

async function scoreOf(page: Page, name: string): Promise<number> {
  const txt = await page
    .locator("#game-players .player-card", { has: page.locator(".pname", { hasText: name }) })
    .locator(".score")
    .innerText();
  return parseInt(txt, 10);
}

async function answeringName(page: Page): Promise<string> {
  const t = await page.locator("#game-players .player-card.answering .pname").innerText();
  return t.replace("（あなた）", "");
}

// 4択が有効になっている画面がちょうど1つになるまで待ち、その Page を返す
async function answeringPage(players: Player[]): Promise<Page> {
  let answerer: Page | null = null;
  await expect(async () => {
    let count = 0;
    for (const p of players) {
      if ((await p.page.locator(".choice:enabled").count()) > 0) {
        count++;
        answerer = p.page;
      }
    }
    expect(count, "4択が有効な画面はちょうど1つ").toBe(1);
  }).toPass({ timeout: 10_000 });
  return answerer!;
}

// 再早押し用の柔らかい版。問題が終わっていたら null を返す（timeout で投げない）
async function tryAnsweringPage(players: Player[], want: string, timeout: number): Promise<Page | null> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const counter = await players[0].page.locator("#question-counter").innerText().catch(() => "");
    if (counter !== want) return null;
    if (await players[0].page.locator(".choice.correct").isVisible().catch(() => false)) {
      return null;
    }
    let answerer: Page | null = null;
    let count = 0;
    for (const p of players) {
      if ((await p.page.locator(".choice:enabled").count()) > 0) {
        count++;
        answerer = p.page;
      }
    }
    expect(count, "4択が有効な画面は高々1つ").toBeLessThanOrEqual(1);
    if (count === 1) return answerer;
    await players[0].page.waitForTimeout(100);
  }
  return null;
}

// 出題中になってから全員同時に押す。失格者のボタンは無効なのでそのクリックは捨てる
async function buzzAll(players: Player[]) {
  await expect(async () => {
    for (const p of players) {
      if (await p.page.locator("#buzz-btn").isEnabled()) return;
    }
    throw new Error("まだ誰も押せない");
  }).toPass({ timeout: 30_000 });
  await Promise.all(
    players.map((p) =>
      p.page
        .locator("#buzz-btn")
        .click({ timeout: 3_000 })
        .catch(() => {}),
    ),
  );
}

async function isRevealed(page: Page): Promise<boolean> {
  try {
    await expect(page.locator(".choice.correct")).toBeVisible({ timeout: 2_000 });
    return true;
  } catch {
    return false;
  }
}

test("4人対戦: 満員拒否・同時早押し・回答・復帰・タイマー同期・完走・撮影", async ({ browser }) => {
  test.setTimeout(300_000);
  const names = ["アキラ", "ボブ", "チエ", "ダイスケ"];
  const players: Player[] = [];
  for (const [i, name] of names.entries()) {
    players.push(await openPlayer(browser, name, i === 3 ? MOBILE : PC));
  }
  const pages = players.map((p) => p.page);

  // 部屋を作って4人が入る
  const code = await createRoom(players[0]);
  expect(code).toMatch(/^[A-Z2-9]{6}$/);
  for (const p of players.slice(1)) await joinRoom(p, code);

  // 5人目は満員で入れない
  const fifth = await openPlayer(browser, "エイジ");
  await fifth.page.fill("#name-input", fifth.name);
  await fifth.page.fill("#code-input", code);
  await fifth.page.click("#join-btn");
  await expect(fifth.page.locator("#entry-error")).toHaveText(/満員/);
  await fifth.context.close();

  // ロビーの撮影（PC幅・スマホ幅）
  await pages[0].screenshot({ path: `${ARTIFACTS}/lobby-pc.png` });
  await pages[3].screenshot({ path: `${ARTIFACTS}/lobby-mobile.png` });

  // ホストが開始 → 全員ゲーム画面へ
  await players[0].page.click("#start-btn");
  for (const p of pages) {
    await expect(p.locator("#screen-game")).toBeVisible();
    await expect(p.locator("#question-text")).not.toBeEmpty();
  }

  let checkedWrong = false;
  let checkedReload = false;
  let checkedOffline = false;
  let checkedTimerSync = false;
  let tookQuestionShots = false;
  let tookAnsweringShots = false;
  let questionCount = 0;

  for (;;) {
    // 次の問題が出るか、結果画面になるまで待つ（問題を1つ飛ばしても合わせる）
    await expect(async () => {
      if (await pages[0].locator("#screen-result").isVisible()) return;
      const txt = await pages[0].locator("#question-counter").innerText().catch(() => "");
      const m = txt.match(/第(\d+)問/);
      expect(m && parseInt(m[1], 10) >= questionCount + 1).toBeTruthy();
    }).toPass({ timeout: 60_000 });
    if (await pages[0].locator("#screen-result").isVisible()) break;
    const counterNow = await pages[0].locator("#question-counter").innerText();
    questionCount = parseInt(counterNow.match(/第(\d+)問/)![1], 10);
    const want = `第${questionCount}問 / 10`;
    if (questionCount > 10) throw new Error("10問を越えても終わらない");

    if (!tookQuestionShots) {
      // 出題中の撮影（PC幅・スマホ幅）
      await pages[0].screenshot({ path: `${ARTIFACTS}/question-pc.png` });
      await pages[3].screenshot({ path: `${ARTIFACTS}/question-mobile.png` });
      // スマホ幅で問題文・4択・早押しボタンがスクロールなしで見える
      await expect(pages[3].locator("#question-text")).toBeInViewport();
      await expect(pages[3].locator(".choice").first()).toBeInViewport();
      await expect(pages[3].locator("#buzz-btn")).toBeInViewport();
      tookQuestionShots = true;

      // 4画面の残り時間の差が1秒以内
      const timers = await Promise.all(pages.map((p) => p.locator("#timer-text").innerText()));
      const values = timers.map((t) => parseInt(t, 10));
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      checkedTimerSync = true;
    }

    if (!checkedOffline && questionCount >= 3) {
      // チエの回線を5秒切る → ほかの画面に「接続が切れています」→ 復帰で消える
      const offBadge = pages[0]
        .locator("#game-players .player-card", { has: pages[0].locator(".pname", { hasText: "チエ" }) })
        .locator(".badge.off");
      await players[2].context.setOffline(true);
      await expect(offBadge).toBeVisible({ timeout: 15_000 });
      await pages[0].waitForTimeout(5_000);
      await players[2].context.setOffline(false);
      await expect(offBadge).toBeHidden({ timeout: 15_000 });
      await expect(players[2].page.locator("#reconnecting")).toBeHidden({ timeout: 15_000 });
      checkedOffline = true;
    }

    // 全員同時に早押し → 回答権は1人だけ
    await buzzAll(players);
    let answerer: Page;
    try {
      answerer = await answeringPage(players);
    } catch (e) {
      // クリックが問題の締め切りと競合しただけなら次の問題へ。
      // 出題中なのに誰も回答権を得ないのはサーバーのバグなので投げ直す
      const txt = await pages[0].locator("#question-counter").innerText().catch(() => "");
      const revealed = await pages[0].locator(".choice.correct").isVisible().catch(() => false);
      const done = await pages[0].locator("#screen-result").isVisible();
      if (txt !== want || revealed || done) continue;
      throw e;
    }
    let name = await answeringName(answerer);
    let before = await scoreOf(pages[0], name);

    if (!tookAnsweringShots) {
      // 回答中の撮影（PC幅・スマホ幅。回答者カードが強調される）
      await pages[0].screenshot({ path: `${ARTIFACTS}/answering-pc.png` });
      await pages[3].screenshot({ path: `${ARTIFACTS}/answering-mobile.png` });
      tookAnsweringShots = true;
    }

    // 回答権を得た人がページを再読み込みしても同じ名前・同じ点数で戻る
    if (!checkedReload && questionCount >= 2) {
      await answerer.reload();
      await expect(answerer.locator("#screen-game")).toBeVisible({ timeout: 15_000 });
      await expect(
        answerer.locator("#game-players .player-card", {
          has: answerer.locator(".pname", { hasText: `${name}（あなた）` }),
        }),
      ).toBeVisible();
      expect(await scoreOf(answerer, name)).toBe(before);
      checkedReload = true;
      // 再読み込み後も回答権は残っている
      await expect(answerer.locator(".choice").first()).toBeEnabled({ timeout: 15_000 });
    }

    // この問題を終わらせる: 回答→不正解なら残りで再び早押し→…→revealまで
    for (let round = 0; round < 8; round++) {
      await answerer.locator(".choice:enabled").first().click();
      if (await isRevealed(pages[0])) {
        // 全員失格→reveal の場合も不正解として記録する
        if ((await scoreOf(pages[0], name)) === before - 5) checkedWrong = true;
        break;
      }
      // 不正解だった: 全画面で -5、本人のボタンは無効で「回答済み」
      for (const p of pages) {
        expect(await scoreOf(p, name)).toBe(before - 5);
      }
      await expect(answerer.locator("#buzz-btn")).toBeDisabled();
      await expect(
        answerer
          .locator("#game-players .player-card", { has: answerer.locator(".pname", { hasText: name }) })
          .locator(".badge.out"),
      ).toBeVisible();
      checkedWrong = true;
      // 残りの人で再び同時早押し。問題が締め切られていたら抜ける
      const counter = await pages[0].locator("#question-counter").innerText().catch(() => "");
      if (counter !== want) break;
      await buzzAll(players);
      const next = await tryAnsweringPage(players, want, 8_000);
      if (!next) break;
      answerer = next;
      name = await answeringName(answerer);
      before = await scoreOf(pages[0], name);
    }
  }

  expect(questionCount).toBe(10);
  expect(checkedWrong).toBe(true);
  expect(checkedReload).toBe(true);
  expect(checkedOffline).toBe(true);
  expect(checkedTimerSync).toBe(true);

  // 4画面すべてに同じ最終順位
  for (const p of pages) {
    await expect(p.locator("#screen-result")).toBeVisible({ timeout: 30_000 });
  }
  const lists = await Promise.all(pages.map((p) => p.locator("#result-list").innerText()));
  expect(new Set(lists).size).toBe(1);

  // 結果の撮影（PC幅・スマホ幅）
  await pages[0].screenshot({ path: `${ARTIFACTS}/result-pc.png` });
  await pages[3].screenshot({ path: `${ARTIFACTS}/result-mobile.png` });

  for (const p of players) await p.context.close();
});

test("タイムアウト: 20秒無回答で正解表示・回答10秒切れで-5", async ({ browser }) => {
  test.setTimeout(120_000);
  const host = await openPlayer(browser, "フジオ");
  const guest = await openPlayer(browser, "ゲスト");
  const code = await createRoom(host);
  await joinRoom(guest, code);
  await host.page.click("#start-btn");
  await expect(host.page.locator("#question-text")).not.toBeEmpty();

  // 誰も押さない → 実時間20秒で正解が全員に表示される
  await expect(host.page.locator(".choice.correct")).toBeVisible({ timeout: 30_000 });
  await expect(guest.page.locator(".choice.correct")).toBeVisible();
  await expect(host.page.locator("#game-status")).toContainText("正解は");

  // 次の問題: 押した人が何も選ばない → 実時間10秒で -5
  await expect(async () => {
    expect(await host.page.locator("#question-counter").innerText()).toBe("第2問 / 10");
  }).toPass({ timeout: 30_000 });
  await host.page.locator("#buzz-btn").click();
  await expect(host.page.locator(".choice").first()).toBeEnabled({ timeout: 5_000 });
  const t0 = Date.now();
  await expect.poll(() => scoreOf(host.page, "フジオ"), { timeout: 20_000 }).toBe(-5);
  expect(Date.now() - t0).toBeGreaterThanOrEqual(8_000);
  expect(await scoreOf(guest.page, "フジオ")).toBe(-5);
  await expect(host.page.locator("#buzz-btn")).toBeDisabled();
  await expect(host.page.locator("#game-status")).toContainText("この問題は回答済み");

  await host.context.close();
  await guest.context.close();
});
