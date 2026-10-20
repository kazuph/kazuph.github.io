import { expect, test } from "@playwright/test";
import {
  createRoomFromUi,
  joinRoomFromUi,
  newClient,
  setupLobby,
  startGame,
} from "./helpers";

test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) {
    await context.close();
  }
});

test("入口から部屋を作り、コードで3人が参加でき、5人目は満員で断られる", async ({
  browser,
}) => {
  const host = await newClient(browser, "ホスト");
  const code = await createRoomFromUi(host);
  expect(code).toMatch(/^[A-Z0-9]{6}$/);

  const guests = [await newClient(browser, "P2"), await newClient(browser, "P3"), await newClient(browser, "P4")];
  for (const guest of guests) {
    await joinRoomFromUi(guest, code);
    await expect(guest.page.locator(`#lobby-slots .slot[data-player-id]`)).toHaveCount(
      2 + guests.indexOf(guest),
    );
  }

  await expect(host.page.locator("#lobby-slots .slot.is-filled")).toHaveCount(4);
  await expect(host.page.locator("#start-btn")).toBeEnabled();
  await expect(host.page.locator("#start-btn")).toHaveText("ゲームを開始");
  await expect(host.page.locator("#lobby-status")).toContainText("4人");

  // 5人目
  const fifth = await newClient(browser, "P5");
  await fifth.page.goto("/");
  await fifth.page.fill("#name-input", "P5");
  await fifth.page.fill("#code-input", code);
  await fifth.page.click("#join-room-btn");
  await expect(fifth.page.locator("#entry-error")).toBeVisible();
  await expect(fifth.page.locator("#entry-error")).toContainText("満員");
  await expect(fifth.page.locator("#screen-entry")).toBeVisible();
  await expect(fifth.page.locator("#screen-lobby")).toBeHidden();
});

test("存在しない部屋コードでは理由が出て入れない", async ({ browser }) => {
  const client = await newClient(browser, "迷子");
  await client.page.goto("/");
  await client.page.fill("#name-input", "迷子");
  await client.page.fill("#code-input", "ZZZZZZ");
  await client.page.click("#join-room-btn");
  await expect(client.page.locator("#entry-error")).toBeVisible();
  await expect(client.page.locator("#entry-error")).toContainText("見つかりません");
});

test("名前を入れないと部屋を作れない", async ({ browser }) => {
  const client = await newClient(browser, "");
  await client.page.goto("/");
  await client.page.click("#create-room-btn");
  await expect(client.page.locator("#entry-error")).toContainText("名前");
});

test("開始できるのは2人以上のときだけ", async ({ browser }) => {
  const solo = await newClient(browser, "ひとり");
  await createRoomFromUi(solo);
  await expect(solo.page.locator("#start-btn")).toBeDisabled();
  await expect(solo.page.locator("#start-btn")).toContainText("人以上で開始");

  const guest = await newClient(browser, "ふたり");
  const code = (await solo.page.locator("#lobby-code").textContent())?.trim() ?? "";
  await joinRoomFromUi(guest, code);
  await expect(solo.page.locator("#start-btn")).toBeEnabled();
  await expect(solo.page.locator("#lobby-slots .slot.is-filled")).toHaveCount(2);
});

test("開始できるのはホストだけ", async ({ browser }) => {
  const room = await setupLobby(browser, ["ホスト", "ゲスト"]);
  const guest = room.clients[1];
  await expect(guest.page.locator("#start-btn")).toBeDisabled();
  await expect(guest.page.locator("#start-btn")).toHaveText("ホストの開始を待っています");

  await startGame(room);
  await expect(room.host.page.locator("#question-text")).not.toBeEmpty();
  await expect(guest.page.locator("#buzz-btn")).toBeEnabled();
});

test("開始後の参加は拒否される", async ({ browser }) => {
  const room = await setupLobby(browser, ["ホスト", "ゲスト"]);
  await startGame(room);

  const late = await newClient(browser, "おそい");
  await late.page.goto("/");
  await late.page.fill("#name-input", "おそい");
  await late.page.fill("#code-input", room.code);
  await late.page.click("#join-room-btn");
  await expect(late.page.locator("#entry-error")).toContainText("始まっています");
});
