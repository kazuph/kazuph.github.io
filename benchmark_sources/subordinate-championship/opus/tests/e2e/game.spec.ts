// ブラウザE2E: 4人それぞれ別のブラウザ（コンテキスト）で、実際の画面を操作して確かめる。
import { expect, test } from "@playwright/test";
import { buzzer, closeAll, createRoom, joinRoom, newPlayer, scoresOf, setupRoom, solveCurrentQuestion, startGame } from "./helpers";

const NAMES = ["さくら", "ハルト", "ゆい", "ソウタ"];

test("5人目は入れず、満員の理由が画面に出る（遊び方1・2）", async ({ browser }) => {
  const { code, players } = await setupRoom(browser, NAMES);
  const fifth = await newPlayer(browser, "ごにんめ");
  await joinRoom(fifth, code);
  await expect(fifth.page.getByRole("alert")).toHaveText("この部屋は満員です（定員4人）");
  await expect(fifth.page.getByTestId("room-code")).toHaveCount(0);
  await closeAll([...players, fifth]);
});

test("存在しない部屋コードは理由つきで断られる", async ({ browser }) => {
  const p = await newPlayer(browser, "まいご");
  await joinRoom(p, "ZZZZZ");
  await expect(p.page.getByRole("alert")).toHaveText("部屋が見つかりません。コードを確かめてください");
  await closeAll([p]);
});

test("開始はホストだけ・2人から（遊び方3）", async ({ browser }) => {
  const host = await newPlayer(browser, "ホスト");
  const code = await createRoom(host);
  const start = host.page.getByRole("button", { name: "▶ ゲーム開始" });
  await expect(start).toBeDisabled();
  await expect(host.page.getByText("あと1人以上集まると開始できます")).toBeVisible();

  const guest = await newPlayer(browser, "ゲスト");
  await joinRoom(guest, code);
  await expect(start).toBeEnabled();
  await expect(guest.page.getByRole("button", { name: "▶ ゲーム開始" })).toHaveCount(0);
  await expect(guest.page.getByText("ホスト（ホストさん）が開始するのを待っています")).toBeVisible();

  await start.click();
  await expect(guest.page.getByTestId("question-text")).toBeVisible({ timeout: 10_000 });
  await closeAll([host, guest]);
});

test("4人同時に早押ししても回答権は1人だけで、全員の画面に同じ回答者が出る（遊び方5・11）", async ({ browser }) => {
  const { players } = await setupRoom(browser, NAMES);
  await startGame(players);
  await Promise.all(players.map((p) => expect(buzzer(p)).toBeEnabled()));

  // 4つのブラウザで同時にクリック
  await Promise.all(players.map((p) => buzzer(p).click({ noWaitAfter: true })));

  // 回答権を得た画面は「あなたの回答です」がちょうど1つ
  await expect.poll(async () => (await Promise.all(players.map((p) => p.page.locator(".banner-me").count()))).reduce((a, b) => a + b)).toBe(1);
  const winnerIdx = (await Promise.all(players.map((p) => p.page.locator(".banner-me").count()))).indexOf(1);
  const winner = players[winnerIdx]!;
  // 他の3人の画面には同じ名前で「〇〇さんが回答中」
  for (const p of players.filter((x) => x !== winner)) {
    await expect(p.page.getByTestId("answering-name")).toHaveText(`${winner.name}さんが回答中`);
    await expect(p.page.locator(".choice:enabled")).toHaveCount(0);
    await expect(buzzer(p)).toBeDisabled();
  }
  // 得点表でも同じ人に「回答中」
  for (const p of players) {
    await expect(p.page.locator(".seat.is-answering .seat-name")).toHaveText(winner.name);
  }
  await expect(winner.page.locator(".choice:enabled")).toHaveCount(4);
  await closeAll(players);
});

