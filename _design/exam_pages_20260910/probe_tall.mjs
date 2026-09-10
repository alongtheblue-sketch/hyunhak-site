import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await pg.goto('http://127.0.0.1:8911/interview/korea-hum.html', { waitUntil: 'load' }); await pg.waitForTimeout(1200);
const r = await pg.evaluate(() => {
  const out = {};
  for (const sel of ['.xrules li', '.xlock li', '.xsteps li', '.xtype', '.xtime .row', '.xpit>div', '.xplan .st', '.faq', '.xsib li']) {
    const els = [...document.querySelectorAll(sel)];
    out[sel] = els.map(e => Math.round(e.getBoundingClientRect().height));
  }
  const tall = [...document.querySelectorAll('main *')].map(e => ({ h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width), c: (e.className && String(e.className).slice(0, 24)) || e.tagName, t: (e.textContent || '').trim().slice(0, 30) })).filter(x => x.w < 400 && x.h > 300).slice(0, 6);
  const sec = {}; document.querySelectorAll('section.page').forEach(s => sec[s.id] = Math.round(s.getBoundingClientRect().height));
  return { out, tall, sec };
});
console.log(JSON.stringify(r)); await b.close();
