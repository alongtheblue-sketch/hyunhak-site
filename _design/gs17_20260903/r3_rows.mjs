// GS-17 r3 보조: 가이드북 면 section 별 top, height, pct, padding 을 1440 과 390 에서 덤프한다.
//   node r3_rows.mjs <base_url>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const base = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(base + 'programs/guidebook.html', { waitUntil: 'load', timeout: 30000 });
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))]));
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(600);
  const r = await pg.evaluate(() => {
    const H = document.documentElement.scrollHeight;
    return { H, rows: [...document.querySelectorAll('section, footer')].map(el => { const cs = getComputedStyle(el); const rc = el.getBoundingClientRect(); return { id: el.id || el.tagName.toLowerCase(), top: Math.round(rc.top + scrollY), h: Math.round(rc.height), pct: +((rc.top + scrollY) / H * 100).toFixed(1), pt: cs.paddingTop, pb: cs.paddingBottom }; }) };
  });
  console.log(`[${w}] H=${r.H}`);
  for (const x of r.rows) console.log(`  ${x.id.padEnd(8)} top=${String(x.top).padStart(5)} h=${String(x.h).padStart(5)} pct=${x.pct} pad=${x.pt}/${x.pb}`);
  await ctx.close();
}
await b.close();
