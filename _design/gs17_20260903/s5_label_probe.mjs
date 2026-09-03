// GS-17 r3b: 단계 화면 확대 라벨(.vis .zl)이 그림 상자 안에 들어앉는지 실측.
// 반박 r3 = 라벨이 p1 std_home 의 "21분 7분" 칸과 p5 std_report 의 "2 / 10" 점수를 덮는다(5장 중 2장).
// 상자 교차는 잉크 겹침의 상위 집합이라, 상자 교차 0 이면 잉크 겹침도 0 이다(수리 후 판정에 씀).
//   node s5_label_probe.mjs <base_url> <label>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const base = process.argv[2], label = process.argv[3] || 'x';
const b = await chromium.launch({ channel: 'chrome' });
const out = {};
for (const w of [1440, 390]) {
  const ctx = await b.newContext({ viewport: { width: w, height: w === 390 ? 844 : 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();
  await pg.goto(base + 'programs/studio.html', { waitUntil: 'load', timeout: 30000 });
  await pg.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await pg.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 8000))]));
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await pg.waitForTimeout(600);
  out[w] = await pg.evaluate(() => {
    const rows = [];
    for (const a of document.querySelectorAll('.vis .zoom')) {
      const zl = a.querySelector('.zl'), im = a.querySelector('.shot img, .shot .ph');
      if (!zl || !im) { rows.push({ sel: a.parentElement?.id || '?', err: 'zl 또는 img 없음' }); continue; }
      const z = zl.getBoundingClientRect(), i = im.getBoundingClientRect();
      const ox = Math.max(0, Math.min(z.right, i.right) - Math.max(z.left, i.left));
      const oy = Math.max(0, Math.min(z.bottom, i.bottom) - Math.max(z.top, i.top));
      rows.push({ sel: a.parentElement?.id || '?', zl: [Math.round(z.width), Math.round(z.height)], zlTop: Math.round(z.top + scrollY), imgBottom: Math.round(i.bottom + scrollY), overlapPx: Math.round(ox * oy), inside: ox * oy > 0, zlVisible: getComputedStyle(zl).opacity !== '0' && getComputedStyle(zl).display !== 'none' });
    }
    return { n: rows.length, overlapping: rows.filter(r => r.inside).length, rows };
  });
  await ctx.close();
}
await b.close();
for (const w of [1440, 390]) console.log(`[zl ${w}] shots=${out[w].n} 그림 상자와 겹치는 라벨=${out[w].overlapping}`);
console.log(JSON.stringify({ label, out }, null, 1));
