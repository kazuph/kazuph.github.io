import { expect, test } from "@playwright/test";
import {
  answerCorrectly,
  answererSeat,
  answerWrongly,
  createRoom,
  expectScore,
  joinRoom,
  openSeat,
  PC,
  scoreOn,
  SP,
  startWith,
  waitBuzzable,
  type Seat,
} from "./helpers";

test.describe("部屋・早押し・再接続", () => {
  test("PC3台とスマホ1台で入れて、5人目は満員と出る", async ({ browser }) => {
    test.setTimeout(60_000);
    const seats: Seat[] = [
      await openSeat(browser, "えー", PC),
      await openSeat(browser, "びー", PC),
      await openSeat(browser, "しー", PC),
      await openSeat(browser, "でぃー", SP),
    ];
    const code = await createRoom(seats[0]);
    // 1人のときは開始できない
    await expect(seats[0].page.locator("#start")).toBeDisabled();
    for (const seat of seats.slice(1)) await joinRoom(seat, code);
    for (const seat of seats) {
      await expect(seat.page.locator("#lobby-players li")).toHaveCount(4);
    }
    await expect(seats[0].page.locator("#start")).toBeEnabled();
    await expect(seats[1].page.locator("#start")).toBeHidden();
    const fifth = await openSeat(browser, "いー", PC);
    await joinRoom(fifth, code);
    await expect(fifth.page.locator("#entry-error")).toHaveText("満員です（4人まで）");
    await expect(fifth.page.locator("#lobby")).toBeHidden();
    await fifth.context.close();
    for (const seat of seats) await seat.context.close();
  });

  test("4人が同時に押しても回答権は1人だけ（3問くり返す）", async ({ browser }) => {
    test.setTimeout(90_000);
    const seats: Seat[] = [];
    for (const name of ["えー", "びー", "しー", "でぃー"]) seats.push(await openSeat(browser, name));
    const code = await createRoom(seats[0]);
    for (const seat of seats.slice(1)) await joinRoom(seat, code);
    await startWith(seats);

    for (let round = 0; round < 3; round++) {
      await waitBuzzable(seats);
      // 押せる瞬間に全員へ同時に押下を送る（押せない人の操作が遅れて届かないよう DOM の click を使う）
      await Promise.all(seats.map((seat) => seat.page.locator("#buzz").dispatchEvent("click")));
      const winner = await answererSeat(seats);
      // 4択が有効になるのは回答者の画面だけ
      for (const seat of seats) {
        const enabled = await seat.page.locator(".choice:enabled").count();
        expect(enabled).toBe(seat === winner ? 4 : 0);
        await expect(seat.page.locator("#status")).toContainText(
          seat === winner ? "あなたが回答中" : `${winner.name}さんが回答中`,
        );
      }
      await answerCorrectly(winner);
      await expect(seats[0].page.locator("#timer-text")).toContainText("次の問題まで");
    }
    // 3問終えた後、全員の画面で各人の点数が一致している
    for (const other of seats) {
      const expected = await scoreOn(seats[0].page, other.name);
      await expectScore(seats, other.name, expected);
    }
    for (const seat of seats) await seat.context.close();
  });

  test("不正解で -5 点になり、その人はこの問題で押せなくなる", async ({ browser }) => {
    test.setTimeout(60_000);
    const seats: Seat[] = [];
    for (const name of ["えー", "びー", "しー"]) seats.push(await openSeat(browser, name));
    const code = await createRoom(seats[0]);
    for (const seat of seats.slice(1)) await joinRoom(seat, code);
    await startWith(seats);

    await waitBuzzable(seats);
    const wrongSeat = seats[1];
    await wrongSeat.page.click("#buzz");
    await expect(wrongSeat.page.locator("#status")).toContainText("あなたが回答中");
    await answerWrongly(wrongSeat);

    await expectScore(seats, "びー", "-5");
    await expect(wrongSeat.page.locator("#buzz")).toBeDisabled();
    await expect(wrongSeat.page.locator("#status")).toContainText("この問題は回答済み");
    // 残りの人は押し直せる
    await expect(seats[0].page.locator("#buzz")).toBeEnabled();
    for (const seat of seats) await seat.context.close();
  });

  test("回答者が再読み込みしても、同じ名前・点数・回答中の状態で戻る", async ({ browser }) => {
    test.setTimeout(60_000);
    const a = await openSeat(browser, "えー");
    const b = await openSeat(browser, "びー");
    const seats = [a, b];
    const code = await createRoom(a);
    await joinRoom(b, code);
    await startWith(seats);

    // 1問目: えーが不正解で失格 → びーが正解（+10）
    await waitBuzzable(seats);
    await a.page.click("#buzz");
    await answererSeat(seats);
    await answerWrongly(a);
    await expect(b.page.locator("#buzz")).toBeEnabled();
    await b.page.click("#buzz");
    await answererSeat(seats);
    await answerCorrectly(b);
    await expectScore(seats, "びー", "+10");

    // 2問目: びーが押して回答中のところで再読み込み
    await waitBuzzable(seats);
    await b.page.click("#buzz");
    await answererSeat(seats);
    await b.page.reload();
    await expect(b.page.locator("#round")).toHaveText("第2問 / 10");
    await expect(b.page.locator("#status")).toContainText("あなたが回答中");
    await expect(b.page.locator("#game-players .pname", { hasText: /^びー$/ })).toBeVisible();
    await expect(b.page.locator("#game-players li.me .score")).toHaveText("+10");
    for (const seat of seats) await seat.context.close();
  });

  test("回線を5秒切ると「接続が切れています」が出て、戻ると自動で再接続する", async ({ browser }) => {
    test.setTimeout(90_000);
    const a = await openSeat(browser, "えー");
    const b = await openSeat(browser, "びー");
    const seats = [a, b];
    const code = await createRoom(a);
    await joinRoom(b, code);
    await startWith(seats);
    await waitBuzzable(seats);

    await a.context.setOffline(true);
    await expect(b.page.locator("#game-players li", { hasText: "えー" })).toContainText("接続が切れています", {
      timeout: 15_000,
    });
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await a.context.setOffline(false);
    await expect(b.page.locator("#game-players li", { hasText: "えー" })).not.toContainText("接続が切れています", {
      timeout: 15_000,
    });
    await expect(a.page.locator("#banner")).toBeHidden({ timeout: 15_000 });
    await expect(a.page.locator("#game")).toBeVisible();
    for (const seat of seats) await seat.context.close();
  });
});
