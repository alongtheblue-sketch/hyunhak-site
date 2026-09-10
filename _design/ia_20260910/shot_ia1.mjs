// IA1 브라우저 인수 검증 (메타 층). 구현 샌드박스에서는 실행하지 않는다.
// 별도 터미널: python3 -m http.server 8911 --bind 127.0.0.1
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = process.env.IA1_BASE || 'http://127.0.0.1:8911';
const out = new URL('./shots/', import.meta.url);
await mkdir(out, { recursive: true });
const codeSource = await readFile(new URL('../../_tools/exam_pages/codes.py', import.meta.url), 'utf8');
const codes = [...codeSource.matchAll(/^\s*\("([a-z-]+)",/gm)].map(m => m[1]);
if (codes.length !== 8) throw new Error(`Expected 8 codes, got ${codes.length}`);
const pages = ['programs/studio.html#units', 'studio.html#units', ...codes.map(c => `interview/${c}.html`)];
const browser = await chromium.launch();
const rows = [];
try {
  for (const path of pages) for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    const response = await page.goto(`${base}/${path}`, { waitUntil: 'load' });
    if (response.status() !== 200) throw new Error(`${path}: HTTP ${response.status()}`);
    await page.evaluate(() => document.fonts.ready);
    const isCard = path.includes('#units');
    if (isCard) {
      const count = path.startsWith('programs/') ? 8 : 5;
      await page.waitForFunction(n => document.querySelectorAll('#units .unit').length === n, count);
      await page.locator('#units').scrollIntoViewIfNeeded();
    }
    const metrics = await page.evaluate(({ width, isCard }) => {
      const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const rect = el => el.getBoundingClientRect();
      const insideScroller = el => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          if (/auto|scroll/.test(getComputedStyle(n).overflowX)) return true;
        }
        return false;
      };
      const scope = document.querySelector(isCard ? '#units' : 'main');
      const over = [...scope.querySelectorAll('*')].filter(el => visible(el) && (rect(el).right > width + 1 || rect(el).left < -1) && !insideScroller(el)).map(el => el.className || el.tagName);
      const cards = [...scope.querySelectorAll('.unit')].map(el => {
        const r = rect(el), heading = el.querySelector('h3'), style = getComputedStyle(heading);
        const actions = [...el.querySelectorAll('.foot a,.foot button')];
        const tooSmall = actions.filter(a => rect(a).height < parseFloat(getComputedStyle(a).getPropertyValue('--tap')) - 1).length;
        const collision = [...el.querySelectorAll('*')].filter(child => visible(child) && (rect(child).right > r.right + 1 || rect(child).left < r.left - 1)).length;
        const shortGap = actions.some((a, i) => i && Math.abs(rect(a).top - rect(actions[i - 1]).top) < 1 && rect(a).left - rect(actions[i - 1]).right < parseFloat(getComputedStyle(a).getPropertyValue('--s3')) - 1);
        return { code: el.dataset.r3Unit, x: r.x, y: r.y, width: r.width, height: r.height,
          titleLines: Math.round(rect(heading).height / parseFloat(style.lineHeight)), tooSmall, collision, shortGap };
      });
      const columns = isCard ? getComputedStyle(scope.querySelector('.units')).gridTemplateColumns.split(' ').length : null;
      const pairHeightMismatch = width >= 760 && cards.some((card, i) => i % 2 === 1 && Math.abs(card.height - cards[i - 1].height) > 1);
      return { over, cards, columns, pairHeightMismatch, docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }, { width, isCard });
    const pass = !errors.length && !metrics.over.length && metrics.docOverflow <= 1 && !metrics.pairHeightMismatch
      && (!isCard || (metrics.columns === (width >= 760 ? 2 : 1) && metrics.cards.every(c => !c.tooSmall && !c.collision && !c.shortGap && (width !== 1280 || c.titleLines === 1))));
    const name = path.replace(/[\/#?=]/g, '_');
    await page.screenshot({ path: new URL(`${name}_${width}.png`, out).pathname, fullPage: true });
    rows.push({ path, width, pass, errors, ...metrics });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${path} ${width} ${JSON.stringify(metrics)}`);
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(new URL('results.json', out), JSON.stringify(rows, null, 2));
}
process.exitCode = rows.length === pages.length * 2 && rows.every(row => row.pass) ? 0 : 1;
