import { expect, test } from "@playwright/test";
import {
  answererOf,
  createRoomAs,
  gather,
  hammerCurrentQuestion,
  joinRoomAs,
  meOf,
  openHome,
  phaseOf,
  pressBuzz,
  questionIndexOf,
} from "./helpers";

/**
 * ブラウザE2E。
 * 実際に複数のブラウザコンテキストを立ち上げ、4人が同じ部屋で遊ぶところまで通す。
 * サーバーは playwright.config.ts の webServer が 8899 で起動する。
 */

test("4人まで入れて、5人目は満員の理由が画面に出る", async ({ browser }) => {
  const party = await gather(browser, ["いち", "に", "さん", "よん"]);
  await expect(party.pages[0].locator("#lobby-count")).toContainText("4 / 4");
  await expect(party.pages[0].locator("#lobby-players [data-player-id]")).toHaveCount(4);
  // ホスト以外には開始ボタンが出ない
  await expect(party.pages[3].locator("#btn-start")).toBeHidden();

  const fifthContext = await browser.newContext();
  const fifth = await fifthContext.newPage();
  await openHome(fifth);
  await fifth.fill("#input-name", "ご");
  await fifth.click("#tab-join");
  await fifth.fill("#input-code", party.code);
  await fifth.click("#btn-join");

  await expect(fifth.locator("#home-error")).toBeVisible();
  await expect(fifth.locator("#home-error")).toContainText("満員");
  await expect(fifth.locator("#home-error")).toContainText("定員4人");
  await expect(fifth.locator("#screen-home")).toBeVisible();
  await expect(party.pages[0].locator("#lobby-players [data-player-id]")).toHaveCount(4);
});

test("4人がいっせいに早押ししても回答権を得るのは1人だけ", async ({ browser }) => {
  const party = await gather(browser, ["あか", "あお", "き", "みどり"]);
  const pages = party.pages;

  await pages[0].click("#btn-start");
  for (const page of pages) {
    await expect(page.locator("#screen-game")).toBeVisible();
    await expect(page.locator("#btn-buzz")).toBeEnabled();
    await expect(page.locator("#question-text")).not.toBeEmpty();
  }

  // 4ページで可能な限り同時にクリックする
  await Promise.all(
    pages.map((page) =>
      page.evaluate(() => (document.getElementById("btn-buzz") as HTMLButtonElement).click()),
    ),
  );

  await expect
    .poll(
      async () => {
        const values = await Promise.all(pages.map((page) => answererOf(page)));
        return new Set(values.filter(Boolean)).size;
      },
      { timeout: 8000 },
    )
    .toBe(1);

  const statuses = await Promise.all(
    pages.map((page) => page.locator("#buzz-status").textContent()),
  );
  expect(statuses.filter((s) => s && s.includes("あなたが回答中"))).toHaveLength(1);
  // 全員が同じ回答者を見ている
  const answerers = await Promise.all(pages.map((page) => answererOf(page)));
  expect(new Set(answerers)).toHaveProperty("size", 1);
});

test("点数・残り時間・誰が回答中かが全員の画面でそろう", async ({ browser }) => {
  const party = await gather(browser, ["いち", "に", "さん", "よん"]);
  const pages = party.pages;

  await pages[0].click("#btn-start");
  for (const page of pages) {
    await expect(page.locator("#screen-game")).toBeVisible();
    await expect(page.locator("#btn-buzz")).toBeEnabled();
  }

  // 残り時間: 全員がサーバーの同じ締め切りから計算しているので1秒以内に収まる
  await expect
    .poll(async () => {
      const values = await Promise.all(
        pages.map(async (page) => Number(await page.locator("#timer-seconds").textContent())),
      );
      if (!values.every((value) => Number.isFinite(value))) return null;
      return Math.max(...values) - Math.min(...values);
    })
    .toBeLessThanOrEqual(1);

  // 回答者: どの画面でも同じ1人を指す
  expect(await pressBuzz(pages[0])).toBe(true);
  await expect
    .poll(async () => new Set(await Promise.all(pages.map((page) => answererOf(page)))).size)
    .toBe(1);
  const statuses = await Promise.all(
    pages.map((page) => page.locator("#buzz-status").textContent()),
  );
  expect(statuses.filter((s) => s && s.includes("あなたが回答中"))).toHaveLength(1);

  // 点数: 回答後、全員のスコアボードが同じ値になる
  const answererId = await meOf(pages[0]);
  await pages[0].locator('[data-testid="choice"]').first().click();
  await expect
    .poll(async () => {
      const scores = await Promise.all(
        pages.map((page) =>
          page
            .locator(`#scoreboard [data-testid="score-row"][data-player-id="${answererId}"]`)
            .getAttribute("data-score"),
        ),
      );
      return new Set(scores.map(Number)).size === 1 && Number(scores[0]) !== 0;
    })
    .toBe(true);
});

