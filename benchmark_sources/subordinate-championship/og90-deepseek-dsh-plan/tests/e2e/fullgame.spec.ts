import { expect, test } from "@playwright/test";
import {
  artifactPath,
  closePlayers,
  correctIndexOf,
  createRoom,
  ensureArtifacts,
  joinRoom,
  newDesktopPlayer,
  newMobilePlayer,
  questionTextOf,
  startGame,
  waitForBuzzing,
  waitForNextQuestion,
  waitForReveal,
  waitForSingleAnswerer,
  type Player,
} from "./helpers";

test("10問を最後まで遊ぶと、4つの画面に同じ最終順位が出る", async ({ browser }) => {
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

    for (let round = 0; round < 10; round += 1) {
      await waitForBuzzing(players);
      if (round === 0) {
        // スペースキーでも早押しできる
        await host.page.keyboard.press("Space");
      } else {
        await host.page.locator("#buzz-button").click();
      }
      const winner = await waitForSingleAnswerer(players);
      expect(winner).toBe(0);

      const text = await questionTextOf(host.page);
      await host.page.locator(".choice").nth(correctIndexOf(text)).click();
      await waitForReveal(players);
      if (round < 9) await waitForNextQuestion(players);
    }

    await Promise.all(
      players.map((player) =>
        expect(player.page.locator("#screen-result")).toBeVisible({ timeout: 20_000 }),
      ),
    );

    const rankingOf = (player: Player) =>
      player.page
        .locator("#ranking .rank-item")
        .evaluateAll((items) =>
          items.map(
            (item) =>
              `${item.querySelector(".rank-name")?.textContent ?? ""}:${
                item.querySelector(".rank-score")?.textContent ?? ""
              }`,
          ),
        );

    const rankings = await Promise.all(players.map(rankingOf));
    expect(rankings[0]).toHaveLength(4);
    for (const ranking of rankings) {
      expect(ranking).toEqual(rankings[0]);
    }
    expect(rankings[0]![0]).toBe("あかね:100点");
    expect(rankings[0]!.filter((entry) => entry.endsWith(":0点"))).toHaveLength(3);

    // 結果画面（PC幅・スマホ幅）
    await host.page.screenshot({ path: artifactPath("result-pc.png") });
    await mobile.page.screenshot({ path: artifactPath("result-mobile.png") });
  } finally {
    await closePlayers(players);
  }
});
