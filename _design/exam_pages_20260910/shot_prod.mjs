// 실데이터 8면(빌더 산출, 셸 미부착) 1280/390 스크린샷 + 반응형 실측 (2026-09-10 메인 세션. critic 입력용)
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const OUT = '/Users/gregory/Workspace/hyunhak-site/_design/exam_pages_20260910';
const BASE = 'http://127.0.0.1:8911/interview';
const FILES = process.argv.slice(2).length ? process.argv.slice(2) : ['korea-hum','korea-eq-hum','yonsei-mirae','yonsei-intl'];
const b = await chromium.launch();
const rows = [];
for (const code of FILES) for (const w of [1280, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await pg.goto(`${BASE}/${code}.html`, { waitUntil: 'load', timeout: 60000 });
  await pg.waitForTimeout(1500);
  const m = await pg.evaluate((vw) => {
    const de = document.documentElement;
    const ox = de.scrollWidth - de.clientWidth;
    const over = [];
    const inScroller = (el) => { let n = el.parentElement; while (n && n !== document.body) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; n = n.parentElement; } return false; };
    document.querySelectorAll('main *').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.right > vw + 1 && !inScroller(el)) over.push(((el.className && String(el.className).slice(0,30)) || el.tagName) + ' r' + Math.round(r.right)); });
    const tableOver = []; document.querySelectorAll('td,th,dd,dt').forEach(el => { const r = el.getBoundingClientRect(); if (r.right > vw + 1) tableOver.push(((el.className && String(el.className).slice(0,20)) || el.tagName) + ' r' + Math.round(r.right)); });
    const small = [];
    document.querySelectorAll('a,button,summary').forEach(el => { const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.height < 44) small.push((el.textContent || '').trim().slice(0, 14) + ' h' + Math.round(r.height)); });
    const ph = document.querySelectorAll('.ph').length;
    const banned = { mid: (document.body.innerText.match(/·/g) || []).length, dash: (document.body.innerText.match(/—/g) || []).length };
    const liMax = Math.max(0, ...[...document.querySelectorAll('.xrules li, .xlock li, .xsteps li')].map(el => el.getBoundingClientRect().height));
    const rowZero = [...document.querySelectorAll('.xtime .row')].filter(el => el.getBoundingClientRect().width < 50).length;
    const absOut = [...document.querySelectorAll('main *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom < 0; }).length;
    return { ox, liMax: Math.round(liMax), rowZero, absOut, docH: de.scrollHeight, over: over.slice(0, 8), overN: over.length, cellOver: tableOver.length, small: small.slice(0, 8), smallN: small.length, ph, banned };
  }, w);
  await pg.screenshot({ path: `${OUT}/prod_${code}_${w}.png`, fullPage: true });
  rows.push({ code, vw: w, err: errs.length, ...m });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(rows, null, 0));
