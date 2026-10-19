import { expect, test } from "@playwright/test";
import {
  answerOn,
  buzz,
  correctIndexForPrompt,
  createRoom,
  findAnswerer,
  joinRoom,
  openPlayer,
  promptOf,
  scoreOf,
  startGame,
  waitForPhase,
  waitForQuestion,
  waitForReveal,
  type TestPlayer,
} from "./helpers";

test.describe("4-player buzzer quiz", () => {
  test("rejects a 5th player, synchronises a simultaneous buzz, and survives reload", async ({
    browser,
  }) => {
    const host = await openPlayer(browser, "Alice");
    const bob = await openPlayer(browser, "Bob");
    const cara = await openPlayer(browser, "Cara");
    const dan = await openPlayer(browser, "Dan");
    const players = [host, bob, cara, dan];
    const pages = players.map((player) => player.page);

    const code = await createRoom(host);
    for (const player of [bob, cara, dan]) await joinRoom(player, code);

    for (const page of pages) {
      await expect(page.getByTestId("player-count")).toContainText("4 / 4");
    }

    // A 5th visitor is refused before a socket is ever created, and the UI
    // explains the 4 player capacity.
    const fifth = await openPlayer(browser, "Eve");
    await fifth.page.getByTestId("room-code-input").fill(code);
    await fifth.page.getByTestId("join-room").click();
    await expect(fifth.page.getByTestId("landing-error")).toContainText(
      "満員",
    );
    await expect(fifth.page).toHaveURL(/\/$/);
    await fifth.context.close();

    await startGame(host.page);
    await waitForQuestion(pages, 1);

    // The question and all four choices are visible to everyone.
    for (const page of pages) {
      await expect(page.getByTestId("question-prompt")).not.toBeEmpty();
      for (let choice = 0; choice < 4; choice += 1) {
        await expect(page.getByTestId(`choice-${choice}`)).toBeVisible();
      }
      await expect(page.getByTestId("buzz-button")).toBeVisible();
    }

    const prompt = await promptOf(host.page);
    const correct = correctIndexForPrompt(prompt);

    // Four near-simultaneous buzzes. The server must grant exactly one right.
    await Promise.all(pages.map((page) => buzz(page)));
    const answererPage = await findAnswerer(pages);
    const answerer = players.find(
      (player) => player.page === answererPage,
    ) as TestPlayer;

    let otherCount = 0;
    for (const player of players) {
      if (player === answerer) continue;
      await expect(player.page.getByTestId("other-answering")).toBeVisible();
      await expect(player.page.getByTestId("answerer-name")).toContainText(
        answerer.name,
      );
      otherCount += 1;
    }
    expect(otherCount).toBe(3);

    await answerOn(answererPage, correct);
    await waitForReveal(pages, 1);
    for (const player of pages) {
      await expect(player.getByTestId("reveal-banner")).toContainText("正解");
      expect(await scoreOf(player, answerer.name)).toBe(10);
    }

    // Reload the answerer: same player, same score, same room.
    await answererPage.reload();
    await expect(answererPage.locator('[data-testid="room"], [data-testid="result"]')).toHaveAttribute(
      "data-phase",
      /.+/,
      { timeout: 15_000 },
    );
    await expect
      .poll(() => scoreOf(answererPage, answerer.name), { timeout: 15_000 })
      .toBe(10);
    await expect(answererPage.getByTestId("player-card")).toHaveCount(4);

    // Question 2: a wrong answer is penalised, the player is locked out, and
    // the remaining players can buzz again.
    await waitForQuestion(pages, 2);
    const prompt2 = await promptOf(host.page);
    const correct2 = correctIndexForPrompt(prompt2);
    const wrong2 = (correct2 + 1) % 4;

    await buzz(answererPage);
    const answerer2 = await findAnswerer(pages);
    await answerOn(answerer2, wrong2);
    await waitForPhase(pages, "question", 2);
    for (const player of pages) {
      await expect(
        player
          .locator(
            `[data-testid="player-card"][data-player-name="${answerer.name}"]`,
          )
          .getByTestId("player-status"),
      ).toContainText("解答権なし");
      expect(await scoreOf(player, answerer.name)).toBe(5);
    }

    const secondBuzzer = players.find(
      (player) => player.page !== answererPage,
    )!;
    await buzz(secondBuzzer.page);
    const answerer3 = await findAnswerer(pages);
    expect(answerer3).toBe(secondBuzzer.page);
    await answerOn(answerer3, correct2);
    await waitForReveal(pages, 2);
    for (const player of pages) {
      expect(await scoreOf(player, secondBuzzer.name)).toBe(10);
      expect(await scoreOf(player, answerer.name)).toBe(5);
    }
  });
});
