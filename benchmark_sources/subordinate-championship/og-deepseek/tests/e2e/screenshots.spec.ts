import { mkdir } from "node:fs/promises";
import path from "node:path";
import { devices, expect, test } from "@playwright/test";
import {
  answerOn,
  buzz,
  correctIndexForPrompt,
  createRoom,
  findAnswerer,
  joinRoom,
  openPlayer,
  promptOf,
  resultScore,
  scoreOf,
  startGame,
  waitForPhase,
  waitForQuestion,
  waitForReveal,
  type TestPlayer,
} from "./helpers";

const ARTIFACTS = path.resolve(".artifacts");

test.describe("screenshots and full 4 player game", () => {
  test.setTimeout(240_000);

  test("captures lobby, question, answering and result on desktop and mobile", async ({
    browser,
  }) => {
    await mkdir(ARTIFACTS, { recursive: true });

    const deskA = await openPlayer(browser, "Hikari", {
      viewport: { width: 1440, height: 900 },
    });
    const deskB = await openPlayer(browser, "Ren", {
      viewport: { width: 1440, height: 900 },
    });
    const deskC = await openPlayer(browser, "Mio", {
      viewport: { width: 1440, height: 900 },
    });
    const mobile = await openPlayer(browser, "Sora", {
      ...devices["iPhone 13"],
      deviceScaleFactor: 2,
    });
    const players: TestPlayer[] = [deskA, deskB, deskC, mobile];
    const pages = players.map((player) => player.page);

    const code = await createRoom(deskA);
    for (const player of [deskB, deskC, mobile]) {
      await joinRoom(player, code);
    }
    for (const page of pages) {
      await expect(page.getByTestId("player-count")).toContainText("4 / 4");
    }
    await deskA.page.waitForTimeout(400);
    await deskA.page.screenshot({
      path: path.join(ARTIFACTS, "lobby-desktop.png"),
      fullPage: true,
    });
    await mobile.page.screenshot({
      path: path.join(ARTIFACTS, "lobby-mobile.png"),
      fullPage: true,
    });

    await startGame(deskA.page);
    await waitForQuestion(pages, 1);
    await deskA.page.waitForTimeout(400);
    await deskA.page.screenshot({
      path: path.join(ARTIFACTS, "question-desktop.png"),
    });
    await mobile.page.screenshot({
      path: path.join(ARTIFACTS, "question-mobile.png"),
    });

    // Round 1: Hikari buzzes and the answering UI is captured on both widths.
    const prompt1 = await promptOf(deskA.page);
    const correct1 = correctIndexForPrompt(prompt1);
    await buzz(deskA.page);
    await expect(deskA.page.getByTestId("you-are-answering")).toBeVisible();
    await expect(mobile.page.getByTestId("other-answering")).toBeVisible();
    await mobile.page.getByTestId("buzz-zone").scrollIntoViewIfNeeded();
    await Promise.all([
      deskA.page.screenshot({
        path: path.join(ARTIFACTS, "answering-desktop.png"),
      }),
      mobile.page.screenshot({
        path: path.join(ARTIFACTS, "answering-mobile.png"),
      }),
    ]);
    await answerOn(deskA.page, correct1);
    await waitForReveal(pages, 1);

    for (let round = 2; round <= 10; round += 1) {
      await waitForQuestion(pages, round);
      const prompt = await promptOf(deskA.page);
      const correct = correctIndexForPrompt(prompt);

      if (round === 4) {
        // Deliberately wrong answer: the server applies -5, locks Hikari out,
        // and reopens buzzing for the remaining players.
        await buzz(deskA.page);
        await findAnswerer(pages);
        await answerOn(deskA.page, (correct + 1) % 4);
        await waitForPhase(pages, "question", 4);
        await expect(deskA.page.getByTestId("locked-out")).toBeVisible();
        await buzz(deskB.page);
        const answerer = await findAnswerer(pages);
        expect(answerer).toBe(deskB.page);
        await answerOn(answerer, correct);
      } else {
        const buzzer = players[(round - 1) % players.length];
        await buzz(buzzer.page);
        const answerer = await findAnswerer(pages);
        expect(answerer).toBe(buzzer.page);
        await answerOn(answerer, correct);
      }

      await waitForReveal(pages, round);
    }

    await waitForPhase(pages, "finished");

    const expected: Record<string, number> = {
      Hikari: 25,
      Ren: 40,
      Mio: 20,
      Sora: 10,
    };
    for (const page of pages) {
      for (const [name, score] of Object.entries(expected)) {
        expect(await resultScore(page, name)).toBe(score);
      }
      await expect(page.getByTestId("rank-row")).toHaveCount(4);
      await expect(page.getByTestId("winner-name")).toContainText("Ren");
    }

    await deskA.page.waitForTimeout(500);
    await deskA.page.screenshot({
      path: path.join(ARTIFACTS, "result-desktop.png"),
      fullPage: true,
    });
    await mobile.page.screenshot({
      path: path.join(ARTIFACTS, "result-mobile.png"),
      fullPage: true,
    });

    await expect(mobile.page.getByTestId("result")).toBeVisible();
  });
});
