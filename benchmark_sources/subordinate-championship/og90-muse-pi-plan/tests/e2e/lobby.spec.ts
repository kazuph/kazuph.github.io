import { expect, test } from "@playwright/test";
import {
  closeClients,
  createRoom,
  joinRoom,
  MOBILE,
  openClients,
  PC,
  type Client,
} from "./helpers";

// ロビー・定員・開始条件とスクリーンショット
test("4人が参加でき、5人目は「満員」で入れない", async ({ browser }) => {
  const clients = await openClients(
    browser,
    [PC, PC, PC, MOBILE],
    ["ホスト", "あおい", "さくら", "れん"],
  );
  let fifth: Client | null = null;
  try {
    const code = await createRoom(clients[0].page, "ホスト");
    for (let i = 1; i < 4; i++) {
      await joinRoom(clients[i].page, clients[i].name, code);
    }
    // 全員のロビーに4人そろう
    for (const c of clients) {
      await expect(c.page.getByTestId("members")).toContainText("ホスト");
      await expect(c.page.getByTestId("members")).toContainText("れん");
    }
    // ロビーの撮影
    await clients[0].page.screenshot({ path: ".artifacts/lobby-pc.png" });
    await clients[3].page.screenshot({ path: ".artifacts/lobby-mobile.png" });

    // 5人目は入れない
    const ctx5 = await browser.newContext({ viewport: PC });
    const p5 = await ctx5.newPage();
    fifth = { page: p5, context: ctx5, name: "ごろう" };
    await p5.goto("/");
    await p5.getByTestId("name-input").fill("ごろう");
    await p5.getByTestId("code-input").fill(code);
    await p5.getByTestId("join-btn").click();
    await expect(p5.getByTestId("entry-error")).toContainText("満員", {
      timeout: 15000,
    });
    await expect(p5.getByTestId("lobby")).toBeHidden();

    // 1人では開始できない（別部屋）
    const ctx1 = await browser.newContext({ viewport: PC });
    const solo = await ctx1.newPage();
    await createRoom(solo, "ぼっち");
    await solo.getByTestId("start-btn").click();
    await expect(solo.getByTestId("lobby")).toBeVisible();
    await ctx1.close();
  } finally {
    if (fifth) await fifth.context.close().catch(() => undefined);
    await closeClients(clients);
  }
});
