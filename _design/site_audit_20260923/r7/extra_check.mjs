// r7 자기 점검 (s9): 반증 6차 P2 4종 수리 확인. 서빙 = 8093 워크트리.
//  short  짧은 화면 6종 × N=2 카드별: 하단바 전체 뷰포트 안(bottom ≤ innerHeight), 활성 카드 top ≥ 0, --pbar-h 값, 카드 max-height ≤ 뷰포트 - 2*16 - 하단바
//  wrap   N=4(의뢰 카드 복제 2장) 1920x1080, 1440x900: |d|≥2 슬롯 data-far + opacity 0, → 전이 중 감아 도는 슬롯 transition none, 어떤 측면 슬롯도 활성 카드 폭 안으로 들어오지 않음(전이 0/100/200/300ms)
//  keys   1440x420 N=2 첫 초점 .pdim 에서 ArrowDown/PageDown/Space 로 활성 카드 scrollTop 증가, ArrowUp 으로 감소. 초점은 .pdim 그대로
// 사용: node extra_check.mjs → r7/extra_check.json
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const HERE = path.dirname(new URL(import.meta.url).pathname);
const B = "http://localhost:8093/index.html";
const b = await chromium.launch({ channel: "chrome", headless: true });
const out = { short: [], wrap: [], keys: null };
const ONLY = process.argv[2] || "all";
const geo = () => {
  const bar = document.querySelector(".pbar"), on = document.querySelector(".pslot[data-on] .pop"), root = document.querySelector(".pdim");
  const bb = bar.getBoundingClientRect(), ob = on.getBoundingClientRect();
  return { cur: document.querySelector("[data-ppop-cur]")?.textContent, barTop: +bb.top.toFixed(1), barBottom: +bb.bottom.toFixed(1), barH: +bb.height.toFixed(1), onTop: +ob.top.toFixed(1), onBottom: +ob.bottom.toFixed(1), onH: +ob.height.toFixed(1),
    pbarVar: root.style.getPropertyValue("--pbar-h"), maxH: getComputedStyle(on).maxHeight, innerH: innerHeight, innerW: innerWidth, scrollable: on.scrollHeight > on.clientHeight, joint: +(ob.bottom - bb.top).toFixed(2) };
};
// short
if (ONLY === "all" || ONLY === "short") for (const [w, h] of [[390, 640], [360, 640], [844, 390], [568, 320], [320, 256], [1440, 600], [390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 600, isMobile: w < 600 }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  if (!(await p.$(".pdim"))) { out.short.push({ w, h, noPopup: true }); await ctx.close(); continue; }
  const cards = [];
  for (let k = 0; k < 2; k++) {
    const g = await p.evaluate(geo);
    cards.push({ ...g, ok: g.barBottom <= g.innerH + 0.5 && g.onTop >= -0.5 && g.barTop >= 0 });
    await p.keyboard.press("ArrowRight"); await p.waitForTimeout(700);
  }
  out.short.push({ w, h, cards });
  await ctx.close();
}
// wrap N=4
const clone = () => document.addEventListener("DOMContentLoaded", () => {
  const src = document.querySelector('[data-hh-popup]:not([data-promo-popup])');
  if (!src) return;
  for (const k of ["clone1", "clone2"]) { const c = src.cloneNode(true); c.setAttribute("data-hh-popup", k); c.removeAttribute("data-popup-until"); const h2 = c.querySelector("h2"); if (h2) h2.textContent = "복제 카드 " + k; document.body.appendChild(c); }
});
if (ONLY === "all" || ONLY === "wrap") for (const [w, h] of [[1920, 1080], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.addInitScript(clone);
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const N = await p.$$eval(".pslot", (s) => s.length);
  const state = () => [...document.querySelectorAll(".pslot")].map((s) => ({ i: s.dataset.i, d: s.dataset.d, far: s.hasAttribute("data-far"), on: s.hasAttribute("data-on"), op: getComputedStyle(s).opacity, tr: s.style.transition || "", rect: [Math.round(s.getBoundingClientRect().left), Math.round(s.getBoundingClientRect().right)] }));
  const st0 = await p.evaluate(state);
  // 활성 카드 폭 안으로 들어오는 측면 슬롯이 있는지 전이 표본
  const onRect = await p.evaluate(() => { const r = document.querySelector(".pslot[data-on]").getBoundingClientRect(); return [r.left, r.right]; });
  const samples = [];
  await p.keyboard.press("ArrowRight");
  for (const t of [0, 100, 200, 300, 800]) { await p.waitForTimeout(t === 0 ? 30 : t - (samples.length ? samples[samples.length - 1].t : 0)); samples.push({ t, s: await p.evaluate(state) }); }
  const cross = samples.flatMap(({ t, s }) => s.filter((x) => !x.on && x.op !== "0" && x.rect[1] > onRect[0] + 8 && x.rect[0] < onRect[1] - 8).map((x) => ({ t, i: x.i, d: x.d, rect: x.rect })));
  const wrapJump = samples[0].s.filter((x) => x.tr === "none").map((x) => x.i);
  out.wrap.push({ w, h, N, before: st0, after: samples[samples.length - 1].s, wrapJumpSlots_t30ms: wrapJump, crossings: cross, far: st0.filter((x) => x.far).map((x) => [x.i, x.d, x.op]) });
  await ctx.close();
}
// keys (1440x420: 카드 429px 가 max-height 에 걸려 안 스크롤이 생기는 높이)
if (ONLY === "all" || ONLY === "keys") {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 420 } }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const rd = () => { const on = document.querySelector(".pslot[data-on] .pop"); return { st: on.scrollTop, sh: on.scrollHeight, ch: on.clientHeight, active: document.activeElement.className }; };
  const r = { start: await p.evaluate(rd) };
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(100); r.arrowDown = await p.evaluate(rd);
  await p.keyboard.press("PageDown"); await p.waitForTimeout(100); r.pageDown = await p.evaluate(rd);
  await p.keyboard.press("ArrowUp"); await p.waitForTimeout(100); r.arrowUp = await p.evaluate(rd);
  await p.keyboard.press("Space"); await p.waitForTimeout(100); r.space = await p.evaluate(rd);
  r.ok = r.start.sh > r.start.ch ? (r.arrowDown.st > r.start.st && r.pageDown.st > r.arrowDown.st && r.arrowUp.st < r.pageDown.st && r.space.active === "pdim") : "not-scrollable";
  out.keys = r;
  await ctx.close();
}
fs.writeFileSync(path.join(HERE, ONLY === "all" ? "extra_check.json" : `extra_check_${ONLY}.json`), JSON.stringify(out, null, 1));
console.log("SHORT", out.short.map((s) => `${s.w}x${s.h}: ` + (s.noPopup ? "noPopup" : s.cards.map((c) => `cur${c.cur} bar[${c.barTop},${c.barBottom}]/${c.innerH} on[${c.onTop},${c.onBottom}] var=${c.pbarVar} joint=${c.joint} scroll=${c.scrollable} ${c.ok ? "OK" : "BAD"}`).join(" | "))).join("\n"));
console.log("WRAP", JSON.stringify(out.wrap.map((x) => ({ w: x.w, N: x.N, far: x.far, wrapJump: x.wrapJumpSlots_t30ms, crossings: x.crossings.length, after: x.after.map((s) => [s.i, s.d, s.far, s.op]) }))));
console.log("KEYS", JSON.stringify(out.keys));
await b.close();
