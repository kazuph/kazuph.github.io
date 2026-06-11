// Headless verification + screenshots for the 5 VFX scenes.
// Usage: node scripts/fable5_vfx_2026/capture.mjs [baseURL]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:8941';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'images', 'posts', 'fable5-vfx');
mkdirSync(OUT, { recursive: true });

const SHOTS = [
  { slug: 'water', name: 'water', act: async (p) => {
    for (let i = 0; i < 12; i++) { await p.mouse.move(360 + i * 40, 470 + Math.sin(i * 0.7) * 80); await p.waitForTimeout(45); }
    await p.waitForTimeout(700);
  } },
  { slug: 'water', name: 'water-feed', act: async (p) => {
    await p.mouse.move(600, 470); await p.mouse.down(); await p.mouse.up();
    await p.waitForTimeout(3500);
  } },
  { slug: 'waves', name: 'waves-calm' },
  { slug: 'waves', name: 'waves-storm', query: '?storm=1' },
  { slug: 'forest', name: 'forest-day' },
  { slug: 'forest', name: 'forest-night', query: '?time=night' },
  { slug: 'glass', name: 'glass' },
  { slug: 'explosion', name: 'explosion-peak', query: '?t=0.45' },
  { slug: 'explosion', name: 'explosion-smoke', query: '?t=4.5' },
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let failed = 0;
for (const { slug, name, act, query } of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await page.goto(`${BASE}/labs/fable5-vfx/${slug}.html${query || ''}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3500);
  if (act) await act(page);
  await page.screenshot({ path: join(OUT, `${name}.png`), timeout: 90000 });

  // drag-rotate sanity check
  const b1 = await page.screenshot({ timeout: 90000 });
  await page.mouse.move(600, 450);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(600 + i * 25, 450);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const b2 = await page.screenshot({ timeout: 90000 });
  let diff = 0;
  for (let i = 0; i < Math.min(b1.length, b2.length); i += 17) if (b1[i] !== b2[i]) diff++;
  const ok = errs.length === 0 && diff > 200;
  if (!ok) failed++;
  console.log(`[${ok ? 'ok' : 'NG'}] ${name} errors=${errs.length} dragWorks=${diff > 200}`);
  for (const e of errs) console.log(`    ${e}`);
  await page.close();
}
await browser.close();
if (failed) process.exit(1);
