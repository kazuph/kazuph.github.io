import { expect, test } from "@playwright/test";
import {
  closePlayers,
  createRoom,
  gamePlayerRow,
  joinRoom,
  newDesktopPlayer,
  startGame,
  waitForBuzzing,
  type Player,
} from "./helpers";

test("回線が一時的に切れても自動で再接続し、同じプレイヤーとして復帰する", async ({ browser }) => {
  const players: Player[] = [];
  try {
    const host = await newDesktopPlayer(browser, "あかね");
    players.push(host);
    const code = await createRoom(host);

    const victim = await newDesktopPlayer(browser, "ばんり");
    players.push(victim);
    await joinRoom(victim, code);

    const watcher = await newDesktopPlayer(browser, "つばさ");
    players.push(watcher);
    await joinRoom(watcher, code);

    await startGame(players, host);
    await waitForBuzzing(players);

    // ブラウザのオフラインイベントで接続を閉じてから、実際に5秒間オフラインにする。
    await victim.page.evaluate(() => window.dispatchEvent(new Event("offline")));
    await victim.context.setOffline(true);

    // ほかの人の画面に「接続が切れています」が出る
    await expect(gamePlayerRow(host.page, "ばんり")).toHaveClass(/offline/, { timeout: 15_000 });
    await expect(gamePlayerRow(watcher.page, "ばんり")).toHaveClass(/offline/, {
      timeout: 15_000,
    });

    await victim.page.waitForTimeout(5_000);

    await victim.context.setOffline(false);
    await victim.page.evaluate(() => window.dispatchEvent(new Event("online")));

    // 自動で再接続し、同じプレイヤーとしてゲームに戻る
    await expect(victim.page.locator("#connection-banner")).toBeHidden({ timeout: 20_000 });
    await expect(victim.page.locator("#screen-game")).toBeVisible();
    await expect(gamePlayerRow(victim.page, "ばんり")).toBeVisible();

    // ほかの人の画面の「接続が切れています」が消える
    await expect(gamePlayerRow(host.page, "ばんり")).not.toHaveClass(/offline/, {
      timeout: 20_000,
    });
    await expect(gamePlayerRow(watcher.page, "ばんり")).not.toHaveClass(/offline/, {
      timeout: 20_000,
    });
  } finally {
    await closePlayers(players);
  }
});
