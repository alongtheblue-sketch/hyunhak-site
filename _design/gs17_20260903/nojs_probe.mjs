// critic r3b P1 검증: 스크립트를 막은 채 지면이 보이는지 잰다.
// 팔 1 = 로컬 새 판(noscript 폴백 있음) → 비가시 0 이어야 한다.
// 팔 2 = 라이브 구판(폴백 없음) → 비가시 다수여야 한다(대조군. 고치기 전 세계가 실제로 깨져 있었다는 증거).
//   node nojs_probe.mjs <local_base> <live_base>
import { chromium } from '/Users/gregory/Workspace/iruri_6mo_thumb/node_modules/playwright/index.mjs';
const [localBase, liveBase] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const rows = [];
for (const [arm, base, pages] of [
  ['로컬 새 판', localBase, ['programs/studio.html', 'programs/guidebook.html']],
  ['라이브 구판', liveBase, ['programs/studio.html', 'programs/guidebook.html']],
]) {
  for (const p of pages) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0 Safari/537.36' });
    const pg = await ctx.newPage();
    let err = null;
    try { await pg.goto(base + p, { waitUntil: 'load', timeout: 30000 }); } catch (e) { err = String(e).slice(0, 80); }
    const r = err ? { err } : await pg.evaluate(() => {
      const all = [...document.querySelectorAll('.rv')];
      const hidden = all.filter(e => parseFloat(getComputedStyle(e).opacity) < 0.5);
      const key = ['#books', '#format', '#close', '#units', '#p5'].map(q => {
        const e = document.querySelector(q); if (!e) return null;
        const inside = [...e.querySelectorAll('.rv')];
        const h = inside.filter(x => parseFloat(getComputedStyle(x).opacity) < 0.5).length;
        return `${q} ${h}/${inside.length} 비가시`;
      }).filter(Boolean);
      return { rvTotal: all.length, rvHidden: hidden.length, key };
    });
    rows.push({ arm, p, ...r });
    await ctx.close();
  }
}
await b.close();
for (const r of rows) console.log(r.err ? `[${r.arm}] ${r.p} 오류 ${r.err}` : `[${r.arm}] ${r.p} .rv ${r.rvHidden}/${r.rvTotal} 비가시 | ${r.key.join(' , ')}`);
