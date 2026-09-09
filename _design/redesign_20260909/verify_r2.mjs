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
const out = path.join(root, '_design/redesign_20260909/browser_results_r2c');
const manifest = JSON.parse(await readFile(path.join(root, '_tools/seo_manifest.json'), 'utf8'));
const pages = Object.keys(manifest.pages).sort();
const ledger = await readFile(path.join(root, '_design/redesign_20260909/copy_ledger_v6.md'), 'utf8');
const expectedCopy = Object.fromEntries([...ledger.matchAll(/^\| [^|]+ \| `([^`]+)` \| ([^|]+) \|/gm)].map(m => [m[1], m[2].trim()]));
const campaign = JSON.parse(await readFile(path.join(root, '_tools/promo.json'), 'utf8'));
const programPages = ['programs/guidebook.html', 'programs/studio.html', 'programs/korea.html', 'programs/yonsei.html'];
const separateShellPages = new Set(['programs/korea.html', 'programs/yonsei.html']);
const normalize = value => value.replace(/\s+/g, ' ').trim();
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
  for (const [selector, guideLabel, studioLabel] of [['.gnb', '가이드북', '스튜디오'], ['.fix', '가이드북', '스튜디오']]  /* R3 GNB 라벨 「스튜디오」(SECTION_SPEC_R3 §4, 2026-09-09). 구 「제시문 면접 스튜디오」는 R2 셸 */) {
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
    // 행사 배치와 통신 실패는 다른 상태다. 정상 배치는 고정 행사 응답으로 재현한다.
    await context.addInitScript(() => { const now = Date.parse('2026-09-09T12:00:00+09:00'); Date.now = () => now; });
    await context.route('**/api/config', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ oauth: {}, promo: campaign }) }));
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
        if (separateShellPages.has(rel)) {
          findings.push({ result: 'SKIP', label: `${rel} ${viewport.width} search label Pretendard`, detail: 'Separate LP shell has no shared label.ph or app.js (R2c scope).' });
        } else if (programPages.includes(rel)) {
          const labels = page.locator('label.ph');
          const font = await labels.count() === 1 ? await labels.evaluate(n => getComputedStyle(n).fontFamily) : null;
          check(font?.includes('Pretendard'), `${rel} ${viewport.width} search label Pretendard`, font ?? 'label.ph missing');
        }
        const h1Key = ({ 'index.html': 'home_h1', 'programs/guidebook.html': 'guide_h1', 'programs/studio.html': 'studio_h1' })[rel];
        if (h1Key) {
          const actual = normalize(await page.locator('h1').innerText());
          check(Boolean(expectedCopy[h1Key]) && actual === normalize(expectedCopy[h1Key]), `${rel} ${viewport.width} H1 matches selected ledger copy`, { actual, expected: expectedCopy[h1Key] });
        }
        if (rel === 'index.html') {
          const boxes = await page.locator('[data-product]').evaluateAll(nodes => nodes.map(n => {
            const r = n.getBoundingClientRect(); const h = n.querySelector('h2').getBoundingClientRect();
            return { top: r.top, width: r.width, height: r.height, headingTop: h.top };
          }));
          check(boxes.length === 2 && boxes.every(r => r.top >= 0 && r.top < viewport.height && r.headingTop < viewport.height), `home ${viewport.width} both card headings in first viewport`, boxes);
          if (viewport.width === 1280) check(Math.abs(boxes[0].width - boxes[1].width) <= 2 && Math.abs(boxes[0].height - boxes[1].height) <= 2, 'home equal card dimensions', boxes);
          const prices = await page.locator('[data-product]').evaluateAll(cards => cards.map(card => [...card.querySelectorAll('.r2-card-price')].map(row => row.querySelector('[data-list-price]')?.dataset.listPrice)));
          check(JSON.stringify(prices) === JSON.stringify([['33000', '511500'], ['495000', '33000']]), `home ${viewport.width} two price rows per card in approved order`, prices);
          if (viewport.width === 1280) {
            const actions = await page.locator('.r2-card .r2-actions').evaluateAll(nodes => nodes.map(n => ({ top: n.getBoundingClientRect().top, bottom: n.getBoundingClientRect().bottom })));
            check(actions.length === 2 && actions.every(r => r.top >= 0 && r.bottom <= viewport.height), 'home desktop both card CTAs in first viewport', actions);
          }
          const more = await page.locator('#find .more').evaluate(n => ({ count: n.querySelectorAll('a').length, hrefs: [...n.querySelectorAll('a')].map(a => a.getAttribute('href')), gap: parseFloat(getComputedStyle(n).columnGap) }));
          check(more.count === 1 && more.hrefs[0] === 'guidebook/index.html' && await page.locator('#flow a[href="programs/studio.html"]').count() === 1, `home ${viewport.width} find link belongs to guidebooks only`, more);
          // B3의 중복 제거 후 링크는 하나다. 일시적으로 같은 링크를 복제하여 B2의 실제 간격도 측정한다.
          const linkGap = await page.locator('#find .more').evaluate(n => {
            const first = n.querySelector('a'); if (!first) return null;
            const probe = first.cloneNode(true); n.append(probe);
            try {
              const a = first.getBoundingClientRect(), b = probe.getBoundingClientRect();
              return b.top >= a.bottom ? b.top - a.bottom : b.left - a.right;
            } finally { probe.remove(); }
          });
          check(more.gap >= 12 && linkGap >= 12, `home ${viewport.width} find links gap at least 12px (temporary pair)`, { configured: more.gap, measured: linkGap });
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
  // 별도 로컬 실패 레그: config 요청을 실제 중단하고 두 번 실패한 뒤 행사/팝업 0개를 확인한다.
  for (const rel of ['index.html', 'studio.html', ...programPages]) {
    if (separateShellPages.has(rel)) {
      findings.push({ result: 'SKIP', label: `${rel} config blocked promo check`, detail: 'Separate LP shell does not load the shared app.js promo runtime (R2c scope).' });
      continue;
    }
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    let configAttempts = 0;
    await context.route('**/api/config', async route => { configAttempts++; await route.abort('failed'); });
    const page = await context.newPage();
    try {
      await page.goto(new URL(rel, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
      if (!await page.evaluate(() => Boolean(window.HH?.promoReady))) throw new Error('HH.promoReady missing: this page does not load the shared app runtime');
      await page.evaluate(async () => {
        let timer;
        try {
          await Promise.race([window.HH.promoReady, new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error('promoReady timed out')), 15000);
          })]);
        } finally { clearTimeout(timer); }
      });
      const result = await page.evaluate(() => {
        const visible = n => { const s = getComputedStyle(n), r = n.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
        return { promoCount: document.querySelectorAll('[data-promo]').length, visible: [...document.querySelectorAll('[data-promo], [data-promo-popup]')].filter(visible).length, discounted: document.querySelectorAll('[data-list-price] .sale').length, unknown: window.HH.promo() === undefined };
      });
      check(configAttempts >= 2 && result.promoCount > 0 && result.visible === 0 && result.discounted === 0 && result.unknown, `${rel} config blocked: no visible campaign, list prices unchanged`, { ...result, configAttempts });
    } catch (e) { check(false, `${rel} config blocked execution`, e.message); }
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
