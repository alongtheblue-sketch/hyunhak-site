import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const file = process.argv[2]; const browser = await chromium.launch();
for (const w of [390, 600, 724, 768, 810, 834, 880, 900, 960, 1000, 1024]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(/^https?:/.test(file) ? file : 'file://' + file, { waitUntil: 'load' });
  await page.addStyleTag({ content: '.rv{opacity:1!important;transform:none!important}' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => { const hero = document.querySelector('.hero').getBoundingClientRect(); const st = document.querySelector('.stage').getBoundingClientRect(); const out = {}; for (const s of document.querySelectorAll('.scr')) { const b = s.getBoundingClientRect(); out[s.className] = { bottom: Math.round(b.bottom), overHero: Math.round(b.bottom - hero.bottom), overStage: Math.round(b.bottom - st.bottom) }; } return { heroB: Math.round(hero.bottom), stageH: Math.round(st.height), stageOverflow: getComputedStyle(document.querySelector('.stage')).overflow, scr: out }; });
  console.log(w, JSON.stringify(r)); await page.close();
}
await browser.close();
