// 로컬 정적 서버(127.0.0.1:8788)의 사이트 면 4종을 1440/390 에서 실측. overflow, 이미지 로드, 44px 미만 탭, 이용권 카드 3장 배치.
// node measure_site.mjs <outdir>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const outdir = process.argv[2] || 'shots_site'; fs.mkdirSync(outdir, { recursive: true });
const BASE = 'http://127.0.0.1:8788/';
const PAGES = ['index.html', 'studio.html', 'programs/studio.html', 'programs/guidebook.html'];
const browser = await chromium.launch();
const report = {};
for (const p of PAGES) {
  report[p] = {};
  for (const w of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    page.on('dialog', (d) => d.dismiss());
    await page.goto(BASE + p, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} .rv{opacity:1!important;transform:none!important}' });
    await page.evaluate(() => { document.querySelectorAll('img[loading=lazy]').forEach((i) => i.removeAttribute('loading')); });
    const H0 = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H0; y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(40); }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const doc = document.documentElement; const vw = window.innerWidth;
      const over = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (r.right > vw + 1 && r.width > 0) over.push({ tag: el.tagName, cls: String(el.className).slice(0, 40), right: Math.round(r.right) });
      }
      const small = [];
      for (const a of document.querySelectorAll('a,button,summary')) { const r = a.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && r.height < 44) small.push({ t: (a.textContent || '').trim().slice(0, 16), h: Math.round(r.height) }); }
      const imgs = Array.from(document.images); const ok = imgs.filter((i) => i.complete && i.naturalWidth > 0).length;
      const plans = Array.from(document.querySelectorAll('.plans .plan')).map((e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), w: Math.round(r.width), y: Math.round(r.top + scrollY) }; });
      const price = Array.from(document.querySelectorAll('.price li, .plan .price')).slice(0, 8).map((e) => (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40));
      const text = document.body.innerText;
      return { vw, scrollWidth: doc.scrollWidth, H: doc.scrollHeight, imgs: imgs.length, imgLoaded: ok, overflowN: over.length, overflow: over.slice(0, 8),
        smallN: small.length, small: small.slice(0, 8), plans, price, has396: /396,000/.test(text), n495: (text.match(/495,000/g) || []).length, n220: (text.match(/220,000/g) || []).length,
        skip: !!document.querySelector('a.skip'), lectureBtn: !!document.querySelector('[data-cart-sku="lecture-common"]') };
    });
    report[p][w] = m;
    const tag = p.replace(/[\/.]/g, '_');
    await page.screenshot({ path: `${outdir}/${tag}_${w}_fold.png`, fullPage: false });
    const sec = await page.$('#plans, .price, .sample');
    if (sec) await sec.screenshot({ path: `${outdir}/${tag}_${w}_sec.png` }).catch(() => {});
    await page.close();
  }
}
await browser.close();
fs.writeFileSync(`${outdir}/measure_site.json`, JSON.stringify(report, null, 1));
for (const [p, r] of Object.entries(report)) for (const [w, m] of Object.entries(r))
  console.log(p, w, 'overflow', m.overflowN, 'imgs', m.imgLoaded + '/' + m.imgs, 'small', m.smallN, 'plans', JSON.stringify(m.plans), '396?', m.has396, '495x', m.n495, '220x', m.n220, 'skip', m.skip, 'lecBtn', m.lectureBtn);
