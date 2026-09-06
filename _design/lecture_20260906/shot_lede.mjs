import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
for (const w of [1280, 390, 900]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } }); const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:8813/index.html', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  await pg.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important} #ledeMore{display:block!important}' });
  const el = await pg.$('.lede2'); const box = await el.boundingBox();
  const lines = await pg.evaluate(() => [...document.querySelectorAll('.lede2 p')].map(p => { const r = document.createRange(); r.selectNodeContents(p); const rects = [...r.getClientRects()]; let lines = 0, last = -1e9; for (const x of rects.sort((a,b)=>a.top-b.top)) { if (x.top >= last - 1) lines++; last = Math.max(last, x.bottom); } return lines; }));
  await el.screenshot({ path: `/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_design/lecture_20260906/lede_${w}.png` });
  console.log(w, 'lede box', Math.round(box.width) + 'x' + Math.round(box.height), 'lines per p', lines.join(','), 'nb spans', await pg.evaluate(() => document.querySelectorAll('.lede2 .nb').length));
  await ctx.close();
}
await browser.close();
