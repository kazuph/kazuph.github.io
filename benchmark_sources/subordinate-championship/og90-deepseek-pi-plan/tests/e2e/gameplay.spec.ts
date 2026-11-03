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

test("4人が同時に押しても回答権は1人だけ（3問くり返す）", async ({ browser }) => {
  test.setTimeout(90_000);
  const room = await setupGame(browser);
  const clients = room.clients;

  for (let q = 1; q <= 3; q += 1) {
    await waitForPhase(clients, "question");
    await expect(clients[0].page.locator("#q-number")).toHaveText(String(q));
    for (const client of clients) {
      await expect(client.page.locator("#buzz-btn")).toBeEnabled();
    }

    // 4人がいっせいに押す（4つの画面で同時に buzz を送る）
    await Promise.all(
      clients.map(async (client) => {
        await expect(client.page.locator("body")).toHaveAttribute("data-phase", "question");
      }),
    );
    await buzzSimultaneously(clients);

    await expect.poll(() => countAnswerers(clients), { timeout: 10_000 }).toBe(1);
    const answerer = await findAnswerer(clients);

    // 回答権を得られなかった人のボタンは無効になる
    for (const client of clients) {
      if (client !== answerer) {
        await expect(client.page.locator("#buzz-btn")).toBeDisabled();
      }
    }

    // ほかの人の画面には「○○さんが回答中」が出る
    for (const client of clients) {
      if (client === answerer) {
        await expect(client.page.locator("#game-status")).toContainText("あなたが回答中");
      } else {
        await expect(client.page.locator("#game-status")).toContainText(
          `${answerer.name}さんが回答中`,
        );
      }
      await expect(
        client.page.locator(`.player-row[data-player-name="${answerer.name}"]`),
      ).toHaveClass(/is-answering/);
    }

    const answer = await correctChoice(answerer.page);
    await answerer.page.locator(`.choice[data-choice="${answer}"]`).click();
    await waitForPhase(clients, "reveal");
    await expect(answerer.page.locator("#game-status")).toContainText("正解");
  }

  // 3問おわったので4問目がはじまる
  await waitForPhase(clients, "question");
  await expect(clients[0].page.locator("#q-number")).toHaveText("4");
});

test("不正解の人は-5点になり、その問題ではもう押せない", async ({ browser }) => {
  test.setTimeout(60_000);
  const room = await setupGame(browser, ["あか", "あお", "きいろ"]);
  const clients = room.clients;
  const target = clients[1];

  await waitForPhase(clients, "question");
  await target.page.locator("#buzz-btn").click();
  await expect(target.page.locator("body")).toHaveAttribute("data-answerer", "true");

  const answer = await correctChoice(target.page);
  const wrong = (answer + 1) % 4;
  await target.page.locator(`.choice[data-choice="${wrong}"]`).click();

  // 全員の画面で -5 点になる
  for (const client of clients) {
    await expect(
      client.page.locator(`.player-row[data-player-name="あお"] .player-score`),
    ).toHaveText("-5");
  }
  // 不正解だった人はもう押せない
  await expect(target.page.locator("#buzz-btn")).toBeDisabled();
  await expect(target.page.locator("#game-status")).toContainText("もう押せません");
  for (const client of clients) {
    await expect(
      client.page.locator(`.player-row[data-player-name="あお"] .player-note`),
    ).toContainText("回答済み");
  }
  // ほかの人はまだ押せる
  await expect(clients[0].page.locator("#buzz-btn")).toBeEnabled();
});

test("誰も押さないと、問題が出てから20秒で正解が表示される", async ({ browser }) => {
  test.setTimeout(60_000);
  const room = await setupGame(browser, ["あか", "あお"]);
  await waitForPhase(room.clients, "question");

  const startedAt = Date.now();
  await expect(room.clients[0].page.locator("#game-status")).toContainText("正解", {
    timeout: 26_000,
  });
  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeGreaterThan(18_000);
  expect(elapsed).toBeLessThan(26_000);

  // 正解の選択肢が示される
  await expect(room.clients[1].page.locator(".choice.is-correct")).toHaveCount(1);
});

test("回答権を得て何も選ばないと、10秒で-5点になる", async ({ browser }) => {
  test.setTimeout(60_000);
  const room = await setupGame(browser, ["あか", "あお"]);
  const clients = room.clients;
  await waitForPhase(clients, "question");
  await clients[0].page.locator("#buzz-btn").click();
  await expect(clients[0].page.locator("body")).toHaveAttribute("data-answerer", "true");

  const startedAt = Date.now();
  await expect(
    clients[1].page.locator(`.player-row[data-player-name="あか"] .player-score`),
  ).toHaveText("-5", { timeout: 15_000 });
  const elapsed = Date.now() - startedAt;
  expect(elapsed).toBeGreaterThan(8_000);
  expect(elapsed).toBeLessThan(14_000);
  await expect(clients[0].page.locator("#buzz-btn")).toBeDisabled();
});

test("全員が押せなくなると、20秒を待たずに正解が表示される", async ({ browser }) => {
  test.setTimeout(60_000);
  const room = await setupGame(browser, ["あか", "あお"]);
  const clients = room.clients;
  await waitForPhase(clients, "question");

  for (const client of clients) {
    await waitForPhase(clients, "question");
    await client.page.locator("#buzz-btn").click();
    await expect(client.page.locator("body")).toHaveAttribute("data-answerer", "true");
    const answer = await correctChoice(client.page);
    await client.page.locator(`.choice[data-choice="${(answer + 2) % 4}"]`).click();
  }

  await waitForPhase(clients, "reveal");
  await expect(clients[0].page.locator("#game-status")).toContainText("全員が回答できなく");
});

test("点数・残り時間・回答中の人が全員の画面でそろって見える", async ({ browser }) => {
  test.setTimeout(60_000);
  const room = await setupGame(browser);
  const clients = room.clients;
  await waitForPhase(clients, "question");

  // 残り時間の差が1秒以内
  await expect
    .poll(
      async () => {
        const values = await Promise.all(
          clients.map((client) => client.page.locator("#timer-value").textContent()),
        );
        const numbers = values.map((value) => Number.parseFloat(value ?? "0"));
        return Math.max(...numbers) - Math.min(...numbers);
      },
      { timeout: 15_000 },
    )
    .toBeLessThanOrEqual(1);

  // 問題文と問題番号もそろっている
  const texts = await Promise.all(
    clients.map((client) => client.page.locator("#question-text").textContent()),
  );
  expect(new Set(texts).size).toBe(1);

  // 時間が減っている
  const first = Number.parseFloat(
    (await clients[0].page.locator("#timer-value").textContent()) ?? "0",
  );
  await expect
    .poll(async () => {
      const value = await clients[0].page.locator("#timer-value").textContent();
      return Number.parseFloat(value ?? "0");
    })
    .toBeLessThan(first);

  // 回答中は全員の画面で同じ人を指す
  await clients[2].page.locator("#buzz-btn").click();
  await waitForPhase(clients, "answering");
  for (const client of clients) {
    await expect(client.page.locator(".player-row.is-answering")).toHaveCount(1);
    await expect(client.page.locator(".player-row.is-answering")).toHaveAttribute(
      "data-player-name",
      "きいろ",
    );
  }
});
