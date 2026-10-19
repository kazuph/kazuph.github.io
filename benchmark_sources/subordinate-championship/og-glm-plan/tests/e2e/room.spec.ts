import { expect, test } from "@playwright/test";
import { makePlayers, NAMES } from "./fixtures";
import {
  MOBILE_VIEWPORT,
  PC_VIEWPORT,
  answerCorrectly,
  answerWrongly,
  buzzAll,
  createRoom,
  findAnswerer,
  joinRoom,
  startGame,
  waitQuestion,
} from "./helpers";

test.describe("部屋の作成・参加・定員", () => {
  test("4人まで入室でき、5人目は満員で拒否される", async ({ browser }) => {
    const { contexts, pages } = await makePlayers(browser);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], NAMES[i], code);

      // ホストのロビーに4人並ぶ（空席がなく、全員の名前が出る）
      await expect(pages[0].locator("#lobby-players")).not.toContainText("あいた座席");
      for (const name of NAMES.slice(0, 4)) {
        await expect(pages[0].locator("#lobby-players")).toContainText(name);
      }
      await expect(pages[0].locator("#lobby-count")).toHaveText("4/4");

      // 5人目は入れない。理由が画面に出る
      const fifth = await browser.newContext({ viewport: PC_VIEWPORT });
      const fifthPage = await fifth.newPage();
      await fifthPage.goto("/");
      await fifthPage.fill("#input-name", "5人目");
      await fifthPage.fill("#input-code", code);
      await fifthPage.click("#btn-join");
      await expect(fifthPage.locator("#entry-error")).toHaveText("満員です（4人まで）");
      await fifth.close();
    } finally {
      for (const c of contexts) await c.close();
    }
  });

  test("開始できるのは2人以上のとき。1人では開始ボタンが押せない", async ({ page }) => {
    const code = await createRoom(page, "ひとりぼっち");
    await expect(page.locator("#btn-start")).toBeDisabled();
    // 2人目が入ると押せる
    const second = await page.context().browser()!.newContext({ viewport: MOBILE_VIEWPORT });
    const secondPage = await second.newPage();
    await joinRoom(secondPage, "うえの", code);
    await expect(page.locator("#btn-start")).toBeEnabled();
    await second.close();
  });
});

test.describe("早押しと得点", () => {
  test("4人が同時に押すと、回答権を得る画面はちょうど1つ（3問くり返す）", async ({ browser }) => {
    const { contexts, pages } = await makePlayers(browser);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], NAMES[i], code);
      await startGame(pages[0]);

      for (let round = 1; round <= 3; round++) {
        await Promise.all(pages.map((p) => waitQuestion(p, round)));
        await buzzAll(pages);
        const answerer = await findAnswerer(pages);
        await answerCorrectly(answerer);
        // 全員の画面で正解表示になる
        await Promise.all(pages.map((p) => expect(p.locator("#game-status")).toContainText("正解は")));
      }
    } finally {
      for (const c of contexts) await c.close();
    }
  });

  test("不正解の相手は -5点になり、その問題ではもう押せない（全員の画面でそろう）", async ({ browser }) => {
    const { contexts, pages } = await makePlayers(browser);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], NAMES[i], code);
      await startGame(pages[0]);
      await Promise.all(pages.map((p) => waitQuestion(p, 1)));
      await buzzAll(pages);
      const answerer = await findAnswerer(pages);
      const answererName = NAMES[pages.indexOf(answerer)];

      await answerWrongly(answerer);

      // 全員の画面で、外した人の点数が -5 になる
      for (const p of pages) {
        const row = p.locator("#players-list li", { hasText: answererName });
        await expect(row.locator(".p-score")).toHaveText("-5");
      }
      // 外した人の画面では、この問題でもう押せない
      await expect(answerer.locator("#buzzer")).toBeDisabled();
      await expect(answerer.locator("#buzzer")).toContainText("この問題は回答済み");
      // ほかの人はまだ押せる（同じ問題で早押しを再開）
      for (const p of pages) {
        if (p !== answerer) await expect(p.locator("#buzzer")).toBeEnabled();
      }
    } finally {
      for (const c of contexts) await c.close();
    }
  });
});

