import { expect, test } from "@playwright/test";
import {
  MOBILE_VIEWPORT,
  PC_VIEWPORT,
  closePlayers,
  newPlayer,
  playerCreatesRoom,
  playerJoinsRoom,
  waitForPhase,
} from "./helpers";

test.describe("定員と開始条件", () => {
  test("4人までは入れて、5人目は「満員」と表示されて入れない", async ({ browser }) => {
    // PC幅3つとスマホ幅1つで参加する。
    const viewports = [PC_VIEWPORT, PC_VIEWPORT, PC_VIEWPORT, MOBILE_VIEWPORT];
    const players = [];
    const names = ["Alice", "Bob", "Carol", "Dave"];
    for (let index = 0; index < names.length; index += 1) {
      players.push(await newPlayer(browser, names[index], viewports[index]));
    }
    const code = await playerCreatesRoom(players[0]);
    for (const player of players.slice(1)) {
      await playerJoinsRoom(player, code);
    }
    // ホストの画面に4人ぶんの参加者が見えている。
    await expect(players[0].page.locator(".lobby-player:not(.is-empty)")).toHaveCount(4);

    const fifth = await newPlayer(browser, "Erin");
    await fifth.page.getByPlaceholder("ABC123").fill(code);
    await fifth.page.getByRole("button", { name: "参加する" }).click();
    await expect(fifth.page.locator("#entry-error")).toHaveText("満員です（4人まで）");
    await expect(fifth.page.locator("#screen-entry")).toBeVisible();

    await closePlayers([...players, fifth]);
  });

  test("開始できるのはホストだけで、1人では開始できない。開始後は入れない", async ({ browser }) => {
    const host = await newPlayer(browser, "Alice");
    const code = await playerCreatesRoom(host);

    // 1人だけでは開始ボタンが無効。
    await expect(host.page.locator("#start-btn")).toBeDisabled();
    await expect(host.page.locator("#start-btn")).toHaveText("あと1人で開始");

    const guest = await newPlayer(browser, "Bob");
    await playerJoinsRoom(guest, code);
    await expect(host.page.locator("#start-btn")).toBeEnabled();
    // ホスト以外には開始ボタンが出ない。
    await expect(guest.page.locator("#start-btn")).toBeHidden();

    await host.page.locator("#start-btn").click();
    await waitForPhase(host.page, "question");
    await waitForPhase(guest.page, "question");

    const late = await newPlayer(browser, "Carol");
    await late.page.getByPlaceholder("ABC123").fill(code);
    await late.page.getByRole("button", { name: "参加する" }).click();
    await expect(late.page.locator("#entry-error")).toHaveText("ゲームはもう始まっています");

    await closePlayers([host, guest, late]);
  });
});
