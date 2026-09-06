import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const targets = [
  ['mega_lecsearch', 'https://www.megastudy.net/lecbookSearch/main.asp'],
  ['mega_curriculum', 'https://www.megastudy.net/teacher_v2/curriculum/main.asp'],
  ['mega_teacher', 'https://www.megastudy.net/teacher_v2/teacher_main.asp'],
  ['mimac_newlec', 'https://www.mimacstudy.com/ex/prod/2022/newLec/532662_indexfull.ds?CTR=698&tabType=h3'],
  ['mimac_teacher', 'https://www.mimacstudy.com/common/getMenuContainer.ds?requestMenuId=MNMN_M004'],
];
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' });
const found = {};
for (const [tag, url] of targets) {
  const pg = await ctx.newPage();
  try {
    const r = await pg.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await pg.waitForTimeout(4000);
    const h = await pg.evaluate(() => document.documentElement.scrollHeight);
    await pg.screenshot({ path: `${tag}.png`, fullPage: h < 6000, clip: h >= 6000 ? { x: 0, y: 0, width: 1440, height: 6000 } : undefined });
    const links = await pg.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => [(a.innerText||'').trim().replace(/\s+/g,' '), a.href]).filter(([t,h]) => /강좌|커리큘럼|맛보기|OT|무료|자료/.test(t) && t.length < 30 && /^https?:/.test(h)).slice(0, 25));
    found[tag] = links;
    console.log(tag, r && r.status(), pg.url(), 'h=' + h);
  } catch (e) { console.log(tag, 'ERR', String(e).slice(0, 160)); }
  await pg.close();
}
console.log(JSON.stringify(found, null, 1).slice(0, 5000));
await browser.close();
