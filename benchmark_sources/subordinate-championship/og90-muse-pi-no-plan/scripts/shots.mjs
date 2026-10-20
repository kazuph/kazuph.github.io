#!/usr/bin/env node
/* スクリーンショット撮影: wrangler dev(8787)を起動→4画面×2幅を.artifacts/に保存→終了 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const BASE = "http://127.0.0.1:8787";
const OUT = new URL("../.artifacts/", import.meta.url);

async function waitForHealth() {
  const start = Date.now();
  for (;;) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    if (Date.now() - start > 120_000) throw new Error("dev server が起動しません");
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const server = spawn("npx", ["wrangler", "dev", "--port", "8787", "--ip", "127.0.0.1"], {
    cwd: new URL("../", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});
  try {
    await waitForHealth();

    for (const width of [1280, 390]) {
      const height = width === 1280 ? 800 : 844;
      const browser = await chromium.launch();
      const tag = width === 1280 ? "pc" : "mobile";
      const ctx = await browser.newContext({ viewport: { width, height } });

      // ホーム
      const home = await ctx.newPage();
      await home.goto(`${BASE}/`);
      await home.waitForTimeout(800);
      await home.screenshot({ path: new URL(`./home-${tag}.png`, OUT).pathname });

      // ロビー（ホスト作成＋2人参加：別コンテキスト＝別ブラウザ相当）
      await home.locator("#nameInput").fill("ホスト");
      await home.locator("#createBtn").click();
      await home.locator("#screen-lobby").waitFor({ timeout: 15000 });
      const code = (await home.locator("#roomCode").textContent())?.trim();
      const ctx2 = await browser.newContext({ viewport: { width, height } });
      const p2 = await ctx2.newPage();
      await p2.goto(`${BASE}/?room=${code}`);
      await p2.locator("#nameInput").fill("B子");
      await p2.locator("#codeInput").fill(code ?? "");
      await p2.locator("#joinBtn").click();
      await p2.locator("#screen-lobby").waitFor({ timeout: 15000 });
      await home.waitForTimeout(1000);
      await home.screenshot({ path: new URL(`./lobby-${tag}.png`, OUT).pathname });

      // 開始 → 出題中
      await home.locator("#startBtn").click();
      await home.locator("#screen-game").waitFor({ timeout: 15000 });
      await home.waitForTimeout(800);
      await home.screenshot({ path: new URL(`./question-${tag}.png`, OUT).pathname });

      // 早押し → 回答中（ホストの画面）
      await home.locator("#buzzBtn").click();
      await home.locator("#choices .choice:enabled").first().waitFor({ timeout: 8000 });
      await home.waitForTimeout(500);
      await home.screenshot({ path: new URL(`./answering-${tag}.png`, OUT).pathname });

      // 不正解の可能性もあるので、正解するまで別タブも使って進め、revealを撮る
      // （正解番号は公開されないため、ホストが外したらB子が押して総当たり）
      for (let i = 0; i < 4; i++) {
        const en = await home.locator("#choices .choice:enabled").count();
        if (en === 0) break;
        await home.locator("#choices .choice:enabled").first().click();
        await home.waitForTimeout(700);
        if (await home.locator("#screen-game").isVisible()) {
          const txt = (await home.locator("#revealBox").textContent()) ?? "";
          if (txt.includes("正解") || txt.includes("時間切れ") || txt.includes("不正解")) break;
        }
      }
      // reveal中でなければB子に押させる
      if ((await home.locator("#revealBox").textContent().catch(() => "")) === "") {
        await p2.bringToFront().catch(() => {});
      }
      await home.waitForTimeout(500);
      await home.screenshot({ path: new URL(`./reveal-${tag}.png`, OUT).pathname });

      // 結果：残りを総当たりで完走させる
      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        if (await home.locator("#screen-result").isVisible()) break;
        let acted = false;
        for (const pg of [home, p2]) {
          if (await pg.locator("#screen-result").isVisible()) break;
          const ce = await pg.locator("#choices .choice:enabled").count().catch(() => 0);
          if (ce > 0) {
            await pg.locator("#choices .choice:enabled").first().click().catch(() => {});
            acted = true;
            await pg.waitForTimeout(700);
            break;
          }
        }
        if (!acted) {
          for (const pg of [home, p2]) {
            const be = await pg.locator("#buzzBtn").isEnabled().catch(() => false);
            if (be) {
              await pg.locator("#buzzBtn").click().catch(() => {});
              acted = true;
              await pg.waitForTimeout(500);
              break;
            }
          }
        }
        await home.waitForTimeout(400);
      }
      await home.locator("#screen-result").waitFor({ timeout: 30000 });
      await home.waitForTimeout(500);
      await home.screenshot({ path: new URL(`./result-${tag}.png`, OUT).pathname });

      await browser.close();
      console.log(`saved ${tag} shots, room=${code}`);
    }
  } finally {
    server.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 1500));
    if (!server.killed) server.kill("SIGKILL");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
