import { createRequire } from 'module'; const require = createRequire('/Users/gregory/Workspace/iruri_6mo_thumb/package.json');
const { chromium } = require('playwright'); const b = await chromium.launch();
for (const w of [430, 390, 375, 360, 320]) {
  const pg = await b.newPage({ viewport: { width: w, height: 844 } });
  await pg.goto('http://127.0.0.1:8813/lectures/yonsei-hum.html', { waitUntil: 'load' });
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}.rv{opacity:1!important}' });
  await pg.evaluate(() => window.scrollTo(0, 1500)); await pg.waitForTimeout(250);
  const r = await pg.evaluate(() => [...document.querySelectorAll('.anch a')].map(a => { const b = a.querySelector('b'); const rg = document.createRange(); rg.selectNodeContents(a); const tn = [...a.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()); const tr = tn.length ? (rg.selectNodeContents(tn[tn.length - 1]), rg.getBoundingClientRect()) : null; const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect(); return { a: [Math.round(ar.x), Math.round(ar.y), Math.round(ar.width), Math.round(ar.height)], b: [Math.round(br.x), Math.round(br.y), Math.round(br.width), Math.round(br.height)], t: tr ? [Math.round(tr.x), Math.round(tr.y), Math.round(tr.width), Math.round(tr.height)] : null, cs: getComputedStyle(a).display + '/' + getComputedStyle(a).flexShrink + '/' + getComputedStyle(a).whiteSpace, text: a.textContent.trim() }; }));
  const nav = await pg.evaluate(() => { const n = document.querySelector('.anch'); const r = n.getBoundingClientRect(); return { rect: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)], scrollW: n.scrollWidth, clientW: n.clientWidth }; });
  console.log(w, JSON.stringify(nav), JSON.stringify(r));
  if (w === 390) await pg.locator('.anch').screenshot({ path: '_design/lecture_20260906/anch_390.png' });
  await pg.close();
}
await b.close();
