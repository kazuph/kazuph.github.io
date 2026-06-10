// Capture screenshots + console errors for all generated 3D HTML files.
// Usage: node scripts/3d_benchmark_2026/capture_screens.mjs [baseURL]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = process.argv[2] || 'http://127.0.0.1:8765';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODELS = ['fable5', 'gemini35flash', 'gpt55'];
const SLUGS = ['trackball-split-keyboard', 'watch-movement', 'cat', 'robot-arm-7axis', 'espresso-machine'];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const model of MODELS) {
  const outDir = join(ROOT, 'images', 'posts', '3d-model-benchmark', model);
  mkdirSync(outDir, { recursive: true });
  for (const slug of SLUGS) {
    const url = `${BASE}/benchmark_sources/3d-model-benchmark/${model}/${slug}.html`;
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    page.on('requestfailed', (r) => errors.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`));
    let webgl = false;
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.waitForTimeout(5000); // let CDN modules + first frames settle
      webgl = await page.evaluate(() => {
        const canvases = [...document.querySelectorAll('canvas')];
        return canvases.some((c) => {
          try {
            return !!(c.getContext('webgl2') || c.getContext('webgl'));
          } catch { return c.width > 0; }
        });
      });
      await page.screenshot({ path: join(outDir, `${slug}.png`) });
    } catch (e) {
      errors.push(`fatal: ${e.message}`);
    }
    await page.close();
    results.push({ model, slug, webgl, errors });
    console.log(`[${model}/${slug}] webgl=${webgl} errors=${errors.length}`);
    for (const e of errors) console.log(`    ${e}`);
  }
}
await browser.close();
const bad = results.filter((r) => !r.webgl || r.errors.length);
console.log(`\nsummary: ${results.length - bad.length}/${results.length} clean`);
if (bad.length) console.log(JSON.stringify(bad, null, 2));
