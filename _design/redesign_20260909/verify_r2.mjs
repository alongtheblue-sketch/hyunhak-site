// Browser leg only. Do not execute in the implementation sandbox.
// Usage: node _design/redesign_20260909/verify_r2.mjs [http://127.0.0.1:8788/]
// PLAYWRIGHT_MODULE may identify an existing Playwright installation; no auto-install.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const out = path.join(root, '_design/redesign_20260909/browser_results');
const manifest = JSON.parse(await readFile(path.join(root, '_tools/seo_manifest.json'), 'utf8'));
const pages = Object.keys(manifest.pages).sort();
const findings = [];
let server, browser, base;
function check(ok, label, detail = '') {
  findings.push({ result: ok ? 'PASS' : 'FAIL', label, detail });
}
async function startServer() {
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.vtt': 'text/vtt', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2' };
  server = createServer(async (req, res) => {
    try {
      const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + (rel.endsWith('/') ? rel + 'index.html' : rel));
      if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const info = await stat(file);
      if (!info.isFile()) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}/`;
}
async function navCheck(page, rel, viewport) {
  for (const [selector, guideLabel, studioLabel] of [['.gnb', '가이드북', '제시문 면접 스튜디오'], ['.fix', '가이드북', '스튜디오']]) {
    const result = await page.locator(selector).evaluate((nav, labels) => {
      const links = [...nav.querySelectorAll('a')];
      return labels.map(label => {
        const a = links.find(x => x.textContent.trim() === label);
        return a ? new URL(a.href).pathname : null;
      });
    }, [guideLabel, studioLabel]);
    check(result[0] === '/programs/guidebook.html' && result[1] === '/programs/studio.html', `${rel} ${viewport.width} ${selector} destinations`, result);
  }
}
try {
  let chromium;
  // The parent session's shots.mjs uses this existing workspace installation.
  const modules = [process.env.PLAYWRIGHT_MODULE, 'playwright', path.resolve(root, '../../iruri_6mo_thumb/node_modules/playwright')].filter(Boolean);
  for (const candidate of modules) {
    try { ({ chromium } = require(candidate)); break; } catch {}
  }
  if (!chromium) throw new Error('BLOCKED: Playwright module unavailable. Set PLAYWRIGHT_MODULE to an existing installation.');
  base = process.argv[2] ? new URL(process.argv[2]).href.replace(/\/?$/, '/') : await startServer();
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  await mkdir(out, { recursive: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    for (const rel of pages) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });
      try {
        const response = await page.goto(new URL(rel, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        check(response && response.ok(), `${rel} ${viewport.width} HTTP`, response?.status());
        await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: 15000 });
        await page.evaluate(async () => {
          if (!window.HH?.promoReady) return;
          let timer;
          try {
            await Promise.race([window.HH.promoReady, new Promise((_, reject) => {
              timer = setTimeout(() => reject(new Error('promoReady timed out')), 15000);
            })]);
          } finally { clearTimeout(timer); }
        });
        // Dismiss the preserved campaign dialog through its real control, recording the action.
        const dialog = page.locator('#promoPopup:not([hidden])');
        if (await dialog.isVisible()) {
          await dialog.locator('[data-ppop-close]').first().click();
          findings.push({ result: 'INFO', label: `${rel} campaign dialog dismissed through close control` });
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        const widths = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, body: document.body.scrollWidth, viewport: innerWidth }));
        check(widths.document <= widths.viewport && widths.body <= widths.viewport, `${rel} ${viewport.width} overflow`, widths);
        if (rel === 'index.html') {
          const boxes = await page.locator('[data-product]').evaluateAll(nodes => nodes.map(n => {
            const r = n.getBoundingClientRect(); const h = n.querySelector('h2').getBoundingClientRect();
            return { top: r.top, width: r.width, height: r.height, headingTop: h.top };
          }));
          check(boxes.length === 2 && boxes.every(r => r.top >= 0 && r.top < viewport.height && r.headingTop < viewport.height), `home ${viewport.width} both card headings in first viewport`, boxes);
          if (viewport.width === 1280) check(Math.abs(boxes[0].width - boxes[1].width) <= 2 && Math.abs(boxes[0].height - boxes[1].height) <= 2, 'home equal card dimensions', boxes);
          const bandTop = await page.locator('section.pband').evaluate(n => n.getBoundingClientRect().top);
          check(bandTop >= viewport.height, `home ${viewport.width} price band below fold`, bandTop);
          check(await page.locator('.r2-products [data-list-price]').count() >= 2, 'home price contracts');
          const strip = await page.locator('.r2-promo p').evaluate(n => ({ height: n.getBoundingClientRect().height - parseFloat(getComputedStyle(n).paddingTop) - parseFloat(getComputedStyle(n).paddingBottom), line: parseFloat(getComputedStyle(n).lineHeight) }));
          check(strip.height <= strip.line + 2, `home ${viewport.width} promo single line`, strip);
        }
        if (['programs/guidebook.html', 'programs/studio.html'].includes(rel)) {
          await page.locator('#buy [data-primary]').waitFor({ state: 'visible' });
          const box = await page.locator('#buy [data-primary]').boundingBox();
          check(box && box.y >= 0 && box.y + box.height <= viewport.height, `${rel} ${viewport.width} primary fully in first viewport`, box);
          check(await page.locator('#buy [data-primary]').isEnabled(), `${rel} primary enabled`);
          check(await page.locator('#buy [data-list-price]').count() >= 2, `${rel} price contracts`);
          check(await page.locator('#buy [data-primary]').count() === 1, `${rel} single primary`);
        }
        if (['index.html', 'programs/guidebook.html', 'programs/studio.html'].includes(rel)) {
          await navCheck(page, rel, viewport);
          await page.screenshot({ path: path.join(out, `${rel.replaceAll('/', '_')}_${viewport.width}.png`) });
        }
      } catch (e) { check(false, `${rel} ${viewport.width} execution`, e.message); }
      check(errors.length === 0, `${rel} ${viewport.width} console errors`, errors);
      await page.close();
    }
    await context.close();
  }
  const failures = findings.filter(x => x.result === 'FAIL');
  await writeFile(path.join(out, 'results.json'), JSON.stringify({ base, findings }, null, 2) + '\n');
  for (const item of findings) console.log(item.result, item.label, JSON.stringify(item.detail ?? ''));
  console.log(`r2_browser: pages=${pages.length} viewports=2 FAIL=${failures.length}`);
  process.exitCode = failures.length ? 1 : 0;
} catch (e) {
  console.error(e.message.startsWith('BLOCKED:') ? e.message : 'BLOCKED: Browser leg could not start: ' + e.message);
  process.exitCode = 2;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
