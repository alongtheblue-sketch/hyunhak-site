import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
for (const k of ['A','B','C']) for (const w of [1280, 390]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto('file:///Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_design/lecture_20260906/sian/' + k + '.html', { waitUntil: 'load' });
  await pg.waitForTimeout(1500);
  const h = await pg.evaluate(() => document.documentElement.scrollHeight);
  const sx = await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  await pg.screenshot({ path: `/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_design/lecture_20260906/sian/${k}_${w}.png`, fullPage: true });
  console.log(k, w, 'h=' + h, 'scrollX=' + sx);
  await ctx.close();
}
await browser.close();
