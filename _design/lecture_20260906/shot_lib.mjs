import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
await pg.goto('file:///Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/library.html#lecdocs', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
const el = await pg.$('#lecdocs'); await el.screenshot({ path: '/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_design/lecture_20260906/pg_libdocs.png' });
console.log('ok'); await browser.close();
