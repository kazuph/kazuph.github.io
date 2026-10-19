import { expect, test } from "@playwright/test";
import { closeAll, joinRoom, MOBILE, openPlayer, openRoomOf4 } from "./helpers";

test("4つの独立したブラウザで作成と参加ができ、5人目の画面に「満員」が出る", async ({ browser }) => {
  const { players, code } = await openRoomOf4(browser, ["あや", "けん", "ゆい", "そら"]);
  // PC幅3つ + スマホ幅1つ
  expect(players.map((p) => p.page.viewportSize()!.width)).toEqual([1280, 1280, 1280, 390]);
  for (const p of players) {
    await expect(p.page.getByTestId("room-code")).toHaveText(code);
    await expect(p.page.getByTestId("lobby-players")).toContainText("あや");
    await expect(p.page.getByTestId("lobby-players")).toContainText("そら");
  }
  // ホストだけが開始ボタンを持つ
  await expect(players[0].page.getByTestId("start-btn")).toBeEnabled();
  await expect(players[1].page.getByTestId("start-btn")).toBeHidden();

  const fifth = await openPlayer(browser, "ごろう", MOBILE);
  fifth.page.on("dialog", (d) => d.dismiss());
  await fifth.page.getByTestId("name-input").fill("ごろう");
  await fifth.page.getByTestId("code-input").fill(code);
  await fifth.page.getByTestId("join-btn").click();
  await expect(fifth.page.getByTestId("entry-error")).toContainText("満員");
  await expect(fifth.page.getByTestId("screen-entry")).toBeVisible();
  await closeAll([...players, fifth]);
});

test("ホストは2人未満では開始できず、存在しない部屋・開始後の部屋には入れない", async ({ browser }) => {
  const host = await openPlayer(browser, "ホスト");
  await host.page.getByTestId("name-input").fill("ホスト");
  await host.page.getByTestId("create-btn").click();
  await expect(host.page.getByTestId("start-btn")).toBeDisabled();
  await expect(host.page.getByTestId("lobby-hint")).toContainText("2人以上");
  const code = (await host.page.getByTestId("room-code").textContent())!;

  const guest = await openPlayer(browser, "ゲスト");
  await joinRoom(guest, code);
  await expect(host.page.getByTestId("start-btn")).toBeEnabled();
  await host.page.getByTestId("start-btn").click();
  await expect(guest.page.getByTestId("screen-game")).toBeVisible();

  const late = await openPlayer(browser, "おくれた人");
  await late.page.getByTestId("name-input").fill("おくれた人");
  await late.page.getByTestId("code-input").fill(code);
  await late.page.getByTestId("join-btn").click();
  await expect(late.page.getByTestId("entry-error")).toContainText("もう始まっています");

  await late.page.getByTestId("code-input").fill("ZZZZZZ");
  await late.page.getByTestId("join-btn").click();
  await expect(late.page.getByTestId("entry-error")).toContainText("見つかりません");
  await closeAll([host, guest, late]);
});
