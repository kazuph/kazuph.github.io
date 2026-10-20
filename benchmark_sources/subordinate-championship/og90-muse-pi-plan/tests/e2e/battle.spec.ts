import { expect, test } from "@playwright/test";
import {
  buzzAll,
  buzzAllFast,
  closeClients,
  correctChoice,
  createRoom,
  currentQuestion,
  joinRoom,
  MOBILE,
  myScore,
  openClients,
  PC,
  waitAnswerer,
  type Client,
} from "./helpers";

test.setTimeout(420_000);

// 4人同時対戦の全体フロー（同時押し・不正解・再読込・オフライン・完走）
test("4人で10問遊びきる", async ({ browser }) => {
  const clients = await openClients(
    browser,
    [PC, PC, PC, MOBILE],
    ["ホスト", "あおい", "さくら", "れん"],
  );
  try {
    const code = await createRoom(clients[0].page, "ホスト");
    for (let i = 1; i < 4; i++) {
      await joinRoom(clients[i].page, clients[i].name, code);
    }

    // ホスト以外には開始ボタンが出ない
    await expect(clients[1].page.getByTestId("start-btn")).toBeHidden();
    await expect(
      clients[1].page.getByTestId("lobby-wait"),
    ).toBeVisible();

    // ホストが開始
    await clients[0].page.getByTestId("start-btn").click();
    for (const c of clients) {
      await expect(c.page.getByTestId("game")).toBeVisible({ timeout: 15000 });
      await expect(c.page.getByTestId("qnum")).toContainText("第1問", {
        timeout: 15000,
      });
    }

    // 出題中の撮影＋スマホで1画面に収まること
    await clients[0].page.screenshot({ path: ".artifacts/question-pc.png" });
    await clients[3].page.screenshot({
      path: ".artifacts/question-mobile.png",
    });
    const fit = await clients[3].page.evaluate(() => {
      const q = document
        .querySelector('[data-testid="question"]')!
        .getBoundingClientRect();
      const b = document
        .querySelector('[data-testid="buzz-btn"]')!
        .getBoundingClientRect();
      return { qTop: q.top, bBottom: b.bottom, h: window.innerHeight };
    });
    expect(fit.qTop).toBeGreaterThanOrEqual(0);
    expect(fit.bBottom).toBeLessThanOrEqual(fit.h);

    // ---- 第1問：4人同時押し → 1人だけ回答権 ----
    await buzzAll(clients);
    const first: Client = await waitAnswerer(clients);
    // 回答中の撮影（PC とスマホ）
    await clients[0].page.screenshot({ path: ".artifacts/answering-pc.png" });
    await clients[3].page.screenshot({
      path: ".artifacts/answering-mobile.png",
    });

    // 回答者がわざと不正解 → -5点・その問題はもう押せない
    const q1 = await currentQuestion(first.page);
    const wrong = (correctChoice(q1) + 1) % 4;
    await first.page.getByTestId(`choice-${wrong}`).click();
    // サーバーが不正解を処理して配信するまで待つ
    await expect(first.page.getByTestId("scores")).toContainText("回答済み", {
      timeout: 10000,
    });
    await expect(first.page.getByTestId("buzz-btn")).toBeDisabled({
      timeout: 10000,
    });
    expect(await myScore(first.page)).toBe(-5);

    // 残り3人で同時押し → 別の1人が回答権を得る
    const rest = clients.filter((c) => c !== first);
    await buzzAll(rest);
    const second = await waitAnswerer(rest);
    expect(second).not.toBe(first);
    const q1b = await currentQuestion(second.page);
    await second.page.getByTestId(`choice-${correctChoice(q1b)}`).click();
    await expect(second.page.getByTestId("reveal")).toBeVisible({
      timeout: 10000,
    });
    expect(await myScore(second.page)).toBe(10);
    // 全員の画面に正解が表示される
    for (const c of clients) {
      await expect(c.page.getByTestId("reveal")).toContainText("答え", {
        timeout: 10000,
      });
    }

    // ---- 第2問・第3問：同時押しをくり返す（ちょうど1人だけ有効） ----
    for (const n of [2, 3]) {
      for (const c of clients) {
        await expect(c.page.getByTestId("qnum")).toContainText(`第${n}問`, {
          timeout: 15000,
        });
      }
      await buzzAll(clients);
      const a = await waitAnswerer(clients);
      // 4択が有効な画面はその1人だけ
      for (const c of clients) {
        const n_enabled = await c.page
          .locator('[data-testid^="choice-"]:enabled')
          .count();
        expect(n_enabled).toBe(c === a ? 4 : 0);
      }
      const q = await currentQuestion(a.page);
      await a.page.getByTestId(`choice-${correctChoice(q)}`).click();
      await expect(a.page.getByTestId("reveal")).toBeVisible({ timeout: 10000 });
    }

    // ---- 第4問：再読み込みしても同じ名前・同じ点数で復帰 ----
    for (const c of clients) {
      await expect(c.page.getByTestId("qnum")).toContainText("第4問", {
        timeout: 15000,
      });
    }
    const reloader = clients[1];
    const beforeScore = await myScore(reloader.page);
    await reloader.page.reload();
    await expect(reloader.page.getByTestId("game")).toBeVisible({
      timeout: 15000,
    });
    await expect(reloader.page.getByTestId("scores")).toContainText("あおい");
    expect(await myScore(reloader.page)).toBe(beforeScore);

    // ---- 回線を5秒切っても自動で再接続し、切断表示が消える ----
    await clients[3].context.setOffline(true);
    for (const c of [clients[0], clients[1], clients[2]]) {
      await expect(c.page.getByTestId("scores")).toContainText(
        "接続が切れています",
        { timeout: 25000 },
      );
    }
    await clients[3].page.waitForTimeout(5000);
    await clients[3].context.setOffline(false);
    for (const c of [clients[0], clients[1], clients[2]]) {
      await expect(c.page.getByTestId("scores")).not.toContainText(
        "接続が切れています",
        { timeout: 20000 },
      );
    }
    await expect(clients[3].page.getByTestId("game")).toBeVisible({
      timeout: 15000,
    });

    // ---- 4画面の残り時間の差は1秒以内 ----
    const times = await Promise.all(
      clients.map((c) => c.page.getByTestId("timer-text").textContent()),
    );
    const secs = times.map((t) => parseFloat(t!.replace("秒", "")));
    expect(Math.max(...secs) - Math.min(...secs)).toBeLessThanOrEqual(1);

    // ---- 残りを最後まで遊ぶ（オフライン中に進んでいてもよい） ----
    for (let i = 0; i < 12; i++) {
      if (await clients[0].page.getByTestId("result").isVisible()) break;
      // 出題フェーズを待つ（第何問でもよい。結果が出ていたら抜ける）
      await expect
        .poll(
          async () => {
            if (await clients[0].page.getByTestId("result").isVisible()) {
              return "done";
            }
            if (
              await clients[0].page
                .getByTestId("buzz-btn")
                .isEnabled()
                .catch(() => false)
            ) {
              return "open";
            }
            return "";
          },
          { timeout: 30000 },
        )
        .not.toBe("");
      if (await clients[0].page.getByTestId("result").isVisible()) break;
      await buzzAllFast(clients);
      // 回答者が決まるか、そのまま結果になるか
      await expect
        .poll(
          async () => {
            if (await clients[0].page.getByTestId("result").isVisible()) {
              return "done";
            }
            for (const c of clients) {
              const b = c.page.getByTestId("answering-banner");
              if (!(await b.isVisible().catch(() => false))) continue;
              const txt = (await b.textContent()) ?? "";
              if (txt.includes("あなたが回答中")) return c.name;
            }
            return "";
          },
          { timeout: 15000 },
        )
        .not.toBe("");
      if (await clients[0].page.getByTestId("result").isVisible()) break;
      const a = await waitAnswerer(clients);
      const q = await currentQuestion(a.page);
      await a.page.getByTestId(`choice-${correctChoice(q)}`).click();
      // reveal か result のどちらかに進むのを待つ
      await expect
        .poll(
          async () =>
            (await clients[0].page.getByTestId("result").isVisible()) ||
            (await clients[0].page.getByTestId("reveal").isVisible()),
          { timeout: 15000 },
        )
        .toBe(true);
    }

    // ---- 最終順位が4画面で一致 ----
    for (const c of clients) {
      await expect(c.page.getByTestId("result")).toBeVisible({ timeout: 20000 });
    }
    const rankings: (string | null)[] = await Promise.all(
      clients.map((c) => c.page.getByTestId("ranking").textContent()),
    );
    // 「（あなた）」は画面ごとに付く位置が違うので取り除いて比べる
    const norm = rankings.map((r) => (r ?? "").replace(/（あなた）/g, ""));
    for (const r of norm) {
      expect(r).toBe(norm[0]);
    }
    expect(norm[0]).toContain("1位");
    await clients[0].page.screenshot({ path: ".artifacts/result-pc.png" });
    await clients[3].page.screenshot({
      path: ".artifacts/result-mobile.png",
    });
  } finally {
    await closeClients(clients);
  }
});
