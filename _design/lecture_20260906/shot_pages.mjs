import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const R = '/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/';
const browser = await chromium.launch();
for (const [tag, rel] of [['list','lectures.html'],['room','classroom.html'],['detail','lectures/korea-hum.html'],['common','lectures/common.html']]) for (const w of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 } });
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e).slice(0,120)));
  await pg.goto('file://' + R + rel, { waitUntil: 'load' });
  await pg.waitForTimeout(2500);
  await pg.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' });
  const h = await pg.evaluate(() => document.documentElement.scrollHeight);
  const sx = await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  const state = await pg.evaluate(() => (document.getElementById('crView')||{}).getAttribute ? document.getElementById('crView').getAttribute('data-state') : '');
  await pg.screenshot({ path: R + `_design/lecture_20260906/pg_${tag}_${w}.png`, fullPage: true });
  console.log(tag, w, 'h=' + h, 'scrollX=' + sx, state ? 'state=' + state : '', errs.length ? 'ERR ' + errs.join(' | ') : '');
  await ctx.close();
}
await browser.close();
