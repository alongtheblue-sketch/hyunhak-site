// Browser verification only. BLOCKED in the implementation sandbox.
// Run: node _design/redesign_20260909/verify_r3.mjs
// Optional URL argument, PLAYWRIGHT_MODULE and PLAYWRIGHT_CHANNEL use existing installations.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
const copy = JSON.parse(await readFile(path.join(root, '_tools/r2_copy.json'), 'utf8'));
const promo = JSON.parse(await readFile(path.join(root, '_tools/promo.json'), 'utf8'));
const units = ['yonsei-hum', 'yonsei-sci', 'korea-hum', 'korea-sci'];
const labels = ['연세대 인문+통합', '연세대 자연', '고려대 인문', '고려대 자연'];
const expectedNav = ['/programs/guidebook.html', '/programs/studio.html', '/ranking.html', '/lectures.html', '/b2b.html'];
const expectedFix = ['/index.html', '/programs/guidebook.html', '/programs/studio.html', '/ranking.html', '/my.html'];
const results = [];
const check = (ok, label, detail) => results.push({ result: ok ? 'PASS' : 'FAIL', label, detail });
let server, browser;
async function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.vtt': 'text/vtt', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  server = createServer(async (req, res) => {
    try {
      let rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (rel.endsWith('/')) rel += 'index.html';
      const file = path.resolve(root, '.' + rel);
      if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(await readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${server.address().port}/`;
}
function rankData(state) {
  return { generated_at: '2026-09-09T05:00:00Z', units: Object.fromEntries(units.map((unit, i) => [unit, {
    label: labels[i], takers: state === 'empty' ? 0 : 12, scored: state === 'collecting' ? 3 : state === 'empty' ? 0 : 12,
    dist: state === 'populated' ? [0, 0, 0, 0, 0, 1, 2, 3, 4, 2] : null,
    rows: state === 'empty' || state === 'private' ? [] : [
      { rank: 1, name: '별명123', masked: false, score: 95, set_id: 'yonsei_2027_h01', at: '2026-09-09T04:00:00Z' },
      { rank: 2, name: '김*우', masked: true, score: 91, set_id: 'korea_2027_h01', at: '2026-09-09T03:00:00Z' }
    ]
  }])) };
}
async function ready(page, base, rel) {
  const response = await page.goto(new URL(rel, base).href, { waitUntil: 'domcontentloaded' });
  check(response?.ok(), `${rel} HTTP`, response?.status());
  await page.evaluate(async () => { await document.fonts.ready; if (window.HH?.promoReady) await HH.promoReady; });
  const popup = page.locator('#promoPopup:not([hidden])');
  if (await popup.isVisible()) await popup.locator('[data-ppop-close]').first().click();
  await page.evaluate(() => scrollTo(0, 0));
}
try {
  let chromium;
  for (const mod of [process.env.PLAYWRIGHT_MODULE, 'playwright', path.resolve(root, '../../iruri_6mo_thumb/node_modules/playwright')].filter(Boolean)) {
    try { ({ chromium } = require(mod)); break; } catch {}
  }
  if (!chromium) throw new Error('BLOCKED: set PLAYWRIGHT_MODULE to an existing Playwright installation');
  const base = process.argv[2] || await serve();
  browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
  const out = path.join(root, '_design/redesign_20260909/browser_results_r3b');
  await mkdir(out, { recursive: true });
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    let rankState = 'populated';
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    await context.addInitScript(() => { Date.now = () => Date.parse('2026-09-09T12:00:00+09:00'); });
    await context.route('**/api/config', route => route.fulfill({ json: { oauth: {}, promo } }));
    await context.route('**/api/auth/me', route => route.fulfill({ json: { member: null } }));
    await context.route('**/api/studio/ranking', route => rankState === 'failed' ? route.abort('failed') : route.fulfill({ json: rankData(rankState) }));
    for (const rel of ['programs/guidebook.html', 'programs/studio.html', 'ranking.html', 'studio.html', 'index.html']) {
      const page = await context.newPage();
      page.on('pageerror', e => check(false, `${rel} pageerror`, e.message));
      await ready(page, base, rel);
      for (const [selector, expected] of [['.gnb', expectedNav], ['.fix', expectedFix]]) {
        const actual = await page.locator(selector + ' a').evaluateAll(links => links.map(a => new URL(a.href).pathname));
        check(JSON.stringify(actual) === JSON.stringify(expected), `${rel} ${viewport.width} ${selector} five hrefs`, actual);
      }
      if (rel.startsWith('programs/')) {
        const primary = await page.locator('#buy [data-primary]').boundingBox();
        check(primary && primary.y >= 0 && primary.y + primary.height <= viewport.height, `${rel} ${viewport.width} primary in first viewport`, primary);
        if (viewport.width === 1280) {
          const band = await page.locator('.r3-metrics').boundingBox();
          check(band && band.y < viewport.height, `${rel} metrics top in viewport`, band);
        }
        const height = await page.evaluate(() => document.documentElement.scrollHeight);
        if (viewport.width === 390) check(height <= (rel.includes('guidebook') ? 15000 : 13000), `${rel} mobile height limit`, height);
        const taps = await page.locator('main button, main .r3-actions a').evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => ({ text: n.textContent.trim(), h: n.getBoundingClientRect().height, min: parseFloat(getComputedStyle(n).getPropertyValue('--tap')) })));
        check(taps.every(t => t.h >= t.min), `${rel} tap targets`, taps);
        const gaps = await page.locator('main .r3-actions').evaluateAll(nodes => nodes.map(n => ({ gap: parseFloat(getComputedStyle(n).gap), min: parseFloat(getComputedStyle(n).getPropertyValue('--s3')) })));
        check(gaps.every(g => g.gap >= g.min), `${rel} CTA gap`, gaps);
        const destinations = await page.locator('main a[href]').evaluateAll(links => {
          const rows = links.filter(a => !a.closest('#close')).map(a => new URL(a.href)).filter(u => u.origin === location.origin && u.pathname.endsWith('.html'));
          return { paths: [...new Set(rows.map(u => u.pathname))], urls: [...new Set(rows.map(u => u.pathname + u.search + u.hash))] };
        });
        // Raw distinct page count. 31 per-book links are intentionally not collapsed into one category.
        check(destinations.paths.length <= 6, `${rel} distinct destination pages <=6`, destinations);
        if (rel.includes('guidebook')) {
          await page.locator('input[value="pdf"]').check();
          check(await page.locator('#buy [data-primary]').getAttribute('data-cart-sku') === 'guide-all-pdf', 'PDF product SKU');
          check(await page.locator('#buy [data-plan="pdf"]').isVisible(), 'PDF delivery note');
          await page.locator('#buy [data-primary]').click();
          const cart = await page.evaluate(() => JSON.parse(localStorage.getItem('hh_cart_v1') || '[]'));
          check(cart.some(x => x.sku === 'guide-all-pdf' && x.list_price === 1705000), 'PDF cart retains list price', cart);
        }
      }
      if (rel === 'ranking.html') {
        await page.waitForFunction(() => document.querySelectorAll('[data-rank-rows] tr').length === 2);
        check(await page.locator('thead th').nth(1).innerText() === '별명', 'ranking nickname header');
        check(await page.locator('[data-rank-tabs] button').count() === 4, 'ranking four tabs');
        check(await page.locator('[data-rank-rows] tr').nth(1).getAttribute('title') === copy.r3_rank_masked[0], 'masked row title');
        check(await page.locator('[data-rank-rows] [data-c="name"]').nth(1).innerText() === '김*우', 'masked value unchanged');
        check(await page.locator('[data-rank-rows] tr').first().getAttribute('title') === null, 'nickname row has no masked title');
        const order = await page.evaluate(() => ['.rtbl', '[data-rank-views]', '[data-rank-dist]'].map(s => document.querySelector(s).getBoundingClientRect().top));
        check(order[0] < order[1] && order[0] < order[2], 'ranking table before view controls and distribution', order);
        for (const unit of units) { await page.locator(`[data-rank-tabs] [data-unit="${unit}"]`).click(); check(await page.locator('[role="tabpanel"]').getAttribute('data-unit') === unit, 'ranking tab ' + unit); }
        for (const view of ['set', 'difficulty', 'all']) { await page.locator(`[data-view="${view}"]`).click(); check(await page.locator(`[data-view="${view}"]`).getAttribute('aria-pressed') === 'true', 'ranking view ' + view); }
        const padding = await page.locator('section.page.wrap').evaluate(n => parseFloat(getComputedStyle(n).paddingLeft));
        check(padding > 0, 'page.wrap inline padding', padding);
        for (const state of ['empty', 'collecting', 'private', 'failed']) {
          rankState = state; await ready(page, base, rel);
          await page.locator('[data-rank-note]').waitFor({ state: 'visible' });
          check(await page.locator('h1').isVisible(), `ranking ${state} H1 stays visible`);
          check(await page.locator('[data-rank-note]').innerText().then(Boolean), `ranking ${state} note`);
        }
        rankState = 'populated'; await ready(page, base, rel);
      }
      // Load lazy images before measuring final document dimensions.
      await page.evaluate(async () => {
        document.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });
        await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
      });
      const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, height: document.documentElement.scrollHeight }));
      check(size.document <= size.viewport && size.body <= size.viewport, `${rel} ${viewport.width} overflow zero`, size);
      if (viewport.width === 390 && rel.startsWith('programs/')) check(size.height <= (rel.includes('guidebook') ? 15000 : 13000), `${rel} loaded mobile height`, size.height);
      await page.screenshot({ path: path.join(out, rel.replaceAll('/', '_') + '_' + viewport.width + '.png'), fullPage: true });
      await page.close();
    }
    await context.close();
  }
  await writeFile(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  for (const row of results) console.log(`${row.result} ${row.label}${row.detail === undefined ? '' : ' ' + JSON.stringify(row.detail)}`);
  const failures = results.filter(r => r.result === 'FAIL').length;
  console.log(`verify_r3: checks=${results.length} FAIL=${failures}`);
  process.exitCode = failures ? 1 : 0;
} catch (e) { console.error(e.message); process.exitCode = 1; }
finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); }
