// Koi motion analyzer: records trajectories, computes naturalness metrics,
// and saves a trail screenshot. Fails (exit 1) on spinning / overlap.
// Usage: node analyze_koi.mjs [baseURL] [outPrefix] [--feed]
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://127.0.0.1:8941';
const PREFIX = process.argv[3] || '/tmp/koi-analysis';
const FEED = process.argv.includes('--feed');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => console.log('PAGEERROR:', e.message.slice(0, 200)));
await page.goto(`${BASE}/labs/fable5-vfx/water.html?trails=1`, { waitUntil: 'commit', timeout: 30000 });
await page.waitForTimeout(12000);

const samples = [];
const t0 = Date.now();
const DURATION = 60000;
let fed = false;
while (Date.now() - t0 < DURATION) {
  const s = await page.evaluate(() => ({ t: performance.now(), koi: window.__koiState || [], sep: window.__koiMinSep ?? null }));
  if (s.koi.length) samples.push(s);
  if (FEED && !fed && Date.now() - t0 > DURATION / 2) {
    await page.mouse.move(600, 430);
    await page.mouse.down();
    await page.mouse.up();
    fed = true;
    console.log('-- fed at t=%ds', Math.round((Date.now() - t0) / 1000));
  }
  await page.waitForTimeout(150);
}
await page.screenshot({ path: `${PREFIX}-trails.png`, timeout: 120000 });
writeFileSync(`${PREFIX}.json`, JSON.stringify(samples));
await browser.close();

// ---- metrics ----
const N = samples[0].koi.length;
const report = [];
let worstSep = Infinity;
for (const s of samples) if (s.sep !== null && s.sep < worstSep) worstSep = s.sep;

function shortestArc(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

let anySpin = false;
for (let i = 0; i < N; i++) {
  const xs = samples.map((s) => s.koi[i]);
  let path = 0;
  for (let j = 1; j < xs.length; j++) path += Math.hypot(xs[j][0] - xs[j - 1][0], xs[j][1] - xs[j - 1][1]);

  // straightness over 10s windows: net displacement / path length
  const win = Math.round(10000 / 150);
  let minStraight = 1;
  for (let j = 0; j + win < xs.length; j += Math.round(win / 2)) {
    let wPath = 0;
    for (let m = j + 1; m <= j + win; m++) wPath += Math.hypot(xs[m][0] - xs[m - 1][0], xs[m][1] - xs[m - 1][1]);
    const net = Math.hypot(xs[j + win][0] - xs[j][0], xs[j + win][1] - xs[j][1]);
    if (wPath > 1.5) minStraight = Math.min(minStraight, net / wPath);
  }

  // spin detection: |cumulative signed heading change| within any 8s window > 1.2 turns
  const winS = Math.round(8000 / 150);
  let maxWind = 0;
  const dh = [];
  for (let j = 1; j < xs.length; j++) dh.push(shortestArc(xs[j][2] - xs[j - 1][2]));
  for (let j = 0; j + winS < dh.length; j += 4) {
    let acc = 0;
    for (let m = j; m < j + winS; m++) acc += dh[m];
    maxWind = Math.max(maxWind, Math.abs(acc) / (Math.PI * 2));
  }
  const spin = maxWind > 1.2;
  if (spin) anySpin = true;
  report.push({ koi: i, pathLen: +path.toFixed(1), minStraightness10s: +minStraight.toFixed(2), maxTurns8s: +maxWind.toFixed(2), spinning: spin });
}
console.table(report);
console.log('worst pairwise separation (1.0 = personal space):', worstSep === Infinity ? 'n/a' : worstSep.toFixed(3));
console.log(`trails: ${PREFIX}-trails.png / raw: ${PREFIX}.json`);

const sepBad = worstSep !== Infinity && worstSep < 0.6;
if (anySpin || sepBad) {
  console.log('VERDICT: FAIL', anySpin ? '(spinning detected)' : '', sepBad ? '(overlap)' : '');
  process.exit(1);
}
console.log('VERDICT: PASS');