test("誤答で-5点・その人は押せなくなり、残りで再開。正解で+10点（遊び方6・7・8）", async ({ browser }) => {
  const { players } = await setupRoom(browser, NAMES.slice(0, 3));
  await startGame(players);
  const [a, b, c] = players as [any, any, any];

  // A が押して選ぶ。正解なら+10、不正解なら-5になるはず
  await buzzer(a).click();
  await expect(a.page.locator(".banner-me")).toBeVisible();
  await a.page.locator('.choice[data-choice="0"]').click();
  await expect(a.page.locator(".banner-reveal, .banner-miss")).toBeVisible();
  if (await a.page.locator(".banner-reveal").isVisible()) {
    // 1つ目で当たった場合: 全員の画面で A が10点
    for (const p of players) await expect.poll(() => scoresOf(p)).toEqual({ [a.name]: 10, [b.name]: 0, [c.name]: 0 });
  } else {
    for (const p of players) await expect.poll(() => scoresOf(p)).toEqual({ [a.name]: -5, [b.name]: 0, [c.name]: 0 });
    // A はもう押せない、B・C は押せる
    await expect(buzzer(a)).toBeDisabled();
    await expect(a.page.getByText("この問題ではもう押せません")).toBeVisible();
    await expect(b.page.locator(".seat.is-me").getByText("× 押せない")).toHaveCount(0);
    await expect(b.page.getByText("× 押せない")).toBeVisible();
    await expect(buzzer(b)).toBeEnabled();
    // 外れた選択肢には A の名前
    await expect(c.page.locator('.choice[data-choice="0"]')).toContainText(`✕ ${a.name}`);

    // B と C が残りの選択肢を順に試す
    let solved = false;
    for (const [p, choice] of [
      [b, 1],
      [c, 2],
    ] as const) {
      await buzzer(p).click();
      await expect(p.page.locator(".banner-me")).toBeVisible();
      await p.page.locator(`.choice[data-choice="${choice}"]`).click();
      await expect(p.page.locator(".banner-reveal, .banner-miss")).toBeVisible();
      if (await p.page.locator(".banner-reveal").isVisible()) {
        solved = true;
        await expect(a.page.locator(".banner-reveal")).toContainText(`${p.name}さん 正解！ +10点`);
        break;
      }
    }
    // 全員外したら正解発表（全員押せなくなった）
    if (!solved) await expect(a.page.locator(".banner-reveal")).toContainText("正解者なし");
  }
  // 正解の選択肢が全員に表示される
  for (const p of players) await expect(p.page.locator(".choice.is-correct")).toHaveCount(1);
  const correctText = await a.page.locator(".choice.is-correct .choice-text").innerText();
  for (const p of players) await expect(p.page.locator(".choice.is-correct .choice-text")).toHaveText(correctText);
  // 5秒後に次の問題
  await expect(a.page.locator(".q-num")).toContainText("第2問", { timeout: 8000 });
  await closeAll(players);
});

