#!/usr/bin/env node
/**
 * スクリーンショット生成スクリプト（結果採点用の納品物）
 * 使い方: 1) `npm run dev` で wrangler dev を起動  2) 別ターミナルで `npm run shots`
 * 保存先: .artifacts/*.png（ロビー・出題中・回答中・結果 × PC/スマホ）
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:8787";
const OUT = new URL("../.artifacts/", import.meta.url).pathname;

mkdirSync(OUT, { recursive: true });

async function api(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function newPage(browser, { mobile = false } = {}) {
  const ctx = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
      : { viewport: { width: 1280, height: 800 } }
  );
  return ctx.newPage();
}

async function openAs(browser, name, token, code, opts) {
  const page = await newPage(browser, opts);
  await page.addInitScript(
    ([sessionKey, session]) => {
      localStorage.setItem(sessionKey, session);
    },
    ["buzzool_session_v1", JSON.stringify({ code, token, playerId: null })]
  );
  await page.goto(BASE + "/");
  await page.waitForFunction(
    () => {
      const lobby = document.querySelector("#screen-lobby");
      const quiz = document.querySelector("#screen-quiz");
      return (lobby && !lobby.hidden) || (quiz && !quiz.hidden);
    },
    undefined,
    { timeout: 30_000 }
  );
  return page;
}

async function shot(page, name) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + name + ".png", fullPage: false });
  console.log("saved", name + ".png");
}

async function autoPlayAll(pages) {
  const deadline = Date.now() + 200_000;
  while (Date.now() < deadline) {
    const done = await Promise.all(
      pages.map((p) =>
        p.evaluate(() => {
          const r = document.querySelector("#screen-result");
          return !!r && !r.hidden;
        })
      )
    );
    if (done.every(Boolean)) return;
    for (const p of pages) {
      const state = await p.evaluate(() => {
        const result = document.querySelector("#screen-result");
        if (result && !result.hidden) return "result";
        const buzz = document.querySelector("#btn-buzz");
        if (buzz && !buzz.hidden && !buzz.disabled) return "buzzable";
        if (document.querySelector(".choice.selectable")) return "my-answer";
        return "waiting";
      });
      if (state === "buzzable") await p.click("#btn-buzz", { timeout: 700 }).catch(() => {});
      else if (state === "my-answer") await p.locator(".choice.selectable").first().click({ timeout: 700 }).catch(() => {});
    }
    await pages[0].waitForTimeout(150);
  }
  throw new Error("autoPlayAll timed out");
}

const browser = await chromium.launch();
try {
  // ---- 部屋を作って4人入室 ----
  const host = await api("/api/create", { name: "あやか" });
  const code = host.code;
  const tokens = [host.token];
  for (const name of ["りく", "ももか", "そら"]) {
    const j = await api("/api/join", { name, code });
    tokens.push(j.token);
  }

  const pcHost = await openAs(browser, "あやか", tokens[0], code, {});
  const mobile2 = await openAs(browser, "りく", tokens[1], code, { mobile: true });
  const pc3 = await openAs(browser, "ももか", tokens[2], code, {});
  const pc4 = await openAs(browser, "そら", tokens[3], code, {});

  // ---- ロビー (PC / スマホ) ----
  await pcHost.waitForFunction(() => document.querySelectorAll("#lobby-players .player-row").length === 4);
  await shot(pcHost, "01-lobby-pc");
  await shot(mobile2, "02-lobby-mobile");

  // ---- ゲーム開始 → 出題中（早押し） ----
  await pcHost.click("#btn-start");
  await pcHost.waitForFunction(() => {
    const q = document.querySelector("#screen-quiz");
    const b = document.querySelector("#btn-buzz");
    return q && !q.hidden && b && !b.disabled;
  }, undefined, { timeout: 30_000 });
  await shot(pcHost, "03-question-pc");
  await shot(mobile2, "04-question-mobile");

  // ---- 回答中（回答権を得た側＋見ている側） ----
  await pc3.click("#btn-buzz");
  await pc3.waitForFunction(() => !!document.querySelector(".choice.selectable"), undefined, { timeout: 10_000 });
  await shot(pc3, "05-answering-pc");
  await shot(mobile2, "06-answering-mobile"); // 回答者を見ている側の画面
  // スマホが回答者パターンも欲しいので、次の問題でももかが答えた後、りく（スマホ）に押させる
  await pc3.locator(".choice.selectable").first().click();

  // 以降は自動プレイで結果まで進める（途中の回答中スマホも撮る）
  let tookMobileAnswering = false;
  const all = [pcHost, mobile2, pc3, pc4];
  const deadline = Date.now() + 200_000;
  while (Date.now() < deadline) {
    const done = await Promise.all(
      all.map((p) => p.evaluate(() => {
        const r = document.querySelector("#screen-result");
        return !!r && !r.hidden;
      }))
    );
    if (done.every(Boolean)) break;
    for (const p of all) {
      const state = await p.evaluate(() => {
        const result = document.querySelector("#screen-result");
        if (result && !result.hidden) return "result";
        const buzz = document.querySelector("#btn-buzz");
        if (buzz && !buzz.hidden && !buzz.disabled) return "buzzable";
        if (document.querySelector(".choice.selectable")) return "my-answer";
        return "waiting";
      });
      if (state === "buzzable") {
        if (p === mobile2 && !tookMobileAnswering) {
          await p.click("#btn-buzz", { timeout: 700 }).catch(() => {});
          const got = await p.waitForFunction(() => !!document.querySelector(".choice.selectable"), undefined, { timeout: 5_000 }).then(() => true).catch(() => false);
          if (got) {
            await shot(p, "07-answering-mobile");
            tookMobileAnswering = true;
            await p.locator(".choice.selectable").first().click();
            continue;
          }
        } else {
          await p.click("#btn-buzz", { timeout: 700 }).catch(() => {});
        }
      } else if (state === "my-answer") {
        await p.locator(".choice.selectable").first().click({ timeout: 700 }).catch(() => {});
      }
    }
    await all[0].waitForTimeout(150);
  }

  // ---- 結果 (PC / スマホ) ----
  await Promise.all(all.map((p) => p.waitForFunction(() => {
    const r = document.querySelector("#screen-result");
    return r && !r.hidden && document.querySelectorAll("#result-list .result-row").length === 4;
  }, undefined, { timeout: 30_000 })));
  await shot(pcHost, "08-result-pc");
  await shot(mobile2, "09-result-mobile");

  console.log("done →", OUT);
} finally {
  await browser.close();
}
