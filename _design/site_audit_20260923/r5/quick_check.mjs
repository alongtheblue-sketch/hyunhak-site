// s8 critic 4차 P1(하단바 ←/→) + P2 수리 직후 빠른 자기 점검. 실제 마우스 클릭, 터치 탭, 키보드 Enter 로 넘김 확인.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const B = "http://localhost:8092/";
const b = await chromium.launch({ channel: "chrome", headless: true });
const st = (p) => p.evaluate(() => { const btn = document.querySelector("[data-ppop-pause]"); return { cur: document.querySelector("[data-ppop-cur]")?.textContent, btn: btn && [btn.textContent, btn.getAttribute("aria-label"), btn.getAttribute("aria-pressed")] }; });
const out = {};
for (const [name, w, h, opt, how] of [["click1440", 1440, 900, {}, "click"], ["tap390", 390, 844, { hasTouch: true, isMobile: true }, "tap"], ["enter1440", 1440, 900, {}, "enter"], ["side1440", 1440, 900, {}, "side"], ["reduce390", 390, 844, { reducedMotion: "reduce" }, "click"]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...opt }); const p = await ctx.newPage();
  await p.goto(B + "index.html", { waitUntil: "networkidle" }); await p.waitForTimeout(700);
  const s0 = await st(p);
  const next = p.locator("[data-ppop-next]"), prev = p.locator("[data-ppop-prev]");
  if (how === "click") { await next.click(); }
  else if (how === "tap") { await next.tap(); }
  else if (how === "enter") { await next.focus(); await p.keyboard.press("Enter"); }
  else if (how === "side") { await p.locator(".pslot[data-side]").first().click({ position: { x: 60, y: 60 } }); }
  await p.waitForTimeout(300);
  const s1 = await st(p);
  if (how === "click" || how === "tap") { if (how === "tap") await prev.tap(); else await prev.click(); await p.waitForTimeout(300); }
  const s2 = await st(p);
  const pop = await p.evaluate(() => { const on = document.querySelector(".pslot[data-on] .pop"), side = document.querySelector(".pslot[data-side] .pop"); return { onBB: on && getComputedStyle(on).borderBottomWidth, sideR: side && getComputedStyle(side).borderRadius, pfrT: getComputedStyle(document.querySelector(".pfr")).transitionDuration }; });
  out[name] = { s0, s1, s2, pop };
  if (name === "click1440") await p.screenshot({ path: "shots/popup_after_next_1440.png" });
  await ctx.close();
}
for (const pg of ["index", "join", "login", "cart"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage();
  await p.goto(B + pg + ".html", { waitUntil: "networkidle" }); await p.waitForTimeout(400); await p.keyboard.press("Escape");
  out["footer_" + pg] = await p.evaluate(() => [...document.querySelectorAll("footer .ft-legal a")].filter((a) => a.textContent === "결제").map((a) => { const r = a.getBoundingClientRect(); const g = document.createRange(); g.selectNodeContents(a); const t = g.getBoundingClientRect(); return [+(t.left - r.left).toFixed(1), +(r.right - t.right).toFixed(1)]; }));
  await ctx.close();
}
{
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.goto(B + "index.html", { waitUntil: "networkidle" }); await p.waitForTimeout(500); await p.keyboard.press("Escape");
  await p.fill("#q2", "없는대학"); await p.waitForTimeout(300);
  out.empty = await p.evaluate(() => { const e = document.querySelector("#tiles .empty"); const cs = getComputedStyle(e); return { border: cs.borderTopWidth + " " + cs.borderTopStyle, w: e.getBoundingClientRect().width, tw: document.querySelector("#tiles").getBoundingClientRect().width }; });
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 0).replace(/\},"/g, '},\n"'));
