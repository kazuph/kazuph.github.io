import { expect, test } from "@playwright/test";
import {
  attemptJoin,
  closePlayers,
  createRoom,
  ensureArtifacts,
  artifactPath,
  joinRoom,
  newDesktopPlayer,
  newMobilePlayer,
  type Player,
} from "./helpers";

test("4人まで参加でき、5人目は満員で断られる（ロビーのスクリーンショット付き）", async ({
  browser,
}) => {
  ensureArtifacts();
  const players: Player[] = [];
  try {
    const host = await newDesktopPlayer(browser, "あかね");
    players.push(host);
    const code = await createRoom(host);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);

    for (const name of ["ばんり", "つばさ"]) {
      const player = await newDesktopPlayer(browser, name);
      players.push(player);
      await joinRoom(player, code);
    }

    const mobile = await newMobilePlayer(browser, "だいち");
    players.push(mobile);
    await joinRoom(mobile, code);

    await expect(host.page.locator("#lobby-count")).toHaveText("4");
    await expect(host.page.locator("#lobby-players .player-slot.filled")).toHaveCount(4);

    // ロビー画面（PC幅・スマホ幅）
    await host.page.screenshot({ path: artifactPath("lobby-pc.png") });
    await mobile.page.screenshot({ path: artifactPath("lobby-mobile.png") });

    // 5人目は入れず、理由が画面に出る
    const fifth = await newDesktopPlayer(browser, "えみ");
    players.push(fifth);
    await attemptJoin(fifth, code);
    await expect(fifth.page.locator("#entry-error")).toContainText("満員");
    await expect(fifth.page.locator("#screen-lobby")).toBeHidden();

    // ホストの画面には4人のまま
    await expect(host.page.locator("#lobby-count")).toHaveText("4");
  } finally {
    await closePlayers(players);
  }
});

test("存在しない部屋コードでは入室できない", async ({ browser }) => {
  const player = await newDesktopPlayer(browser, "たろう");
  try {
    await attemptJoin(player, "ZZZZZZ");
    await expect(player.page.locator("#entry-error")).toContainText("部屋が見つかりません");
  } finally {
    await closePlayers([player]);
  }
});

test("1人では開始できず、2人そろうとホストだけが開始できる", async ({ browser }) => {
  const players: Player[] = [];
  try {
    const host = await newDesktopPlayer(browser, "あかね");
    players.push(host);
    const code = await createRoom(host);
    // 1人だけでは開始できない
    await expect(host.page.locator("#start-button")).toBeDisabled();

    const guest = await newDesktopPlayer(browser, "ばんり");
    players.push(guest);
    await joinRoom(guest, code);

    // ホストの開始ボタンが有効になり、ゲストには開始ボタンが出ない
    await expect(host.page.locator("#start-button")).toBeEnabled();
    await expect(guest.page.locator("#start-button")).toBeHidden();
    await expect(guest.page.locator("#lobby-note")).toContainText("ホスト");
  } finally {
    await closePlayers(players);
  }
});
