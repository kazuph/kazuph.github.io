import { test, expect, chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

const ART = ".artifacts/e2e";

test("4人で1ゲーム完走し、途中の画面を撮る", async ({ request }) => {
  mkdirSync(ART, { recursive: true });
  const browser = await chromium.launch();

  const mk = async (mobile: boolean) => {
    const ctx = await browser.newContext(
      mobile
        ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 800 } }
    );
    return ctx.newPage();
  };

  const p1 = await mk(false); // host, desktop
  const p2 = await mk(false);
  const p3 = await mk(false);
  const p4 = await mk(true); // mobile viewport
  const players = [p1, p2, p3, p4];
  const names = ["アオ", "ベニ", "キイロ", "ミドリ"];

  // --- 1. 部屋作成と参加 ---
  await p1.goto("/");
  await p1.fill("#in-name", names[0]);
  await p1.click("#btn-create");
  await expect(p1.locator("#view-lobby")).toBeVisible();
  const code = (await p1.locator("#lobby-code").textContent())!.trim();
  expect(code).toMatch(/^[A-Z2-9]{6}$/);

  for (let i = 1; i < 4; i++) {
    await players[i].goto("/");
    await players[i].fill("#in-name", names[i]);
    await players[i].fill("#in-code", code);
    await players[i].click("#btn-join");
    await expect(players[i].locator("#view-lobby")).toBeVisible();
  }

  // 4人全員のロビーに4人分表示されている
  for (const pg of players) {
    await expect(pg.locator("#lobby-players li:not(.empty)")).toHaveCount(4);
  }

  // --- 2. 5人目は理由つきで拒否 ---
  const p5 = await mk(false);
  await p5.goto("/");
  await p5.fill("#in-name", "ゴニン");
  await p5.fill("#in-code", code);
  await p5.click("#btn-join");
  await expect(p5.locator("#entry-error")).toContainText("満員");
  await p5.close();

  // ロビーのスクリーンショット（PC / モバイル）
  await p1.screenshot({ path: `${ART}/01-lobby-pc.png` });
  await p4.screenshot({ path: `${ART}/02-lobby-mobile.png` });

  // --- 3. ホストが開始 → 全員の画面に問題と早押しボタン ---
  await expect(p1.locator("#btn-start")).toBeEnabled();
  await p1.click("#btn-start");
  for (const pg of players) {
    await expect(pg.locator("#view-game")).toBeVisible();
    await expect(pg.locator("#q-text")).not.toBeEmpty();
    await expect(pg.locator("#btn-buzz")).toBeEnabled();
    await expect(pg.locator("#q-count")).toContainText("Q1/10");
  }
  await p1.screenshot({ path: `${ART}/03-question-pc.png` });
  await p4.screenshot({ path: `${ART}/04-question-mobile.png` });

  // --- 4. 早押し: p2 が押す → 全員に「ベニが回答中」が見える ---
  await p2.click("#btn-buzz");
  await expect(p2.locator("#q-status")).toContainText("あなたが回答中");
  await expect(p1.locator("#q-status")).toContainText(`${names[1]} が回答中`);
  await expect(p4.locator("#q-status")).toContainText(`${names[1]} が回答中`);
  // 他者のボタンは無効
  await expect(p1.locator("#btn-buzz")).toBeDisabled();
  await p1.screenshot({ path: `${ART}/05-answering-pc.png` });
  await p4.screenshot({ path: `${ART}/06-answering-mobile.png` });
  // 回答中プレイヤーは4択を選べる
  await expect(p2.locator(".choice.can-answer")).toHaveCount(4);
  await p2.locator(".choice.can-answer").first().click();

  // --- 5. ゲーム中リロードで復帰できる ---
  await p3.reload();
  await expect(p3.locator("#view-game")).toBeVisible({ timeout: 10000 });
  await expect(p3.locator("#scoreboard")).toContainText(names[2]);

  // --- 6. 終了まで自動プレイ ---
  // まだ押せる人が押し、回答権が来たら最初の選択肢を選ぶ。時間切れ・
  // 全員ロックでもゲームは進むので、結果画面が出るまで繰り返す。
  for (let guard = 0; guard < 600; guard++) {
    if (await p1.locator("#view-result").isVisible()) break;
    let acted = false;
    for (const pg of players) {
      const gameVisible = await pg.locator("#view-game").isVisible();
      if (!gameVisible) continue;
      const buzz = pg.locator("#btn-buzz");
      if (await buzz.isEnabled().catch(() => false)) {
        await buzz.click().catch(() => {});
        const choice = pg.locator(".choice.can-answer").first();
        try {
          await choice.waitFor({ timeout: 3000 });
          await choice.click();
        } catch {
          /* window may have elapsed */
        }
        acted = true;
        break;
      }
    }
    if (!acted) await p1.waitForTimeout(400);
  }

  // --- 7. 最終結果 ---
  for (const pg of players) {
    await expect(pg.locator("#view-result")).toBeVisible({ timeout: 60000 });
    await expect(pg.locator("#ranking li")).toHaveCount(4);
  }
  await p1.screenshot({ path: `${ART}/07-result-pc.png` });
  await p4.screenshot({ path: `${ART}/08-result-mobile.png` });

  await browser.close();
});
