// 요소 단위 스크린샷. node shot_el.mjs <html 절대경로> <outdir> <selector1> [selector2 ...]
// 1440 과 390 두 폭에서 각 selector 의 첫 요소를 찍는다. 파일명 = <outdir>/<w>_<n>.png
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const [file, outdir, ...sels] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch();
for (const w of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
  await page.goto('file://' + file, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} .rv{opacity:1!important;transform:none!important}' });
  await page.evaluate(() => { document.querySelectorAll('img[loading=lazy]').forEach(i => i.removeAttribute('loading')); });
  await page.waitForFunction(() => Array.from(document.images).every(i => i.complete), null, { timeout: 30000 }).catch(() => {});
  for (const [i, sel] of sels.entries()) {
    const el = page.locator(sel).first();
    if (await el.count() === 0) { console.log('missing', sel); continue; }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    const box = await el.boundingBox();
    await el.screenshot({ path: `${outdir}/${w}_${i}.png` });
    console.log(w, sel, box && { w: Math.round(box.width), h: Math.round(box.height) });
  }
  await page.close();
}
await browser.close();
