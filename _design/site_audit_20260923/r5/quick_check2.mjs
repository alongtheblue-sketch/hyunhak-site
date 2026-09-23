// s8 critic 5차 P2(Codex P1) 터치 재개 수리 점검: 390 터치 정지→재생 뒤 자동 넘김 재개, 1440 마우스 호버 멈춤 유지, 넘김 회귀.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const B = "http://localhost:8092/index.html";
const b = await chromium.launch({ channel: "chrome", headless: true });
const cur = (p) => p.evaluate(() => document.querySelector("[data-ppop-cur]")?.textContent);
const lab = (p) => p.evaluate(() => document.querySelector("[data-ppop-pause]")?.getAttribute("aria-label"));
const out = {};
{ // 390 터치: 정지 탭 → 재생 탭 → 9.5초 안에 넘어가야
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const pb = p.locator("[data-ppop-pause]");
  await pb.tap(); await p.waitForTimeout(200); const a = [await cur(p), await lab(p)];
  await pb.tap(); await p.waitForTimeout(200); const b1 = [await cur(p), await lab(p)];
  await p.waitForTimeout(9300); const c = [await cur(p), await lab(p)];
  out.touchResume390 = { afterPause: a, afterResume: b1, after9_5s: c };
  // 넘김 탭 → 재생 탭 → 재개
  await p.locator("[data-ppop-next]").tap(); await p.waitForTimeout(200); const d = [await cur(p), await lab(p)];
  await pb.tap(); await p.waitForTimeout(9300); const e = [await cur(p), await lab(p)];
  out.tapNextThenPlay390 = { afterNext: d, afterPlay9_3s: e };
  await ctx.close();
}
{ // 1440 마우스: 무대 위에 올려두면 9.5초 고정, 딤으로 빼면 8초 안에 넘김
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(300);
  const box = await p.locator(".pslot[data-on] .pop").boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + 40); const s0 = await cur(p);
  await p.waitForTimeout(9500); const s1 = await cur(p);
  await p.mouse.move(5, 5); await p.waitForTimeout(8600); const s2 = await cur(p);
  out.hover1440 = { start: s0, afterHover9_5s: s1, afterLeave8_6s: s2, label: await lab(p) };
  // 넘김 회귀
  await p.locator("[data-ppop-next]").click(); await p.waitForTimeout(300); const n1 = await cur(p);
  await p.locator("[data-ppop-prev]").click(); await p.waitForTimeout(300); const n2 = await cur(p);
  out.nav1440 = { afterNextFromCur: [s2, n1], afterPrev: n2 };
  await ctx.close();
}
{ // 390 탭 넘김 회귀 + :hover 잔류
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(300);
  const c0 = await cur(p); await p.locator("[data-ppop-next]").tap(); await p.waitForTimeout(300); const c1 = await cur(p);
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector("[data-ppop-next]")).backgroundColor);
  out.tap390 = { from: c0, to: c1, nextBgAfterTap: bg };
  await ctx.close();
}
{ // 하단바 position 과 그림자 띠
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(300);
  out.pbar = await p.evaluate(() => { const bar = document.querySelector(".pbar"); return { position: getComputedStyle(bar).position, inActiveSlot: !!bar.closest(".pslot[data-on]") }; });
  await ctx.close();
}
const t = setTimeout(() => process.exit(0), 5000); await b.close(); clearTimeout(t);
console.log(JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'));
