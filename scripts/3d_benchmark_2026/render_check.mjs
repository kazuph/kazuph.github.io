// Headless render validation for a single 3D HTML page.
// Usage: node render_check.mjs <url>  -> exit 0 if WebGL canvas alive and no page errors
import { chromium } from 'playwright';

const url = process.argv[2];
if (!url) { console.error('usage: render_check.mjs <url>'); process.exit(2); }

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
try {
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(5000);
  const webgl = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll('canvas')];
    return canvases.some((c) => {
      try { return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return c.width > 0; }
    });
  });
  if (!webgl) errors.push('no webgl canvas');
} catch (e) {
  errors.push(`fatal: ${e.message}`);
}
await browser.close();
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('render ok');