test("誰も押さなければ20秒で正解発表になり、次の問題へ進む（遊び方8）", async ({ browser }) => {
  const { players } = await setupRoom(browser, NAMES.slice(0, 2));
  await startGame(players);
  const t0 = Date.now();
  await expect(players[1]!.page.locator(".banner-reveal")).toContainText("正解者なし", { timeout: 25_000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeGreaterThan(18_000);
  expect(elapsed).toBeLessThan(23_000);
  await expect(players[0]!.page.locator(".choice.is-correct")).toHaveCount(1);
  await expect(players[0]!.page.locator(".q-num")).toContainText("第2問", { timeout: 8000 });
  await closeAll(players);
});

test("残り時間が4人の画面でそろっている（遊び方11）", async ({ browser }) => {
  const { players } = await setupRoom(browser, NAMES);
  await startGame(players);
  await players[0]!.page.waitForTimeout(2500);
  // 各画面で「描かれているバーの長さ」と「その瞬間の手元時計」を同時に読む。
  // 4画面は同じ PC の時計を使うので、バーから逆算した締め切り時刻が4画面でそろっていれば表示がそろっている。
  const samples = await Promise.all(
    players.map((p) =>
      p.page.evaluate(
        () =>
          new Promise<{ end: number; impliedEnd: number }>((resolve) =>
            requestAnimationFrame(() => {
              const el = document.querySelector<HTMLElement>("[data-bar]")!;
              const ratio = new DOMMatrix(getComputedStyle(el).transform).a;
              resolve({ end: Number(el.dataset.bar), impliedEnd: Date.now() + ratio * Number(el.dataset.barTotal) });
            }),
          ),
      ),
    ),
  );
  expect(new Set(samples.map((r) => r.end)).size).toBe(1);
  const implied = samples.map((r) => r.impliedEnd);
  expect(Math.max(...implied) - Math.min(...implied)).toBeLessThan(300); // 0.3秒未満のずれ
  const secs = await Promise.all(players.map((p) => p.page.getByTestId("question-seconds").innerText()));
  const nums = secs.map(Number);
  expect(Math.max(...nums) - Math.min(...nums)).toBeLessThanOrEqual(1);
  await closeAll(players);
});

test("ゲーム中に再読み込みしても、同じプレイヤーとして点数を保って復帰する（遊び方10）", async ({ browser }) => {
  const { players } = await setupRoom(browser, NAMES.slice(0, 2));
  await startGame(players);
  const [a, b] = players as [any, any];
  // 1問目を解いて点数を動かす
  await solveCurrentQuestion(players);
  const before = await scoresOf(b);
  await expect.poll(() => scoresOf(a)).toEqual(before);
  expect(Object.values(before).some((v) => v !== 0)).toBe(true);

  await a.page.reload();
  // 名前入力に戻らず、ゲーム画面に「あなた」として戻る
  await expect(a.page.getByTestId("scoreboard")).toBeVisible();
  await expect(a.page.locator(".seat.is-me .seat-name")).toHaveText(a.name);
  await expect.poll(() => scoresOf(a)).toEqual(before);
  // 他の人の画面では人数が増えていない
  await expect(b.page.locator("[data-testid=scoreboard] .seat")).toHaveCount(2);
  // 復帰後も押せる
  await expect(a.page.locator(".q-num")).toContainText("第2問", { timeout: 8000 });
  await buzzer(a).click();
  await expect(a.page.locator(".banner-me")).toBeVisible();
  await expect(b.page.getByTestId("answering-name")).toHaveText(`${a.name}さんが回答中`);
  await closeAll(players);
});

test("回線が一時的に切れても、つながり直すと同じプレイヤーとして復帰する（遊び方10）", async ({ browser }) => {
  const host = await newPlayer(browser, NAMES[0]!);
  const guest = await newPlayer(browser, NAMES[1]!);
  // ゲストの WebSocket を中継し、好きなときに「回線断」を起こせるようにする
  let blocked = false;
  const live: { close: () => Promise<void> }[] = [];
  await guest.page.routeWebSocket(/\/api\/rooms\/.+\/ws/, async (ws) => {
    if (blocked) {
      await ws.close({ code: 1000, reason: "offline" }); // つながらない
      return;
    }
    const server = ws.connectToServer();
    live.push({
      close: async () => {
        await server.close();
        await ws.close({ code: 1000, reason: "network down" });
      },
    });
  });
  const code = await createRoom(host);
  await joinRoom(guest, code);
  const players = [host, guest];
  await startGame(players);
  await solveCurrentQuestion(players);
  const before = await scoresOf(host);
  await expect.poll(() => scoresOf(guest)).toEqual(before);

  // 回線断: サーバー側の接続を切り、しばらく再接続もできない状態にする
  blocked = true;
  await Promise.all(live.splice(0).map((l) => l.close()));
  await expect(host.page.locator(".seat", { hasText: guest.name }).getByText("切断中")).toBeVisible();
  await expect(guest.page.locator("#conn")).toHaveText("再接続中…");
  await guest.page.waitForTimeout(1500); // 再接続の試行が何度か失敗する

  // 回線復旧: 画面は自動で再接続し、同じプレイヤーとして戻る
  blocked = false;
  await expect(host.page.locator(".seat", { hasText: guest.name }).getByText("切断中")).toHaveCount(0, { timeout: 10_000 });
  await expect(guest.page.locator("#conn")).toBeHidden();
  await expect(guest.page.locator(".seat.is-me .seat-name")).toHaveText(guest.name);
  await expect.poll(() => scoresOf(guest)).toEqual(await scoresOf(host));
  const after = await scoresOf(host);
  expect(after[guest.name]).toBe(before[guest.name]);
  await expect(host.page.locator("[data-testid=scoreboard] .seat")).toHaveCount(2);
  await closeAll(players);
});

test("4人で10問を最後まで遊び、全員に同じ最終順位が出る（遊び方4・9・11、4人同時プレイ）", async ({ browser }) => {
  test.setTimeout(360_000);
  const { players } = await setupRoom(browser, NAMES);
  await startGame(players);
  const seen = new Set<string>();
  for (let q = 1; q <= 10; q++) {
    await Promise.all(players.map((p) => expect(p.page.locator(".q-num")).toContainText(`第${q}問`, { timeout: 10_000 })));
    // 4人の画面で同じ問題文
    const texts = await Promise.all(players.map((p) => p.page.getByTestId("question-text").innerText()));
    expect(new Set(texts).size).toBe(1);
    seen.add(texts[0]!);
    await solveCurrentQuestion(players);
    // 正解発表の時点で、4人の画面の点数が一致
    const boards = await Promise.all(players.map((p) => scoresOf(p)));
    for (const b of boards.slice(1)) expect(b).toEqual(boards[0]);
  }
  expect(seen.size).toBe(10); // 10問すべて別の問題
  await Promise.all(players.map((p) => expect(p.page.getByTestId("ranking")).toBeVisible({ timeout: 10_000 })));
  const rankings = await Promise.all(players.map((p) => p.page.getByTestId("rank-row").allInnerTexts()));
  for (const r of rankings) {
    expect(r).toHaveLength(4);
    expect(r.map((x) => x.replace(/あなた/g, "").replace(/\s+/g, " "))).toEqual(
      rankings[0]!.map((x) => x.replace(/あなた/g, "").replace(/\s+/g, " ")),
    );
  }
  // 点数の高い順に並んでいる
  const scores = rankings[0]!.map((r) => Number(r.match(/(-?\d+)\s*点/)![1]));
  expect([...scores].sort((x, y) => y - x)).toEqual(scores);
  // ホストは「もう一度遊ぶ」でロビーに戻れる
  await players[0]!.page.getByRole("button", { name: "もう一度遊ぶ" }).click();
  await Promise.all(players.map((p) => expect(p.page.getByTestId("room-code")).toBeVisible()));
  await closeAll(players);
});

test("スマホ幅（390px）でも横スクロールなしで押す・選ぶができる（UI）", async ({ browser }) => {
  const { players } = await setupRoom(browser, NAMES.slice(0, 2), { width: 390, height: 844 });
  for (const p of players) {
    expect(await p.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await startGame(players);
  const [a] = players as [any];
  await expect(buzzer(a)).toBeInViewport();
  await buzzer(a).click();
  await expect(a.page.locator(".banner-me")).toBeVisible();
  await expect(a.page.locator(".choice:enabled").first()).toBeVisible();
  expect(await a.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await closeAll(players);
});
