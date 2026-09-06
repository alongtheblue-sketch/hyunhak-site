import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto('file:///Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/_design/lecture_20260906/ot_script.html', { waitUntil: 'networkidle' });
await pg.pdf({ path: '/Users/gregory/Workspace/_wt/hyunhak-site-lecture-20260906/assets/docs/lecture_ot_script.pdf', format: 'A4', preferCSSPageSize: true, printBackground: true });
await browser.close(); console.log('pdf ok');
