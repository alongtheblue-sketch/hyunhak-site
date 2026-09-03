import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const b = await chromium.launch({ channel: 'chrome' }); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage();
await pg.goto(process.argv[2] + 'programs/studio.html', { waitUntil: 'load' }); await pg.waitForTimeout(800);
await pg.evaluate(() => window.scrollTo(0, 1200)); await pg.waitForTimeout(400);
await pg.screenshot({ path: '/Users/gregory/Workspace/hyunhak-site/_design/gs17_20260903/shots_s44/st_buybar_390.png' });
const deco = await pg.evaluate(() => getComputedStyle(document.querySelector('.buybar .nm')).textDecorationColor); console.log('nm deco', deco);
await b.close();
