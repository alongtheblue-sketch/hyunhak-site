// Codex 7차 P2 재검증: .pdim 초점에서 ArrowDown 스크롤 → 자동 넘김 정지(정지 단추 「재생」, stopped) → 9.5초 뒤 cur 불변. 대조 = 스크롤 불가 카드에서는 키가 무시되고 벨트가 돈다.
// 사용: node keys_pause_check.mjs [BASE] → keys_pause_check.json
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const B = (process.argv[2] || "http://localhost:8092/") + "index.html";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch({ channel: "chrome", headless: true });
const out = {};
const st = () => { const on = document.querySelector(".pslot[data-on] .pop"); return { cur: document.querySelector("[data-ppop-cur]")?.textContent, pause: document.querySelector("[data-ppop-pause]")?.textContent, st: on.scrollTop, scrollable: on.scrollHeight > on.clientHeight, active: document.activeElement.className }; };
for (const [name, w, h] of [["short_1440x420", 1440, 420], ["tall_1440x900", 1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const r = { start: await p.evaluate(st) };
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(150); r.afterKey = await p.evaluate(st);
  await p.waitForTimeout(9500); r.after9_5s = await p.evaluate(st);
  r.ok = r.start.scrollable ? (r.afterKey.st > 0 && r.afterKey.pause === "재생" && r.after9_5s.cur === r.start.cur) : (r.afterKey.pause === "정지" && r.after9_5s.cur !== r.start.cur);
  out[name] = r; await ctx.close();
}
{ // 빠른 연속 감아 돌기: N=4, → 를 30ms 간격 3회 뒤 400ms, 모든 슬롯 inline transition 이 비어 있어야(none 잔류 0)
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage();
  await p.addInitScript(() => document.addEventListener("DOMContentLoaded", () => { const src = document.querySelector('[data-hh-popup]:not([data-promo-popup])'); if (!src) return; for (const k of ["c1", "c2"]) { const c = src.cloneNode(true); c.setAttribute("data-hh-popup", k); c.removeAttribute("data-popup-until"); document.body.appendChild(c); } }));
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { await p.keyboard.press("ArrowRight"); await p.waitForTimeout(30); }
  await p.waitForTimeout(400);
  const tr = await p.$$eval(".pslot", (s) => s.map((x) => [x.dataset.i, x.dataset.d, x.style.transition || ""]));
  out.rapidWrap = { N: tr.length, transitions: tr, ok: tr.every((t) => t[2] === "") };
  await ctx.close();
}
fs.writeFileSync(path.join(HERE, "keys_pause_check.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
await b.close();
