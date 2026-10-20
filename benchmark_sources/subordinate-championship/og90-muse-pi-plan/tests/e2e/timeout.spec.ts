import { expect, test } from "@playwright/test";
import {
  buzzAll,
  closeClients,
  createRoom,
  joinRoom,
  myScore,
  openClients,
  PC,
} from "./helpers";

test.setTimeout(420_000);

// 実時間の締め切り（問題20秒・回答10秒）
test("誰も押さないと20秒で正解表示、回答放置は10秒で-5点", async ({
  browser,
}) => {
  const clients = await openClients(
    browser,
    [PC, PC],
    ["ホスト", "あおい"],
  );
  try {
    const code = await createRoom(clients[0].page, "ホスト");
    await joinRoom(clients[1].page, "あおい", code);
    await clients[0].page.getByTestId("start-btn").click();
    for (const c of clients) {
      await expect(c.page.getByTestId("game")).toBeVisible({ timeout: 15000 });
    }

    // 誰も押さずに20秒待つ → 正解が全員に表示される
    for (const c of clients) {
      await expect(c.page.getByTestId("reveal")).toContainText("時間切れ", {
        timeout: 30000,
      });
    }

    // 第2問で早押しだけして放置 → 10秒で -5点、外した人は押せない
    for (const c of clients) {
      await expect(c.page.getByTestId("qnum")).toContainText("第2問", {
        timeout: 15000,
      });
    }
    await buzzAll(clients);
    // どちらか1人だけが回答者になるまで待つ
    let answererIdx = -1;
    await expect
      .poll(
        async () => {
          const banners = await Promise.all(
            clients.map(async (c) => {
              const b = c.page.getByTestId("answering-banner");
              if (!(await b.isVisible().catch(() => false))) return "";
              return (await b.textContent()) ?? "";
            }),
          );
          answererIdx = banners.findIndex((t) =>
            (t ?? "").includes("あなたが回答中"),
          );
          return answererIdx;
        },
        { timeout: 15000 },
      )
      .toBeGreaterThanOrEqual(0);
    // 何も選ばず10秒待つ → -5点で出題中に戻る（相手が残っているため）
    const answerer = clients[answererIdx];
    await expect(answerer.page.getByTestId("scores")).toContainText(
      "回答済み",
      { timeout: 20000 },
    );
    expect(await myScore(answerer.page)).toBe(-5);
  } finally {
    await closeClients(clients);
  }
});
