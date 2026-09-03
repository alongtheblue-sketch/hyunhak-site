// GS-17 G4 결함주입 대조군. 새 판정식(g4_rule.mjs)이 옳은 배치만 통과시키는지 양방향으로 확인한다.
//   팔 1 (as-is, r3)      : #p5 뒤 #diff 앞          → PASS 여야 한다(성공해야 하는 대조 팔)
//   팔 2 (HEAD 재현)      : #format 뒤 #faq 앞        → FAIL. HEAD 82acc5a 의 자리, 원 지적의 대상
//   팔 3 (r2 재현)        : #p3 뒤 #p4 앞             → FAIL. 백분율 축(50.4 ≤ 72)으로는 통과하므로 구조 술어만이 가른다
// 살아 있는 지면을 DOM 에서 옮겨 재판정한다(빌드 3벌 대신). 판정식은 gate 와 같은 모듈에서 주입한다.
//   node g4_controls.mjs <base_url>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
import { g4Eval, g4One, G4_TARGET } from './g4_rule.mjs';
const base = process.argv[2];
const ARMS = [
  { id: 'as-is(r3)', move: null, expect: true },
  { id: 'HEAD 재현(#faq 앞)', move: 'faq', expect: false },
  { id: 'r2 재현(#p4 앞)', move: 'p4', expect: false },
];
const b = await chromium.launch({ channel: 'chrome' });
const res = [];
for (const w of [1440, 390]) {
  for (const arm of ARMS) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    await pg.goto(base + 'programs/guidebook.html', { waitUntil: 'load', timeout: 30000 });
    await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
    await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))]));
    if (arm.move) {
      const moved = await pg.evaluate(target => {
        const bk = document.querySelector('#books'), tg = document.querySelector('#' + target);
        if (!bk || !tg) return false;
        tg.parentNode.insertBefore(bk, tg);
        return document.querySelector('#books').nextElementSibling.id === target;
      }, arm.move);
      if (!moved) { res.push({ w, arm: arm.id, err: '주입 실패' }); await ctx.close(); continue; }
    }
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
    await pg.waitForTimeout(600);
    const o = await pg.evaluate(g4Eval);
    const v = g4One(o);
    res.push({ w, arm: arm.id, expect: arm.expect, pass: v.pass, ok: v.pass === arm.expect, booksPct: o.books?.pct, p4Pct: o.p4?.pct, prev: o.books?.prevId, next: o.books?.nextId, why: v.why });
    await ctx.close();
  }
}
await b.close();
console.log('target = ' + G4_TARGET);
for (const r of res) console.log(`[${r.w}] ${r.arm.padEnd(20)} 기대=${r.expect} 실측=${r.pass} ${r.ok ? 'OK' : '!! 대조군 실패'} | books ${r.prev}<#books<${r.next} ${r.booksPct}% p4 ${r.p4Pct}%${r.why?.length ? ' | ' + r.why.join(' ; ') : ''}`);
const bad = res.filter(r => !r.ok);
console.log(bad.length ? `대조군 ${bad.length}건 실패` : `대조군 ${res.length}/${res.length} 전건 기대대로`);
process.exit(bad.length ? 1 : 0);
