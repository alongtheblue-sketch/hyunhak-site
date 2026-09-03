import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const targets = process.argv.slice(2);
const browser = await chromium.launch();
for (const t of targets) {
  for (const w of [1440, 1200, 1024, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    await page.goto(t, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html{scroll-behavior:auto!important} .rv{opacity:1!important;transform:none!important}' });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const aeo = document.querySelector('.aeo-answer');
      const cs = aeo ? getComputedStyle(aeo) : null;
      const ar = aeo ? aeo.getBoundingClientRect() : null;
      const wrap = document.querySelector('.hero .wrap'); const wr = wrap ? wrap.getBoundingClientRect() : null;
      const units = Array.from(document.querySelectorAll('.unit'));
      const ov = units.map((u, i) => { const ur = u.getBoundingClientRect(); const s = u.querySelector('.won small'); const sr = s ? s.getBoundingClientRect() : null; const won = u.querySelector('.won'); const wr2 = won ? won.getBoundingClientRect() : null; return { i, cardR: Math.round(ur.right), wonR: wr2 ? Math.round(wr2.right) : null, smallR: sr ? Math.round(sr.right) : null, over: sr ? Math.round(sr.right - ur.right) : null }; });
      const prices = Array.from(document.querySelectorAll('.price li, .plan')).map((u, i) => { const ur = u.getBoundingClientRect(); const s = u.querySelector('.won small'); const sr = s ? s.getBoundingClientRect() : null; return { i, over: sr ? Math.round(sr.right - ur.right) : null }; });
      return { aeo: aeo ? { x: Math.round(ar.x), y: Math.round(ar.y), w: Math.round(ar.width), h: Math.round(ar.height), fs: cs.fontSize, color: cs.color, display: cs.display, parent: aeo.parentElement.tagName + '.' + aeo.parentElement.className } : null, heroWrapX: wr ? Math.round(wr.x) : null, units: ov, prices };
    });
    console.log(w, t.split('/').pop(), JSON.stringify(r));
    await page.close();
  }
}
await browser.close();
