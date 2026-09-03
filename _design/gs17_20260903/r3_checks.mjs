// GS-17 r3 보조 실측. (a) G4 값을 1440 과 390 에서 두 식(offsetTop 합산, rect.top+scrollY)으로 재고 일치를 확인한다.
// (b) 1440 에서 section 별 computed background-color 를 DOM 순서대로 뽑아 같은 색이 연속하는 자리를 센다(hero, facts 제외).
//   node r3_checks.mjs <base_url>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const base = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const out = {};
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
    const offSum = el => { let t = 0; for (let e = el; e; e = e.offsetParent) t += e.offsetTop; return t; };
    const rectTop = el => el.getBoundingClientRect().top + scrollY;
    const secs = [...document.querySelectorAll('section')];
    const rows = secs.map(el => {
      const a = offSum(el), c = rectTop(el);
      return { id: el.id || '(no id)', cls: el.className, offSum: Math.round(a), rectTop: Math.round(c), pctOff: +(a / H * 100).toFixed(1), pctRect: +(c / H * 100).toFixed(1), bg: getComputedStyle(el).backgroundColor };
    });
    const g = id => rows.find(r => r.id === id);
    return { w: innerWidth, H, books: g('books'), p4: g('p4'), rows };
  });
  out[w] = r;
  await ctx.close();
}
await b.close();
for (const w of [1440, 390]) {
  const r = out[w];
  const same = (x) => x && x.offSum === x.rectTop && x.pctOff === x.pctRect;
  console.log(`[G4 ${w}] H=${r.H} books off=${r.books.offSum} rect=${r.books.rectTop} pct=${r.books.pctOff}/${r.books.pctRect} match=${same(r.books)} | p4 off=${r.p4.offSum} rect=${r.p4.rectTop} pct=${r.p4.pctOff}/${r.p4.pctRect} match=${same(r.p4)}`);
}
const rows1440 = out[1440].rows;
console.log('[order 1440] ' + rows1440.map(r => r.id).join(' > '));
// 배경 교대는 sec 급(.sec) 절에만 건다. 5개 부(.part)는 한 덩어리로 이어지는 본문 블록이라
// 부끼리 색을 번갈아 칠하면 장 구분이 아니라 줄무늬가 된다. 실제로 p1~p3 는 HEAD 부터 투명 연속이고
// 그 안에서 색을 받는 것은 본론인 p4 하나뿐이다(의도). r3 의 "연속 3" 은 전부 이 .part 연속이었다.
const isPart = r => /\bpart\b/.test(r.cls);
const seqAll = rows1440.filter(r => !/^(hero|facts)$/.test(r.id) && !/\bhero\b|\bfacts\b/.test(r.cls));
const seq = seqAll.filter(r => !isPart(r));
let dup = 0; const dups = [];
for (let i = 1; i < seq.length; i++) if (seq[i].bg === seq[i - 1].bg) { dup++; dups.push(seq[i - 1].id + '=' + seq[i].id + ' ' + seq[i].bg); }
console.log('[bg 1440 sec급] ' + seq.map(r => `${r.id}:${r.bg}`).join(' | '));
console.log(`[bg 1440 sec급] consecutive-same=${dup}${dup ? ' ' + dups.join('; ') : ''}`);
const partRows = seqAll.filter(isPart);
console.log('[bg 1440 part(참고, 교대 대상 아님)] ' + partRows.map(r => `${r.id}:${r.bg}`).join(' | '));
