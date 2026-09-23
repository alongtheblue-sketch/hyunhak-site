// 반증 7차 behavior P2 수리 검증: N>1 첫 초점 .pdim 에서 End → 활성 카드 scrollTop = max, Home → 0, 벨트 정지(「재생」). 스크롤 불가 카드(1440x900)에서는 키 무시 + 벨트 계속(「정지」). Tab 으로 카드 안 링크에 초점을 두면 가로채기 없음(preventDefault 미발생).
// 사용: node keys_endhome_check.mjs [BASE] → keys_endhome_check.json
import { createRequire } from "node:module";
import fs from "node:fs"; import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/gregory/.npm/_npx/705bc6b22212b352/node_modules/playwright-core");
const B = (process.argv[2] || "http://localhost:8092/") + "index.html";
const HERE = path.dirname(new URL(import.meta.url).pathname);
const b = await chromium.launch({ channel: "chrome", headless: true });
const out = {};
const st = () => { const on = document.querySelector(".pslot[data-on] .pop"); return { cur: document.querySelector("[data-ppop-cur]")?.textContent, pause: document.querySelector("[data-ppop-pause]")?.textContent, st: on.scrollTop, max: on.scrollHeight - on.clientHeight, scrollable: on.scrollHeight > on.clientHeight, active: document.activeElement.className || document.activeElement.tagName }; };
for (const [name, w, h] of [["short_1440x420", 1440, 420], ["tall_1440x900", 1440, 900], ["phone_390x640", 390, 640]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } }); const p = await ctx.newPage();
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  const r = { start: await p.evaluate(st) };
  await p.keyboard.press("End"); await p.waitForTimeout(150); r.afterEnd = await p.evaluate(st);
  await p.keyboard.press("Home"); await p.waitForTimeout(150); r.afterHome = await p.evaluate(st);
  await p.keyboard.press("ArrowDown"); await p.waitForTimeout(150); r.afterDown = await p.evaluate(st);
  await p.keyboard.press("Home"); await p.waitForTimeout(150); r.afterDownHome = await p.evaluate(st);
  r.ok = r.start.active === "pdim" && (r.start.scrollable
    ? (r.afterEnd.st === r.afterEnd.max && r.afterEnd.max > 0 && r.afterEnd.pause === "재생" && r.afterHome.st === 0 && r.afterDown.st > 0 && r.afterDownHome.st === 0)
    : (r.afterEnd.st === 0 && r.afterEnd.pause === "정지" && r.afterHome.st === 0));
  out[name] = r; await ctx.close();
}
{ // 카드 안 링크에 초점(Tab)일 때 End 는 가로채지 않는다: 문서 keydown 의 defaultPrevented 가 false
  const ctx = await b.newContext({ viewport: { width: 1440, height: 420 } }); const p = await ctx.newPage();
  await p.addInitScript(() => { window.__dp = []; document.addEventListener("keydown", (e) => window.__dp.push([e.key, e.defaultPrevented, document.activeElement.tagName]), true); window.addEventListener("keydown", (e) => window.__dp.push(["post", e.key, e.defaultPrevented])); });
  await p.goto(B, { waitUntil: "networkidle" }); await p.waitForTimeout(500);
  await p.keyboard.press("Tab"); await p.waitForTimeout(100);
  const active = await p.evaluate(() => document.activeElement.tagName + (document.activeElement.className ? "." + document.activeElement.className : ""));
  await p.keyboard.press("End"); await p.waitForTimeout(150);
  const dp = await p.evaluate(() => window.__dp);
  const post = dp.filter((x) => x[0] === "post" && x[1] === "End");
  out.tabThenEnd = { active, prevented: post.length ? post[post.length - 1][2] : null, ok: active !== "DIV.pdim" && post.length > 0 && post[post.length - 1][2] === false };
  await ctx.close();
}
out.ok = Object.values(out).every((r) => r && r.ok !== false);
fs.writeFileSync(path.join(HERE, "keys_endhome_check.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
await b.close();
