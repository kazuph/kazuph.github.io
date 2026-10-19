import { test, expect, type Page } from "@playwright/test";
import { QUESTIONS } from "../src/questions";
import { createRoom, joinRoom, phaseText, unlocked } from "./helpers";

test.describe("早押しクイズ 4人対戦", () => {
  test("5人目は満員で入れず、理由が画面に出る", async ({ browser }) => {
    const ctxs = [];
    try {
      const pages = [];
      for (let i = 0; i < 4; i++) {
        const c = await browser.newContext({ reducedMotion: "reduce" });
        ctxs.push(c);
        pages.push(await c.newPage());
      }
      const code = await createRoom(pages[0], "ホスト");
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], `参加者${i}`, code);
      await expect(pages[0].locator("[data-testid=player-count]")).toHaveText("4 / 4");

      const fifthCtx = await browser.newContext({ reducedMotion: "reduce" });
      ctxs.push(fifthCtx);
      const fifth = await fifthCtx.newPage();
      await fifth.goto("/");
      await fifth.fill("[data-testid=name-input]", "五人目");
      await fifth.fill("[data-testid=code-input]", code);
      await fifth.click("[data-testid=join-btn]");

      // ロビーには入れず、理由が表示される
      await expect(fifth.locator("[data-testid=home-error]")).toBeVisible();
      await expect(fifth.locator("[data-testid=home-error]")).toContainText("満員");
      await expect(fifth.locator("#view-home")).toHaveClass(/active/);
    } finally {
      for (const c of ctxs) await c.close();
    }
  });

  test("再読み込みしても点数を保ったまま復帰できる", async ({ browser }) => {
    const c1 = await browser.newContext({ reducedMotion: "reduce" });
    const c2 = await browser.newContext({ reducedMotion: "reduce" });
    try {
      const p1 = await c1.newPage();
      const p2 = await c2.newPage();
      const code = await createRoom(p1, "Aさん");
      await joinRoom(p2, "Bさん", code);
      await expect(p1.locator("[data-testid=player-count]")).toHaveText("2 / 4");

      await p1.click("[data-testid=start-btn]");
      await expect(p1.locator("[data-testid=phase]")).toContainText("早押し受付中");

      // A が押して正解
      await p1.click("[data-testid=buzz-btn]");
      await expect(p1.locator("[data-testid=phase]")).toContainText("あなたが回答中");
      const correct = QUESTIONS[0].correct;
      await p1.click(`[data-testid=choice-${correct}]`);
      await expect(p1.locator("[data-testid=phase]")).not.toContainText("あなたが回答中");

      const scoreLocator = p1.locator(".score-chip:has(.sc-name:has-text('あなた')) .sc-score");
      const before = (await scoreLocator.textContent())?.trim() ?? "";
      expect(before).toContain("10");

      // リロード（同じ playerId が localStorage に残っているので自動再接続）
      await p1.reload();
      await expect(p1.locator("#view-game")).toHaveClass(/active/);
      await expect(p1.locator(".score-chip:has(.sc-name:has-text('あなた')) .sc-score")).toContainText("10");
      // プレイヤーが重複していない
      await expect(p1.locator("[data-testid=scoreboard] .score-chip")).toHaveCount(2);
    } finally {
      await c1.close();
      await c2.close();
    }
  });

  test("4人で同時に遊べて、結果画面まで到達する", async ({ browser }) => {
    test.setTimeout(240_000);
    const ctxs = [];
    try {
      const pages = [];
      for (let i = 0; i < 4; i++) {
        const c = await browser.newContext({ reducedMotion: "reduce" });
        ctxs.push(c);
        pages.push(await c.newPage());
      }
      const names = ["一郎", "二郎", "三郎", "四郎"];
      const code = await createRoom(pages[0], names[0]);
      for (let i = 1; i < 4; i++) await joinRoom(pages[i], names[i], code);
      await expect(pages[0].locator("[data-testid=player-count]")).toHaveText("4 / 4");
      for (const p of pages) {
        await expect(p.locator("[data-testid=player-list] .player-slot.filled")).toHaveCount(4);
      }

      await pages[0].click("[data-testid=start-btn]");
      for (const p of pages) await expect(p.locator("#view-game")).toHaveClass(/active/);

      for (let qi = 0; qi < QUESTIONS.length; qi++) {
        const q = QUESTIONS[qi];
        // 問題文が全員にそろって配信されている
        for (const p of pages) {
          await expect(p.locator("[data-testid=question-text]")).toHaveText(q.text);
          await expect(p.locator("[data-testid=q-index]")).toHaveText(String(qi + 1));
        }

        // 4人それぞれが押して回答権を取るまで繰り返す
        for (let guard = 0; guard < 16; guard++) {
          // すでに誰かが回答中なら、自分が回答権を持つページで答える
          const mine = await findMine(pages);
          if (mine) {
            await mine.click(`[data-testid=choice-${q.correct}]`).catch(() => {});
            await expect(mine.locator("[data-testid=phase]")).not.toContainText("あなたが回答中", { timeout: 6000 });
            continue;
          }
          const able = await unlocked(pages);
          if (able.length === 0) break;
          // 4人でほぼ同時に押す（勝敗はサーバーが決める）。敗者のクリック完了は
          // 待たずに、回答権を得た1人をポーリングで見つける。
          for (const p of able) {
            void p
              .locator("[data-testid=buzz-btn]")
              .click({ timeout: 4000 })
              .catch(() => {});
          }
          const winner = await waitMine(pages, 6000);
          if (!winner) continue;
          // サーバーが1人だけに回答権を与えている
          const answeringCount = (
            await Promise.all(pages.map(async (p) => (await phaseText(p)).includes("あなたが回答中")))
          ).filter(Boolean).length;
          expect(answeringCount).toBe(1);

          await winner.click(`[data-testid=choice-${q.correct}]`).catch(() => {});
          await expect(winner.locator("[data-testid=phase]")).not.toContainText("あなたが回答中", { timeout: 6000 });
        }

        // 全員押せなくなったら正解発表
        for (const p of pages) await expect(p.locator("[data-testid=phase]")).toContainText("正解は", { timeout: 15000 });
        for (const p of pages) {
          await expect(p.locator(`[data-testid=choice-${q.correct}]`)).toHaveClass(/correct/);
        }
      }

      // 最終結果
      for (const p of pages) {
        await expect(p.locator("#view-result")).toHaveClass(/active/, { timeout: 15000 });
        await expect(p.locator("[data-testid=rank-list] li")).toHaveCount(4);
      }
      // 全員が全問正解したので同点（+100点）
      const firstScore = await pages[0].locator("[data-testid=rank-list] li .rank-score").first().textContent();
      expect(firstScore).toContain("100");
    } finally {
      for (const c of ctxs) await c.close();
    }
  });
});

function p_wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** いま「あなたが回答中」になっているページを探す。 */
async function findMine(pages: Page[]): Promise<Page | null> {
  for (const p of pages) {
    if ((await phaseText(p)).includes("あなたが回答中")) return p;
  }
  return null;
}

/** 回答権を持つページが現れるまでポーリングする。 */
async function waitMine(pages: Page[], timeoutMs: number): Promise<Page | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const mine = await findMine(pages);
    if (mine) return mine;
    await p_wait(50);
  }
  return null;
}
