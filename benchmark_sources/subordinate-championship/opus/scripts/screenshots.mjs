// 4人分のブラウザで1ゲームを進めながら、ロビー・出題中・回答中・正解発表・結果の各画面を撮る。
// 使い方: 開発サーバー（npm run dev）を起動したまま `npm run screenshots`
// 保存先: .artifacts/screenshots/<desktop|mobile>-<画面>.png（git には入れない）
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:8786";
const OUT = new URL("../.artifacts/screenshots/", import.meta.url).pathname;
const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
};
const NAMES = ["さくら", "ハルト", "ゆい", "ソウタ"];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

async function shoot(page, kind, name) {
  const path = `${OUT}${kind}-${name}.png`;
  await page.screenshot({ path, fullPage: kind === "mobile" });
  console.log("saved", path);
}

/** 画面に出ている選択肢のうち、正解を知らない前提で1つ選ぶ（ここではゲームを進めるのが目的） */
for (const [kind, viewport] of Object.entries(VIEWPORTS)) {
  const contexts = await Promise.all(NAMES.map(() => browser.newContext({ viewport, deviceScaleFactor: 2, hasTouch: kind === "mobile" })));
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [host, ...guests] = pages;

  await host.goto(BASE);
  await shoot(host, kind, "home");
  await host.fill('input[name="name"]', NAMES[0]);
  await host.click('button[value="create"]');
  const code = (await host.locator('[data-testid="room-code"]').innerText()).replace(/\s/g, "");
  for (const [i, g] of guests.entries()) {
    await g.goto(`${BASE}/?room=${code}`);
    await g.fill('input[name="name"]', NAMES[i + 1]);
    await g.click('button[value="join"]');
    await g.locator('[data-testid="room-code"]').waitFor();
  }
  await host.getByText("4人で開始できます").waitFor();
  // 5人目は満員で断られる
  const fifthCtx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const fifth = await fifthCtx.newPage();
  await fifth.goto(`${BASE}/?room=${code}`);
  await fifth.fill('input[name="name"]', "ごにんめ");
  await fifth.click('button[value="join"]');
  await fifth.getByText("この部屋は満員です").waitFor();
  await shoot(fifth, kind, "room-full");
  await fifthCtx.close();
  await shoot(host, kind, "lobby");
  await shoot(guests[0], kind, "lobby-guest");

  await host.click('[data-action="start"]');
  await host.locator(".countdown-num").waitFor();
  await shoot(host, kind, "countdown");
  await host.locator('[data-testid="question-text"]').waitFor({ timeout: 6000 });
  await host.waitForTimeout(1200);
  await shoot(host, kind, "question");

  // ゆいが押して、わざと誤答 → 他の人の画面に「不正解・早押し再開」
  await pages[2].click(".buzzer");
  await pages[2].locator(".banner-me").waitFor();
  await shoot(pages[2], kind, "answering-me");
  await shoot(host, kind, "answering-other");
  // 正解は画面に出ていないので、1つずつ試す（サーバーが正誤を決める）
  const answerers = [2, 1, 0, 3];
  let revealed = false;
  for (const [n, idx] of answerers.entries()) {
    if (n > 0) {
      await pages[idx].locator(".buzzer.is-live").waitFor();
      await pages[idx].click(".buzzer");
      await pages[idx].locator(".banner-me").waitFor();
    }
    await pages[idx].locator(`.choice[data-choice="${n}"]`).click();
    await host.waitForFunction(() => document.querySelector(".banner-reveal, .banner-miss"));
    if (await host.locator(".banner-reveal").count()) {
      revealed = true;
      break;
    }
    if (n === 0) await shoot(host, kind, "wrong-resume");
  }
  if (!revealed) await host.locator(".banner-reveal").waitFor();
  await shoot(host, kind, "reveal");
  // 正解発表中にゲストが再読み込み → 同じプレイヤー・同じ点数で戻る
  await guests[1].reload();
  await guests[1].locator(".seat.is-me").waitFor();
  await guests[1].waitForTimeout(400);
  await shoot(guests[1], kind, "reloaded");

  // 残りの問題: 4人が順に別々の選択肢を答えれば、4回以内に必ず正解が出る
  for (;;) {
    await host.waitForFunction(() => document.querySelector(".buzzer.is-live") || document.querySelector(".result"), null, { timeout: 30000 });
    if (await host.locator(".result").count()) break;
    for (let n = 0; n < 4; n++) {
      const p = pages[n];
      await p.locator(".buzzer.is-live").waitFor();
      await p.click(".buzzer");
      await p.locator(".banner-me").waitFor();
      await p.locator(`.choice[data-choice="${n}"]`).click();
      await host.waitForFunction(() => document.querySelector(".banner-reveal") || document.querySelector(".banner-miss"));
      if (await host.locator(".banner-reveal").count()) break;
    }
    await host.waitForFunction(() => !document.querySelector(".banner-reveal"), null, { timeout: 10000 });
  }
  await host.waitForTimeout(1500);
  await shoot(host, kind, "result");
  await shoot(guests[0], kind, "result-guest");
  await Promise.all(contexts.map((c) => c.close()));
}

await browser.close();
