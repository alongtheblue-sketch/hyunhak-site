import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const b = await chromium.launch();
for (const path of ['programs/studio.html', 'studio.html']) {
  const pg = await b.newPage({ viewport: { width: +(process.env.W||1280), height: 900 } });
  await pg.goto('http://127.0.0.1:8912/' + path, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => {
    const wrap = document.querySelector('#units'); const wr = wrap.getBoundingClientRect();
    const main = document.querySelector('main .wrap, main .container, main') ; const mr = main.getBoundingClientRect();
    const cards = [...wrap.querySelectorAll('.unit')].slice(0, 4).map((c, i) => {
      const cr = c.getBoundingClientRect(); let maxR = -1, who = '', minL = 9999;
      c.querySelectorAll('*').forEach(el => { const er = el.getBoundingClientRect(); if (er.width > 0) { if (er.right > maxR) { maxR = er.right; who = (el.className || el.tagName) + ':' + el.textContent.trim().slice(0, 8); } minL = Math.min(minL, er.left); } });
      return { i, cardL: +cr.left.toFixed(1), cardR: +cr.right.toFixed(1), childMinL: +minL.toFixed(1), childMaxR: +maxR.toFixed(1), who, padL: getComputedStyle(c).paddingLeft, padR: getComputedStyle(c).paddingRight };
    });
    return { wrapL: +wr.left.toFixed(1), wrapR: +wr.right.toFixed(1), mainR: +mr.right.toFixed(1), cards };
  });
  console.log(path, JSON.stringify(r));
  await pg.close();
}
await b.close();
