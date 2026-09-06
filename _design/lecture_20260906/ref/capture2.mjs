import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' });
const pg = await ctx.newPage();
await pg.goto('https://www.megastudy.net/teacher_v2/teacher_main.asp', { waitUntil: 'domcontentloaded', timeout: 45000 });
await pg.waitForTimeout(3000);
const tlinks = await pg.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => [(a.innerText||'').trim().replace(/\s+/g,' '), a.href]).filter(([t,h]) => /tcc|tec_cd|teacher_v2\/(tcc|main|teacher_)/.test(h) && t.length>1 && t.length<20).slice(0, 12));
console.log('teacher links', JSON.stringify(tlinks));
let detail = null;
const cand = tlinks.find(([t,h]) => /tec_cd|tcc/.test(h));
if (cand) {
  await pg.goto(cand[1], { waitUntil: 'domcontentloaded', timeout: 45000 }); await pg.waitForTimeout(3000);
  const ll = await pg.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => [(a.innerText||'').trim().replace(/\s+/g,' '), a.href]).filter(([t,h]) => /개설 강좌|강좌|lecture|lec_cd|chr_cd/.test(t + h) && t.length < 24).slice(0, 15));
  console.log('teacher page', pg.url(), JSON.stringify(ll));
  const h1 = await pg.evaluate(() => document.documentElement.scrollHeight);
  await pg.screenshot({ path: 'mega_teacher_page.png', clip: { x: 0, y: 0, width: 1440, height: Math.min(h1, 5000) } });
  const lec = ll.find(([t,h]) => /개설 강좌|강좌/.test(t) && /megastudy/.test(h));
  if (lec) { await pg.goto(lec[1], { waitUntil: 'domcontentloaded', timeout: 45000 }); await pg.waitForTimeout(3500); const h2 = await pg.evaluate(() => document.documentElement.scrollHeight); await pg.screenshot({ path: 'mega_lecture_list.png', clip: { x: 0, y: 0, width: 1440, height: Math.min(h2, 5000) } }); console.log('lecture list', pg.url(), h2);
    const dl = await pg.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => [(a.innerText||'').trim().replace(/\s+/g,' '), a.href]).filter(([t,h]) => /lec_cd|chr_cd|detail|lecture/i.test(h) && t.length>3 && t.length<40).slice(0, 8));
    console.log('detail links', JSON.stringify(dl));
    if (dl[0]) { await pg.goto(dl[0][1], { waitUntil: 'domcontentloaded', timeout: 45000 }); await pg.waitForTimeout(3500); const h3 = await pg.evaluate(() => document.documentElement.scrollHeight); await pg.screenshot({ path: 'mega_lecture_detail.png', clip: { x: 0, y: 0, width: 1440, height: Math.min(h3, 6000) } }); console.log('detail', pg.url(), h3); }
  }
}
await browser.close();
