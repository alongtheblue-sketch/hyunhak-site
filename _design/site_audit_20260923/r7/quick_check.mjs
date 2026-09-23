// s9 r7 (r6 사본, 8093 워크트리 서빙). 하단바 margin-top -1 이라 barTop = popBottom - 1 이 기대값. s8 r6 하단바 고정 + 첫 초점 수리 직후 자기 점검: → 위치가 카드마다 같은지, 같은 좌표 연타(100~250ms)가 딤/체크에 안 맞는지, 터치 재개, 첫 초점, 넘김 회귀.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const B = "http://localhost:8093/index.html";
const b = await chromium.launch({ channel: "chrome", headless: true });
const cur = (p) => p.evaluate(() => document.querySelector("[data-ppop-cur]")?.textContent);
const out = {};
for (const [w, h, opt] of [[1440, 900, {}], [390, 844, { hasTouch: true, isMobile: true }], [1440, 700, {}]]) {
  const key = `${w}x${h}`;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opt }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const r = {};
  r.initialFocus = await p.evaluate(() => { const a = document.activeElement; return a.className || a.tagName; });
  const nb = async () => { const x = await p.locator("[data-ppop-next]").boundingBox(); return [Math.round(x.x * 10) / 10, Math.round(x.y * 10) / 10]; };
  const pos = [await nb()];
  const bar = async () => p.evaluate(() => { const bb = document.querySelector(".pbar").getBoundingClientRect(), pop = document.querySelector(".pslot[data-on] .pop").getBoundingClientRect(); return { barTop: +bb.top.toFixed(1), popBottom: +pop.bottom.toFixed(1), barW: +bb.width.toFixed(1), popW: +pop.width.toFixed(1), inView: bb.bottom <= innerHeight }; });
  r.bar0 = await bar();
  await p.locator("[data-ppop-next]").click(); await p.waitForTimeout(700); pos.push(await nb()); r.bar1 = await bar();
  await p.locator("[data-ppop-next]").click(); await p.waitForTimeout(700); pos.push(await nb());
  r.nextPos = pos; r.curAfter2 = await cur(p);
  // 같은 좌표 연타
  const sweep = [];
  for (const gap of [100, 150, 250]) {
    const c0 = await cur(p); const [x, y] = await nb(); const bx = x + 20, by = y + 20;
    for (let k = 0; k < 3; k++) { await p.mouse.click(bx, by); await p.waitForTimeout(gap); }
    await p.waitForTimeout(600);
    const st = await p.evaluate(() => ({ open: !!document.querySelector(".pdim"), mute: !!document.querySelector("[data-ppop-mute-all]")?.checked, cur: document.querySelector("[data-ppop-cur]")?.textContent }));
    sweep.push({ gap, from: c0, ...st });
    if (!st.open) break;
  }
  r.sweep = sweep;
  if (w === 1440 && h === 900) await p.screenshot({ path: "shots/popup_pinned_1440.png" });
  if (w === 390) await p.screenshot({ path: "shots/popup_pinned_390.png" });
  out[key] = r;
  await ctx.close();
}
{ // 터치 재개 회귀
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(400);
  const pb = p.locator("[data-ppop-pause]"); await pb.tap(); await p.waitForTimeout(200); await pb.tap(); const c0 = await cur(p); await p.waitForTimeout(9300);
  out.touchResume = { from: c0, after9_3s: await cur(p) };
  await ctx.close();
}
{ // 자동 넘김 뒤 초점이 움직이지 않는지(첫 초점 = 대화상자 틀)
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  const log = [];
  await p.exposeFunction("_fi", (s) => log.push(s));
  await p.addInitScript(() => document.addEventListener("focusin", (e) => window._fi && window._fi((e.target.id || e.target.className || e.target.tagName) + "@" + Math.round(performance.now())), true));
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(9000); const c9 = await cur(p); await p.waitForTimeout(8500);
  out.autoFocus = { focusins: log, cur9s: c9, cur17_5s: await cur(p) };
  await ctx.close();
}
const t = setTimeout(() => process.exit(0), 5000); await b.close(); clearTimeout(t);
console.log(JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'));
