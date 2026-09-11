// IA2 브라우저 인수 검증 (메타 층). shot_ia1.mjs 복제, 대상에 my.html 추가 + 출력 폴더·대상 필터 env.
// 별도 터미널: python3 -m http.server 8912 --bind 127.0.0.1
//   IA2_BASE  기본 http://127.0.0.1:8912
//   IA2_OUT   기본 ./shots/ (g 대안 캡처는 ./shots_g2/ 처럼 갈라 쓴다)
//   IA2_ONLY  쉼표 목록. 경로에 이 문자열이 들어간 면만 찍는다
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const base = process.env.IA2_BASE || 'http://127.0.0.1:8912';
const out = new URL(process.env.IA2_OUT || './shots/', import.meta.url);
await mkdir(out, { recursive: true });
const codeSource = await readFile(new URL('../../_tools/exam_pages/codes.py', import.meta.url), 'utf8');
const codes = [...codeSource.matchAll(/^\s*\("([a-z-]+)",/gm)].map(m => m[1]);
if (codes.length !== 8) throw new Error(`Expected 8 codes, got ${codes.length}`);
let pages = ['programs/studio.html#units', 'studio.html#units', 'my.html', ...codes.map(c => `interview/${c}.html`)];
if (process.env.IA2_ONLY) {
  const want = process.env.IA2_ONLY.split(',');
  pages = pages.filter(p => want.some(w => p.includes(w)));
}
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
    await page.waitForTimeout(1200);   // 해설 강의 상태 조회(실패 포함) 정착 대기. IA2 h 의 면 1회 안내가 열리는 자리
    const metrics = await page.evaluate(({ width, isCard }) => {
      const visible = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const rect = el => el.getBoundingClientRect();
      const insideScroller = el => {
        for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
          if (/auto|scroll/.test(getComputedStyle(n).overflowX)) return true;
        }
        return false;
      };
      const scope = document.querySelector(isCard ? '#units' : 'main') || document.body;
      const over = [...scope.querySelectorAll('*')].filter(el => visible(el) && (rect(el).right > width + 1 || rect(el).left < -1) && !insideScroller(el)).map(el => el.className || el.tagName);
      const cards = [...scope.querySelectorAll('.unit')].map(el => {
        const r = rect(el), heading = el.querySelector('h3'), style = getComputedStyle(heading);
        const actions = [...el.querySelectorAll('.foot a,.foot button')];
        const tooSmall = actions.filter(a => rect(a).height < parseFloat(getComputedStyle(a).getPropertyValue('--tap')) - 1).length;
        const collision = [...el.querySelectorAll('*')].filter(child => visible(child) && (rect(child).right > r.right + 1 || rect(child).left < r.left - 1)).length;
        const shortGap = actions.some((a, i) => i && Math.abs(rect(a).top - rect(actions[i - 1]).top) < 1 && rect(a).left - rect(actions[i - 1]).right < parseFloat(getComputedStyle(a).getPropertyValue('--s3')) - 1);
        const price = el.querySelector('.r3-unit-commerce .price'), lec = el.querySelector('.r3-unit-commerce .lec');
        return { code: el.dataset.r3Unit, x: r.x, y: r.y, width: r.width, height: r.height,
          titleLines: Math.round(rect(heading).height / parseFloat(style.lineHeight)), tooSmall, collision, shortGap,
          // IA2 h: 가격 행과 해설 강의 줄이 갈라졌는가 (같은 줄이면 sameRow true)
          priceLecSameRow: !!(price && lec && !lec.hidden) && Math.abs(rect(price).top - rect(lec).top) < 4,
          actions: actions.map(a => a.textContent.trim()) };
      });
      const columns = isCard ? getComputedStyle(scope.querySelector('.units')).gridTemplateColumns.split(' ').length : null;
      const pairHeightMismatch = width >= 760 && cards.some((card, i) => i % 2 === 1 && Math.abs(card.height - cards[i - 1].height) > 1);
      const lecNote = document.getElementById('lecNote');
      return { over, cards, columns, pairHeightMismatch, lecNoteShown: lecNote ? !lecNote.hidden : null,
        lecRepeat: [...document.querySelectorAll('.r3-unit-commerce .lec')].filter(p => !p.hidden).length,
        docOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    }, { width, isCard });
    const pass = !errors.length && !metrics.over.length && metrics.docOverflow <= 1 && !metrics.pairHeightMismatch
      && !metrics.cards.some(c => c.priceLecSameRow)
      && (!isCard || (metrics.columns === (width >= 760 ? 2 : 1) && metrics.cards.every(c => !c.tooSmall && !c.collision && !c.shortGap && (width !== 1280 || c.titleLines === 1))));
    const name = path.replace(/[\/#?=]/g, '_');
    await page.screenshot({ path: new URL(`${name}_${width}.png`, out).pathname, fullPage: true });
    rows.push({ path, width, pass, errors, ...metrics });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${path} ${width} over=${metrics.over.length} docOverflow=${metrics.docOverflow} titleLines=${[...new Set(metrics.cards.map(c => c.titleLines))].join('/')} lecNote=${metrics.lecNoteShown} lecRepeat=${metrics.lecRepeat}`);
    await page.close();
  }
} finally {
  await browser.close();
  await writeFile(new URL('results.json', out), JSON.stringify(rows, null, 2));
}
process.exitCode = rows.every(row => row.pass) ? 0 : 1;
