import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const file = process.argv[2]; const outdir = process.argv[3] || 'shots';
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch();
const report = {};
for (const w of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} .rv{opacity:1!important;transform:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('img[loading=lazy]').forEach(i => { i.removeAttribute('loading'); }); });
  const H0 = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H0; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(60); }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => {
    const doc = document.documentElement; const vw = window.innerWidth;
    const over = [];
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (r.right > vw + 1 && r.width > 0) over.push({ tag: el.tagName, cls: el.className && el.className.baseVal === undefined ? String(el.className).slice(0, 40) : '', right: Math.round(r.right), w: Math.round(r.width) });
    }
    // nowrap 넘침 게이트 (2026-09-03 critic P1-1 후 신설): body overflow-x hidden 아래에서 scrollWidth 는 요소 내부 넘침을 못 본다.
    // white-space:nowrap(상속 포함) 요소의 우변이 가장 가까운 카드 조상(li, article, .card, .unit, .plan, .price>li) 우변을 넘으면 기록
    const nowrapOver = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (!/nowrap|pre$/.test(cs.whiteSpace)) continue;
      const host = el.closest('li,article,.card,.unit,.plan,.price>li'); if (!host || host === el) continue;
      const r = el.getBoundingClientRect(), hr = host.getBoundingClientRect();
      if (r.width > 0 && r.right > hr.right + 1) nowrapOver.push({ tag: el.tagName, cls: String(el.className).slice(0, 30), over: Math.round(r.right - hr.right), t: (el.textContent || '').trim().slice(0, 24) });
    }
    const y = (id) => { const e = document.getElementById(id); return e ? Math.round(e.getBoundingClientRect().top + window.scrollY) : null; };
    const H = doc.scrollHeight;
    const small = [];
    for (const a of document.querySelectorAll('a,button,summary')) { const r = a.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.height < 44) small.push({ t: (a.textContent || '').trim().slice(0, 20), h: Math.round(r.height) }); }
    const imgs = Array.from(document.images); const imgLoaded = imgs.filter(i => i.complete && i.naturalWidth > 0).length;
    return { vw, scrollWidth: doc.scrollWidth, H, imgs: imgs.length, imgLoaded, overflow: over.slice(0, 20), overflowN: over.length,
      climax: { p4: y('p4'), p4pct: Math.round(y('p4') / H * 1000) / 10, p4end: Math.round(y('p5') / H * 1000) / 10, trust: y('trust'), parts: y('parts'), diff: y('diff'), books: y('units') }, smallTap: small.slice(0, 12), smallN: small.length, nowrapOver: nowrapOver.slice(0, 12), nowrapOverN: nowrapOver.length };
  });
  report[w] = m;
  await page.screenshot({ path: `${outdir}/full_${w}.png`, fullPage: true });
  await page.screenshot({ path: `${outdir}/fold_${w}.png`, fullPage: false });
  await page.close();
}
await browser.close();
fs.writeFileSync(`${outdir}/measure.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
