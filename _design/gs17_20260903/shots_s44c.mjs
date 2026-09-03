import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const base = process.argv[2]; const dir = '/Users/gregory/Workspace/hyunhak-site/_design/gs17_20260903/shots_s44/';
const b = await chromium.launch({ channel: 'chrome' });
async function shot(path, w, h, sel, name, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
  await pg.goto(base + path, { waitUntil: 'load' }); await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 6000))]));
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(400);
  if (sel) { const el = pg.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await pg.waitForTimeout(300); await el.screenshot({ path: dir + name }); }
  else { await pg.evaluate(y => window.scrollTo(0, y), opts.y || 0); await pg.waitForTimeout(300); await pg.screenshot({ path: dir + name }); }
  await ctx.close();
}
await shot('programs/studio.html', 1440, 900, '#p2', 'st_p2_1440_c.png');
await shot('programs/studio.html', 1440, 900, '#parts .rail', 'st_rail_1440_c.png');
await shot('programs/guidebook.html', 1440, 900, '#format', 'gb_format_1440_c.png');
await shot('programs/guidebook.html', 390, 844, null, 'gb_buybar_390_c.png', { y: 3000 });
await b.close(); console.log('shots done');
