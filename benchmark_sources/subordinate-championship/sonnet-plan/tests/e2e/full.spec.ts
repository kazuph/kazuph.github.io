import { expect, test } from "@playwright/test";
import { buzzAndAnswer, closeAll, correctIndex, openRoomOf4, startGame, waitQuestion, type Player } from "./helpers";

const SHOTS = ".artifacts/screenshots";

async function shoot(pc: Player, mobile: Player, stage: string): Promise<void> {
  await pc.page.screenshot({ path: `${SHOTS}/${stage}-pc.png` });
  await mobile.page.screenshot({ path: `${SHOTS}/${stage}-mobile.png` });
}

test("10問を最後まで遊び、4つの画面に同じ最終順位が出る（各画面を PC幅・スマホ幅で撮影）", async ({ browser }) => {
  test.setTimeout(180_000);
  const { players } = await openRoomOf4(browser, ["あや", "けん", "ゆい", "そら"]);
  const [pc, , , mobile] = players;
  await shoot(pc, mobile, "1-lobby");

  await startGame(players);
  await waitQuestion(players, 1);
  await shoot(pc, mobile, "2-question");

  // 1問目: スマホの人が回答中の画面 → 不正解 → PCの人が回答中の画面 → 正解 → 正解表示
  await mobile.page.getByTestId("buzz-btn").click();
  await expect(mobile.page.getByTestId("choice-0")).toBeEnabled();
  await expect(pc.page.getByTestId("status")).toContainText("そらさんが回答中");
  await shoot(pc, mobile, "3-answering");
  await mobile.page.getByTestId(`choice-${((await correctIndex(mobile.page)) + 1) % 4}`).click();
  await expect(pc.page.getByTestId("buzz-btn")).toBeEnabled();
  await pc.page.getByTestId("buzz-btn").click();
  await expect(pc.page.getByTestId("choice-0")).toBeEnabled();
  await shoot(pc, mobile, "4-answering-self");
  await pc.page.getByTestId(`choice-${await correctIndex(pc.page)}`).click();
  await expect(pc.page.locator("body")).toHaveAttribute("data-phase", "reveal");
  await shoot(pc, mobile, "5-reveal");

  // 2〜10問目: 4人が順番に正解していく
  for (let q = 2; q <= 10; q++) {
    await waitQuestion(players, q);
    await buzzAndAnswer(players[(q - 1) % 4], true);
  }
  for (const p of players) await expect(p.page.getByTestId("screen-result")).toBeVisible({ timeout: 10_000 });
  await shoot(pc, mobile, "6-result");

  const texts = await Promise.all(players.map((p) => p.page.getByTestId("ranking").innerText()));
  expect(new Set(texts).size).toBe(1);
  // あや: 1問目+10 と 5,9問目 → 30 / けん: 2,6,10問目 → 30 / ゆい: 3,7問目 → 20 / そら: -5 + 4,8問目 → 15
  const rows = await players[0].page.getByTestId("rank-row").evaluateAll((els) =>
    els.map((e) => ({ name: (e as HTMLElement).dataset.name, rank: (e as HTMLElement).dataset.rank, text: e.textContent })),
  );
  expect(rows.map((r) => `${r.rank}:${r.name}`)).toEqual(["1:あや", "1:けん", "3:ゆい", "4:そら"]);
  expect(rows.map((r) => r.text)).toEqual([
    expect.stringContaining("30点"), expect.stringContaining("30点"), expect.stringContaining("20点"), expect.stringContaining("15点"),
  ]);
  await closeAll(players);
});
