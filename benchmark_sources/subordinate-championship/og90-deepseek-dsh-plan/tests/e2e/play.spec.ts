import { expect, test } from "@playwright/test";
import {
  artifactPath,
  buzzAll,
  closePlayers,
  correctIndexOf,
  createRoom,
  ensureArtifacts,
  gamePlayerRow,
  joinRoom,
  newDesktopPlayer,
  newMobilePlayer,
  questionTextOf,
  startGame,
  timerSpread,
  waitForBuzzing,
  waitForNextQuestion,
  waitForReveal,
  waitForSingleAnswerer,
  type Player,
} from "./helpers";

test("4人が同時に押しても回答権は1人だけ／不正解／再読み込み復帰／時間同期", async ({
  browser,
}) => {
  test.slow();
  ensureArtifacts();
  const players: Player[] = [];
  try {
    const host = await newDesktopPlayer(browser, "あかね");
    players.push(host);
    const code = await createRoom(host);

    for (const name of ["ばんり", "つばさ"]) {
      const player = await newDesktopPlayer(browser, name);
      players.push(player);
      await joinRoom(player, code);
    }
    const mobile = await newMobilePlayer(browser, "だいち");
    players.push(mobile);
    await joinRoom(mobile, code);

    await startGame(players, host);

    // 3問つづけて、4人が同時に早押しする。
    for (let round = 0; round < 3; round += 1) {
      await waitForBuzzing(players);

      if (round === 0) {
        // 出題中のスクリーンショット（PC幅・スマホ幅）
        await host.page.screenshot({ path: artifactPath("question-pc.png") });
        await mobile.page.screenshot({ path: artifactPath("question-mobile.png") });
        // スマホ幅でも問題文と早押しボタンが画面内に見えている
        await expect(mobile.page.locator("#question-text")).toBeInViewport();
        await expect(mobile.page.locator("#buzz-button")).toBeInViewport();
      }

      await buzzAll(players);
      const winner = await waitForSingleAnswerer(players);
      expect(winner).toBeGreaterThanOrEqual(0);

      const enabledCounts = await Promise.all(
        players.map((player) => player.page.locator(".choice:not([disabled])").count()),
      );
      expect(enabledCounts.filter((count) => count > 0)).toHaveLength(1);
      expect(enabledCounts[winner]).toBe(4);

      // 「誰が回答中か」が全員の画面で同じ
      for (const player of players) {
        await expect(player.page.locator(".game-player.answering")).toHaveCount(1);
        await expect(player.page.locator(".game-player.answering")).toContainText(
          players[winner]!.name,
        );
      }

      if (round === 0) {
        // 回答中のスクリーンショット（PC幅・スマホ幅）
        await host.page.screenshot({ path: artifactPath("answering-pc.png") });
        await mobile.page.screenshot({ path: artifactPath("answering-mobile.png") });
      }

      const text = await questionTextOf(players[winner]!.page);
      await players[winner]!.page.locator(".choice").nth(correctIndexOf(text)).click();
      await waitForReveal(players);
      await waitForNextQuestion(players);
    }

    // 残り時間が4画面でそろっている（差が1秒以内）
    await waitForBuzzing(players);
    expect(await timerSpread(players)).toBeLessThanOrEqual(1);

    // 得点を持っている人が再読み込みしても、同じ名前・同じ点数で復帰する
    const reloadTarget = players.find((player) => player.name === "ばんり")!;
    const scoreBefore =
      (await gamePlayerRow(reloadTarget.page, "ばんり").locator(".gp-score").textContent()) ?? "";
    await reloadTarget.page.reload();
    await expect(reloadTarget.page.locator("#screen-game")).toBeVisible({ timeout: 15_000 });
    await expect(reloadTarget.page.locator("#screen-entry")).toBeHidden();
    await expect(gamePlayerRow(reloadTarget.page, "ばんり")).toBeVisible({ timeout: 15_000 });
    await expect(gamePlayerRow(reloadTarget.page, "ばんり").locator(".gp-score")).toHaveText(
      scoreBefore,
    );

    // 不正解のテスト: 次の問題でわざと間違える
    await waitForBuzzing(players);
    await buzzAll(players);
    const wrongWinner = await waitForSingleAnswerer(players);
    const wrongName = players[wrongWinner]!.name;
    const beforeWrong =
      (await gamePlayerRow(players[0]!.page, wrongName).locator(".gp-score").textContent()) ?? "0点";
    const beforeWrongScore = Number.parseInt(beforeWrong, 10);
    const wrongText = await questionTextOf(players[wrongWinner]!.page);
    const correct = correctIndexOf(wrongText);
    await players[wrongWinner]!.page.locator(".choice").nth((correct + 1) % 4).click();

    // 全員の画面で -5 点になり、その人はこの問題ではもう押せない
    for (const player of players) {
      await expect(
        gamePlayerRow(player.page, wrongName).locator(".gp-score"),
      ).toHaveText(`${beforeWrongScore - 5}点`);
    }
    await expect(players[wrongWinner]!.page.locator("#buzz-button")).toBeDisabled();
    await expect(players[wrongWinner]!.page.locator("#buzz-button")).toHaveText("回答済み");

    // 残りの人はまだ押せる
    for (let index = 0; index < players.length; index += 1) {
      if (index === wrongWinner) continue;
      await expect(players[index]!.page.locator("#buzz-button")).toBeEnabled();
    }
  } finally {
    await closePlayers(players);
  }
});
