// .artifacts/ に PC/スマホ幅 × ロビー/出題中/回答中/結果 を保存する
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import fs from "node:fs";

const PORT = 18888;
const BASE = `http://localhost:${PORT}`;
const OUT = ".artifacts";
fs.mkdirSync(OUT, { recursive: true });

const server = spawn("npx", ["wrangler", "dev", "--port", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));

async function waitHealth() {
  for (let i = 0; i < 120; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server did not start:\n" + serverLog.slice(-2000));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  await waitHealth();
  console.log("server up on", PORT);
  const browser = await chromium.launch();

  // PC: ホスト / SP: 参加者（同じ部屋）
  const pcCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const spCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const pc = await pcCtx.newPage();
  const sp = await spCtx.newPage();

  await pc.goto(BASE + "/");
  await pc.fill("#nameInput", "ホスト");
  await pc.click("#btnCreate");
  await pc.locator("#screen-lobby").waitFor({ timeout: 15000 });
  const code = (await pc.locator("#lobbyCode").textContent()).trim();

  await sp.goto(BASE + "/");
  await sp.fill("#nameInput", "挑戦者");
  await sp.fill("#codeInput", code);
  await sp.click("#btnJoin");
  await sp.locator("#screen-lobby").waitFor({ timeout: 15000 });
  await sleep(1200);
  await pc.screenshot({ path: `${OUT}/lobby-pc.png` });
  await sp.screenshot({ path: `${OUT}/lobby-sp.png` });
  console.log("lobby ok", code);

  await pc.click("#btnStart");
  await pc.locator("#screen-game").waitFor({ timeout: 10000 });
  await sp.locator("#screen-game").waitFor({ timeout: 10000 });
  await sleep(800);
  await pc.screenshot({ path: `${OUT}/quiz-pc.png` });
  await sp.screenshot({ path: `${OUT}/quiz-sp.png` });
  console.log("quiz ok");

  // 回答中: PCが押して選択肢表示
  await pc.click("#btnBuzz");
  await pc.locator("#choices:not(.hidden) .choice").first().waitFor({ timeout: 8000 });
  await sleep(400);
  await pc.screenshot({ path: `${OUT}/answering-pc.png` });
  // Q1はわざと不正解 → SPが押し直して回答者になる
  const wrong1 = 1; // Q1正解は0
  await pc.locator(".choice").nth(wrong1).click();
  await sp.locator("#notice").waitFor({ timeout: 8000 });
  await sp.locator("#btnBuzz:not([disabled])").waitFor({ timeout: 8000 });
  await sp.click("#btnBuzz");
  await sp.locator("#choices:not(.hidden) .choice").first().waitFor({ timeout: 8000 });
  await sleep(400);
  await sp.screenshot({ path: `${OUT}/answering-sp.png` });
  console.log("answering ok");
  await sp.locator(".choice").nth(0).click(); // Q1正解

  // Q2〜Q10: PCが全問正解して最終結果へ
  const answers = [null, 2, 1, 3, 1, 1, 2, 2, 0, 1]; // index=qi
  for (let qi = 1; qi < 10; qi++) {
    await pc.locator("#btnBuzz:not([disabled])").waitFor({ timeout: 25000 });
    await pc.click("#btnBuzz");
    await pc.locator("#choices:not(.hidden) .choice").first().waitFor({ timeout: 8000 });
    await pc.locator(".choice").nth(answers[qi]).click();
    await sleep(300);
  }
  await pc.locator("#screen-result").waitFor({ timeout: 20000 });
  await sp.locator("#screen-result").waitFor({ timeout: 20000 });
  await sleep(600);
  await pc.screenshot({ path: `${OUT}/result-pc.png` });
  await sp.screenshot({ path: `${OUT}/result-sp.png` });
  console.log("result ok");

  await browser.close();
  console.log("SCREENSHOTS-DONE");
} finally {
  server.kill("SIGTERM");
}
process.exit(0);
