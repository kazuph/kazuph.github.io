import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import {
  ARTIFACTS_DIR,
  MOBILE_VIEWPORT,
  PC_VIEWPORT,
  answerCorrectly,
  buzzAll,
  closePlayers,
  ensureArtifactsDir,
  findAnswerer,
  setupGame,
  startGame,
  waitForPhase,
  waitForQuestionNumber,
} from "./helpers";

const TOTAL_QUESTIONS = 10;

interface RankedRow {
  name: string;
  score: string;
}

async function readRanking(page: Page): Promise<RankedRow[]> {
  const names = await page.locator(".result-name").allTextContents();
  const scores = await page.locator(".result-score").allTextContents();
  return names.map((name, index) => ({
    name: name.replace(" (あなた)", "").trim(),
    score: scores[index].trim(),
  }));
}

test.describe("通しプレイとスクリーンショット", () => {
  test("10問を最後まで遊ぶと、4つの画面に同じ最終順位が出る", async ({ browser }) => {
    test.setTimeout(180_000);
    const { players } = await setupGame(browser, ["Alice", "Bob", "Carol", "Dave"]);
    await startGame(players);

    for (let questionNumber = 1; questionNumber <= TOTAL_QUESTIONS; questionNumber += 1) {
      await buzzAll(players);
      const answerer = await findAnswerer(players);
      await answerCorrectly(answerer);
      if (questionNumber < TOTAL_QUESTIONS) {
        for (const player of players) {
          await waitForQuestionNumber(player.page, questionNumber + 1);
        }
      }
    }

    for (const player of players) {
      await waitForPhase(player.page, "finished");
    }
    const rankings = await Promise.all(players.map((player) => readRanking(player.page)));
    for (const ranking of rankings) {
      expect(ranking).toEqual(rankings[0]);
    }
    // 10問すべて正解したので合計は 10 × 10 = 100 点。
    const total = rankings[0].reduce((sum, row) => sum + Number.parseInt(row.score, 10), 0);
    expect(total).toBe(100);

    await closePlayers(players);
  });

  test("ロビー・出題中・回答中・結果をPC幅とスマホ幅で保存し、スマホで1画面に収まる", async ({
    browser,
  }) => {
    test.setTimeout(240_000);
    ensureArtifactsDir();
    const { players } = await setupGame(
      browser,
      ["Alice", "Bob", "Carol", "Dave"],
      [PC_VIEWPORT, PC_VIEWPORT, PC_VIEWPORT, MOBILE_VIEWPORT],
    );
    const pc = players[0];
    const mobile = players[3];

    // ロビー
    await pc.page.screenshot({ path: join(ARTIFACTS_DIR, "lobby-pc.png") });
    await mobile.page.screenshot({ path: join(ARTIFACTS_DIR, "lobby-mobile.png") });

    await startGame(players);
    await waitForQuestionNumber(pc.page, 1);

    // 出題中
    await pc.page.screenshot({ path: join(ARTIFACTS_DIR, "question-pc.png") });
    await mobile.page.screenshot({ path: join(ARTIFACTS_DIR, "question-mobile.png") });

    // スマホ幅では、問題文・4択・早押しボタンがスクロールせずに見えている。
    for (const selector of ["#question-text", "#choices", "#buzz-btn"]) {
      const box = await mobile.page.locator(selector).boundingBox();
      if (!box) throw new Error(`${selector} の位置を取得できませんでした`);
      expect(box.y, `${selector} が画面上端より上にある`).toBeGreaterThanOrEqual(0);
      expect(
        box.y + box.height,
        `${selector} が画面内に収まっている`,
      ).toBeLessThanOrEqual(MOBILE_VIEWPORT.height + 1);
    }

    // 回答中（ホストだけが押して、回答権はホスト1人）。
    await expect(pc.page.locator("#buzz-btn")).toBeEnabled();
    await pc.page.locator("#buzz-btn").click();
    const answerer = await findAnswerer(players);
    expect(answerer.name).toBe("Alice");
    await expect(mobile.page.locator(".score-item.answering")).toContainText("Alice");
    await pc.page.screenshot({ path: join(ARTIFACTS_DIR, "answering-pc.png") });
    await mobile.page.screenshot({ path: join(ARTIFACTS_DIR, "answering-mobile.png") });
    await answerCorrectly(answerer);

    // 残りの問題を最後まで進める。
    for (let questionNumber = 2; questionNumber <= TOTAL_QUESTIONS; questionNumber += 1) {
      for (const player of players) {
        await waitForQuestionNumber(player.page, questionNumber);
      }
      await buzzAll(players);
      const next = await findAnswerer(players);
      await answerCorrectly(next);
    }
    for (const player of players) {
      await waitForPhase(player.page, "finished");
    }

    // 結果
    await pc.page.screenshot({ path: join(ARTIFACTS_DIR, "result-pc.png") });
    await mobile.page.screenshot({ path: join(ARTIFACTS_DIR, "result-mobile.png") });

    await closePlayers(players);
  });
});
