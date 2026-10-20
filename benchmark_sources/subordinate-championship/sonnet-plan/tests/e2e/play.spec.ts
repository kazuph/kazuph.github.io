import { expect, test } from "@playwright/test";
import {
  buzzAndAnswer, card, closeAll, correctIndex, enabledChoiceCount, MOBILE, openRoomOf4, pressNow, scoreOf, startGame,
  waitQuestion,
} from "./helpers";

const NAMES = ["あや", "けん", "ゆい", "そら"];

test("4人が同時に早押ししても、4択が有効になる画面はちょうど1つ（3問くり返す）", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  await startGame(players);
  const expected: Record<string, number> = {};
  for (let q = 1; q <= 3; q++) {
    await waitQuestion(players, q);
    for (const p of players) await expect(p.page.getByTestId("buzz-btn")).toBeEnabled();
    await Promise.all(players.map((p) => pressNow(p.page, "buzz-btn")));
    await expect.poll(() => enabledChoiceCount(players)).toBe(1);
    await players[0].page.waitForTimeout(400);
    expect(await enabledChoiceCount(players)).toBe(1);

    // 回答者はみんなの画面で同じ人
    const flags = await Promise.all(players.map((p) => p.page.getByTestId("choice-0").isEnabled()));
    const winner = players[flags.indexOf(true)];
    for (const p of players) {
      await expect(p.page.getByTestId("status")).toContainText(
        p === winner ? "あなたが回答中" : `${winner.name}さんが回答中`,
      );
      await expect(card(p.page, winner.name)).toHaveClass(/answering/);
      await expect(p.page.getByTestId("buzz-btn")).toBeDisabled();
    }
    await winner.page.getByTestId(`choice-${await correctIndex(winner.page)}`).click();
    expected[winner.name] = (expected[winner.name] ?? 0) + 10;
    for (const p of players) await expect(scoreOf(p.page, winner.name)).toHaveText(String(expected[winner.name]));
  }
  await closeAll(players);
});

test("回答者が不正解を選ぶと、全員の画面でその人が -5 点になりボタンが無効になる", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  await startGame(players);
  await waitQuestion(players, 1);
  const [ayaP, kenP, yuiP] = players;
  await buzzAndAnswer(kenP, false);
  for (const p of players) await expect(scoreOf(p.page, "けん")).toHaveText("-5");
  await expect(kenP.page.getByTestId("buzz-btn")).toBeDisabled();
  await expect(kenP.page.getByTestId("status")).toContainText("この問題は回答済み");
  await expect(card(ayaP.page, "けん")).toContainText("回答済み");
  // 残りの人で早押しが再開される
  await expect(ayaP.page.getByTestId("buzz-btn")).toBeEnabled();
  await expect(yuiP.page.getByTestId("buzz-btn")).toBeEnabled();
  // 失格の人は、押そうとしても回答権を得られない
  await kenP.page.keyboard.press("Space");
  await ayaP.page.waitForTimeout(400);
  expect(await enabledChoiceCount(players)).toBe(0);
  await closeAll(players);
});

test("回答者がページを再読み込みしても、同じ名前・同じ点数で戻る", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  await startGame(players);
  await waitQuestion(players, 1);
  const [, kenP] = players;
  await buzzAndAnswer(kenP, false);
  await expect(scoreOf(kenP.page, "けん")).toHaveText("-5");

  await kenP.page.reload();
  await expect(kenP.page.getByTestId("screen-game")).toBeVisible();
  await expect(card(kenP.page, "けん")).toContainText("あなた");
  await expect(scoreOf(kenP.page, "けん")).toHaveText("-5");
  await expect(kenP.page.getByTestId("buzz-btn")).toBeDisabled(); // 失格のまま
  await expect(kenP.page.getByTestId("qnum")).toContainText("第1問");

  // 回答中に再読み込みしても、回答権をもったまま戻る
  const ayaP = players[0];
  await ayaP.page.getByTestId("buzz-btn").click();
  await expect(ayaP.page.getByTestId("choice-0")).toBeEnabled();
  await ayaP.page.reload();
  await expect(ayaP.page.getByTestId("choice-0")).toBeEnabled();
  await expect(ayaP.page.getByTestId("status")).toContainText("あなたが回答中");
  await closeAll(players);
});

test("回線を5秒切って戻すと自動で再接続し、ほかの人の「接続が切れています」が消える", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  await startGame(players);
  await waitQuestion(players, 1);
  const [ayaP, kenP, yuiP, soraP] = players;
  await expect(kenP.page.getByTestId("buzz-btn")).toBeEnabled();

  await kenP.context.setOffline(true);
  await expect(kenP.page.locator("#conn")).toBeVisible(); // 「再接続中…」
  await expect(kenP.page.locator("#conn")).toContainText("再接続中");
  for (const p of [ayaP, yuiP, soraP]) {
    await expect(card(p.page, "けん")).toContainText("接続が切れています");
    await expect(scoreOf(p.page, "けん")).toHaveText("0"); // 席と点数は残る
  }
  await kenP.page.waitForTimeout(5000);
  await kenP.context.setOffline(false);

  await expect(kenP.page.locator("#conn")).toBeHidden();
  for (const p of [ayaP, yuiP, soraP]) await expect(card(p.page, "けん")).not.toContainText("接続が切れています");
  await expect(kenP.page.getByTestId("buzz-btn")).toBeEnabled();
  await expect(card(kenP.page, "けん")).toContainText("あなた");
  await closeAll(players);
});

test("4つの画面の残り時間の差が1秒以内（端末の時計が大きくずれていても）", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  // 1人の端末の時計を1時間進める。残り時間はサーバーの時刻との差で出すので影響しない
  await players[2].context.addInitScript(() => {
    const real = Date.now.bind(Date);
    Date.now = () => real() + 3_600_000;
  });
  await players[2].page.reload();
  await expect(players[2].page.getByTestId("screen-lobby")).toBeVisible();
  await startGame(players);
  await waitQuestion(players, 1);
  for (let i = 0; i < 5; i++) {
    const values = await Promise.all(
      players.map((p) => p.page.getByTestId("timer-text").getAttribute("data-remaining-ms").then(Number)),
    );
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1000);
    expect(Math.max(...values)).toBeLessThanOrEqual(20_000);
    await players[0].page.waitForTimeout(800);
  }
  await closeAll(players);
});

test("スマホ幅の出題中の画面で、問題文・4択・早押しボタンがスクロールせず画面内に見える", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  await startGame(players);
  await waitQuestion(players, 1);
  const mobile = players[3].page;
  expect(mobile.viewportSize()).toEqual(MOBILE);
  for (const id of ["question", "choice-0", "choice-3", "buzz-btn"]) {
    const box = (await mobile.getByTestId(id).boundingBox())!;
    expect(box.y, id).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height, id).toBeLessThanOrEqual(MOBILE.height);
    await expect(mobile.getByTestId(id)).toBeInViewport({ ratio: 1 });
  }
  await closeAll(players);
});

test("スペースキーでも早押しできる", async ({ browser }) => {
  const { players } = await openRoomOf4(browser, NAMES);
  await startGame(players);
  await waitQuestion(players, 1);
  const [ayaP, kenP] = players;
  await kenP.page.keyboard.press("Space");
  await expect(kenP.page.getByTestId("choice-0")).toBeEnabled();
  await expect(ayaP.page.getByTestId("status")).toContainText("けんさんが回答中");
  await closeAll(players);
});
