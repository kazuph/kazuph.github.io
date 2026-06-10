// Automated dogfooding: animation / drag-rotate / UI inventory for each 3D page.
// Usage: node dogfood_check.mjs <baseURL> <model> [model...]
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:8941';
const MODELS = process.argv.slice(3).length ? process.argv.slice(3) : ['fable5', 'gemini35flash', 'gpt55'];
const SLUGS = ['trackball-split-keyboard', 'watch-movement', 'cat', 'robot-arm-7axis', 'espresso-machine'];

function diffRatio(a, b) {
  if (!a || !b) return -1;
  const n = Math.min(a.length, b.length);
  let d = Math.abs(a.length - b.length);
  for (let i = 0; i < n; i += 13) if (a[i] !== b[i]) d++;
  return d / (n / 13);
}

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const out = [];
for (const model of MODELS) {
  for (const slug of SLUGS) {
    const url = `${BASE}/benchmark_sources/3d-model-benchmark/${model}/${slug}.html`;
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const rec = { model, slug, errors };
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(4500);
      const a = await page.screenshot();
      await page.waitForTimeout(2200);
      const b = await page.screenshot();
      rec.animates = diffRatio(a, b) > 0.001;

      // UI inventory
      rec.buttons = await page.$$eval('button', (els) => els.map((e) => e.textContent.trim()).filter(Boolean).slice(0, 20));
      rec.sliders = await page.$$eval('input[type=range]', (els) => els.length);
      rec.selects = await page.$$eval('select', (els) => els.length);

      // drag-rotate test
      const before = await page.screenshot();
      await page.mouse.move(600, 420);
      await page.mouse.down();
      for (let i = 1; i <= 10; i++) await page.mouse.move(600 + i * 22, 420 + i * 6);
      await page.mouse.up();
      await page.waitForTimeout(700);
      const after = await page.screenshot();
      rec.dragRotates = diffRatio(before, after) > 0.002;

      // wheel zoom test
      const beforeZ = await page.screenshot();
      await page.mouse.move(600, 450);
      await page.mouse.wheel(0, -600);
      await page.waitForTimeout(700);
      const afterZ = await page.screenshot();
      rec.wheelZooms = diffRatio(beforeZ, afterZ) > 0.002;
    } catch (e) {
      rec.fatal = e.message;
    }
    await page.close();
    out.push(rec);
    console.log(JSON.stringify(rec));
  }
}
await browser.close();
