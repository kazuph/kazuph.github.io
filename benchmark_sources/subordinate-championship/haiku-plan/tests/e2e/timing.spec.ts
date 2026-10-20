import { expect, test } from "@playwright/test";
import { answererSeat, createRoom, joinRoom, openSeat, scoreOn, startWith, waitBuzzable, type Seat } from "./helpers";

// 時間は縮めず、実時間で確かめる
test.describe("締め切り（実時間）", () => {
  test("誰も答えないと20秒で正解が表示され、回答権を得て何も選ばないと10秒で -5 点になる", async ({ browser }) => {
    test.setTimeout(120_000);
    const a = await openSeat(browser, "えー");
    const b = await openSeat(browser, "びー");
    const seats: Seat[] = [a, b];
    const code = await createRoom(a);
    await joinRoom(b, code);
    await startWith(seats);

    // 1問目: 誰も押さない → 20秒で「誰も押しませんでした」
    await waitBuzzable(seats);
    const questionAt = Date.now();
    await expect(a.page.locator("#status")).toContainText("誰も押しませんでした", { timeout: 30_000 });
    const idleMs = Date.now() - questionAt;
    console.log(`問題の締め切り: 出題から ${idleMs} ms で正解表示`);
    expect(idleMs).toBeGreaterThanOrEqual(19_000);
    expect(idleMs).toBeLessThanOrEqual(23_000);

    // 2問目: びーが押して何も選ばない → 10秒で時間切れ -5
    await waitBuzzable(seats);
    await b.page.click("#buzz");
    await expect(b.page.locator("#status")).toContainText("あなたが回答中");
    const buzzedAt = Date.now();
    await expect(a.page.locator("#status")).toContainText("時間切れ", { timeout: 20_000 });
    const answerMs = Date.now() - buzzedAt;
    console.log(`回答の締め切り: 押してから ${answerMs} ms で時間切れ`);
    expect(answerMs).toBeGreaterThanOrEqual(9_000);
    expect(answerMs).toBeLessThanOrEqual(12_000);
    await expect.poll(() => scoreOn(a.page, "びー")).toBe("-5");
    await expect.poll(() => scoreOn(b.page, "びー")).toBe("-5");
    for (const seat of seats) await seat.context.close();
  });
});

test.describe("残り時間の同期", () => {
  test("端末の時計が30秒ずれていても、4画面の残り時間の差は1秒以内", async ({ browser }) => {
    test.setTimeout(90_000);
    const seats: Seat[] = [];
    for (const name of ["えー", "びー", "しー"]) seats.push(await openSeat(browser, name));
    // でぃーの端末の時計は30秒進んでいる
    const skewed = await openSeat(browser, "でぃー");
    await skewed.context.addInitScript(() => {
      const real = Date.now;
      Date.now = () => real() + 30_000;
    });
    seats.push(skewed);

    const code = await createRoom(seats[0]);
    for (const seat of seats.slice(1)) await joinRoom(seat, code);
    await startWith(seats);
    await waitBuzzable(seats);

    const readAll = async () =>
      Promise.all(seats.map((seat) => seat.page.locator("#timer").getAttribute("data-remaining-ms")));
    const spread = (values: (string | null)[]) => {
      const numbers = values.map((v) => Number(v));
      return Math.max(...numbers) - Math.min(...numbers);
    };
    const questionValues = await readAll();
    console.log(`出題中の残り時間(ms): ${questionValues.join(", ")}`);
    expect(spread(questionValues)).toBeLessThanOrEqual(1_000);
    expect(Number(questionValues[3])).toBeLessThanOrEqual(20_000);

    await seats[1].page.click("#buzz");
    const winner = await answererSeat(seats);
    expect(winner.name).toBe("びー");
    const answeringValues = await readAll();
    console.log(`回答中の残り時間(ms): ${answeringValues.join(", ")}`);
    expect(spread(answeringValues)).toBeLessThanOrEqual(1_000);
    for (const seat of seats) await seat.context.close();
  });
});
