/**
 * ブラウザE2E（Playwright / Chromium）。
 * 実際の4ブラウザを同時に動かし、要件の11項目をブラウザ目線で確認する。
 * スクリーンショットは .artifacts/ に保存する（PC幅・スマホ幅の両方）。
 */
import { expect, test, type Browser } from "@playwright/test";
import { QUESTIONS } from "../src/questions";
import {
  capture,
  closeAll,
  enterRoom,
  expectNoHorizontalScroll,
  readReveal,
  roomCodeOf,
  scoresOf,
  waitForPhase,
  waitForScreen,
  VIEWPORTS,
  type Player,
  type SizeKey,
} from "./helpers";

const sizeOf = (): SizeKey => (test.info().project.name === "mobile" ? "mobile" : "pc");

/** 4人全員の画面に正解が表示されていることを、同じ瞬間に確認する */
async function expectRevealOnAll(players: Player[], questionIndex: number, choiceIndex: number) {
  await waitForPhase(players[0].page, "reveal");
  const views = await Promise.all(players.map((p) => readReveal(p.page)));
  for (const view of views) {
    expect(view.phase).toBe("reveal");
    expect(view.progress).toContain(`第${questionIndex + 1}問`);
    expect(view.answer).toContain(QUESTIONS[questionIndex].choices[choiceIndex]);
  }
  return views;
}

async function joinFour(browser: Browser, size: SizeKey, hostName = "あおい") {
  const host = await enterRoom(browser, size, hostName);
  await waitForScreen(host.page, "lobby");
  const code = await roomCodeOf(host.page);
  const players: Player[] = [host];
  for (const name of ["はると", "みお", "そうた"]) {
    const p = await enterRoom(browser, size, name, code);
    await waitForScreen(p.page, "lobby");
    players.push(p);
  }
  for (const p of players) {
    await expect(p.page.locator("#lobby-count")).toHaveText("4");
    await expect(p.page.locator(".seat.filled")).toHaveCount(4);
  }
  return { host, players, code };
}

