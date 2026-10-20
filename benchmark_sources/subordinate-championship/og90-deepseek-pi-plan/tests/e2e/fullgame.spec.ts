import { expect, test } from "@playwright/test";
import {
  buzzSimultaneously,
  countAnswerers,
  correctChoice,
  findAnswerer,
  setupGame,
  waitForPhase,
} from "./helpers";

test.afterEach(async ({ browser }) => {
  for (const context of browser.contexts()) {
    await context.close();
  }
});

test("4人が10問さいごまで遊ぶと、4つの画面に同じ最終順位が出る", async ({ browser }) => {
  test.setTimeout(180_000);
  const room = await setupGame(browser);
  const clients = room.clients;

  for (let q = 1; q <= 10; q += 1) {
    await waitForPhase(clients, "question", 30_000);
    await expect(clients[0].page.locator("#q-number")).toHaveText(String(q));
    await expect(clients[0].page.locator("#q-total")).toHaveText("10");

    await buzzSimultaneously(clients);
    await expect.poll(() => countAnswerers(clients), { timeout: 10_000 }).toBe(1);
    const answerer = await findAnswerer(clients);
    const answer = await correctChoice(answerer.page);
    await answerer.page.locator(`.choice[data-choice="${answer}"]`).click();
  }

  for (const client of clients) {
    await expect(client.page.locator("#screen-result")).toBeVisible({ timeout: 30_000 });
    await expect(client.page.locator("#result-ranking .rank-row")).toHaveCount(4);
  }

  const rankings = await Promise.all(
    clients.map((client) =>
      client.page
        .locator("#result-ranking .rank-row")
        .evaluateAll((rows) =>
          rows.map((row) => ({
            name: row.getAttribute("data-player-name"),
            rank: row.getAttribute("data-rank"),
            text: (row.textContent ?? "").replace(/\s+/g, "").replace("（あなた）", ""),
          })),
        ),
    ),
  );
  for (const ranking of rankings) {
    expect(ranking).toEqual(rankings[0]);
  }

  // 10問すべて正解しているので、合計点は100点
  const scores = await clients[0].page.locator("#result-ranking .rank-score").allTextContents();
  const total = scores.reduce((sum, value) => sum + Number.parseInt(value, 10), 0);
  expect(total).toBe(100);

  for (const client of clients) {
    await expect(client.page.locator("#result-ranking .rank-row.is-me")).toHaveCount(1);
    await expect(client.page.locator("#result-ranking .rank-row.is-me")).toContainText(
      client.name,
    );
  }
});