test.describe("再読み込みと再接続", () => {
  test("回答権を持ったまま再読み込みしても、同じ名前・同じ点数で戻れる", async ({ browser }) => {
    const { contexts, pages } = await makePlayers(browser, 3);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      await joinRoom(pages[1], NAMES[1], code);
      await joinRoom(pages[2], NAMES[2], code);
      await startGame(pages[0]);
      await Promise.all(pages.map((p) => waitQuestion(p, 1)));

      // 回答者アの画面
      await pages[1].click("#buzzer");
      await expect(pages[1].locator("#game-status")).toContainText("あなたが回答中");

      // 再読み込みしても同じプレイヤーとして復帰する
      await pages[1].reload();
      await expect(pages[1].locator("#screen-game")).toBeVisible();
      await expect(pages[1].locator("#players-list li", { hasText: NAMES[1] }).locator(".p-score")).toHaveText("0");
      await expect(pages[1].locator("#game-status")).toContainText("あなたが回答中");

      // そのまま回答を続けられる
      await answerCorrectly(pages[1]);
      await expect(pages[1].locator("#game-status")).toContainText("正解は");
    } finally {
      for (const c of contexts) await c.close();
    }
  });

  test("回線が一時的に切れると「接続が切れています」が出て、戻ると自動で再接続する", async ({ browser }) => {
    const { contexts, pages } = await makePlayers(browser);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], NAMES[i], code);
      await startGame(pages[0]);
      await Promise.all(pages.map((p) => waitQuestion(p, 1)));

      // 3人目の回線を切る。いったん off line にしたうえで、ブラウザが本来発火させる
      // offline イベントを発火させて、実際の回線断と同じ経路へ落とす
      // （Chromiumの CDP offline エミュレーションは既存の WebSocket を切らないため）
      await contexts[2].setOffline(true);
      await pages[2].evaluate(() => window.dispatchEvent(new Event("offline")));
      // 切れた人の画面では再接続中を出す
      await expect(pages[2].locator("#conn-banner")).toBeVisible();
      // ほかの人の画面では「接続が切れています」を出す
      await expect(pages[0].locator("#players-list li", { hasText: NAMES[2] })).toContainText("接続が切れています");
      await expect(pages[1].locator("#players-list li", { hasText: NAMES[2] })).toContainText("接続が切れています");

      // 5秒待って戻す
      await new Promise((r) => setTimeout(r, 5000));
      await contexts[2].setOffline(false);
      await pages[2].evaluate(() => window.dispatchEvent(new Event("online")));

      // 自動で再接続し、表示が消える。点数は0のまま
      await expect(pages[0].locator("#players-list li", { hasText: NAMES[2] })).not.toContainText("接続が切れています");
      await expect(pages[0].locator("#players-list li", { hasText: NAMES[2] }).locator(".p-score")).toHaveText("0");
      await expect(pages[2].locator("#conn-banner")).toBeHidden();
    } finally {
      for (const c of contexts) await c.close();
    }
  });
});

test.describe("表示の同期", () => {
  test("4つの画面の残り時間の差が1秒以内", async ({ browser }) => {
    const { contexts, pages } = await makePlayers(browser);
    try {
      const code = await createRoom(pages[0], NAMES[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], NAMES[i], code);
      await startGame(pages[0]);
      await Promise.all(pages.map((p) => waitQuestion(p, 1)));

      // 順番に読むので多少のずれはあるが、1秒以内に収まっているはず
      const seconds = [];
      for (const p of pages) {
        const text = (await p.locator("#timer-text").textContent())!.trim();
        seconds.push(parseFloat(text.replace(/[^\d.]/g, "")));
      }
      const spread = Math.max(...seconds) - Math.min(...seconds);
      expect(spread).toBeLessThanOrEqual(1.0);
    } finally {
      for (const c of contexts) await c.close();
    }
  });
});