test.describe("4人オンライン早押しクイズ", () => {
  test("4人が同時に遊べる／同時押しで1人だけが回答権を得る／10問完走で順位表示", async ({ browser }) => {
    test.setTimeout(300_000);
    const size = sizeOf();
    const { host, players, code } = await joinFour(browser, size);

    // --- 要件1・2: ロビーと定員 -------------------------------------------------
    await expectNoHorizontalScroll(host.page);
    await capture(host.page, "lobby", size);

    // 5人目は入れず、理由が画面に出る
    const fifthContext = await browser.newContext(VIEWPORTS[size]);
    const fifthPage = await fifthContext.newPage();
    await fifthPage.goto("/");
    await fifthPage.locator("#input-name").fill("いつか");
    await fifthPage.locator("#input-code").fill(code);
    await fifthPage.locator("#btn-join").click();
    await expect(fifthPage.locator("#entry-error")).toContainText("満員");
    await expect(fifthPage.locator("body")).toHaveAttribute("data-screen", "entry");
    await capture(fifthPage, "room-full", size);
    await fifthContext.close();

    // --- 要件3: ホストが開始 -------------------------------------------------------
    await host.page.locator("#btn-start").click();
    for (const p of players) await waitForPhase(p.page, "question");

    // --- 要件4・5・11: 4択が出題され、全員の画面がそろう -----------------------------
    const questionText = await host.page.locator("#q-text").textContent();
    expect(questionText).toBe(QUESTIONS[0].text);
    await expect(host.page.locator(".choice")).toHaveCount(4);
    await expect(host.page.locator("#q-progress")).toContainText("第1問");
    for (const p of players) {
      await expect(p.page.locator(".choice")).toHaveCount(4);
      await expect(p.page.locator("#q-text")).toHaveText(QUESTIONS[0].text);
      await expect(p.page.locator("#btn-buzz")).toHaveAttribute("data-state", "ready");
      await expect(p.page.locator("#timer-text")).toHaveText(/^\d{1,2}\.\d$/);
    }
    await expectNoHorizontalScroll(host.page);
    const buzzBox = await host.page.locator("#btn-buzz").boundingBox();
    const viewport = host.page.viewportSize()!;
    expect(buzzBox!.x).toBeGreaterThanOrEqual(0);
    expect(buzzBox!.x + buzzBox!.width).toBeLessThanOrEqual(viewport.width + 1);
    // スクロールしなくても早押しボタンが見える（スマホ幅でも遊べる）
    expect(buzzBox!.y + buzzBox!.height).toBeLessThanOrEqual(viewport.height + 1);
    await capture(host.page, "question", size);

    // 4人が同時に早押しする。
    // 負けた側のボタンはサーバーからのスナップショットで即座に無効化されるため、
    // Playwright の click() だと actionability 待ちで待たされてしまう。
    // 「ほぼ同時に押す」状況を作るため click イベントを直接発火させる。
    const tBuzz = Date.now();
    await Promise.all(players.map((p) => p.page.locator("#btn-buzz").dispatchEvent("click")));
    for (const p of players) await waitForPhase(p.page, "answering");

    const views = await Promise.all(
      players.map((p) =>
        p.page.evaluate(() => ({
          phase: document.body.dataset.phase ?? "",
          answerer: document.body.dataset.answerer ?? "",
          me: document.body.dataset.me ?? "",
          screen: document.body.dataset.screen ?? "",
          buzzState: document.getElementById("btn-buzz")?.getAttribute("data-state") ?? "",
        })),
      ),
    );
    const winners = players.filter(
      (_, index) => views[index].answerer !== "" && views[index].answerer === views[index].me,
    );
    expect(winners, "回答権を得たのは1人だけ").toHaveLength(1);
    expect(Date.now() - tBuzz, "4人がほぼ同時に押している").toBeLessThan(2000);
    const winner = winners[0];
    const winnerId = await winner.page.evaluate(() => document.body.dataset.me!);
    const hostId = await host.page.evaluate(() => document.body.dataset.me!);

    // 全員の画面で「誰が回答中か」「点数」「残り時間」がそろっている
    const answererIds = await Promise.all(
      players.map((p) => p.page.evaluate(() => document.body.dataset.answerer ?? "")),
    );
    expect(new Set(answererIds).size).toBe(1);
    expect(answererIds[0]).toBe(winnerId);
    const scoreViews = await Promise.all(players.map((p) => scoresOf(p.page)));
    for (const view of scoreViews) expect(view).toEqual(scoreViews[0]);
    for (const p of players) {
      await expect(p.page.locator("#status-line")).toContainText(
        p === winner ? "あなたが回答中" : winner.name,
      );
      await expect(p.page.locator(`.score-card[data-player-id="${winnerId}"]`)).toHaveClass(/answering/);
      await expect(p.page.locator("#timer-text")).toHaveText(/^\d{1,2}\.\d$/);
    }
    await capture(winner.page, "answering", size);

    // --- 要件6: 正解は +10 ---------------------------------------------------------
    await winner.page.locator(".choice").nth(QUESTIONS[0].correct).click();
    const revealQ1 = await expectRevealOnAll(players, 0, QUESTIONS[0].correct);
    for (const view of revealQ1) expect(view.headline).toContain("+10");
    const afterQ1 = await scoresOf(host.page);
    expect(afterQ1[winnerId]).toBe(10);

    // --- 要件7・8: 不正解は -5 でその問題はもう押せない。残りで再開 ----------------
    await waitForPhase(host.page, "question");
    await expect(host.page.locator("#q-progress")).toContainText("第2問");
    await host.page.locator("#btn-buzz").click();
    await waitForPhase(host.page, "answering");
    await host.page.locator(".choice").nth((QUESTIONS[1].correct + 1) % 4).click();
    for (const p of players) await waitForPhase(p.page, "question");

    const afterWrong = await scoresOf(host.page);
    // ホストが1問目で回答権を得ていれば 10 点持っている
    expect(afterWrong[hostId]).toBe((winner === host ? 10 : 0) - 5);
    await expect(host.page.locator("#status-line")).toContainText("もう押せません");
    await expect(host.page.locator("#btn-buzz")).toHaveAttribute("data-state", "waiting");
    await expect(host.page.locator("#btn-buzz")).toBeDisabled();
    await expect(host.page.locator(`.score-card[data-player-id="${hostId}"]`)).toHaveClass(/locked/);
    await expect(players[1].page.locator("#btn-buzz")).toHaveAttribute("data-state", "ready");

    // 残りの人で早押しが再開し、その人が正解すると +10
    const second = players[1];
    const secondId = await second.page.evaluate(() => document.body.dataset.me!);
    await second.page.locator("#btn-buzz").click();
    await waitForPhase(second.page, "answering");
    await second.page.locator(".choice").nth(QUESTIONS[1].correct).click();
    await expectRevealOnAll(players, 1, QUESTIONS[1].correct);
    expect((await scoresOf(host.page))[secondId]).toBe(10 + (winner === second ? 10 : 0));

    // --- 要件9: 残り8問を進めて10問で結果画面 -------------------------------------
    for (let index = 2; index < QUESTIONS.length; index++) {
      await waitForPhase(host.page, "question");
      await expect(host.page.locator("#q-progress")).toContainText(`第${index + 1}問`);
      await expect(host.page.locator("#btn-buzz")).toHaveAttribute("data-state", "ready");
      await host.page.locator("#btn-buzz").click();
      await waitForPhase(host.page, "answering");
      await host.page.locator(".choice").nth(QUESTIONS[index].correct).click();
      await expectRevealOnAll(players, index, QUESTIONS[index].correct);
    }

    for (const p of players) await waitForScreen(p.page, "result");
    await expectNoHorizontalScroll(host.page);

    const ranking = await host.page.evaluate(() =>
      Array.from(document.querySelectorAll(".rank-row")).map((row) => ({
        name: (row.querySelector(".rank-name")?.textContent ?? "").replace("（あなた）", ""),
        score: Number.parseInt(row.querySelector(".rank-score")?.textContent ?? "0", 10),
      })),
    );
    expect(ranking).toHaveLength(4);
    expect(ranking[0].name).toBe("あおい");
    const expected: Record<string, number> = { あおい: 75, はると: 10, みお: 0, そうた: 0 };
    if (winner.name === "あおい") expected["あおい"] += 10;
    else expected[winner.name] += 10;
    expect(Object.fromEntries(ranking.map((r) => [r.name, r.score]))).toEqual(expected);
    expect(ranking[0].score).toBe(85 + (winner.name === "あおい" ? 0 : -10));
    for (const p of players) {
      await expect(p.page.locator(".rank-row .rank-score").first()).toHaveText(`${ranking[0].score}点`);
    }
    await capture(host.page, "result", size);
    await closeAll(players);
  });

  test("再読み込み・一時切断でも同じプレイヤーとして点数を保って復帰する", async ({ browser }) => {
    test.setTimeout(180_000);
    const size = sizeOf();
    const host = await enterRoom(browser, size, "あおい");
    await waitForScreen(host.page, "lobby");
    const code = await roomCodeOf(host.page);

    // ゲストは「回線が一時的に切れる」状況を作るため、WebSocket を Playwright で仲介し、
    // テストの好きなタイミングで接続を落とせるようにする。
    const guestContext = await browser.newContext(VIEWPORTS[size]);
    const guestPage = await guestContext.newPage();
    let connections = 0;
    let activeRoute: { close: (options?: { code?: number; reason?: string }) => Promise<void> } | null = null;
    await guestPage.routeWebSocket(/\/ws\?/, (ws) => {
      connections += 1;
      activeRoute = ws;
      const server = ws.connectToServer();
      ws.onMessage((message) => server.send(message));
      server.onMessage((message) => ws.send(message));
    });
    await guestPage.goto("/");
    await guestPage.locator("#input-name").fill("はると");
    await guestPage.locator("#input-code").fill(code);
    await guestPage.locator("#btn-join").click();
    await waitForScreen(guestPage, "lobby");
    const guest: Player = { name: "はると", context: guestContext, page: guestPage };
    await expect(guestPage.locator("#lobby-count")).toHaveText("2");

    await host.page.locator("#btn-start").click();
    await waitForPhase(guest.page, "question");
    await guest.page.locator("#btn-buzz").click();
    await waitForPhase(guest.page, "answering");
    await guest.page.locator(".choice").nth(QUESTIONS[0].correct).click();
    await waitForPhase(host.page, "reveal");
    const guestId = await guest.page.evaluate(() => document.body.dataset.me!);
    expect((await scoresOf(host.page))[guestId]).toBe(10);

    // --- 要件10: ブラウザを再読み込み -------------------------------------------------
    await guest.page.reload();
    await waitForScreen(guest.page, "game");
    await expect(guest.page.locator("#net-status")).toHaveClass(/online/);
    await expect(guest.page.locator(".score-card.me .score-name")).toHaveText("はると");
    await expect(guest.page.locator(".score-card.me .score-value")).toContainText("10");
    await expect(guest.page.locator("body")).toHaveAttribute("data-me", guestId);

    // 復帰後も同じ問題に参加できる
    await waitForPhase(guest.page, "question");
    await expect(guest.page.locator("#btn-buzz")).toHaveAttribute("data-state", "ready");

    // --- 要件10: 回線が一時的に切れる -------------------------------------------------
    const connectionsBefore = connections;
    await activeRoute!.close({ code: 1011, reason: "simulated drop" });
    await expect(guest.page.locator("#conn-banner")).toBeVisible({ timeout: 20_000 });
    await expect(guest.page.locator("#conn-banner")).toBeHidden({ timeout: 40_000 });
    await expect(guest.page.locator("#net-status")).toHaveClass(/online/);
    expect(connections).toBeGreaterThan(connectionsBefore);
    await expect(guest.page.locator(".score-card.me .score-value")).toContainText("10");
    await expect(guest.page.locator("body")).toHaveAttribute("data-me", guestId);

    // ホスト側からも同じ点数・同じ名前で見えている
    await expect(host.page.locator(`.score-card[data-player-id="${guestId}"] .score-value`)).toContainText("10");
    await expect(host.page.locator(`.score-card[data-player-id="${guestId}"] .score-name`)).toHaveText("はると");

    await closeAll([host, guest]);
  });

  test("2人未満では開始できず、開始できるのはホストだけ", async ({ browser }) => {
    test.setTimeout(60_000);
    const size = sizeOf();
    const host = await enterRoom(browser, size, "あおい");
    await waitForScreen(host.page, "lobby");
    await expect(host.page.locator("#btn-start")).toBeDisabled();
    await expect(host.page.locator("#btn-start")).toContainText("あと1人");
    await expect(host.page.locator("#lobby-count")).toHaveText("1");

    const code = await roomCodeOf(host.page);
    const guest = await enterRoom(browser, size, "はると", code);
    await waitForScreen(guest.page, "lobby");
    // ゲストには開始ボタンが出ない
    await expect(guest.page.locator("#btn-start")).toBeHidden();
    await expect(host.page.locator("#btn-start")).toBeEnabled();

    // ホスト以外が開始しても始まらない（サーバーが拒否）
    await guest.page.evaluate(() => {
      const button = document.getElementById("btn-start") as HTMLButtonElement;
      button.disabled = false;
      button.classList.remove("hidden");
      button.click();
    });
    await expect(guest.page.locator(".toast.error")).toContainText("ホスト", { timeout: 10_000 });
    await expect(host.page.locator("body")).toHaveAttribute("data-screen", "lobby");

    await closeAll([host, guest]);
  });

  test("入室画面: 名前と部屋コードで入れる（入力不備・存在しない部屋は理由が出る）", async ({ browser }) => {
    test.setTimeout(60_000);
    const size = sizeOf();
    const context = await browser.newContext(VIEWPORTS[size]);
    const page = await context.newPage();
    await page.goto("/");

    await expect(page.locator("#input-name")).toBeVisible();
    await expect(page.locator("#input-code")).toBeVisible();
    await expect(page.locator("#btn-create")).toBeVisible();
    await expect(page.locator("#btn-join")).toBeVisible();
    expect(await page.evaluate(() => document.body.dataset.screen)).toBe("entry");
    await expectNoHorizontalScroll(page);

    // 名前未入力
    await page.locator("#input-name").fill("");
    await page.locator("#btn-create").click();
    await expect(page.locator("#entry-error")).toContainText("名前を入力してください");

    // 部屋コードが短すぎる
    await page.locator("#input-name").fill("あおい");
    await page.locator("#input-code").fill("AB");
    await page.locator("#btn-join").click();
    await expect(page.locator("#entry-error")).toContainText("4文字");

    // 存在しない部屋コード
    await page.locator("#input-code").fill("ZZZZ");
    await page.locator("#btn-join").click();
    await expect(page.locator("#entry-error")).toContainText("ありません");

    // 名前を入れ直して部屋を作るとロビーに入れる
    await page.locator("#input-name").fill("あおい");
    await capture(page, "entry", size);
    await page.locator("#btn-create").click();
    await waitForScreen(page, "lobby");
    await expect(page.locator("#lobby-code")).toHaveText(/^[A-Z0-9]{4}$/);
    await expect(page.locator("#lobby-count")).toHaveText("1");

    await context.close();
  });
});
