#!/usr/bin/env node
/**
 * スクリーンショット撮影スクリプト。
 *
 * .artifacts/ に「ロビー・出題中・回答中・正解発表・結果」を
 * PC幅 (1280x900) とスマホ幅 (390x844) の両方で保存する。
 *
 * 使い方:
 *   node scripts/shots.mjs              # 8899 で dev サーバーを起動して撮影
 *   SHOTS_BASE_URL=http://127.0.0.1:8899 node scripts/shots.mjs   # 既存サーバーを使う
 *
 * `.artifacts/` は .gitignore 済み（コミットしない）。
 */
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".artifacts");
const PORT = Number(process.env.SHOTS_PORT || 8899);
const BASE = process.env.SHOTS_BASE_URL || `http://127.0.0.1:${PORT}`;

const NAMES = ["ホスト", "あおい", "けん", "みどり"];

async function healthOk(base) {
  try {
    const res = await fetch(`${base}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(base, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await healthOk(base)) return true;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return false;
}

async function startServer() {
  const child = spawn(
    process.execPath,
    [
      path.join(root, "scripts", "dev.mjs"),
      "--port",
      String(PORT),
      "--var",
      "QUESTION_MS:5000",
      "--var",
      "ANSWER_MS:3000",
      "--var",
      "REVEAL_MS:900",
    ],
    { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdout.on("data", (chunk) => process.stdout.write(`[shots:dev] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[shots:dev] ${chunk}`));
  return child;
}

async function shot(page, name) {
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file });
  console.log(`[shots] ${path.relative(root, file)}`);
}

async function waitPhase(page, phase, timeout = 15_000) {
  await page.waitForFunction((value) => document.body.dataset.phase === value, phase, { timeout });
}

async function waitBuzzArmed(page, timeout = 15_000) {
  await page.waitForFunction(
    () => {
      const button = document.getElementById("btn-buzz");
      return button instanceof HTMLButtonElement && !button.disabled;
    },
    undefined,
    { timeout },
  );
}

async function clickBuzzIfPossible(page) {
  const armed = await page.evaluate(() => {
    const button = document.getElementById("btn-buzz");
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  if (!armed) return false;
  await page.evaluate(() => document.getElementById("btn-buzz").click());
  await page.waitForTimeout(80);
  return page.evaluate(() => document.body.dataset.answerer === document.body.dataset.me);
}

async function playToEnd(pages) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const phase = await pages[0].evaluate(() => document.body.dataset.phase);
    if (phase === "final") return true;
    if (phase === "question") {
      for (const page of pages) {
        const current = await page.evaluate(() => document.body.dataset.phase);
        if (current !== "question") break;
        const becameAnswerer = await clickBuzzIfPossible(page);
        if (becameAnswerer) {
          const choices = page.locator('[data-testid="choice"]');
          if ((await choices.count()) > 0) {
            await choices.nth(1).click({ timeout: 2000 }).catch(() => undefined);
          }
        }
      }
      await pages[0].waitForTimeout(350);
    } else {
      await pages[0].waitForTimeout(150);
    }
  }
  return false;
}

async function captureRun(browser, { prefix, viewport, isMobile }) {
  const contexts = [];
  const pages = [];
  for (let i = 0; i < 4; i++) {
    const context = await browser.newContext({
      viewport,
      isMobile,
      hasTouch: Boolean(isMobile),
      deviceScaleFactor: isMobile ? 2 : 1,
      locale: "ja-JP",
    });
    contexts.push(context);
    pages.push(await context.newPage());
  }

  try {
    await pages[0].goto(`${BASE}/`, { waitUntil: "networkidle" });
    await pages[0].waitForSelector("#screen-home");
    await shot(pages[0], `${prefix}-home`);

    await pages[0].fill("#input-name", NAMES[0]);
    await pages[0].click("#btn-create");
    await pages[0].waitForSelector("#lobby-players [data-player-id]");
    const code = (await pages[0].locator("#lobby-code").textContent())?.trim() ?? "";

    for (let i = 1; i < 4; i++) {
      await pages[i].goto(`${BASE}/`, { waitUntil: "networkidle" });
      await pages[i].fill("#input-name", NAMES[i]);
      await pages[i].click("#tab-join");
      await pages[i].fill("#input-code", code);
      await pages[i].click("#btn-join");
      await pages[i].waitForSelector("#screen-lobby:not([hidden])");
    }
    await pages[0].waitForFunction(
      () => document.querySelectorAll("#lobby-players [data-player-id]").length === 4,
      undefined,
      { timeout: 15_000 },
    );
    await pages[0].waitForTimeout(300);
    await shot(pages[0], `${prefix}-lobby`);

    await pages[0].click("#btn-start");
    await waitPhase(pages[0], "question");
    await waitBuzzArmed(pages[0]);
    await pages[0].waitForTimeout(250);
    await shot(pages[0], `${prefix}-question`);

    // 2人目が早押しして回答中になる
    await waitBuzzArmed(pages[1]);
    await clickBuzzIfPossible(pages[1]);
    await pages[1].waitForFunction(
      () => document.body.dataset.answerer !== "" && document.body.dataset.answerer === document.body.dataset.me,
      undefined,
      { timeout: 10_000 },
    );
    await pages[1].waitForTimeout(250);
    await shot(pages[1], `${prefix}-answering`);
    await shot(pages[0], `${prefix}-answering-others`);

    await pages[1].locator('[data-testid="choice"]').nth(1).click();
    await waitPhase(pages[1], "reveal", 12_000);
    await pages[1].waitForTimeout(250);
    await shot(pages[0], `${prefix}-reveal`);

    const reachedFinal = await playToEnd(pages);
    if (!reachedFinal) {
      throw new Error("game did not reach final state in time");
    }
    await pages[0].waitForSelector("#screen-final:not([hidden])", { timeout: 15_000 });
    await pages[0].waitForTimeout(700);
    await shot(pages[0], `${prefix}-result`);
  } finally {
    await Promise.all(contexts.map((context) => context.close().catch(() => undefined)));
  }
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  let server = null;
  if (!(await healthOk(BASE))) {
    console.log(`[shots] starting dev server on ${BASE}`);
    server = await startServer();
    if (!(await waitForHealth(BASE))) {
      throw new Error("dev server did not become healthy");
    }
  } else {
    console.log(`[shots] using existing server at ${BASE}`);
  }

  const browser = await chromium.launch();
  try {
    await captureRun(browser, {
      prefix: "pc",
      viewport: { width: 1280, height: 900 },
      isMobile: false,
    });
    await captureRun(browser, {
      prefix: "mobile",
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
  } finally {
    await browser.close();
    if (server) {
      server.kill("SIGTERM");
      // ポートが解放されるのを待つ
      await new Promise((resolve) => {
        const probe = createServer();
        probe.once("error", () => resolve());
        probe.once("listening", () => probe.close(() => resolve()));
        probe.listen(0, "127.0.0.1");
      });
    }
  }
  console.log("[shots] done");
}

main().catch((error) => {
  console.error("[shots] failed:", error);
  process.exitCode = 1;
});
