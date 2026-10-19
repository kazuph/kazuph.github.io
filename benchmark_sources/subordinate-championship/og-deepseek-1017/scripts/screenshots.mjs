/**
 * .artifacts/ にスクリーンショットを保存する。
 *   ロビー / 出題中 / 回答中 / 結果 を PC幅(1280x800) と スマホ幅(390x844) で撮る。
 * 実行: node scripts/screenshots.mjs   （wrangler dev は自動で起動・停止する）
 */
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 8787;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = ".artifacts";
const CORRECT = [0, 1, 2, 1, 2, 3, 2, 1, 0, 2]; // src/questions.ts と対応

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && existsSync("/ms-playwright")) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/ms-playwright";
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function isUp() {
  try {
    const res = await fetch(`${BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await isUp()) return null;
  const child = spawn("npx", ["wrangler", "dev", "--port", String(PORT)], {
    env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
    stdio: "ignore",
    detached: true,
  });
  for (let i = 0; i < 200; i++) {
    if (await isUp()) return child;
    await sleep(400);
  }
  await stopServer(child);
  throw new Error("wrangler dev did not start");
}

/** npx→wrangler→workerd をまとめて止める。 */
async function stopServer(child) {
  if (!child) return;
  const killGroup = (signal) => {
    try {
      process.kill(-child.pid, signal);
    } catch {
      try {
        child.kill(signal);
      } catch {
        /* ignore */
      }
    }
  };
  killGroup("SIGTERM");
  await sleep(600);
  killGroup("SIGKILL");
  await sleep(200);
}

async function shoot(page, name) {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log(`  saved ${OUT}/${name}.png`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const server = await ensureServer();
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const pcCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const mobCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2, reducedMotion: "reduce",
    isMobile: true,
    hasTouch: true,
  });
  const extra = [];
  try {
    const pc = await pcCtx.newPage();
    const mobile = await mobCtx.newPage();
    const others = [];
    for (let i = 0; i < 2; i++) {
      const c = await browser.newContext({ viewport: { width: 900, height: 720 }, reducedMotion: "reduce" });
      extra.push(c);
      others.push(await c.newPage());
    }

    // ---- ロビー ----
    await pc.goto(`${BASE}/`);
    await pc.fill("[data-testid=name-input]", "ホスト（PC）");
    await pc.click("[data-testid=create-btn]");
    await pc.waitForSelector("#view-room.active");
    const code = (await pc.locator("[data-testid=room-code]").textContent()).trim();

    await mobile.goto(`${BASE}/`);
    await mobile.fill("[data-testid=name-input]", "スマホさん");
    await mobile.fill("[data-testid=code-input]", code);
    await mobile.click("[data-testid=join-btn]");
    await mobile.waitForSelector("#view-room.active");

    for (let i = 0; i < others.length; i++) {
      const p = others[i];
      await p.goto(`${BASE}/`);
      await p.fill("[data-testid=name-input]", `プレイヤー${i + 3}`);
      await p.fill("[data-testid=code-input]", code);
      await p.click("[data-testid=join-btn]");
      await p.waitForSelector("#view-room.active");
    }
    await pc.waitForFunction(() => document.querySelector("[data-testid=player-count]")?.textContent === "4 / 4");
    await sleep(400);
    await shoot(pc, "lobby-pc");
    await shoot(mobile, "lobby-mobile");

    // ---- ゲーム開始 → 出題中 ----
    await pc.click("[data-testid=start-btn]");
    await pc.waitForSelector("#view-game.active");
    await pc.waitForFunction(() => document.querySelector("[data-testid=phase]")?.textContent?.includes("早押し受付中"));
    await mobile.waitForFunction(() => document.querySelector("[data-testid=phase]")?.textContent?.includes("早押し受付中"));
    await sleep(300);
    await shoot(pc, "question-pc");
    await shoot(mobile, "question-mobile");

    // ---- 誰かが押して回答中 ----
    await others[0].waitForSelector("#view-game.active");
    await others[0].click("[data-testid=buzz-btn]");
    await pc.waitForFunction(() => document.querySelector("[data-testid=phase]")?.textContent?.includes("さんが回答中"));
    await mobile.waitForFunction(() => document.querySelector("[data-testid=phase]")?.textContent?.includes("さんが回答中"));
    await sleep(300);
    await shoot(pc, "answering-pc");
    await shoot(mobile, "answering-mobile");

    // ---- 結果まで自動で進める ----
    await others[0].click(`[data-testid=choice-${CORRECT[0]}]`);
    const all = [pc, mobile, ...others];
    const phase = async (p) => ((await p.locator("[data-testid=phase]").textContent()) || "").trim();

    for (let qi = 0; qi < 10; qi++) {
      // 次の問題が出るまで待つ
      await pc.waitForFunction(
        (n) =>
          document.querySelector("[data-testid=q-index]")?.textContent === String(n) &&
          document.querySelector("[data-testid=phase]")?.textContent?.includes("早押し受付中"),
        qi + 1,
        { timeout: 30000 },
      );
      // 全員が押して回答し、全員ロックアウトさせて正解発表へ
      for (let guard = 0; guard < 16; guard++) {
        // すでに誰かが回答中なら、その人（自分）が答える
        let mine = null;
        for (const p of all) {
          if ((await phase(p)).includes("あなたが回答中")) {
            mine = p;
            break;
          }
        }
        if (mine) {
          await mine.click(`[data-testid=choice-${CORRECT[qi]}]`, { timeout: 4000 }).catch(() => {});
          await sleep(150);
          continue;
        }
        const able = [];
        for (const p of all) {
          if (await p.locator("[data-testid=buzz-btn]").isVisible().catch(() => false)) able.push(p);
        }
        if (able.length === 0) break;
        for (const p of able) {
          void p.locator("[data-testid=buzz-btn]").click({ timeout: 4000 }).catch(() => {});
        }
        let winner = null;
        for (let a = 0; a < 120 && !winner; a++) {
          for (const p of all) {
            if ((await phase(p)).includes("あなたが回答中")) {
              winner = p;
              break;
            }
          }
          if (!winner) await sleep(50);
        }
        if (!winner) continue;
        await winner.click(`[data-testid=choice-${CORRECT[qi]}]`, { timeout: 4000 }).catch(() => {});
        await sleep(150);
      }
      // 正解発表を待つ
      await pc
        .waitForFunction(() => document.querySelector("[data-testid=phase]")?.textContent?.includes("正解は"), null, { timeout: 25000 })
        .catch(() => {});
      await sleep(200);
    }

    await pc.waitForSelector("#view-result.active", { timeout: 20000 });
    await mobile.waitForSelector("#view-result.active", { timeout: 20000 });
    await sleep(400);
    await shoot(pc, "result-pc");
    await shoot(mobile, "result-mobile");
  } finally {
    await browser.close();
    if (server) await stopServer(server);
  }
  console.log("スクリーンショット完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