test("回答すると点数が入り、再読み込みしても同じプレイヤーとして復帰する", async ({ browser }) => {
  const party = await gather(browser, ["ホスト", "あいて"]);
  const [host, guest] = party.pages;

  await host.click("#btn-start");
  await expect(host.locator("#screen-game")).toBeVisible();
  await expect(guest.locator("#btn-buzz")).toBeEnabled();
  await expect(host.locator("#btn-buzz")).toBeEnabled();
  expect(await pressBuzz(host)).toBe(true);
  await expect(host.locator("#buzz-status")).toContainText("あなたが回答中");
  await host.locator('[data-testid="choice"]').first().click();

  const myRow = host.locator('#scoreboard [data-testid="score-row"].is-me');
  await expect.poll(async () => Number(await myRow.getAttribute("data-score"))).not.toBe(0);
  const before = Number(await myRow.getAttribute("data-score"));
  expect([10, -5]).toContain(before);

  // ゲスト側でも同じ点数が見えている（全員の画面でそろっている）
  await expect
    .poll(async () => {
      const rows = await guest
        .locator('#scoreboard [data-testid="score-row"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute("data-score")));
      return rows.map(Number).includes(before);
    })
    .toBe(true);

  await host.reload();
  await expect(host.locator("#screen-game")).toBeVisible();
  const after = Number(
    await host.locator('#scoreboard [data-testid="score-row"].is-me').getAttribute("data-score"),
  );
  expect(after).toBe(before);
  await expect(host.locator('#scoreboard [data-testid="score-row"].is-me')).toContainText("ホスト");
});

test("4人が同じ部屋で10問を遊びきり、全員に最終順位が出る", async ({ browser }) => {
  test.setTimeout(150_000);
  const party = await gather(browser, ["一郎", "二郎", "三郎", "四郎"]);
  const pages = party.pages;

  await pages[0].click("#btn-start");
  for (const page of pages) {
    await expect(page.locator("#screen-game")).toBeVisible();
  }

  for (let q = 0; q < 10; q++) {
    await expect.poll(() => phaseOf(pages[0]), { timeout: 12_000 }).toBe("question");
    const before = await questionIndexOf(pages[0]);
    expect(before).toBe(q);

    await hammerCurrentQuestion(pages);

    await expect
      .poll(
        async () => {
          const phase = await phaseOf(pages[0]);
          if (phase === "final") return "final";
          return String(await questionIndexOf(pages[0]));
        },
        { timeout: 20_000 },
      )
      .not.toBe(String(before));
  }

  for (const page of pages) {
    await expect(page.locator("#screen-final")).toBeVisible();
    await expect(page.locator('#final-ranking [data-testid="rank-row"]')).toHaveCount(4);
  }

  const referenceOrder = await pages[0]
    .locator('#final-ranking [data-testid="rank-row"]')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-player-id")));
  for (const page of pages) {
    const order = await page
      .locator('#final-ranking [data-testid="rank-row"]')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute("data-player-id")));
    expect(order).toEqual(referenceOrder);
  }
});

test("スマホ幅(390x844)でも部屋に入って早押し・回答できる", async ({ browser }) => {
  const mobile = {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  };
  const contextA = await browser.newContext(mobile);
  const contextB = await browser.newContext(mobile);
  const a = await contextA.newPage();
  const b = await contextB.newPage();

  const code = await createRoomAs(a, "モバイル");
  await joinRoomAs(b, "ともだち", code);
  await expect(a.locator("#lobby-players [data-player-id]")).toHaveCount(2);

  await a.locator("#btn-start").click();
  await expect(a.locator("#screen-game")).toBeVisible();
  await expect(a.locator("#btn-buzz")).toBeEnabled();
  expect(await pressBuzz(a)).toBe(true);
  await expect(a.locator("#buzz-status")).toContainText("あなたが回答中");

  // 選択肢がタップできる
  await a.locator('[data-testid="choice"]').first().click();
  await expect
    .poll(async () => Number(await a.locator('#scoreboard [data-testid="score-row"].is-me').getAttribute("data-score")))
    .not.toBe(0);
});
